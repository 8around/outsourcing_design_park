# 프로젝트 수정 권한 변경 계획

## 요구사항
프로젝트 상세 페이지와 수정 페이지에서 작성자만 수정 가능한 현재 구조를 관리자도 수정 가능하도록 변경

## 현재 상황 분석

### 현재 권한 체계
- **프로젝트 작성자**: 자신이 생성한 프로젝트만 수정 가능
- **관리자(admin)**: 수정 권한 없음 (일반 사용자와 동일)
- **일반 사용자**: 수정 권한 없음

### 문제점
- 관리자가 필요시 프로젝트를 수정할 수 없어 운영상 불편함 발생
- 작성자가 부재중이거나 퇴사한 경우 프로젝트 수정 불가

## 변경이 필요한 파일

### 1. app/(dashboard)/projects/[id]/page.tsx
프로젝트 상세 페이지 - 수정 버튼 표시 로직

### 2. app/(dashboard)/projects/[id]/edit/page.tsx  
프로젝트 수정 페이지 - 권한 체크 로직

## 구체적인 변경 사항

### 1. 프로젝트 상세 페이지 (app/(dashboard)/projects/[id]/page.tsx)

#### 278번 줄 - 권한 체크 변수 변경
```typescript
// 기존 코드
const isOwner = user?.id === project.created_by

// 변경 후 코드
const canEdit = user?.id === project.created_by || userData?.role === 'admin'
```

#### 310번 줄 - 수정 버튼 표시 조건 변경
```typescript
// 기존 코드
{isOwner && (
  <>
    <Link
      href={`/projects/${project.id}/edit`}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
    >
      수정
    </Link>
  </>
)}

// 변경 후 코드  
{canEdit && (
  <>
    <Link
      href={`/projects/${project.id}/edit`}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
    >
      수정
    </Link>
  </>
)}
```

### 2. 프로젝트 수정 페이지 (app/(dashboard)/projects/[id]/edit/page.tsx)

#### 127-131번 줄 - 권한 체크 로직 개선
```typescript
// 기존 코드
// 권한 체크
if (projectData.created_by !== user?.id) {
  toast.error('프로젝트 수정 권한이 없습니다.')
  router.push(`/projects/${projectId}`)
  return
}

// 변경 후 코드
// 권한 체크 (작성자 또는 관리자)
const isOwner = projectData.created_by === user?.id
const isAdmin = userData?.role === 'admin'

if (!isOwner && !isAdmin) {
  toast.error('프로젝트 수정 권한이 없습니다.')
  router.push(`/projects/${projectId}`)
  return
}
```

## 변경 후 권한 체계

| 사용자 타입 | 자신의 프로젝트 | 타인의 프로젝트 |
|------------|----------------|----------------|
| 작성자 | ✅ 수정 가능 | ❌ 수정 불가 |
| 관리자(admin) | ✅ 수정 가능 | ✅ 수정 가능 |
| 일반 사용자 | ❌ 수정 불가 | ❌ 수정 불가 |

## 영향 범위

### 긍정적 영향
- 관리자의 프로젝트 관리 권한 강화
- 작성자 부재시에도 프로젝트 수정 가능
- 운영 유연성 증가

### 주의사항
- 관리자의 수정 행위에 대한 로그 기록 필요 (이미 히스토리 로그로 추적 가능)
- 관리자 권한 부여는 신중하게 진행

## 테스트 시나리오

### 1. 관리자 권한 테스트
1. 관리자 계정으로 로그인
2. 타인이 작성한 프로젝트 상세 페이지 접속
3. 수정 버튼 표시 확인
4. 수정 페이지 진입 및 수정 가능 확인

### 2. 작성자 권한 테스트
1. 일반 사용자로 로그인
2. 자신이 작성한 프로젝트 수정 가능 확인
3. 타인이 작성한 프로젝트 수정 불가 확인

### 3. 일반 사용자 권한 테스트
1. 일반 사용자로 로그인
2. 모든 프로젝트 수정 불가 확인

## Supabase RLS 정책 수정 필요

### 현재 RLS 정책의 문제점
현재 `projects` 테이블의 UPDATE 정책은 **모든 승인된 사용자가 모든 프로젝트를 수정**할 수 있도록 되어 있습니다:

```sql
-- 현재 정책 (보안 취약점 존재)
CREATE POLICY "Approved users can update projects" 
ON projects FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);
```

**문제점**:
- 승인된 일반 사용자도 다른 사람의 프로젝트를 수정할 수 있음
- 프론트엔드의 제한과 백엔드 정책이 불일치
- 악의적인 사용자가 API 직접 호출시 데이터 무결성 위험

### 수정해야 할 RLS 정책

```sql
-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "Approved users can update projects" ON projects;

-- 2. 새로운 정책 생성: 작성자 또는 관리자만 수정 가능
CREATE POLICY "Creators and admins can update projects" 
ON projects FOR UPDATE 
USING (
  -- 프로젝트 작성자이거나
  created_by = auth.uid() 
  OR 
  -- 관리자 역할을 가진 사용자
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin' 
    AND is_approved = true
  )
);
```

### RLS 정책 적용 방법
1. Supabase 대시보드에서 SQL Editor 접속
2. 위의 DROP POLICY와 CREATE POLICY 명령어 순차적으로 실행
3. Authentication → Policies 메뉴에서 정책이 올바르게 적용되었는지 확인
4. 테스트 환경에서 각 역할별 수정 권한 테스트

## 구현 시 고려사항

### 보안
- ✅ 프론트엔드와 백엔드(RLS) 정책이 완전히 일치하도록 구현
- ✅ 관리자 역할 검증은 서버 사이드(RLS)에서 반드시 수행
- ✅ 작성자와 관리자만 수정 가능하도록 엄격하게 제한

### UX 개선
- 관리자가 수정하는 경우 "관리자 권한으로 수정" 같은 표시 고려
- 히스토리 로그에 수정자 정보가 명확히 기록되는지 확인

### 추후 개선사항
- 프로젝트별 권한 관리 시스템 도입 고려
- 수정 권한을 특정 사용자에게 위임하는 기능 고려

## 작업 완료 체크리스트

### 1. 코드 수정
- [ ] app/(dashboard)/projects/[id]/page.tsx 파일 수정
- [ ] app/(dashboard)/projects/[id]/edit/page.tsx 파일 수정

### 2. Supabase RLS 정책 수정
- [ ] 기존 "Approved users can update projects" 정책 삭제
- [ ] 새로운 "Creators and admins can update projects" 정책 생성
- [ ] Supabase 대시보드에서 정책 적용 확인

### 3. 테스트
- [ ] 관리자 계정으로 타인의 프로젝트 수정 가능 테스트
- [ ] 일반 사용자 계정으로 자신의 프로젝트만 수정 가능 테스트
- [ ] 일반 사용자 계정으로 타인의 프로젝트 수정 불가 테스트
- [ ] API 직접 호출 테스트 (RLS 정책이 제대로 작동하는지 확인)

### 4. 최종 확인
- [ ] npm run build 실행하여 빌드 에러 없는지 확인
- [ ] 서버 재시작 후 정상 작동 확인
- [ ] 히스토리 로그에 수정자 정보가 올바르게 기록되는지 확인