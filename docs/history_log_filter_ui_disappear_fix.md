# 히스토리 로그 필터링 시 필터 UI 사라짐 문제 수정

## 📋 문제 개요

**증상**: 프로젝트 상세 페이지에서 히스토리 로그를 카테고리별로 필터링했을 때, 해당 카테고리에 로그가 없는 경우 필터 UI까지 사라지는 문제

**발생 위치**: `components/logs/LogList.tsx`

**영향도**: 사용자 경험 저하 - 필터를 변경하거나 초기화할 수 없음

## 🔍 근본 원인 분석

### 문제가 발생하는 코드 (LogList.tsx:178-187)

```typescript
if (logs.length === 0 && totalCount === 0) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4">히스토리 로그</h2>
      <div className="text-center py-8 text-gray-500">
        아직 로그가 없습니다.
      </div>
    </div>
  )
}
```

### 문제점

이 early return 로직은 다음 두 가지 경우를 구분하지 못합니다:

1. **전체 로그가 없는 경우** (정상 케이스)
   - 프로젝트에 아직 로그가 하나도 없음
   - 간단한 메시지만 표시하는 것이 적절함

2. **필터링 결과가 없는 경우** (문제 케이스)
   - 로그는 있지만 선택한 카테고리에 해당하는 로그가 없음
   - 필터 UI는 유지되어야 하고, 사용자가 다른 카테고리를 선택하거나 초기화할 수 있어야 함

### 현재 동작 흐름

```
사용자가 카테고리 필터 선택
    ↓
fetchLogs() 실행 (filterCategory 파라미터 포함)
    ↓
결과: logs.length === 0, totalCount === 0
    ↓
178줄 조건 충족 → early return
    ↓
필터 UI를 포함한 정상 렌더링 블록(189-478줄)에 도달하지 못함
    ↓
결과: 필터 UI 사라짐 ❌
```

## 🔧 수정 방안

### 1단계: Early Return 조건 수정

**파일**: `components/logs/LogList.tsx`
**위치**: 178줄

**수정 전**:
```typescript
if (logs.length === 0 && totalCount === 0) {
```

**수정 후**:
```typescript
if (logs.length === 0 && totalCount === 0 && !filterCategory) {
```

**설명**: 필터가 활성화되지 않은 경우에만 early return을 실행하도록 조건 추가

### 2단계: 필터링 결과 없음 메시지 추가

**파일**: `components/logs/LogList.tsx`
**위치**: 237줄 (로그 목록 렌더링 부분)

**수정 전**:
```typescript
<div className="space-y-4">
  {logs.map((log) => {
    const isExpanded = expandedLogs.has(log.id)
    const isApprovalLog = log.log_type === 'approval_request' || log.log_type === 'approval_response'

    return (
      <div key={log.id} className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
        {/* 로그 아이템 렌더링 */}
      </div>
    )
  })}
</div>
```

**수정 후**:
```typescript
<div className="space-y-4">
  {logs.length === 0 ? (
    <div className="text-center py-8 text-gray-500">
      선택한 카테고리 ({filterCategory})에 해당하는 로그가 없습니다.
    </div>
  ) : (
    logs.map((log) => {
      const isExpanded = expandedLogs.has(log.id)
      const isApprovalLog = log.log_type === 'approval_request' || log.log_type === 'approval_response'

      return (
        <div key={log.id} className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
          {/* 로그 아이템 렌더링 */}
        </div>
      )
    })
  )}
</div>
```

**설명**: 필터링 결과가 없을 때 명확한 안내 메시지를 표시하되, 필터 UI는 그대로 유지

## ✅ 수정 후 기대 효과

### 케이스별 동작

| 상황 | 수정 전 | 수정 후 |
|------|---------|---------|
| 전체 로그 없음 (필터 없음) | ✅ "아직 로그가 없습니다" 메시지 | ✅ "아직 로그가 없습니다" 메시지 (동일) |
| 필터링 결과 없음 (필터 있음) | ❌ 필터 UI 사라짐 | ✅ 필터 UI 유지 + "선택한 카테고리에 해당하는 로그가 없습니다" 메시지 |
| 필터링 결과 있음 | ✅ 정상 렌더링 | ✅ 정상 렌더링 (동일) |

### UI/UX 개선 사항

1. **일관성 유지**: 필터 UI가 항상 표시되어 사용자가 혼란을 겪지 않음
2. **명확한 피드백**: 왜 로그가 보이지 않는지 구체적으로 안내
3. **작업 연속성**: 사용자가 다른 카테고리를 선택하거나 필터를 초기화할 수 있음

## 🧪 테스트 시나리오

### 1. 전체 로그 없음 테스트
**조건**: 로그가 하나도 없는 새 프로젝트
**기대 결과**: "아직 로그가 없습니다" 메시지만 표시 (필터 UI 없음)

### 2. 필터링 결과 없음 테스트
**조건**:
- 로그는 있지만 "사양변경" 카테고리만 있음
- "도면설계" 카테고리 필터 선택

**기대 결과**:
- 필터 선택 UI 유지
- "선택한 카테고리 (도면설계)에 해당하는 로그가 없습니다" 메시지 표시
- 초기화 버튼으로 필터 해제 가능

### 3. 필터링 결과 있음 테스트
**조건**: "사양변경" 카테고리 필터 선택, 해당 로그 있음
**기대 결과**: 필터링된 로그 목록 정상 표시

### 4. 필터 초기화 테스트
**조건**: 필터링 결과 없음 상태에서 "초기화" 버튼 클릭
**기대 결과**: 전체 로그 목록으로 복귀

## 📝 수정 체크리스트

- [ ] `components/logs/LogList.tsx` 178줄 조건 수정
- [ ] `components/logs/LogList.tsx` 237줄 빈 결과 메시지 추가
- [ ] 테스트 시나리오 1: 전체 로그 없음 확인
- [ ] 테스트 시나리오 2: 필터링 결과 없음 확인
- [ ] 테스트 시나리오 3: 필터링 결과 있음 확인
- [ ] 테스트 시나리오 4: 필터 초기화 확인
- [ ] 브라우저 개발자 도구 콘솔 에러 없음 확인
- [ ] 반응형 디자인 정상 작동 확인

## 📚 관련 파일

- `components/logs/LogList.tsx` - 로그 목록 컴포넌트 (수정 대상)
- `app/(dashboard)/projects/[id]/page.tsx` - 프로젝트 상세 페이지 (LogList 사용)
- `lib/services/logs.service.ts` - 로그 서비스 (참고)

## 🔗 관련 이슈

- 필터링 기능: `docs/log_category_filter_feature.md`
- 로그 로딩 개선: `docs/log_loading_spec.md`
- 카테고리 제약조건 수정: `docs/history_log_category_constraint_fix.md`
