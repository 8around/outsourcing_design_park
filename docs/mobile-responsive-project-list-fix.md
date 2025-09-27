# 프로젝트 리스트 페이지 모바일 반응형 레이아웃 수정

## 문제 설명
프로젝트 리스트 페이지(`app/(dashboard)/projects/page.tsx`)에서 모바일 화면 접속 시 "프로젝트 관리" 타이틀 텍스트가 오른쪽 버튼들에 의해 압축되어 세로로 표시되는 문제가 발생합니다.

## 원인 분석
### 현재 코드 구조 (138-164번 줄)
```tsx
<div className="flex items-center justify-between mb-8">
  <div>
    <Title level={2} className="mb-2">
      프로젝트 관리
    </Title>
    <Text type="secondary" className="text-base">
      전체 {totalProjects}개의 프로젝트
    </Text>
  </div>
  <Space>
    <Button icon={<ReloadOutlined />}>새로고침</Button>
    <Button type="primary" icon={<PlusOutlined />}>새 프로젝트</Button>
  </Space>
</div>
```

### 문제점
1. **고정된 flex 방향**: 모든 화면 크기에서 `flex` (row 방향) 유지
2. **justify-between**: 양쪽 끝 정렬로 인해 공간 부족 시 텍스트 압축
3. **Space 컴포넌트**: Ant Design의 Space 컴포넌트는 반응형 제어가 제한적

## 해결 방안

### 1. 헤더 섹션 반응형 레이아웃 적용

#### 수정된 코드
```tsx
<div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
  <div>
    <Title level={2} className="mb-2">
      프로젝트 관리
    </Title>
    <Text type="secondary" className="text-base">
      전체 {totalProjects}개의 프로젝트
    </Text>
  </div>
  <div className="flex gap-2">
    <Button
      icon={<ReloadOutlined spin={refreshing} />}
      onClick={() => fetchProjects(true)}
      disabled={refreshing}
    >
      새로고침
    </Button>
    <Button
      type="primary"
      icon={<PlusOutlined />}
      size="large"
      onClick={() => router.push('/projects/new')}
    >
      새 프로젝트
    </Button>
  </div>
</div>
```

### 2. 변경 사항 상세

#### Tailwind CSS 클래스 설명
- `flex-col`: 모바일에서 세로 방향 배치 (기본값)
- `md:flex-row`: 중간 크기 이상 화면에서 가로 방향 배치
- `md:items-center`: 중간 크기 이상에서 세로 축 중앙 정렬
- `md:justify-between`: 중간 크기 이상에서 양쪽 끝 정렬
- `gap-4`: 자식 요소 간 간격 설정 (1rem)

#### 구조 변경
- Ant Design `Space` 컴포넌트를 순수 `div` + Tailwind flex로 대체
- 더 세밀한 반응형 제어 가능

### 3. 선택적 개선 사항

#### 모바일에서 버튼 전체 너비 적용
```tsx
<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
  <Button
    className="w-full sm:w-auto"
    icon={<ReloadOutlined spin={refreshing} />}
    onClick={() => fetchProjects(true)}
    disabled={refreshing}
  >
    새로고침
  </Button>
  <Button
    className="w-full sm:w-auto"
    type="primary"
    icon={<PlusOutlined />}
    size="large"
    onClick={() => router.push('/projects/new')}
  >
    새 프로젝트
  </Button>
</div>
```

## 브레이크포인트별 레이아웃

### 모바일 (< 768px)
```
[프로젝트 관리]
[전체 N개의 프로젝트]

[새로고침] [새 프로젝트]
```

### 태블릿/데스크톱 (≥ 768px)
```
[프로젝트 관리]                    [새로고침] [새 프로젝트]
[전체 N개의 프로젝트]
```

## 테스트 방법

1. **크롬 개발자 도구**
   - F12로 개발자 도구 열기
   - 반응형 디자인 모드 (Ctrl+Shift+M)
   - 다양한 모바일 기기 프리셋 테스트

2. **주요 테스트 포인트**
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - Samsung Galaxy S20 (412px)
   - iPad Mini (768px) - 브레이크포인트
   - Desktop (1024px+)

3. **확인 사항**
   - 텍스트가 세로로 압축되지 않는지
   - 버튼과 텍스트 간격이 적절한지
   - 각 브레이크포인트에서 레이아웃 전환이 자연스러운지

## 예상 결과

### Before (문제 상황)
- 모바일에서 "프로젝트 관리" 텍스트가 세로로 압축됨
- 버튼과 텍스트가 같은 줄에서 경쟁

### After (수정 후)
- 모바일에서 텍스트와 버튼이 세로로 명확히 분리
- 충분한 공간 확보로 가독성 향상
- 태블릿 이상에서는 기존 레이아웃 유지

## 관련 파일
- `/app/(dashboard)/projects/page.tsx` - 메인 수정 파일
- 영향 없음: 다른 페이지들은 독립적으로 동작

## 작성일
2025-01-27

## 작성자
프로젝트 현장 관리 솔루션 개발팀