-- Migration: rollback_fix_admin_rls_policies
-- Description: 이전 마이그레이션(20260128000000_fix_admin_rls_policies) 롤백
--   - 무한 재귀 오류 해결
--   - Admins can view all users 삭제 (Anyone can check email existence로 충분)
--   - Admins can update all users 원래 상태로 복원

-- ============================================
-- 1. Admins can view all users 삭제
-- ============================================
-- 이유: Anyone can check email existence가 qual=true로 모든 SELECT를 허용하므로 불필요
-- 또한 users 테이블을 참조하면 무한 재귀 발생
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- ============================================
-- 2. Admins can update all users 원래 상태로 복원
-- ============================================
-- 기존에 작동하던 정책으로 복원 (자기 role 변경 방지 로직 제거)
DROP POLICY IF EXISTS "Admins can update all users" ON users;

CREATE POLICY "Admins can update all users" ON users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_approved = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_approved = true
  )
);

-- ============================================
-- 참고: 현재 남아있는 SELECT 정책들
-- ============================================
-- 1. Anyone can check email existence (qual = true) - 모든 SELECT 허용
-- 2. Authenticated users can view approved users - 승인된 사용자 조회
-- 3. Users can view own data - 자기 자신 조회
--
-- 위 정책들로 Admin 포함 모든 사용자의 SELECT가 가능하므로
-- Admins can view all users는 불필요
