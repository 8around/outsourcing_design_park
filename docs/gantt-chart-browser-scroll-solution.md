# 간트차트 브라우저 전체 스크롤 해결 방안

## 📋 문제 설명
간트차트가 반응형 환경에서 스크롤이 되지 않는 문제를 브라우저의 전체 수평 스크롤을 활용하여 해결

### 발생 환경
- 모든 디바이스 (데스크톱, 태블릿, 모바일)
- 간트차트가 화면 너비를 초과하는 경우
- 현재 컨테이너 레벨 스크롤이 작동하지 않음

## 🔍 문제 분석

### 근본 원인
1. **DashboardLayout.tsx의 제약**
   - 위치: `components/common/layout/DashboardLayout.tsx:151`
   - `.main-layout`에 `overflow-x: hidden` 설정
   - 전체 레이아웃 레벨에서 수평 스크롤을 완전 차단

2. **GanttChart.tsx의 스타일 문제**
   - 위치: `components/gantt/GanttChart.tsx:413-420`
   - styled-jsx 로컬 스코프로 인해 스타일이 제대로 적용되지 않음
   - `.gantt-chart-container`에 `overflow: hidden` 설정

3. **스타일 스코핑 문제**
   - styled-jsx는 기본적으로 로컬 스코프 사용
   - 클래스 스타일이 실제 요소에 적용되지 않음

## 🔧 해결 방안

### 접근 방식: 브라우저 네이티브 스크롤 활용
간트차트를 반응형으로 만들지 않고, 고정 너비를 유지하여 브라우저의 수평 스크롤을 사용

### 옵션 1: 간트 페이지에서만 레이아웃 수정 (권장) ⭐

#### DashboardLayout.tsx 수정
```typescript
// 간트 페이지 경로 체크
const pathname = usePathname()
const isGanttPage = pathname === '/gantt'

// 조건부 스타일 적용
<style jsx>{`
  .main-layout {
    position: relative;
    overflow-x: ${isGanttPage ? 'visible' : 'hidden'};
    display: flex;
    flex-direction: column;
  }
`}</style>
```

#### GanttChart.tsx 수정
```css
/* 전역 스타일로 변경 */
:global(.gantt-chart-container) {
  width: 100%;
  overflow: visible;
}

:global(.gantt-wrapper) {
  min-width: 1200px;  /* 간트차트 최소 너비 고정 */
  width: max-content;
  overflow: visible;
}

/* Ant Design Card body 패딩 제거 */
:global(.gantt-chart-container .ant-card-body) {
  padding: 0;
  overflow: visible;
}
```

### 옵션 2: 전체 레이아웃 수정

#### DashboardLayout.tsx 수정
```css
.main-layout {
  position: relative;
  /* overflow-x: hidden; 완전 제거 */
  display: flex;
  flex-direction: column;
}

.main-content {
  position: relative;
  overflow-x: visible;  /* auto → visible */
  flex: 1;
}
```

#### GanttChart.tsx 수정
```css
:global(.gantt-chart-container) {
  width: 100%;
  overflow: visible;
}

:global(.gantt-wrapper) {
  min-width: 1200px;
  overflow: visible;
}
```

## 📝 구현 순서

### Step 1: 현재 경로 확인 로직 추가
1. DashboardLayout.tsx에서 usePathname 훅 import
2. 간트 페이지 여부 확인 변수 추가
3. 조건부 overflow 스타일 적용

### Step 2: GanttChart.tsx 스타일 수정
1. styled-jsx 스타일을 :global() 래퍼로 감싸기
2. overflow: hidden → visible 변경
3. 간트차트 최소 너비 설정 (1200px 권장)

### Step 3: 테스트
1. **데스크톱 브라우저**
   - 브라우저 창 크기 줄였을 때 수평 스크롤바 생성 확인
   - 마우스 휠 좌우 스크롤 동작 확인

2. **태블릿 (768px)**
   - 브라우저 수평 스크롤 동작 확인
   - 터치 제스처로 좌우 이동 가능 확인

3. **모바일 (480px 이하)**
   - 좌우 스와이프로 간트차트 탐색 가능 확인
   - 전체 차트 내용 접근 가능 확인

## ✅ 예상 결과

### 개선 효과
- ✅ 간트차트가 원래 크기 유지 (가독성 우수)
- ✅ 브라우저 네이티브 스크롤 사용 (안정적)
- ✅ 구현이 단순하고 유지보수 용이
- ✅ 모든 디바이스에서 좌우 스크롤로 전체 차트 확인 가능

### 사용자 경험
- 데스크톱: 화면이 작을 때 브라우저 하단 스크롤바 사용
- 태블릿: 터치로 좌우 스크롤 가능
- 모바일: 스와이프 제스처로 간트차트 탐색
- 일관된 UX: 모든 디바이스에서 동일한 방식으로 작동

## 🚨 주의사항

1. **다른 페이지 영향**
   - 옵션 1 사용 시 간트 페이지만 영향
   - 옵션 2 사용 시 전체 애플리케이션 영향 고려

2. **브라우저 호환성**
   - 모든 최신 브라우저에서 지원
   - IE11에서는 추가 폴리필 필요할 수 있음

3. **성능 고려사항**
   - 매우 큰 간트차트의 경우 가상 스크롤 고려
   - 현재 방식은 중소규모 프로젝트에 적합

## 🛠️ 대안 솔루션

### 컨테이너 레벨 스크롤 (기존 접근)
반응형 스크롤을 원한다면:
1. DashboardLayout의 overflow-x: hidden 유지
2. GanttChart 컨테이너에 overflow-x: auto 적용
3. :global() 래퍼로 스타일 스코핑 문제 해결

### 가상 스크롤 구현
대규모 데이터셋의 경우:
1. react-window 또는 react-virtualized 라이브러리 사용
2. 뷰포트에 보이는 부분만 렌더링
3. 성능 최적화 효과

## 📚 참고 자료
- [MDN: overflow](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow)
- [styled-jsx Documentation](https://github.com/vercel/styled-jsx)
- [Ant Design Layout](https://ant.design/components/layout)