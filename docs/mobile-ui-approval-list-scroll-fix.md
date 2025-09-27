# 모바일 화면 승인 대기 목록 UI 수정 계획

## 문제 설명
모바일 화면에서 대시보드 > 승인 대기 목록 화면의 텍스트가 세로로 표시되어 UI가 깨지는 문제가 발생하고 있습니다.

### 현재 상황
- **문제 위치**: `components/dashboard/PendingApprovals.tsx`
- **증상**: 프로젝트명과 메모 텍스트가 한 글자씩 세로로 나열됨
- **원인**: CSS의 word-break와 overflow 속성이 적절히 설정되지 않음
- **참고 솔루션**: `components/logs/GlobalLogFeed.tsx`에서 구현된 좌우 스크롤 방식

## 해결 방안

### 1. Title 영역 수정 (PendingApprovals.tsx 408-423줄)

기존 `<Space>` 컴포넌트를 `<div>` 태그로 변경하고 가로 스크롤 스타일을 적용합니다.

```jsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'nowrap',
  whiteSpace: 'nowrap',
  overflowX: 'auto',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none'
}}>
  <Text strong style={{ flexShrink: 0 }}>{approval.title}</Text>
  <Tag color={config.color} style={{ flexShrink: 0 }}>{config.label}</Tag>
  {approval.priority === 'high' && (
    <Tag color="red" style={{ flexShrink: 0 }}>긴급</Tag>
  )}
  {approval.attachments && approval.attachments.length > 0 && (
    <Tag
      icon={<PaperClipOutlined />}
      color="blue"
      style={{ flexShrink: 0 }}
    >
      첨부 {approval.attachments.length}
    </Tag>
  )}
</div>
```

### 2. Description 영역 수정 (425-467줄)

텍스트 영역에 word-break 및 overflow 처리를 추가합니다.

```jsx
<div className="approval-description">
  <Text style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
    {approval.description}
  </Text>
  {approval.category && (
    <div>
      <Tag color={categoryColors[approval.category] || 'default'} className="mt-1">
        {approval.category}
      </Tag>
    </div>
  )}
  {approval.memo && (
    <div className="mt-1">
      <Text type="secondary" className="text-xs" style={{
        wordBreak: 'keep-all',
        overflowWrap: 'break-word'
      }}>
        메모: {approval.memo}
      </Text>
    </div>
  )}
</div>
```

### 3. 요청자/승인자 정보 영역 수정 (443-466줄)

Space 컴포넌트를 가로 스크롤 가능한 div로 변경합니다.

```jsx
<div className="approval-meta-info" style={{
  display: 'flex',
  gap: '8px',
  flexWrap: 'nowrap',
  whiteSpace: 'nowrap',
  overflowX: 'auto',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  fontSize: '12px'
}}>
  {approval.requestType === 'received' ? (
    <>
      <Text type="secondary" style={{ flexShrink: 0 }}>
        요청자: {approval.requester_name}
        {approval.requester_email && ` (${approval.requester_email})`}
      </Text>
    </>
  ) : (
    <>
      <Text type="secondary" style={{ flexShrink: 0 }}>
        승인자: {approval.approver_name || '관리자'}
      </Text>
      <Text type="secondary" style={{ flexShrink: 0 }}>•</Text>
      <Tag color="orange" className="text-xs" style={{ flexShrink: 0 }}>
        내가 보낸 요청
      </Tag>
    </>
  )}
  <Text type="secondary" style={{ flexShrink: 0 }}>•</Text>
  <Text type="secondary" style={{ flexShrink: 0 }}>
    {formatDistanceToNow(new Date(approval.created_at), {
      addSuffix: true,
      locale: ko
    })}
  </Text>
</div>
```

### 4. CSS 스타일 추가 (595-641줄)

스크롤바 숨김 처리와 모바일 전용 스타일을 추가합니다.

