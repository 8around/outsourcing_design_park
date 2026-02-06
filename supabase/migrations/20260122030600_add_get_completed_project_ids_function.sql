-- Migration: Add RPC function to get completed project IDs
-- Description: 완료된 프로젝트(모든 공정 단계가 completed 상태)의 ID 목록을 반환하는 함수

-- 완료된 프로젝트 ID 목록 조회 함수
-- bool_and()를 사용하여 모든 공정 단계가 completed인 프로젝트만 반환
-- 장점: 단계 수에 관계없이 "모든 단계 완료" 로직을 정확히 표현
CREATE OR REPLACE FUNCTION get_completed_project_ids()
RETURNS TABLE (project_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT ps.project_id
  FROM process_stages ps
  GROUP BY ps.project_id
  HAVING bool_and(ps.status = 'completed');
$$;

-- 함수에 대한 코멘트 추가
COMMENT ON FUNCTION get_completed_project_ids() IS '완료된 프로젝트(모든 공정 단계가 completed 상태)의 ID 목록을 반환합니다.';

-- 함수 권한 설정 (인증된 사용자만 호출 가능)
-- 1. 먼저 PUBLIC 기본 권한 제거 (PostgreSQL 함수 생성 시 기본적으로 PUBLIC에 EXECUTE 권한 부여됨)
REVOKE EXECUTE ON FUNCTION get_completed_project_ids() FROM PUBLIC;

-- 2. anon 역할에서 접근 제거 (Supabase 익명 사용자)
REVOKE EXECUTE ON FUNCTION get_completed_project_ids() FROM anon;

-- 3. authenticated 역할에만 권한 부여
GRANT EXECUTE ON FUNCTION get_completed_project_ids() TO authenticated;
