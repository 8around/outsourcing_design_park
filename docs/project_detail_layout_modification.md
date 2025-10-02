# 프로젝트 상세 페이지 레이아웃 수정 계획

## 📋 요구사항 분석
1. **섹션별 상하 여백 축소** - 레이아웃 간격 최적화
2. **일정 정보 섹션 하단에 비고 섹션 추가**
   - textarea 형태로 구현
   - 프로젝트 수정 권한이 있는 사용자만 작성/수정 가능
3. **공정 단계 현황과 히스토리 로그 위치 교체**

## 🔍 현재 구조 분석

### 파일 위치
- `app/(dashboard)/projects/[id]/page.tsx` (324~606라인)

### 현재 섹션 순서
1. 기본 정보 섹션 (326~384라인)
2. 담당자 정보 섹션 (387~409라인)
3. 일정 정보 섹션 (412~443라인)
4. 공정 단계 현황 (446~499라인)
5. 이미지 갤러리 (502~573라인)
6. 히스토리 로그 (576~605라인)

## 🎯 구현 계획

### 1. 데이터베이스 변경
**⚠️ 중요: 개발자 승인 필요**

#### `projects` 테이블에 `notes` 컬럼 추가
```sql
ALTER TABLE projects
ADD COLUMN notes TEXT;
```

#### `DATABASE_SCHEMA.md` 업데이트
- `projects` 테이블 스키마에 `notes` 컬럼 추가
- 컬럼 설명: 비고 사항, 프로젝트 관련 메모 및 특이사항 기록용 (NULL 허용)

#### TypeScript 타입 정의 업데이트
- `types/database.ts`의 `projects` 테이블 타입에 `notes?: string` 추가
- `app/(dashboard)/projects/[id]/page.tsx`의 `ProjectData` 인터페이스에 `notes?: string` 추가

### 2. UI 레이아웃 수정

#### 2.1 섹션별 상하 여백 축소
- `space-y-8` → `space-y-4` 변경 (324라인)
- 각 섹션의 `p-6` 유지 (내부 패딩은 그대로)

#### 2.2 비고 섹션 추가 (일정 정보 섹션 하단)
**위치**: 일정 정보 섹션(412~443라인) 직후, 공정 단계 현황 이전

**구현 내용**:
- 새로운 섹션 카드 생성 (기존 섹션과 동일한 스타일)
- 제목: "비고"
- textarea 컴포넌트 (최소 높이 100px, 최대 높이 300px, resize 가능)
- placeholder: "프로젝트 관련 비고사항을 입력하세요"
- 자동 저장 기능 (debounce 적용, 1초 후 자동 저장)
- 저장 상태 표시 ("저장 중...", "저장 완료")
- 권한 제어: `canEdit` 변수 활용 (읽기 전용 / 편집 가능 모드)

#### 2.3 섹션 순서 변경
**변경 전**:
1. 기본 정보
2. 담당자 정보
3. 일정 정보
4. 공정 단계 현황 ←
5. 이미지 갤러리
6. 히스토리 로그 ←

**변경 후**:
1. 기본 정보
2. 담당자 정보
3. 일정 정보
4. **비고** ← 신규 추가
5. **히스토리 로그** ← 위로 이동
6. 이미지 갤러리
7. **공정 단계 현황** ← 아래로 이동

### 3. 비고 섹션 기능 구현

#### 3.1 상태 관리
```typescript
const [notes, setNotes] = useState<string>('')
const [notesLoading, setNotesLoading] = useState(false)
const [notesSaveStatus, setNotesSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null)
```

#### 3.2 자동 저장 로직
- `useEffect` + `setTimeout`을 활용한 debounce 구현
- 1초 대기 후 Supabase `UPDATE` 요청
- 저장 성공 시 토스트 알림 없이 상태 표시만 변경
- 저장 실패 시 에러 토스트 표시

#### 3.3 권한 처리
- `canEdit` 변수 활용 (이미 존재)
- `canEdit = true`: textarea 활성화, 편집 가능
- `canEdit = false`: textarea 비활성화 (readonly), 회색 배경

### 4. 서비스 레이어 수정

#### `lib/services/projects.service.ts`
- `updateProjectNotes` 메서드 추가 (또는 기존 `updateProject`에 통합)

```typescript
async updateProjectNotes(projectId: string, notes: string) {
  const { data, error } = await supabase
    .from('projects')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single()

  if (error) throw error
  return data
}
```

## 📝 작업 순서

### Phase 1: 데이터베이스 준비
1. ✅ 개발자에게 DB 컬럼 추가 승인 요청
2. ⏳ Supabase에서 `projects` 테이블에 `notes` 컬럼 추가
3. ⏳ `DATABASE_SCHEMA.md` 문서 업데이트
4. ⏳ TypeScript 타입 정의 업데이트

### Phase 2: UI 구현
1. ⏳ 섹션별 여백 축소 (`space-y-8` → `space-y-4`)
2. ⏳ 비고 섹션 컴포넌트 구현 (일정 정보 섹션 하단)
3. ⏳ 섹션 순서 변경 (히스토리 로그 ↔ 공정 단계 현황)

### Phase 3: 기능 구현
1. ⏳ 비고 저장 로직 구현 (자동 저장 + debounce)
2. ⏳ 저장 상태 표시 UI 추가
3. ⏳ 권한 제어 로직 적용

### Phase 4: 테스트 및 배포
1. ⏳ 로컬 환경 테스트
2. ⏳ `npm run build` 실행 및 에러 확인
3. ⏳ 서버 재시작 및 최종 검증

## ⚠️ 주의사항

1. **DB 컬럼 추가는 개발자 승인 필수**
2. **DATABASE_SCHEMA.md 동기화 필수**
3. **기존 프로젝트 데이터에는 `notes`가 NULL이므로 기본값 처리 필요**
4. **자동 저장 시 네트워크 에러 핸들링 필수**
5. **Textarea 높이 제한으로 과도한 입력 방지**

## 🎨 예상 UI 구조

```
[일정 정보 섹션]
  - 발주일
  - 준공 예정일
  - 설치 요청일

[비고 섹션] ← 신규
  - textarea (편집 가능/읽기 전용)
  - 저장 상태 표시

[히스토리 로그 섹션] ← 위로 이동
  - 로그 작성 버튼
  - 로그 목록

[이미지 갤러리 섹션]
  - 메인 이미지 뷰어
  - 썸네일 그리드

[공정 단계 현황 섹션] ← 아래로 이동
  - 현재 진행 단계
  - 단계별 상태 목록
```

## 📦 관련 파일 목록

### 수정 필요 파일
1. `DATABASE_SCHEMA.md` - 스키마 문서 업데이트
2. `types/database.ts` - DB 타입 정의 업데이트
3. `app/(dashboard)/projects/[id]/page.tsx` - 메인 UI 수정
4. `lib/services/projects.service.ts` - 서비스 로직 추가 (필요 시)

### 마이그레이션
- Supabase Dashboard에서 직접 실행 또는
- `supabase/migrations/` 폴더에 마이그레이션 파일 생성

## 🔄 롤백 계획

만약 문제 발생 시:
1. Git을 통한 코드 롤백
2. DB 컬럼은 유지 (NULL 허용이므로 기존 기능에 영향 없음)
3. 향후 필요 시 컬럼 제거 마이그레이션 별도 작성

---

**작성일**: 2025-10-02
**작성자**: Claude AI
**관련 이슈**: 프로젝트 상세 페이지 UX 개선
