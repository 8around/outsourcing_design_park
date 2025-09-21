# 승인 반려 시 카카오톡 알림 발송 구현 계획

## 구현 개요
로그 작성 후 담당자가 승인을 반려했을 때 요청자에게 카카오톡 알림톡을 발송하는 기능을 구현합니다.

## 제공된 정보
- **템플릿 ID**: KA01TP250919062830851iHHImWx687U
- **기존 참고 코드**: supabase/functions/send-kakao/index.ts

## 발송 메시지 내용

승인 반려 시 발송되는 카카오톡 알림톡 메시지:

```
승인 반려 메시지입니다.

프로젝트: #{site_name} - #{product_name}
처리자: #{rejector_name}
카테고리: #{category}
반려사유: #{response_memo}

시스템에서 상세 내용을 확인해 주세요.
```

### 메시지 변수 매핑
- `#{site_name}`: 현장명 (프로젝트 정보)
- `#{product_name}`: 제품명 (프로젝트 정보)
- `#{rejector_name}`: 반려 처리자명 (승인자명)
- `#{category}`: 로그 카테고리
- `#{response_memo}`: 반려 사유 (승인자가 입력한 메모)

## 주요 구현 파일
1. **lib/services/kakao.client.service.ts** - 승인 반려 알림 메서드 추가
2. **supabase/functions/send-kakao/index.ts** - 새로운 알림 타입 처리 추가
3. **lib/services/approval.service.ts** - 승인 반려 시 카카오톡 발송 로직 추가

## 상세 구현 계획

### 1. kakao.client.service.ts 수정

#### 새로운 메서드 추가
```typescript
/**
 * 프로젝트 승인 반려 카카오톡 알림톡 발송
 */
async sendProjectApprovalRejection(
  requesterPhone: string,
  approverName: string,
  siteName: string,
  productName: string,
  category: string,
  rejectionReason: string
): Promise<KakaoSendResponse>
```

#### 구현 내용
- 템플릿 ID: `KA01TP250919062830851iHHImWx687U` 사용
- 필요한 변수:
  - `site_name`: 현장명
  - `product_name`: 제품명
  - `approver_name`: 반려자명
  - `category`: 카테고리
  - `rejection_reason`: 반려 사유
  - `rejected_at`: 반려 시간 (한국 시간 형식)

### 2. Edge Function (send-kakao/index.ts) 수정

#### 새로운 타입 처리 추가
```typescript
// 기존 코드의 47-53 라인 부분을 확장
if (type === "project-approval-request") {
  // 기존 승인 요청 처리
} else if (type === "project-approval-rejection") {
  // 새로운 승인 반려 처리
  const result = await sendKakaoAlimtalk(data, messageService);
  return new Response(JSON.stringify({ success: true, data: result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

#### sendKakaoAlimtalk 함수 수정
- 템플릿 ID에 따라 다른 처리 로직 적용
- 동일한 SOLAPI 설정 사용 (pfId, from 번호 등)

### 3. approval.service.ts 수정

#### respondToApprovalRequest 메서드 수정 위치
현재 코드의 394-422 라인 부분 (이메일 발송 후)에 카카오톡 발송 로직 추가

#### 추가할 코드 로직
```typescript
// 4-1. 요청자 전화번호 조회 (기존 이메일 조회와 함께)
const { data: requesterData } = await this.supabase
  .from('users')
  .select('email, phone')  // phone 필드 추가
  .eq('id', requestData.requester_id)
  .single();

// 6번 이메일 발송 후...

// 7. 카카오톡 알림톡 발송 (승인 반려의 경우)
if (status === 'rejected' && requesterData?.phone && 
    kakaoClientService.canSendKakao(requesterData.phone)) {
  try {
    await kakaoClientService.sendProjectApprovalRejection(
      requesterData.phone,
      approverName,
      projectData?.site_name || '프로젝트',
      projectData?.product_name || '제품',
      '승인요청',  // 카테고리는 기존 로그에서 가져와야 할 수 있음
      responseMemo
    );
    console.log('승인 반려 카카오톡 발송 성공');
  } catch (error) {
    // 카카오톡 발송 실패해도 승인 반려는 정상 처리
    console.error('승인 반려 카카오톡 발송 실패:', error);
  }
}
```

## 구현 순서

1. **kakao.client.service.ts** 파일에 새로운 메서드 추가
2. **supabase/functions/send-kakao/index.ts** Edge Function 업데이트
3. **approval.service.ts** 파일에서 반려 시 카카오톡 발송 로직 추가
4. 테스트 및 검증

## 주의사항

### 에러 처리
- 카카오톡 발송 실패가 전체 승인 반려 프로세스를 막지 않도록 try-catch로 처리
- 발송 실패 시 콘솔 로그만 기록하고 프로세스는 계속 진행

### 유효성 검사
- 전화번호가 없거나 유효하지 않은 경우 자동으로 스킵
- `kakaoClientService.canSendKakao()` 메서드로 사전 검증

### 로깅
- 성공/실패 여부를 콘솔에 기록
- 실패 시 상세 에러 정보 포함

## 테스트 시나리오

1. **정상 케이스**
   - 승인 반려 시 카카오톡 정상 발송
   - 이메일과 카카오톡 모두 발송 확인

2. **예외 케이스**
   - 전화번호 없는 사용자: 이메일만 발송
   - 잘못된 전화번호: 이메일만 발송, 카카오톡 스킵
   - 카카오톡 API 오류: 이메일은 정상 발송, 에러 로그 기록

3. **검증 항목**
   - 템플릿 변수가 올바르게 전달되는지 확인
   - 한국 시간 형식이 정확한지 확인
   - 반려 사유가 제대로 표시되는지 확인

## 추가 고려사항

### 카테고리 정보 가져오기
현재 `respondToApprovalRequest` 메서드에서는 카테고리 정보를 직접 가져오지 않습니다. 필요시 다음 방법 중 선택:

1. **history_logs 테이블에서 조회**
   - 승인 요청 시 생성된 로그에서 카테고리 정보 조회
   - 추가 DB 쿼리 필요

2. **고정값 사용**
   - '승인요청' 또는 '승인반려' 같은 고정 카테고리 사용
   - 간단하지만 유연성 부족

3. **approval_requests 테이블 확장**
   - 카테고리 필드 추가 (DB 스키마 변경 필요)
   - 가장 효율적이지만 DB 마이그레이션 필요

### 성능 최적화
- 카카오톡 발송은 비동기로 처리하되, await로 완료까지 대기
- 타임아웃 설정 (현재 30초)으로 무한 대기 방지

### 보안
- 전화번호 형식 검증 철저히 수행
- API 키와 시크릿 키는 환경 변수로 관리 (이미 구현됨)