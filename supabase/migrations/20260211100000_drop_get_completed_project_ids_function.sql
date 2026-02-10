-- get_completed_project_ids() RPC 함수 삭제
-- 이유: projects.is_completed 컬럼과 update_project_is_completed_trigger 트리거로 대체됨
-- 참고: idx_process_stages_status 인덱스는 다른 쿼리에서 사용되므로 유지

DROP FUNCTION IF EXISTS get_completed_project_ids();
