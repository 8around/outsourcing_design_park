# send-email Edge Function 정리 계획

## 📊 현재 상황 분석

### send-email/index.ts 파일 현황
- **총 5개의 case 처리**:
  - `project-approval-request` (프로젝트 승인 요청)
  - `project-approval-approved` (프로젝트 승인 완료)
  - `project-approval-rejected` (프로젝트 승인 반려)
  - `user-approval` (사용자 승인/거절) ⚠️ **제거 대상**
  - `new-signup` (신규 가입 알림) ⚠️ **제거 대상**

### send-kakao/index.ts 파일 현황
- **총 3개의 case만 처리** (프로젝트 관련만):
  - `project-approval-request`
  - `project-approval-rejection`
  - `project-approval-approved`

### 🚨 문제점
- **불일치**: 사용자 관련 case가 이메일 Edge Function에만 존재
- **비일관성**: 두 알림 시스템 간 처리 범위가 다름
- **코드 복잡성**: 불필요한 기능으로 인한 유지보수 부담

## 🗑️ 제거 대상 상세

### 1. Switch문에서 제거할 case

#### case "user-approval" (줄 35-36)
```typescript
case "user-approval":
  result = await sendUserApproval(data);
  break;
```

#### case "new-signup" (줄 38-39)
```typescript
case "new-signup":
  result = await sendNewSignupNotification(data);
  break;
```

### 2. 제거할 함수들

#### sendUserApproval() 함수 (줄 275-296)
- 사용자 승인/거절 이메일 발송 함수
- getApprovalTemplate, getRejectionTemplate 호출

#### sendNewSignupNotification() 함수 (줄 299-346)
- 관리자에게 신규 사용자 가입 알림 이메일 발송 함수

#### getApprovalTemplate() 함수 (줄 348-379)
- 사용자 승인 완료 이메일 HTML 템플릿 생성

#### getRejectionTemplate() 함수 (줄 381-421)
- 사용자 승인 거절 이메일 HTML 템플릿 생성

## ✅ 수정 후 남을 기능

### 유지되는 case (3개)
1. **project-approval-request**: 프로젝트 승인 요청 이메일
2. **project-approval-approved**: 프로젝트 승인 완료 이메일
3. **project-approval-rejected**: 프로젝트 승인 반려 이메일

### 유지되는 함수 (3개)
1. **sendProjectApprovalRequest()**: 승인 요청 이메일 발송
2. **sendProjectApprovalApproved()**: 승인 완료 이메일 발송
3. **sendProjectApprovalRejected()**: 승인 반려 이메일 발송

## 🎯 기대 효과

### 1. 코드 일관성 확보
- send-email과 send-kakao 두 Edge Function 모두 프로젝트 관련 알림만 처리
- 동일한 기능 범위로 명확한 역할 분리

### 2. 유지보수성 향상
- 불필요한 코드 제거로 파일 크기 감소
- 프로젝트 관련 알림에만 집중하는 단순한 구조

### 3. 명확한 책임 분리
- 프로젝트 관련 알림: send-email, send-kakao
- 사용자 관련 알림: 별도 처리 또는 다른 시스템으로 이관

## 📝 실행 계획

1. **백업**: 현재 send-email/index.ts 파일 백업
2. **case 제거**: switch문에서 user-approval, new-signup case 제거
3. **함수 제거**: 관련된 4개 함수 완전 삭제
4. **테스트**: 프로젝트 관련 이메일 알림 정상 작동 확인
5. **문서 업데이트**: 변경사항 관련 문서 업데이트

## ⚠️ 주의사항

- 사용자 승인/거절 및 신규 가입 알림 기능이 다른 곳에서 처리되는지 확인 필요
- 기존 사용자 관련 이메일 발송 로직이 다른 시스템으로 이관되었는지 검증
- 프로젝트 관련 알림만 남은 후에도 전체 시스템이 정상 작동하는지 테스트 필요