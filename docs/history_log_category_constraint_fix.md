# 히스토리 로그 카테고리 제약조건 수정

## 문제 요약

프로젝트 작성/수정 화면에서 히스토리 로그 추가 시 **'설비', '기타' 카테고리**를 선택하면 로그 생성이 실패하는 문제가 발견되었습니다.

## 문제 분석

### 근본 원인

**데이터베이스 CHECK 제약조건과 애플리케이션 코드 간의 불일치**

### 상세 분석

#### 1. 코드 레벨 (정상 ✅)

**TypeScript 타입 정의** (`types/log.ts:4-15`)
```typescript
export type LogCategory =
  | '사양변경'
  | '도면설계'
  | '구매발주'
  | '생산제작'
  | '상하차'
  | '현장설치시공'
  | '설치인증'
  | '설비'      // ✅ 정의됨
  | '기타'      // ✅ 정의됨
  | '승인요청'
  | '승인처리'
```

**LogForm 컴포넌트** (`components/logs/LogForm.tsx:10-20`)
```typescript
const LOG_CATEGORIES: { value: LogCategory; label: string }[] = [
  { value: '사양변경', label: '사양변경' },
  { value: '도면설계', label: '도면설계' },
  { value: '구매발주', label: '구매발주' },
  { value: '생산제작', label: '생산제작' },
  { value: '상하차', label: '상하차' },
  { value: '현장설치시공', label: '현장설치시공' },
  { value: '설치인증', label: '설치인증' },
  { value: '설비', label: '설비' },     // ✅ 정의됨
  { value: '기타', label: '기타' }      // ✅ 정의됨
]
```

**DATABASE_SCHEMA.md** (215-219줄)
```sql
category TEXT NOT NULL CHECK (category IN (
  '사양변경', '도면설계', '구매발주', '생산제작',
  '상하차', '현장설치시공', '설치인증', '설비', '기타',
  '승인요청', '승인처리'
)),
```

#### 2. 실제 데이터베이스 (문제 발견 ❌)

**Supabase `history_logs` 테이블의 실제 CHECK 제약조건:**

```sql
CHECK ((category = ANY (ARRAY[
  '사양변경'::text,
  '도면설계'::text,
  '구매발주'::text,
  '생산제작'::text,
  '상하차'::text,
  '현장설치시공'::text,
  '설치인증'::text,
  '승인요청'::text,
  '승인처리'::text
])))
```

**'설비'와 '기타'가 제약조건에서 누락됨!** ❌

### 문제 발생 흐름

1. 사용자가 LogForm에서 '설비' 또는 '기타' 카테고리 선택
2. 프론트엔드: 정상적으로 요청 전송
3. `logService.createManualLog()`: 정상 실행
4. Supabase INSERT 시도: **CHECK 제약조건 위반으로 실패**
5. 사용자에게 "로그 생성에 실패했습니다" 에러 메시지 표시

## 해결방안

### 1. 데이터베이스 마이그레이션 SQL

```sql
-- 1. 기존 제약조건 삭제
ALTER TABLE history_logs
DROP CONSTRAINT IF EXISTS history_logs_category_check;

-- 2. '설비', '기타'를 포함한 새로운 제약조건 추가
ALTER TABLE history_logs
ADD CONSTRAINT history_logs_category_check
CHECK (category IN (
  '사양변경', '도면설계', '구매발주', '생산제작',
  '상하차', '현장설치시공', '설치인증', '설비', '기타',
  '승인요청', '승인처리'
));
```

### 2. 마이그레이션 실행 방법

#### 방법 1: Supabase 대시보드 (권장)
1. Supabase 대시보드 접속
2. SQL Editor 메뉴로 이동
3. 위의 SQL 실행
4. 변경사항 확인

#### 방법 2: Supabase CLI
```bash
# 마이그레이션 파일 생성
npx supabase migration new add_missing_log_categories

# 생성된 파일에 위의 SQL 추가
# supabase/migrations/[timestamp]_add_missing_log_categories.sql

# 마이그레이션 적용
npx supabase db push
```

