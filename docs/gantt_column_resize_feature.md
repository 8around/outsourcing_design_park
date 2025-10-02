# 간트차트 컬럼 너비 조절 기능 구현 계획

## 📋 개요
간트차트 페이지의 "프로젝트/공정 단계", "진행률", "상태" 컬럼 너비를 마우스 드래그로 조절 가능하게 구현합니다.

## 🎯 구현 방식
- **React 상태 기반 커스텀 리사이저**
- 추가 라이브러리 없이 순수 React로 구현
- 세션 내에서만 너비 유지 (localStorage 저장 제외)

## 📝 수정 파일

### 1. **GanttChart.tsx**
- 컬럼 너비 상태 관리 추가
  ```typescript
  const [columnWidths, setColumnWidths] = useState({
    project: 350,
    progress: 100,
    status: 100
  })
  ```
- CustomTaskListHeader, CustomTaskListTable에 props 전달
- 동적 listCellWidth 계산 적용
- 컬럼 너비 리셋 버튼 추가 (모두 접기/펼치기 버튼 옆)

### 2. **CustomTaskList.tsx**
- Props 인터페이스 확장 (columnWidths, onColumnResize)
- CustomTaskListHeader에 리사이저 핸들 추가
  - 각 컬럼 헤더 오른쪽에 드래그 가능한 리사이저
  - 호버 시 시각적 피드백 (파란색 하이라이트)
- CustomTaskListTable에 동적 너비 적용
- 리사이저 이벤트 핸들러 구현
  - mousedown: 리사이징 시작
  - mousemove: 실시간 너비 업데이트
  - mouseup: 리사이징 종료
- 더블클릭으로 개별 컬럼 기본 너비 복원

## 🎨 주요 기능

### 컬럼 너비 제한
- **프로젝트/공정 단계**: 200px ~ 600px
- **진행률**: 80px ~ 200px
- **상태**: 80px ~ 200px

### 사용자 인터랙션
1. **드래그 리사이징**: 컬럼 경계를 드래그하여 너비 조절
2. **더블클릭 리셋**: 리사이저를 더블클릭하여 해당 컬럼 기본 너비 복원
3. **전체 리셋 버튼**: 모든 컬럼을 기본 너비로 복원

### 시각적 피드백
- 리사이저 호버 시 파란색 표시
- 리사이징 중 커서 변경 (col-resize)
- 리사이징 중 텍스트 선택 방지

## 🔧 기술 구현 세부사항

### 리사이저 컴포넌트
```tsx
<div
  className="column-resizer"
  onMouseDown={handleResizerMouseDown}
  onDoubleClick={handleResizerDoubleClick}
  aria-label="컬럼 너비 조절"
/>
```

### 이벤트 핸들러 로직
```typescript
const handleResizerMouseDown = (columnKey: string) => (e: React.MouseEvent) => {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = columnWidths[columnKey]

  const handleMouseMove = (e: MouseEvent) => {
    const diff = e.clientX - startX
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + diff))
    setColumnWidths(prev => ({ ...prev, [columnKey]: newWidth }))
  }

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}
```

### CSS 스타일
```css
.column-resizer {
  position: absolute;
  right: 0;
  top: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  transition: background 0.2s;
  z-index: 10;
}

.column-resizer:hover {
  background: #1890ff;
}

.column-resizer:active {
  background: #096dd9;
}

.column-header-cell {
  position: relative;
}
```

## ✅ 완료 기준
- [x] 각 컬럼 경계에서 마우스 드래그로 너비 조절 가능
- [x] 최소/최대 너비 제한 적용
- [x] 더블클릭으로 개별 컬럼 리셋
- [x] 리셋 버튼으로 전체 컬럼 너비 복원
- [x] 부드러운 시각적 피드백
- [x] npm run build 성공 확인

## 📌 참고사항
- localStorage 저장 제외 (페이지 새로고침 시 기본값으로 초기화)
- 기존 간트차트 기능 유지
- 반응형 디자인 고려
- 컬럼 너비 변경 시 gantt-task-react의 listCellWidth도 동적으로 업데이트

## 🔄 구현 순서
1. GanttChart.tsx에 상태 및 핸들러 추가
2. CustomTaskList.tsx Props 인터페이스 확장
3. CustomTaskListHeader에 리사이저 UI 추가
4. 이벤트 핸들러 구현 및 테스트
5. CSS 스타일 적용
6. 리셋 버튼 추가
7. 빌드 테스트 및 QA
