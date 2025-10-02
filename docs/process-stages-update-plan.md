# 공정 단계 및 히스토리 로그 변경 실행 계획

## 📋 변경사항 요약

### 1. 공정 단계 변경 (14단계 → 15단계)

**기존 순서 (14단계):**
계약 → 도면설계 → 발주 → **레이저** → 용접 → 도금 → 도장 → 판넬 → **조립** → 출하 → 설치 → 인증기간 → 마감 → 준공일

**신규 순서 (15단계):**
계약 → 도면설계 → 발주 → **입고** → 용접 → 도금 → 도장 → **GRC/FRP** → 판넬 → **제작조립** → 출하 → 설치 → 인증기간 → 마감 → 준공일

**변경 내용:**
- ❌ 제거: `laser` (레이저)
- ❌ 제거: `assembly` (조립)
- ✅ 추가: `incoming` (입고) - 4번째
- ✅ 추가: `grc_frp` (GRC/FRP) - 8번째
- ✅ 추가: `fabrication` (제작조립) - 10번째

### 2. 히스토리 로그 카테고리 추가
- ✅ 추가: `설비`, `기타`

### 3. UI 레이아웃 변경
- 🔄 "공정 단계 현황"과 "히스토리 로그" 섹션 위치 교체

---

## 🔧 수정 대상 파일 (8개)

### A. 데이터베이스 마이그레이션 (⚠️ 최우선)

#### 1. Supabase 마이그레이션 생성
**파일 위치**: `supabase/migrations/[timestamp]_update_process_stages_to_15.sql`

**마이그레이션 내용:**
```sql
-- 1. projects 테이블의 CHECK 제약조건 수정
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_current_process_stage_check;
ALTER TABLE projects ADD CONSTRAINT projects_current_process_stage_check
  CHECK (current_process_stage IN (
    'contract', 'design', 'order', 'incoming', 'welding', 'plating',
    'painting', 'grc_frp', 'panel', 'fabrication', 'shipping', 'installation',
    'certification', 'closing', 'completion'
  ));

-- 2. process_stages 테이블의 CHECK 제약조건 수정
ALTER TABLE process_stages DROP CONSTRAINT IF EXISTS process_stages_stage_name_check;
ALTER TABLE process_stages ADD CONSTRAINT process_stages_stage_name_check
  CHECK (stage_name IN (
    'contract', 'design', 'order', 'incoming', 'welding', 'plating',
    'painting', 'grc_frp', 'panel', 'fabrication', 'shipping', 'installation',
    'certification', 'closing', 'completion'
  ));

-- 3. 기존 데이터 변환 (laser → incoming, assembly → fabrication)
UPDATE projects
SET current_process_stage = 'incoming'
WHERE current_process_stage = 'laser';

UPDATE process_stages
SET stage_name = 'incoming'
WHERE stage_name = 'laser';

UPDATE process_stages
SET stage_name = 'fabrication'
WHERE stage_name = 'assembly';

-- 4. stage_order 재정렬
UPDATE process_stages SET stage_order = 1 WHERE stage_name = 'contract';
UPDATE process_stages SET stage_order = 2 WHERE stage_name = 'design';
UPDATE process_stages SET stage_order = 3 WHERE stage_name = 'order';
UPDATE process_stages SET stage_order = 4 WHERE stage_name = 'incoming';
UPDATE process_stages SET stage_order = 5 WHERE stage_name = 'welding';
UPDATE process_stages SET stage_order = 6 WHERE stage_name = 'plating';
UPDATE process_stages SET stage_order = 7 WHERE stage_name = 'painting';
UPDATE process_stages SET stage_order = 8 WHERE stage_name = 'grc_frp';
UPDATE process_stages SET stage_order = 9 WHERE stage_name = 'panel';
UPDATE process_stages SET stage_order = 10 WHERE stage_name = 'fabrication';
UPDATE process_stages SET stage_order = 11 WHERE stage_name = 'shipping';
UPDATE process_stages SET stage_order = 12 WHERE stage_name = 'installation';
UPDATE process_stages SET stage_order = 13 WHERE stage_name = 'certification';
UPDATE process_stages SET stage_order = 14 WHERE stage_name = 'closing';
UPDATE process_stages SET stage_order = 15 WHERE stage_name = 'completion';
```

