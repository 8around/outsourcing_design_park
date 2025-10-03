# 대시보드 전체 활동 로그 카테고리 누락 문제 수정 계획

## 📋 문제 분석 결과

대시보드 전체 활동 로그에서 **'설비'와 '기타'** 카테고리가 표시되지 않는 문제를 발견했습니다.

### ✅ 정상 작동 중인 파일들
- **DATABASE_SCHEMA.md**: '설비', '기타' 포함
- **types/log.ts**: LogCategory 타입에 '설비', '기타' 포함
- **LogForm.tsx**: 카테고리 목록에 '설비', '기타' 포함
- **LogFormSimple.tsx**: 카테고리 목록에 '설비', '기타' 포함

### ❌ 수정 필요한 파일들

**1. GlobalLogFeed.tsx** (3곳 수정)
- 29번 줄: DBCategory 타입에 '설비', '기타' 누락
- 59-70번 줄: categoryConfig에 '설비' 색상 설정 누락 ('기타'는 있음)
- 473-488번 줄: 카테고리 필터 Select에 '설비', '기타' 옵션 누락

**2. LogList.tsx** (2곳 수정)
- 147-160번 줄: getCategoryColor 함수에 '설비', '기타' 색상 정의 누락
- 193-206번 줄: 카테고리 필터 select에 '설비', '기타' 옵션 누락

## 🔧 수정 계획

### 1. GlobalLogFeed.tsx 수정

**1-1) DBCategory 타입 수정 (29번 줄)**
```typescript
// 변경 전
type DBCategory = '사양변경' | '도면설계' | '구매발주' | '생산제작' | '상하차' | '현장설치시공' | '설치인증' | '승인요청' | '승인처리'

// 변경 후
type DBCategory = '사양변경' | '도면설계' | '구매발주' | '생산제작' | '상하차' | '현장설치시공' | '설치인증' | '설비' | '기타' | '승인요청' | '승인처리'
```

**1-2) categoryConfig에 '설비' 추가 (59-70번 줄)**
```typescript
const categoryConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  // ... 기존 카테고리들 ...
  '설비': { color: 'volcano', icon: <ClockCircleOutlined />, label: '설비' },  // 추가
  '기타': { color: 'default', icon: <EditOutlined />, label: '기타' },  // 이미 존재
}
```

**1-3) 카테고리 필터 Select 옵션 추가 (473-488번 줄 이후)**
```tsx
<Select.Option value="설치인증">설치인증</Select.Option>
<Select.Option value="설비">설비</Select.Option>  {/* 추가 */}
<Select.Option value="기타">기타</Select.Option>  {/* 추가 */}
```

### 2. LogList.tsx 수정

**2-1) getCategoryColor 함수에 색상 추가 (147-160번 줄)**
```typescript
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    // ... 기존 색상들 ...
    '승인처리': 'bg-teal-100 text-teal-800',
    '설비': 'bg-amber-100 text-amber-800',  // 추가
    '기타': 'bg-gray-100 text-gray-800'      // 추가
  }
  return colors[category] || 'bg-gray-100 text-gray-800'
}
```

**2-2) 카테고리 필터 select 옵션 추가 (193-206번 줄 이후)**
```tsx
<option value="설치인증">설치인증</option>
<option value="설비">설비</option>  {/* 추가 */}
<option value="기타">기타</option>  {/* 추가 */}
```

## ✅ 예상 결과

- 대시보드 전체 활동 로그에서 '설비'와 '기타' 카테고리가 정상 표시됨
- 카테고리 필터에서 '설비'와 '기타' 선택 가능
- 로그 목록에서 '설비'와 '기타' 카테고리에 적절한 색상 배지 표시
- 프로젝트 상세 페이지 로그 목록에서도 동일하게 정상 작동

## 📝 참고사항

- 데이터베이스 스키마 변경 없음 (이미 '설비', '기타' 카테고리 지원)
- 백엔드 로직 변경 없음 (logs.service.ts는 정상 작동 중)
- 프론트엔드 표시 로직만 수정하여 일관성 확보

## 📂 수정 대상 파일

1. `components/logs/GlobalLogFeed.tsx`
2. `components/logs/LogList.tsx`

---

**작성일**: 2025-01-XX
**분석 도구**: Sequential Thinking MCP
**상태**: 수정 대기 중