## 영향도 분석

### 위험도: **낮음** 🟢

**긍정적 영향:**
- 기존 데이터에 영향 없음 (카테고리 추가만)
- 애플리케이션 코드 변경 불필요
- RLS 정책 영향 없음
- 다운타임 없음
- 즉시 적용 가능

**변경 범위:**
- 테이블: `history_logs` 1개
- 컬럼: `category` CHECK 제약조건만
- 데이터 마이그레이션: 불필요

## 테스트 체크리스트

마이그레이션 적용 후 다음 항목을 테스트해야 합니다:

### 필수 테스트
- [ ] '설비' 카테고리로 히스토리 로그 생성
- [ ] '기타' 카테고리로 히스토리 로그 생성
- [ ] 기존 카테고리들 정상 작동 확인
  - [ ] 사양변경
  - [ ] 도면설계
  - [ ] 구매발주
  - [ ] 생산제작
  - [ ] 상하차
  - [ ] 현장설치시공
  - [ ] 설치인증
- [ ] 승인 요청 로그 생성 정상 확인
- [ ] 승인 처리 로그 생성 정상 확인

### 통합 테스트
- [ ] 프로젝트 상세 페이지에서 로그 목록 조회
- [ ] 홈 화면 글로벌 로그 피드 조회
- [ ] 카테고리별 필터링 동작 확인
- [ ] 로그 삭제 기능 정상 작동 확인

## 검증 SQL

마이그레이션 적용 후 제약조건이 올바르게 설정되었는지 확인:

```sql
-- CHECK 제약조건 확인
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'history_logs'::regclass
  AND contype = 'c'
  AND conname = 'history_logs_category_check';
```

**기대 결과:**
```sql
CHECK ((category = ANY (ARRAY[
  '사양변경'::text,
  '도면설계'::text,
  '구매발주'::text,
  '생산제작'::text,
  '상하차'::text,
  '현장설치시공'::text,
  '설치인증'::text,
  '설비'::text,        -- ✅ 추가됨
  '기타'::text,        -- ✅ 추가됨
  '승인요청'::text,
  '승인처리'::text
])))
```

## 관련 파일

### 수정 불필요 (이미 정상)
- `types/log.ts` - LogCategory 타입 정의
- `components/logs/LogForm.tsx` - 로그 폼 컴포넌트
- `lib/services/logs.service.ts` - 로그 서비스
- `DATABASE_SCHEMA.md` - 스키마 문서

### 업데이트 필요
- ✅ `supabase/migrations/` - 새 마이그레이션 파일 추가

## 롤백 방안

문제 발생 시 원래 상태로 복구:

```sql
-- 롤백 SQL (비상시만 사용)
ALTER TABLE history_logs
DROP CONSTRAINT IF EXISTS history_logs_category_check;

ALTER TABLE history_logs
ADD CONSTRAINT history_logs_category_check
CHECK (category IN (
  '사양변경', '도면설계', '구매발주', '생산제작',
  '상하차', '현장설치시공', '설치인증',
  '승인요청', '승인처리'
));
```

## 참고사항

### 데이터베이스 변경 규칙 (CLAUDE.md 준수)
1. ✅ 개발자 승인 필수
2. ✅ 영향도 분석 완료
3. ✅ DATABASE_SCHEMA.md와 동기화 확인
4. ✅ 테스트 체크리스트 작성
5. ✅ 롤백 방안 준비

### 후속 작업
마이그레이션 완료 후:
1. DATABASE_SCHEMA.md와 실제 DB 동기화 재확인
2. 프로덕션 적용 전 스테이징 환경 테스트
3. 사용자 가이드 업데이트 (필요시)

## 결론

이 마이그레이션은 안전하고 간단한 작업으로, 누락된 카테고리를 추가하여 사용자가 '설비'와 '기타' 카테고리로 히스토리 로그를 정상적으로 생성할 수 있도록 합니다. 기존 데이터나 기능에 영향을 주지 않으며, 즉시 적용 가능합니다.