**롤백 스크립트:**
```sql
-- 롤백용 마이그레이션
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_current_process_stage_check;
ALTER TABLE projects ADD CONSTRAINT projects_current_process_stage_check
  CHECK (current_process_stage IN (
    'contract', 'design', 'order', 'laser', 'welding', 'plating',
    'painting', 'panel', 'assembly', 'shipping', 'installation',
    'certification', 'closing', 'completion'
  ));

ALTER TABLE process_stages DROP CONSTRAINT IF EXISTS process_stages_stage_name_check;
ALTER TABLE process_stages ADD CONSTRAINT process_stages_stage_name_check
  CHECK (stage_name IN (
    'contract', 'design', 'order', 'laser', 'welding', 'plating',
    'painting', 'panel', 'assembly', 'shipping', 'installation',
    'certification', 'closing', 'completion'
  ));
```

### B. TypeScript 타입 정의

#### 2. types/project.ts (4-19 라인)
```typescript
// 기존 (14단계)
export const PROCESS_STAGES = {
  contract: '계약',
  design: '도면설계',
  order: '발주',
  laser: '레이저',        // 제거
  welding: '용접',
  plating: '도금',
  painting: '도장',
  panel: '판넬',
  assembly: '조립',       // 제거
  shipping: '출하',
  installation: '설치',
  certification: '인증기간',
  closing: '마감',
  completion: '준공일'
} as const;

// 신규 (15단계)
export const PROCESS_STAGES = {
  contract: '계약',
  design: '도면설계',
  order: '발주',
  incoming: '입고',       // 추가
  welding: '용접',
  plating: '도금',
  painting: '도장',
  grc_frp: 'GRC/FRP',     // 추가
  panel: '판넬',
  fabrication: '제작조립', // 추가 (assembly 대체)
  shipping: '출하',
  installation: '설치',
  certification: '인증기간',
  closing: '마감',
  completion: '준공일'
} as const;
```

### C. 컴포넌트 수정

#### 3. components/projects/ProcessStagesForm.tsx (11-26 라인)
```typescript
// 기존
export const PROCESS_STAGES = [
  { key: 'contract', label: '계약', order: 1 },
  { key: 'design', label: '도면설계', order: 2 },
  { key: 'order', label: '발주', order: 3 },
  { key: 'laser', label: '레이저', order: 4 },     // 제거
  { key: 'welding', label: '용접', order: 5 },
  { key: 'plating', label: '도금', order: 6 },
  { key: 'painting', label: '도장', order: 7 },
  { key: 'panel', label: '판넬', order: 8 },
  { key: 'assembly', label: '조립', order: 9 },    // 제거
  { key: 'shipping', label: '출하', order: 10 },
  { key: 'installation', label: '설치', order: 11 },
  { key: 'certification', label: '인증기간', order: 12 },
  { key: 'closing', label: '마감', order: 13 },
  { key: 'completion', label: '준공일', order: 14 }
] as const;

// 신규
export const PROCESS_STAGES = [
  { key: 'contract', label: '계약', order: 1 },
  { key: 'design', label: '도면설계', order: 2 },
  { key: 'order', label: '발주', order: 3 },
  { key: 'incoming', label: '입고', order: 4 },    // 추가
  { key: 'welding', label: '용접', order: 5 },
  { key: 'plating', label: '도금', order: 6 },
  { key: 'painting', label: '도장', order: 7 },
  { key: 'grc_frp', label: 'GRC/FRP', order: 8 },  // 추가
  { key: 'panel', label: '판넬', order: 9 },
  { key: 'fabrication', label: '제작조립', order: 10 }, // 추가
  { key: 'shipping', label: '출하', order: 11 },
  { key: 'installation', label: '설치', order: 12 },
  { key: 'certification', label: '인증기간', order: 13 },
  { key: 'closing', label: '마감', order: 14 },
  { key: 'completion', label: '준공일', order: 15 }
] as const;
```

