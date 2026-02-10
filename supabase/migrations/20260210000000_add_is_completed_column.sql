-- ============================================================
-- Migration: projects.is_completed 컬럼 추가 및 트리거 기반 자동 갱신
--
-- 목적: process_stages 기반 RPC 호출(get_completed_project_ids)을
--       단순 컬럼 필터(.eq('is_completed', true/false))로 교체하여
--       조회 성능 개선
-- ============================================================

-- 1. 컬럼 추가
ALTER TABLE projects
  ADD COLUMN is_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. 기존 데이터 백필 (모든 process_stages가 completed인 프로젝트)
UPDATE projects p
SET is_completed = TRUE
WHERE p.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM process_stages ps
    WHERE ps.project_id = p.id
    GROUP BY ps.project_id
    HAVING bool_and(ps.status = 'completed')
  );

-- 3. 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_project_is_completed()
RETURNS TRIGGER AS $$
DECLARE
  target_project_id UUID;
  v_is_completed BOOLEAN;
BEGIN
  -- DELETE 시 NEW는 NULL이므로 OLD 사용
  IF TG_OP = 'DELETE' THEN
    target_project_id := OLD.project_id;
  ELSE
    target_project_id := NEW.project_id;
  END IF;

  -- 해당 프로젝트의 스테이지만 조회 (idx_process_stages_project 인덱스 활용)
  SELECT COALESCE(bool_and(status = 'completed'), FALSE)
  INTO v_is_completed
  FROM process_stages
  WHERE project_id = target_project_id;

  -- 값이 실제로 변경된 경우에만 UPDATE (불필요한 쓰기 방지)
  UPDATE projects
  SET is_completed = v_is_completed
  WHERE id = target_project_id
    AND is_completed IS DISTINCT FROM v_is_completed;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. 트리거 생성 (INSERT 제외: createProject에서 서비스 레이어에서 처리)
CREATE TRIGGER update_project_is_completed_trigger
  AFTER UPDATE OF status OR DELETE ON process_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_project_is_completed();

-- 5. 부분 인덱스 생성
CREATE INDEX idx_projects_is_completed
  ON projects (is_completed)
  WHERE deleted_at IS NULL;
