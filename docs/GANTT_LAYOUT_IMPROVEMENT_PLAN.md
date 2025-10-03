# 간트차트 페이지 레이아웃 개선 계획

## 📋 개요

간트차트 페이지의 `content-wrapper` 영역을 확대하여 더 많은 프로젝트와 공정 단계를 한 화면에 표시할 수 있도록 개선합니다.

**작성일**: 2025-10-03
**문서 버전**: 1.0
**관련 이슈**: 간트차트 가시 영역 확대 요청

---

## 🔍 현재 상황 분석

### 1. 레이아웃 구조

```
DashboardLayout
└── Layout (main-layout)
    └── Content (main-content)
        └── div (content-wrapper) ← 개선 대상
            └── GanttPage
                └── div (container mx-auto px-6 py-8)
                    └── GanttChart
                        └── Card
                            └── Gantt 컴포넌트
```

### 2. 현재 크기 제한 요인

#### DashboardLayout.tsx (98-112번 줄)
```tsx
<div
  className="content-wrapper"
  style={{
    background: 'var(--background-primary)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-color)',
    minHeight: 'calc(100vh - 144px)', // 헤더 + 패딩 고려
    padding: '24px',  // ← 이 패딩이 영역을 제한
    position: 'relative',
    zIndex: 1,
  }}
>
  {children}
</div>
```

**제한 요소**:
- `padding: 24px` (좌우 각 24px = 총 48px 손실)
- `minHeight: calc(100vh - 144px)` (상하 여백)

#### GanttPage (app/(dashboard)/gantt/page.tsx, 91번 줄)
```tsx
<div className="gantt-page container mx-auto px-6 py-8">
```

**제한 요소**:
- `px-6` (좌우 각 24px = 총 48px 추가 손실)
- `py-8` (상하 각 32px = 총 64px 추가 손실)
- 헤더 영역 `mb-6` (24px)
- 제어 패널 영역 `mb-6` (24px)

#### GanttChart.tsx (367번 줄)
```tsx
<Card className="gantt-chart-container">
```

**제한 요소**:
- Ant Design Card의 기본 패딩
- Card body의 여백

### 3. 문제점 요약

| 영역 | 손실 공간 | 비고 |
|------|----------|------|
| content-wrapper 패딩 | 좌우 48px | DashboardLayout |
| GanttPage 컨테이너 패딩 | 좌우 48px | Tailwind px-6 |
| GanttPage 컨테이너 패딩 | 상하 64px | Tailwind py-8 |
| 헤더 하단 여백 | 24px | mb-6 |
| 제어 패널 하단 여백 | 24px | mb-6 |
| **총 손실** | **좌우 96px, 상하 112px** | |

---

## 🎯 개선 방안

### 1. DashboardLayout.tsx 수정

**방법**: 현재 경로를 확인하여 간트차트 페이지(`/gantt`)일 때만 특별한 스타일 적용

```tsx
'use client'

import { useState, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'  // 추가
import { Layout, FloatButton } from 'antd'
// ... 기타 import

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()  // 추가
  const isGanttPage = pathname === '/gantt'  // 간트차트 페이지 확인

  // ... 기존 코드

  return (
    <ThemeProvider>
      <Layout className="dashboard-layout min-h-screen">
        {/* ... Sidebar, Header */}

        <Content
          className="main-content"
          style={{
            marginTop: '72px',
            padding: '24px',
            paddingBottom: '24px',
            minHeight: 'calc(100vh - 72px)',
            background: 'var(--background-secondary)',
            position: 'relative',
            zIndex: 1,
          }}
          onClick={handleContentClick}
        >
          {/* 콘텐츠 래퍼 - 간트차트 페이지일 때 패딩 최소화 */}
          <div
            className="content-wrapper"
            style={{
              background: 'var(--background-primary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border-color)',
              minHeight: 'calc(100vh - 144px)',
              padding: isGanttPage ? '12px' : '24px',  // ✨ 조건부 패딩
              position: 'relative',
              zIndex: 1,
            }}
          >
            {children}
          </div>
        </Content>

        {/* ... FloatButton */}
      </Layout>
    </ThemeProvider>
  )
}
```

**변경 내용**:
- `usePathname` 훅 추가
- 간트차트 페이지일 때 `padding: 12px` 적용 (24px에서 절반으로 감소)
- **효과**: 좌우 각 12px 절약 = 총 24px 추가 확보

