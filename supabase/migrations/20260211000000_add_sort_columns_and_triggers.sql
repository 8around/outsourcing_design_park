-- Migration: 대시보드 정렬 컬럼 및 트리거 추가
-- Description: last_saved_at → last_log_created_at 이름 변경, installation_stage_start_date 추가,
--              트리거 2개 (history_logs, process_stages), 데이터 백필, 인덱스 2개

-- ============================================
-- 1. last_saved_at → last_log_created_at 이름 변경
-- ============================================
ALTER TABLE projects RENAME COLUMN last_saved_at TO last_log_created_at;
ALTER TABLE projects ALTER COLUMN last_log_created_at DROP DEFAULT;
ALTER TABLE projects ALTER COLUMN last_log_created_at SET DEFAULT NULL;

-- ============================================
-- 2. installation_stage_start_date 컬럼 추가
-- ============================================
ALTER TABLE projects ADD COLUMN installation_stage_start_date DATE DEFAULT NULL;

-- ============================================
-- 3. 트리거 함수 1 — history_logs → last_log_created_at (SECURITY DEFINER)
--    - INSERT: 현재 값보다 새로운 경우에만 갱신
--    - UPDATE (소프트 삭제): 남은 활성 로그 중 최신 created_at으로 재계산
-- ============================================
CREATE OR REPLACE FUNCTION update_project_last_log_created_at()
RETURNS TRIGGER AS $$
DECLARE
  target_project_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    target_project_id := NEW.project_id;

    UPDATE projects
    SET last_log_created_at = NEW.created_at
    WHERE id = target_project_id
      AND (last_log_created_at IS NULL OR last_log_created_at < NEW.created_at);

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
      target_project_id := NEW.project_id;

      UPDATE projects
      SET last_log_created_at = (
        SELECT MAX(created_at)
        FROM history_logs
        WHERE project_id = target_project_id
          AND is_deleted = false
      )
      WHERE id = target_project_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_project_last_log_created_at_trigger
  AFTER INSERT OR UPDATE OF is_deleted ON history_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_project_last_log_created_at();

-- ============================================
-- 4. 트리거 함수 2 — process_stages → installation_stage_start_date (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION update_project_installation_start_date()
RETURNS TRIGGER AS $$
DECLARE
  target_project_id UUID;
BEGIN
  target_project_id := NEW.project_id;

  IF NEW.stage_name = 'installation' THEN
    UPDATE projects
    SET installation_stage_start_date = NEW.start_date
    WHERE id = target_project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_project_installation_start_date_trigger
  AFTER INSERT OR UPDATE OF start_date ON process_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_project_installation_start_date();

-- ============================================
-- 5. 기존 데이터 백필
-- ============================================
UPDATE projects p
SET last_log_created_at = (
  SELECT MAX(hl.created_at)
  FROM history_logs hl
  WHERE hl.project_id = p.id AND hl.is_deleted = false
);

UPDATE projects p
SET installation_stage_start_date = ps.start_date
FROM process_stages ps
WHERE ps.project_id = p.id AND ps.stage_name = 'installation';

-- ============================================
-- 6. 인덱스 추가
-- ============================================
CREATE INDEX idx_projects_inprogress_log_sort
  ON projects (is_urgent DESC, last_log_created_at DESC NULLS LAST)
  WHERE deleted_at IS NULL AND is_completed = false;

CREATE INDEX idx_projects_inprogress_install_sort
  ON projects (is_urgent DESC, installation_stage_start_date ASC NULLS LAST)
  WHERE deleted_at IS NULL AND is_completed = false;
