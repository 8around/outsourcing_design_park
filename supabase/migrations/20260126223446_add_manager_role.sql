-- ============================================================
-- Manager Role 추가 마이그레이션
-- 목적: manager role 추가, 프로젝트 수정 권한만 부여
-- ============================================================

-- 1. CHECK 제약조건 수정 (manager role 추가)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'user'::text]));

-- 2. Users can update own data 보안 강화 (role 변경 불가)
-- 기존 문제: 사용자가 자신의 role을 임의로 변경 가능
-- 해결: WITH CHECK에서 role 변경 금지
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())
  );

-- 3. projects RLS 수정 (manager도 프로젝트 수정 가능)
-- 기존: 생성자 또는 admin만 수정 가능
-- 변경: 생성자 또는 admin 또는 manager가 수정 가능
DROP POLICY IF EXISTS "Creators and admins can update projects" ON public.projects;
CREATE POLICY "Creators, admins or managers can update projects" ON public.projects
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
        AND is_approved = true
    )
  );