#### 4. components/projects/ProcessStages.tsx (144 라인)
```typescript
// 기존
const calculateOverallProgress = () => {
  const completedCount = stages.filter(s => s.status === 'completed').length
  return Math.round((completedCount / 14) * 100)
}

// 신규
const calculateOverallProgress = () => {
  const completedCount = stages.filter(s => s.status === 'completed').length
  return Math.round((completedCount / 15) * 100)
}
```

#### 5. components/logs/LogForm.tsx (10-18 라인)
```typescript
// 기존
const LOG_CATEGORIES: { value: LogCategory; label: string }[] = [
  { value: '사양변경', label: '사양변경' },
  { value: '도면설계', label: '도면설계' },
  { value: '구매발주', label: '구매발주' },
  { value: '생산제작', label: '생산제작' },
  { value: '상하차', label: '상하차' },
  { value: '현장설치시공', label: '현장설치시공' },
  { value: '설치인증', label: '설치인증' }
]

// 신규
const LOG_CATEGORIES: { value: LogCategory; label: string }[] = [
  { value: '사양변경', label: '사양변경' },
  { value: '도면설계', label: '도면설계' },
  { value: '구매발주', label: '구매발주' },
  { value: '생산제작', label: '생산제작' },
  { value: '상하차', label: '상하차' },
  { value: '현장설치시공', label: '현장설치시공' },
  { value: '설치인증', label: '설치인증' },
  { value: '설비', label: '설비' },        // 추가
  { value: '기타', label: '기타' }         // 추가
]
```

#### 6. components/logs/LogFormSimple.tsx (10-18 라인)
```typescript
// LogForm.tsx와 동일한 수정 적용
```

### D. 페이지 레이아웃

#### 7. app/(dashboard)/projects/[id]/page.tsx

**1) PROCESS_STAGES 배열 업데이트 (19-34 라인)**
```typescript
// 기존
const PROCESS_STAGES = [
  { name: 'contract', label: '계약', order: 1 },
  { name: 'design', label: '도면설계', order: 2 },
  { name: 'order', label: '발주', order: 3 },
  { name: 'laser', label: '레이저', order: 4 },
  { name: 'welding', label: '용접', order: 5 },
  { name: 'plating', label: '도금', order: 6 },
  { name: 'painting', label: '도장', order: 7 },
  { name: 'panel', label: '판넬', order: 8 },
  { name: 'assembly', label: '조립', order: 9 },
  { name: 'shipping', label: '출하', order: 10 },
  { name: 'installation', label: '설치', order: 11 },
  { name: 'certification', label: '인증기간', order: 12 },
  { name: 'closing', label: '마감', order: 13 },
  { name: 'completion', label: '준공일', order: 14 }
]

// 신규
const PROCESS_STAGES = [
  { name: 'contract', label: '계약', order: 1 },
  { name: 'design', label: '도면설계', order: 2 },
  { name: 'order', label: '발주', order: 3 },
  { name: 'incoming', label: '입고', order: 4 },
  { name: 'welding', label: '용접', order: 5 },
  { name: 'plating', label: '도금', order: 6 },
  { name: 'painting', label: '도장', order: 7 },
  { name: 'grc_frp', label: 'GRC/FRP', order: 8 },
  { name: 'panel', label: '판넬', order: 9 },
  { name: 'fabrication', label: '제작조립', order: 10 },
  { name: 'shipping', label: '출하', order: 11 },
  { name: 'installation', label: '설치', order: 12 },
  { name: 'certification', label: '인증기간', order: 13 },
  { name: 'closing', label: '마감', order: 14 },
  { name: 'completion', label: '준공일', order: 15 }
]
```

**2) 섹션 위치 교체 (460-546 라인)**
```tsx
// 기존 순서
{/* 히스토리 로그 섹션 (460-490) */}
{/* 공정 단계 관리 섹션 (492-546) */}

// 신규 순서
{/* 공정 단계 관리 섹션 (460-??? 먼저 배치) */}
{/* 히스토리 로그 섹션 (???-??? 나중 배치) */}
```

