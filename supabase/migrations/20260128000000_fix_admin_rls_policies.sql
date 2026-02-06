-- Migration: fix_admin_rls_policies
-- Description: Admin RLS 정책 수정
--   1. Admin이 자기 자신의 role은 변경할 수 없도록 함
--   2. JWT role 대신 users 테이블의 role 컬럼 검사로 변경

-- ============================================
-- 1. Admins can update all users 수정
-- ============================================
-- 문제: Admin이 자기 자신의 role을 변경할 수 있어 실수로 권한을 잃을 수 있음
-- 해결: WITH CHECK에 자기 role 변경 방지 조건 추가

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
  AND (
    -- 자기 자신의 role은 변경 불가 (다른 필드는 변경 가능)
    id != auth.uid()
    OR role = (SELECT role FROM users WHERE id = auth.uid())
  )
);

-- ============================================
-- 2. Admins can view all users 수정
-- ============================================
-- 문제: auth.jwt() ->> 'role'은 JWT 클레임(authenticated, anon 등)으로
--       users 테이블의 role 컬럼과 다름 (의미 없는 정책)
-- 해결: users 테이블의 role 컬럼을 직접 검사

DROP POLICY IF EXISTS "Admins can view all users" ON users;

CREATE POLICY "Admins can view all users" ON users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_approved = true
  )
);

-- ============================================
-- 3. Anyone can check email existence 유지
-- ============================================
-- 이메일 중복 체크용으로 필요하며, users 테이블에 민감 정보가 없으므로 유지
-- (변경 없음)
