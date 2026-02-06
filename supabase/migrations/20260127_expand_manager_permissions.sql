-- ============================================================
-- Manager 권한 확장 마이그레이션
-- 목적: 회원 관리를 제외한 admin 기능을 manager에게도 부여
--
-- 변경 내용:
-- 1. history_logs: manager도 로그 soft delete (UPDATE) 가능
-- 2. history_logs: manager도 삭제된 로그 조회 (SELECT) 가능
-- 3. weekly_report_config: manager도 모든 기능 사용 가능
-- 4. weekly_report_history: manager도 모든 기능 사용 가능
--
-- 참고:
-- - service_role은 RLS를 완전히 우회하므로 별도 조건 불필요
-- - auth.jwt() ->> 'role'에는 anon/authenticated/service_role만 가능
--   (admin, manager, user는 users 테이블의 role 컬럼 값)
-- ============================================================

-- ============================================================
-- 1. history_logs 테이블
-- ============================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can update logs" ON public.history_logs;
DROP POLICY IF EXISTS "Admins can view all logs" ON public.history_logs;

-- 새 정책: Admin과 Manager가 로그 soft delete (UPDATE) 가능
CREATE POLICY "Managers can update logs" ON public.history_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
        AND is_approved = true
    )
  );

-- 새 정책: Admin과 Manager가 삭제된 로그 포함 전체 로그 조회 가능
CREATE POLICY "Managers can view all logs" ON public.history_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
        AND is_approved = true
    )
  );

-- ============================================================
-- 2. weekly_report_config 테이블
-- ============================================================

-- 기존 정책 삭제
-- (주의: "Admin only for weekly_report_config"는 JWT role 체크로 잘못된 정책)
DROP POLICY IF EXISTS "Admin only for weekly_report_config" ON public.weekly_report_config;
DROP POLICY IF EXISTS "Admins can manage report config" ON public.weekly_report_config;

-- 새 정책: Admin과 Manager가 모든 작업 가능
CREATE POLICY "Managers can manage report config" ON public.weekly_report_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
        AND is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
        AND is_approved = true
    )
  );

-- ============================================================
-- 3. weekly_report_history 테이블
-- ============================================================

-- 기존 정책 삭제
-- (주의: "Admin only for weekly_report_history"는 JWT role 체크로 잘못된 정책)
-- (주의: "System can create report history"는 service_role이 RLS 우회하므로 불필요)
DROP POLICY IF EXISTS "Admin only for weekly_report_history" ON public.weekly_report_history;
DROP POLICY IF EXISTS "Admins can view report history" ON public.weekly_report_history;
DROP POLICY IF EXISTS "System can create report history" ON public.weekly_report_history;

-- 새 정책: Admin과 Manager가 모든 작업 가능
-- (Edge Function은 service_role로 실행되어 RLS 우회하므로 별도 INSERT 정책 불필요)
CREATE POLICY "Managers can manage report history" ON public.weekly_report_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
        AND is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
        AND is_approved = true
    )
  );