### 2. GanttPage (gantt/page.tsx) 수정

**컨테이너 패딩 최소화**:

```tsx
export default function GanttPage() {
  // ... 기존 코드

  return (
    <div className="gantt-page container mx-auto px-3 py-4">  {/* px-6 py-8 → px-3 py-4 */}
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">  {/* mb-6 → mb-4 */}
        {/* ... */}
      </div>

      {/* 제어 패널 */}
      <div className="mb-4">  {/* mb-6 → mb-4 */}
        {/* ... */}
      </div>

      {/* 간트차트 컴포넌트 */}
      <GanttChart {...props} />

      {/* ... */}
    </div>
  )
}
```

**변경 내용**:
- `px-6` → `px-3` (좌우 각 12px 절약 = 총 24px)
- `py-8` → `py-4` (상하 각 16px 절약 = 총 32px)
- `mb-6` → `mb-4` (헤더, 제어 패널 하단 여백 각 8px 절약 = 총 16px)
- **효과**: 좌우 24px, 상하 48px 추가 확보

### 3. GanttChart.tsx 스타일 최적화

**Card 컴포넌트 여백 최소화**:

```tsx
export function GanttChart({ ... }: GanttChartProps) {
  // ... 기존 코드

  return (
    <div>
      <Card
        className="gantt-chart-container"
        bodyStyle={{ padding: '0' }}  // Card body 패딩 제거
      >
        {/* 전체 펼치기/접기 버튼 */}
        <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: '8px' }}>
          {/* 기존 버튼들 */}
        </div>

        <div className="gantt-wrapper">
          <Gantt {...props} />
        </div>
      </Card>

      {/* 페이지네이션 */}
      <div style={{ marginTop: '16px', padding: '0 12px' }}>  {/* padding 조정 */}
        {/* ... */}
      </div>

      <style jsx>{`
        .gantt-chart-container {
          width: 100%;
          overflow: hidden;
        }

        .gantt-wrapper {
          width: 100%;
          overflow-x: auto;
          min-height: calc(100vh - 360px);  /* 최소 높이 증가 */
        }

        :global(.gantt-chart-container .ant-card-body) {
          padding: 0 !important;  /* 강제 패딩 제거 */
        }

        /* 기타 스타일 */
      `}</style>
    </div>
  )
}
```

**변경 내용**:
- Card `bodyStyle={{ padding: '0' }}` 추가
- `gantt-wrapper` 최소 높이 증가
- 페이지네이션 여백 조정 (24px → 12px)
- **효과**: 상하 여백 약 20px 추가 확보

---

## 📊 예상 효과

### 공간 확보 요약

| 개선 항목 | 좌우 확보 | 상하 확보 |
|-----------|----------|----------|
| content-wrapper 패딩 감소 | 24px | 24px |
| GanttPage 컨테이너 패딩 감소 | 24px | 32px |
| 헤더/제어 패널 여백 감소 | - | 16px |
| Card 여백 최적화 | - | 20px |
| **총 확보 공간** | **48px** | **92px** |

### 화면 크기별 개선 효과

**1920px (Full HD) 기준**:
- 현재 간트차트 너비: 약 1720px
- 개선 후 간트차트 너비: 약 1768px
- **증가율**: ~2.8%

**1440px (노트북) 기준**:
- 현재 간트차트 너비: 약 1240px
- 개선 후 간트차트 너비: 약 1288px
- **증가율**: ~3.9%

**수직 공간**:
- 현재 간트차트 높이: 약 700px
- 개선 후 간트차트 높이: 약 792px
- **증가율**: ~13.1%

### 사용자 경험 개선

1. **더 많은 프로젝트 표시**: 한 화면에 표시되는 프로젝트 수 증가
2. **공정 단계 가시성 향상**: 수평 스크롤 빈도 감소
3. **전체적인 일정 파악 용이**: 넓어진 가시 영역으로 프로젝트 흐름 파악 개선
4. **작업 효율성 증대**: 스크롤 횟수 감소로 작업 속도 향상

---

## ✅ 구현 체크리스트

### Phase 1: 레이아웃 수정 (우선순위: 높음)

- [ ] **DashboardLayout.tsx** 수정
  - [ ] `usePathname` 훅 import
  - [ ] `isGanttPage` 상태 추가
  - [ ] `content-wrapper` 조건부 패딩 적용
  - [ ] 브라우저 테스트 (다른 페이지 영향 없는지 확인)

