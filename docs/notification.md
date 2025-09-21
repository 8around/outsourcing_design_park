# 알림 시스템 수정 계획

## 🔍 문제 분석

### 현재 문제점

#### 1. notifications 테이블 저장 안됨
- **원인**: `createApprovalNotification` 메서드가 'approved' | 'rejected' 타입만 받음
- **영향**: 프로젝트 승인은 'approval_request' | 'approval_response' 타입이 필요하나 타입 불일치로 주석 처리됨
- **위치**: 
  - `approval.service.ts` 359-363라인 (승인 요청)
  - `approval.service.ts` 513-517라인 (승인 응답)

#### 2. 알림 대상자 설정 문제
- **승인 요청 시**: 승인자(approver)에게 알림이 가야 함
- **승인 응답 시**: 요청자(requester)에게 알림이 가야 함
- **현재 상태**: 알림이 생성되지 않아 대상자 구분 자체가 안됨

## 📋 수정 계획

### 1. approval.service.ts 수정

#### 1.1 새로운 메서드 추가
```typescript
/**
 * 프로젝트 승인 관련 알림 생성
 */
private async createProjectNotification(
  userId: string,
  type: 'approval_request' | 'approval_response',
  title: string,
  message: string,
  relatedId?: string,
  relatedType?: 'project' | 'approval_request',
  kakaoSent?: boolean,
  kakaoSentAt?: string,
  emailSent?: boolean,
  emailSentAt?: string
): Promise<void> {
  try {
    await this.supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
      related_id: relatedId,
      related_type: relatedType,
      is_read: false,
      kakao_sent: kakaoSent || false,
      kakao_sent_at: kakaoSentAt || null,
      email_sent: emailSent || false,
      email_sent_at: emailSentAt || null
    });
  } catch (error) {
    console.error("Error creating project notification:", error);
  }
}
```

#### 1.2 createApprovalRequest 메서드 수정
- **위치**: 290-370라인
- **수정 내용**:
  ```typescript
  // 5. 알림 생성 (승인자에게)
  await this.createProjectNotification(
    approverId,
    'approval_request',
    '새로운 승인 요청',
    `${requesterName}님이 프로젝트 승인을 요청했습니다: ${memo}`,
    approvalData.id,
    'approval_request'
  );
  ```

#### 1.3 respondToApprovalRequest 메서드 수정
- **위치**: 374-524라인
- **수정 내용**:
  ```typescript
  // 8. 알림 생성 (요청자에게)
  const statusText = status === "approved" ? "승인" : "반려";
  const title = status === "approved" ? "승인 요청 승인됨" : "승인 요청 반려됨";
  
  await this.createProjectNotification(
    requestData.requester_id,
    'approval_response',
    title,
    `${approverName}님이 프로젝트 승인 요청을 ${statusText}했습니다: ${responseMemo}`,
    requestId,
    'approval_request',
    status === "approved" ? kakaoApprovedResult?.success : kakaoRejectedResult?.success,
    status === "approved" ? kakaoApprovedResult?.success ? new Date().toISOString() : null : 
                            kakaoRejectedResult?.success ? new Date().toISOString() : null
  );
  ```

### 2. logs.service.ts 수정

#### 2.1 createApprovalRequestLog 메서드 수정
- **위치**: 76-210라인
- **수정 내용**:
  ```typescript
  // 8. notifications 테이블에 알림 생성 (승인자에게)
  try {
    await supabase.from('notifications').insert({
      user_id: data.approver_id,
      title: '새로운 승인 요청',
      message: `${data.requester_name}님이 프로젝트 승인을 요청했습니다: ${data.memo}`,
      type: 'approval_request',
      related_id: approvalRequest.id,
      related_type: 'approval_request',
      is_read: false,
      kakao_sent: kakaoSendResult?.success || false,
      kakao_sent_at: kakaoSendResult?.success ? new Date().toISOString() : null,
      email_sent: !!approverData?.email,
      email_sent_at: !!approverData?.email ? new Date().toISOString() : null
    });
    console.log('승인 요청 알림 생성 성공');
  } catch (notificationError) {
    console.error('알림 생성 실패:', notificationError);
    // 알림 생성 실패해도 승인 요청은 유지
  }
  ```

### 3. 카카오톡 발송 정보 연동

#### 3.1 카카오톡 발송 후 notifications 업데이트
- 카카오톡 발송 성공/실패 여부를 `kakao_sent` 필드에 저장
- 발송 시간을 `kakao_sent_at` 필드에 저장
- 이메일 발송 성공/실패 여부를 `email_sent` 필드에 저장
- 발송 시간을 `email_sent_at` 필드에 저장

### 4. 알림 흐름도

```
승인 요청 흐름:
요청자(A) → 승인 요청 생성 → 승인자(B)에게 알림
                            → notifications 테이블에 저장
                            → 카카오톡 발송 (있으면)
                            → 이메일 발송

승인 응답 흐름:
승인자(B) → 승인/거절 처리 → 요청자(A)에게 알림
                           → notifications 테이블에 저장
                           → 카카오톡 발송 (있으면)
                           → 이메일 발송
```

## 🎯 예상 결과

### 성공 시나리오
1. ✅ 승인 요청 시 승인자의 notifications 테이블에 알림 저장
2. ✅ 승인/거절 시 요청자의 notifications 테이블에 알림 저장
3. ✅ 카카오톡 발송 상태가 notifications 테이블에 기록됨
4. ✅ 이메일 발송 상태가 notifications 테이블에 기록됨
5. ✅ 사용자가 알림 목록에서 승인 관련 알림 확인 가능

### 테스트 시나리오
1. **승인 요청 테스트**
   - 프로젝트 승인 요청 생성
   - 승인자의 notifications 확인
   - 카카오톡 발송 여부 확인
   - 이메일 발송 여부 확인

2. **승인 응답 테스트**
   - 승인 처리 후 요청자의 notifications 확인
   - 거절 처리 후 요청자의 notifications 확인
   - 각각의 카카오톡/이메일 발송 상태 확인

## 🔧 구현 우선순위

1. **높음**: createProjectNotification 메서드 추가
2. **높음**: createApprovalRequest에서 알림 생성
3. **높음**: respondToApprovalRequest에서 알림 생성
4. **중간**: logs.service.ts에서 알림 생성
5. **낮음**: 카카오톡/이메일 발송 상태 추적 개선

## 📝 주의사항

- notifications 테이블의 type 필드는 이미 'approval_request' | 'approval_response' | 'system'을 지원함
- 기존 createApprovalNotification 메서드는 사용자 계정 승인용으로 유지
- 새로운 createProjectNotification 메서드는 프로젝트 승인 전용으로 사용
- 알림 생성 실패가 승인 프로세스를 막지 않도록 try-catch로 처리
- 카카오톡/이메일 발송 실패도 승인 프로세스를 막지 않도록 처리