```css
/* 스크롤바 숨김 처리 */
.pending-approvals :global(.ant-list-item-meta-title > div::-webkit-scrollbar) {
  display: none;
}

.pending-approvals :global(.approval-meta-info::-webkit-scrollbar) {
  display: none;
}

/* 설명 영역 스타일 */
.approval-description {
  max-width: 100%;
  word-break: keep-all;
  overflow-wrap: break-word;
}

/* 모바일 전용 스타일 개선 */
@media (max-width: 768px) {
  .approval-list :global(.ant-list-item) {
    padding: 12px 16px;
  }

  .approval-list :global(.ant-list-item-meta) {
    width: 100%;
    overflow: hidden;
  }

  .approval-list :global(.ant-list-item-meta-title) {
    width: 100%;
    overflow: visible;
  }

  .approval-description {
    max-width: 100%;
    word-break: keep-all;
    overflow-wrap: break-word;
  }

  .approval-meta-info {
    width: 100%;
    overflow-x: auto;
  }

  .approval-list :global(.ant-list-item-action) {
    margin-top: 12px;
    margin-left: 0;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
}
```

### 5. 스타일 태그 추가

각 가로 스크롤 영역에 inline style jsx를 추가합니다.

```jsx
<style jsx>{`
  div::-webkit-scrollbar {
    display: none;
  }
`}</style>
```

## 구현 우선순위

1. **높음**: Title 영역 가로 스크롤 구현 (가장 중요한 문제 해결)
2. **높음**: Description 영역 word-break 적용 (메모 텍스트 깨짐 방지)
3. **중간**: 요청자/승인자 정보 가로 스크롤 적용
4. **낮음**: CSS 최적화 및 스크롤바 숨김 처리

## 예상 결과

### 개선 사항
1. ✅ 모바일 화면에서 긴 텍스트가 세로로 표시되지 않음
2. ✅ 프로젝트명과 태그들이 가로 스크롤로 확인 가능
3. ✅ 메모 텍스트가 적절하게 줄바꿈되어 가독성 향상
4. ✅ GlobalLogFeed와 동일한 사용자 경험 제공
5. ✅ 스크롤바는 숨기되 터치/마우스 스크롤 기능 유지

### 사용자 경험
- 모바일에서 좌우 스와이프로 긴 텍스트 확인 가능
- 중요한 정보(프로젝트명, 카테고리, 상태)가 잘리지 않고 표시
- 전체 활동 로그와 일관된 인터페이스 제공

## 테스트 체크리스트

### 디바이스별 테스트
- [ ] iPhone SE (375px)
- [ ] iPhone 12 Pro (390px)
- [ ] iPhone 12 Pro Max (428px)
- [ ] iPad Mini (768px)
- [ ] iPad Pro (1024px)
- [ ] Desktop (1920px)

### 기능 테스트
- [ ] 긴 프로젝트명 표시 확인
- [ ] 긴 메모 텍스트 표시 확인
- [ ] 가로 스크롤 동작 확인
- [ ] 터치 스크롤 동작 확인
- [ ] 승인/거절 버튼 동작 확인
- [ ] 첨부파일 표시 및 다운로드 확인

### 브라우저 호환성
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Samsung Internet
- [ ] Firefox Mobile

## 참고 자료

### GlobalLogFeed.tsx 구현 예시
```jsx
// 331-371줄 참고
<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'nowrap',
  whiteSpace: 'nowrap',
  overflowX: 'auto',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none'
}}>
  {/* 컨텐츠 */}
</div>
```

### 관련 파일
- `components/dashboard/PendingApprovals.tsx` - 수정 대상
- `components/logs/GlobalLogFeed.tsx` - 참고 구현
- `styles/globals.css` - 전역 스타일

## 주의 사항

1. **기존 기능 유지**: 승인/거절 기능이 정상 작동하도록 주의
2. **성능 고려**: 많은 수의 승인 항목이 있을 때도 스크롤이 부드럽게 동작하도록 구현
3. **접근성**: 키보드 네비게이션과 스크린 리더 지원 고려
4. **일관성**: GlobalLogFeed와 유사한 UX 패턴 유지

## 작업 완료 기준

- 모든 모바일 디바이스에서 텍스트가 세로로 표시되지 않음
- 가로 스크롤이 자연스럽게 동작
- 기존 기능(승인/거절/상세보기)이 정상 작동
- 코드 리뷰 통과
- 테스트 체크리스트 100% 완료