- [ ] **gantt/page.tsx** 수정
  - [ ] 컨테이너 클래스 수정 (`px-6 py-8` → `px-3 py-4`)
  - [ ] 헤더 하단 여백 수정 (`mb-6` → `mb-4`)
  - [ ] 제어 패널 하단 여백 수정 (`mb-6` → `mb-4`)
  - [ ] 시각적 확인 및 조정

- [ ] **GanttChart.tsx** 수정
  - [ ] Card `bodyStyle` 추가
  - [ ] `gantt-wrapper` 최소 높이 조정
  - [ ] 페이지네이션 여백 조정
  - [ ] 스타일 최종 검증

### Phase 2: 테스트 및 검증

- [ ] **기능 테스트**
  - [ ] 간트차트 정상 표시 확인
  - [ ] 프로젝트 펼치기/접기 동작 확인
  - [ ] 페이지네이션 동작 확인
  - [ ] 모달 정상 동작 확인

- [ ] **반응형 테스트**
  - [ ] 1920px (Full HD) 화면 테스트
  - [ ] 1440px (노트북) 화면 테스트
  - [ ] 1024px (태블릿) 화면 테스트
  - [ ] 768px (모바일) 화면 테스트

- [ ] **다른 페이지 영향 확인**
  - [ ] 프로젝트 목록 페이지
  - [ ] 프로젝트 상세 페이지
  - [ ] 캘린더 페이지
  - [ ] 관리자 페이지

- [ ] **빌드 테스트**
  - [ ] `npm run build` 성공 확인
  - [ ] TypeScript 타입 에러 없음
  - [ ] 브라우저 콘솔 에러 없음

### Phase 3: 문서화 및 배포

- [ ] **문서 업데이트**
  - [ ] `FOLDER_STRUCTURE.md` 업데이트
  - [ ] 변경 사항 커밋 메시지 작성

- [ ] **Git 작업**
  - [ ] 변경 사항 커밋
  - [ ] 개발자 리뷰 요청

- [ ] **배포 및 모니터링**
  - [ ] 서버 재시작
  - [ ] 실제 환경에서 동작 확인
  - [ ] 사용자 피드백 수집

---

## 🔧 추가 고려사항

### 1. 반응형 디자인

모바일 환경에서는 기존 패딩 유지를 권장합니다:

```tsx
// DashboardLayout.tsx - 반응형 고려
const isGanttPage = pathname === '/gantt'
const isMobile = window.innerWidth < 768

// content-wrapper padding
padding: isGanttPage && !isMobile ? '12px' : '24px'
```

### 2. 성능 최적화

간트차트 데이터가 많을 경우 가상화(Virtualization) 고려:
- 현재 페이지네이션으로 3개씩 표시 중
- 필요시 페이지 크기 조정 가능 (`pageSize` 증가)

### 3. 사용자 설정

향후 사용자가 레이아웃 밀도를 선택할 수 있는 옵션 추가 고려:
- Compact (현재 개선안)
- Normal (기존)
- Comfortable (더 넓은 여백)

---

## 📚 관련 파일

### 수정 대상 파일

1. **components/common/layout/DashboardLayout.tsx** (98-112번 줄)
   - `content-wrapper` 패딩 조건부 적용

2. **app/(dashboard)/gantt/page.tsx** (91, 93, 115번 줄)
   - 컨테이너 패딩 및 여백 최소화

3. **components/gantt/GanttChart.tsx** (367-420번 줄)
   - Card 여백 최적화, wrapper 높이 조정

### 영향 받는 파일

- `styles/globals.css` - 간트차트 관련 전역 스타일 (필요시 조정)
- `FOLDER_STRUCTURE.md` - 이 문서 추가 및 변경 사항 반영

---

## 🚨 주의사항

1. **다른 페이지 영향 확인 필수**: DashboardLayout 변경으로 인한 다른 페이지 레이아웃 영향 확인
2. **빌드 테스트 필수**: `npm run build` 후 정상 동작 확인
3. **서버 재시작**: 변경 후 개발 서버 재시작 권장
4. **Git 커밋 규칙 준수**: `feat: 간트차트 페이지 레이아웃 영역 확대` 형식 사용

---

## 📞 문의 및 피드백

- 개선 사항이나 문제점 발견 시 개발자에게 즉시 보고
- 사용자 피드백을 바탕으로 추가 최적화 검토

---

**문서 작성자**: Claude Code
**최종 수정일**: 2025-10-03
