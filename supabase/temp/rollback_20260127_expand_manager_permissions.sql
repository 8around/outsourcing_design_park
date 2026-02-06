-- ============================================================
-- 롤백: Manager 권한 확장 마이그레이션 되돌리기
-- 목적: 20260127_expand_manager_permissions.sql 실행 전 상태로 복원
--
-- 주의: 이 파일은 마이그레이션 실행 후 롤백이 필요할 때만 사용
-- ============================================================

-- ============================================================
-- 1. history_logs 테이블 - 새 정책 삭제 후 기존 정책 복원
-- ============================================================

-- 새로 생성된 정책 삭제
DROP POLICY IF EXISTS "Managers can update logs" ON public.history_logs;
DROP POLICY IF EXISTS "Managers can view all logs" ON public.history_logs;

-- 기존 정책 복원: Admins can update logs
CREATE POLICY "Admins can update logs" ON public.history_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- 기존 정책 복원: Admins can view all logs
CREATE POLICY "Admins can view all logs" ON public.history_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================
-- 2. weekly_report_config 테이블 - 새 정책 삭제 후 기존 정책 복원
-- ============================================================

-- 새로 생성된 정책 삭제
DROP POLICY IF EXISTS "Managers can manage report config" ON public.weekly_report_config;

-- 기존 정책 복원: Admin only for weekly_report_config (JWT role 체크 방식)
CREATE POLICY "Admin only for weekly_report_config" ON public.weekly_report_config
  FOR ALL
  USING (
    ((auth.jwt() ->> 'role'::text) = 'admin'::text)
    OR ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  );

-- 기존 정책 복원: Admins can manage report config (users 테이블 체크 방식)
CREATE POLICY "Admins can manage report config" ON public.weekly_report_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================
-- 3. weekly_report_history 테이블 - 새 정책 삭제 후 기존 정책 복원
-- ============================================================

-- 새로 생성된 정책 삭제
DROP POLICY IF EXISTS "Managers can manage report history" ON public.weekly_report_history;

-- 기존 정책 복원: Admin only for weekly_report_history (JWT role 체크 방식)
CREATE POLICY "Admin only for weekly_report_history" ON public.weekly_report_history
  FOR ALL
  USING (
    ((auth.jwt() ->> 'role'::text) = 'admin'::text)
    OR ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  );

-- 기존 정책 복원: Admins can view report history
CREATE POLICY "Admins can view report history" ON public.weekly_report_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- 기존 정책 복원: System can create report history
CREATE POLICY "System can create report history" ON public.weekly_report_history
  FOR INSERT
  WITH CHECK (true);
