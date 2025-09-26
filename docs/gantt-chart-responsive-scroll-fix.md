# 간트 차트 반응형 스크롤 문제 해결 가이드

## 📋 문제 설명
간트 차트가 반응형 환경(특히 모바일)에서 좌우 스크롤이 되지 않는 문제

### 발생 환경
- 모바일 디바이스 (스마트폰, 태블릿)
- 화면 너비가 768px 이하인 경우
- 간트 차트 콘텐츠가 화면 너비를 초과하는 경우

## 🔍 문제 분석

### 근본 원인
1. **`.gantt-chart-container`에 `overflow: hidden` 설정**
   - 위치: `components/gantt/GanttChart.tsx:415`
   - 컨테이너가 스크롤을 완전히 차단하고 있음

2. **`.gantt-wrapper`의 `overflow-x: auto`가 작동하지 않음**
   - 부모 컨테이너의 `overflow: hidden` 때문에 효과 없음

3. **DashboardLayout의 `.main-layout`에 `overflow-x: hidden`**
   - 위치: `components/common/layout/DashboardLayout.tsx:151`
   - 전체 레이아웃 레벨에서도 수평 스크롤 차단

4. **반응형 처리 부재**
   - 모바일 특화 스타일 없음
   - 터치 스크롤 지원 미비

## 🔧 해결 방안

### 1. GanttChart.tsx 스타일 수정

#### 현재 코드 (문제)
```css
.gantt-chart-container {
  width: 100%;
  overflow: hidden; /* 스크롤 차단 */
}

.gantt-wrapper {
  width: 100%;
  overflow-x: auto;
}
```

#### 수정 후 코드
```css
.gantt-chart-container {
  width: 100%;
  overflow-x: auto;  /* 수평 스크롤 허용 */
  overflow-y: hidden; /* 수직 스크롤 방지 */
  -webkit-overflow-scrolling: touch; /* iOS 관성 스크롤 */
  scroll-behavior: smooth; /* 부드러운 스크롤 */
}

.gantt-wrapper {
  min-width: 100%;
  width: max-content; /* 콘텐츠 너비에 맞춤 */
  overflow-x: visible; /* 부모에게 스크롤 위임 */
}
```

### 2. 반응형 미디어 쿼리 추가

```css
/* 태블릿 (768px 이하) */
@media (max-width: 768px) {
  .gantt-chart-container {
    overflow-x: scroll; /* 스크롤 항상 표시 */
    -webkit-overflow-scrolling: touch; /* iOS 부드러운 스크롤 */
  }

  .gantt-wrapper {
    min-width: 1000px; /* 최소 너비 보장 */
  }
}

/* 모바일 (480px 이하) */
@media (max-width: 480px) {
  .gantt-chart-container {
    padding: 0; /* 모바일에서 패딩 제거 */
  }

  .gantt-wrapper {
    min-width: 800px; /* 모바일용 최소 너비 */
  }
}
```

### 3. 모바일 터치 스크롤 개선

```css
/* 터치 디바이스 최적화 */
.gantt-chart-container {
  -webkit-overflow-scrolling: touch; /* iOS 관성 스크롤 */
  scroll-behavior: smooth; /* 부드러운 스크롤 애니메이션 */
  overscroll-behavior-x: contain; /* 스크롤 체이닝 방지 */
}

/* 스크롤바 스타일링 (모바일) */
@media (max-width: 768px) {
  .gantt-chart-container::-webkit-scrollbar {
    height: 4px; /* 작은 스크롤바 */
  }

  .gantt-chart-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .gantt-chart-container::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }
}
```

### 4. 스크롤 인디케이터 추가 (선택사항)

```jsx
// 스크롤 가능 여부를 시각적으로 표시
const [canScrollLeft, setCanScrollLeft] = useState(false);
const [canScrollRight, setCanScrollRight] = useState(false);

const checkScroll = (e) => {
  const element = e.target;
  setCanScrollLeft(element.scrollLeft > 0);
  setCanScrollRight(
    element.scrollLeft < element.scrollWidth - element.clientWidth
  );
};

// JSX
<div className="gantt-container-wrapper">
  {canScrollLeft && <div className="scroll-indicator left">‹</div>}
  {canScrollRight && <div className="scroll-indicator right">›</div>}
  <div
    className="gantt-chart-container"
    onScroll={checkScroll}
  >
    {/* 간트 차트 콘텐츠 */}
  </div>
</div>
```

## 📝 구현 순서

### Step 1: GanttChart.tsx 수정
1. 412-425 라인의 스타일 섹션 찾기
2. `.gantt-chart-container`의 `overflow: hidden`을 `overflow-x: auto`로 변경
3. `.gantt-wrapper`의 스타일 조정

### Step 2: 반응형 스타일 추가
1. 미디어 쿼리 섹션 추가
2. 768px 이하 태블릿 스타일 정의
3. 480px 이하 모바일 스타일 정의

### Step 3: 터치 스크롤 지원
1. `-webkit-overflow-scrolling: touch` 추가
2. `scroll-behavior: smooth` 추가
3. 모바일용 스크롤바 커스터마이징

### Step 4: 테스트
1. **데스크톱 브라우저**
   - 마우스 휠 스크롤 동작 확인
   - 스크롤바 드래그 동작 확인

2. **태블릿 (768px)**
   - 터치 스크롤 동작 확인
   - 스크롤 관성 확인

3. **모바일 (480px 이하)**
   - 터치 스크롤 동작 확인
   - 스크롤 부드러움 확인
   - 스크롤바 표시 확인

## ✅ 예상 결과

### 개선 효과
- ✅ 모든 디바이스에서 간트 차트 좌우 스크롤 가능
- ✅ iOS/Android에서 부드러운 터치 스크롤 경험
- ✅ 반응형 환경에서도 전체 차트 내용 접근 가능
- ✅ 스크롤바를 통한 현재 위치 파악 가능

### 사용자 경험 개선
- 모바일에서 간트 차트 전체 내용 확인 가능
- 자연스러운 터치 제스처 지원
- 관성 스크롤로 빠른 탐색 가능
- 시각적 스크롤 인디케이터로 스크롤 가능 여부 인지

## 🚨 주의사항

1. **브라우저 호환성**
   - `-webkit-overflow-scrolling`은 iOS Safari 전용
   - 다른 브라우저는 자동으로 무시됨

2. **성능 고려사항**
   - 대량의 데이터가 있을 경우 가상 스크롤 고려
   - 불필요한 리렌더링 방지

3. **접근성**
   - 키보드 내비게이션 지원 확인
   - 스크린 리더 호환성 테스트

## 📚 참고 자료
- [MDN: overflow-x](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-x)
- [MDN: -webkit-overflow-scrolling](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-overflow-scrolling)
- [CSS Tricks: Momentum Scrolling on iOS](https://css-tricks.com/snippets/css/momentum-scrolling-on-ios-overflow-elements/)