### E. 문서

#### 8. DATABASE_SCHEMA.md
- projects 테이블 스키마 설명 업데이트 (113-117 라인)
- process_stages 테이블 스키마 설명 업데이트 (165-169 라인)
- 14단계 → 15단계 설명 변경

---

## ⚠️ 주요 위험 요소 및 주의사항

### 1. 데이터베이스 마이그레이션 위험
- **기존 데이터**: `laser` 단계를 사용 중인 프로젝트가 있을 수 있음
- **해결책**: laser → incoming, assembly → fabrication 자동 변환
- **백업**: 마이그레이션 전 데이터베이스 백업 필수

### 2. TypeScript 타입 안전성
- 모든 PROCESS_STAGES 참조가 일치해야 함
- 컴파일 에러 발생 가능성 확인 필요

### 3. 실행 순서 (반드시 준수)
1. ✅ **데이터베이스 마이그레이션 실행** (최우선)
2. ✅ 타입 정의 수정 (types/project.ts)
3. ✅ 컴포넌트 수정 (ProcessStagesForm, ProcessStages, LogForm 등)
4. ✅ 페이지 레이아웃 수정
5. ✅ 문서 업데이트
6. ✅ 빌드 테스트 (`npm run build`)
7. ✅ 서버 재시작

### 4. 롤백 계획
- 데이터베이스 마이그레이션 롤백 스크립트 준비됨 (상단 참고)
- Git 커밋을 단계별로 분리하여 부분 롤백 가능

### 5. 테스트 체크리스트
- [ ] 기존 프로젝트 데이터가 올바르게 변환되었는지 확인
- [ ] 신규 프로젝트 생성 시 15단계가 정상 동작하는지 확인
- [ ] 공정 단계 진행률이 올바르게 계산되는지 확인
- [ ] 히스토리 로그 카테고리에 "설비", "기타"가 표시되는지 확인
- [ ] UI 레이아웃이 올바르게 교체되었는지 확인
- [ ] TypeScript 컴파일 에러가 없는지 확인
- [ ] 빌드가 성공하는지 확인 (`npm run build`)

---

## 🚀 실행 절차

### 단계 1: 데이터베이스 마이그레이션
```bash
# 1. 마이그레이션 파일 생성
npx supabase migration new update_process_stages_to_15

# 2. 마이그레이션 SQL 작성 (위 SQL 참고)

# 3. 마이그레이션 적용
npx supabase db push
```

### 단계 2: 코드 수정
- types/project.ts 수정
- 컴포넌트 파일들 수정
- 페이지 레이아웃 수정

### 단계 3: 빌드 및 테스트
```bash
# TypeScript 컴파일 확인
npm run build

# 개발 서버 재시작
npm run dev
```

### 단계 4: 문서 업데이트 및 커밋
```bash
# 문서 업데이트
# - DATABASE_SCHEMA.md

# Git 커밋
git add .
git commit -m "feat: 공정 단계 14→15단계 업데이트 및 히스토리 로그 카테고리 추가

- 공정 단계 변경: laser 제거, incoming/grc_frp/fabrication 추가
- 히스토리 로그 카테고리: 설비, 기타 추가
- UI 레이아웃: 공정 단계 현황과 히스토리 로그 위치 교체
- 데이터베이스 마이그레이션: 기존 데이터 자동 변환"
```

---

## 📝 추가 고려사항

### LogCategory 타입 정의 확인 필요
- `types/log.ts` 파일에서 LogCategory 타입에 '설비', '기타'가 포함되어 있는지 확인
- 없다면 추가 필요

### 기타 참조 파일 확인
- `components/gantt/GanttChart.tsx` - PROCESS_STAGES 참조 여부 확인
- `lib/services/projects.service.ts` - 공정 단계 관련 로직 확인
- `components/projects/ProcessStageManager.tsx` - 단계 관리 로직 확인

---

**작성일**: 2025-10-02
**작성자**: Claude Code Analysis
