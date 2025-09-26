# 리포트 페이지 테이블 스크롤 문제 해결

## 문제
- **위치**: `/admin/reports` 페이지의 "발송 내역" 탭
- **증상**: 반응형 모드에서 테이블의 오른쪽 컬럼이 보이지 않고 좌우 스크롤이 되지 않음

## 원인
`components/reports/ReportHistoryList.tsx`의 218번 줄에서 테이블 래퍼 div에 `overflow-hidden` 클래스가 적용되어 있어 넘치는 콘텐츠가 숨겨짐

## 해결 방법

### 파일 수정
**파일**: `components/reports/ReportHistoryList.tsx`

**218번 줄 수정**:
```tsx
// 기존
<div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">

// 변경
<div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
```