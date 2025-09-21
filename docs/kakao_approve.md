# 승인 완료 시 카카오톡 알림 발송 구현 계획

## 구현 개요
로그 작성 후 담당자가 승인을 완료했을 때 요청자에게 카카오톡 알림톡을 발송하는 기능을 구현합니다.

## 제공된 정보
- **템플릿 ID**: KA01TP250919063658041BaQdwc5qwmQ
- **기존 참고 코드**: supabase/functions/send-kakao/index.ts
- **참고 문서**: docs/send_kakao_request_reject.md (반려 시 발송 구현)

## 발송 메시지 내용

승인 완료 시 발송되는 카카오톡 알림톡 메시지:

```
승인 메시지입니다.

프로젝트: #{site_name} - #{product_name}
승인자: #{approver_name}
카테고리: #{category}

시스템에서 상세 내용을 확인해 주세요.
```

### 메시지 변수 매핑
- `#{site_name}`: 현장명 (프로젝트 정보)
- `#{product_name}`: 제품명 (프로젝트 정보)
- `#{approver_name}`: 승인 처리자명
- `#{category}`: 로그 카테고리

## 현재 상태 분석

### ✅ 이미 구현된 기능
- 승인 **반려** 시 카카오톡 알림 발송 (정상 작동)
- 승인 요청 시 카카오톡 알림 발송
- 이메일 알림 시스템
- Edge Function을 통한 SOLAPI 연동

### ❌ 구현되지 않은 기능
- 승인 **완료** 시 카카오톡 알림 발송

## 주요 구현 파일

### 1. **lib/services/kakao.client.service.ts** - 승인 완료 알림 메서드 추가

#### 새로운 메서드 추가 (152번 라인 이후)
```typescript
/**
 * 프로젝트 승인 완료 카카오톡 알림톡 발송
 */
async sendProjectApprovalApproved(
  requesterPhone: string,
  approverName: string,
  siteName: string,
  productName: string,
  category: string
): Promise<KakaoSendResponse> {
  try {
    const requestData: KakaoSendRequest = {
      type: 'project-approval-approved',
      data: {
        to: requesterPhone,
        templateId: 'KA01TP250919063658041BaQdwc5qwmQ',
        variables: {
          site_name: siteName,
          product_name: productName,
          approver_name: approverName,
          category: category,
          approved_at: new Date().toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
        }
      }
    }

    // 타임아웃 설정 (30초)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('카카오톡 발송 타임아웃 (30초)')), 30000)
    )

    const sendPromise = this.supabase.functions.invoke('send-kakao', {
      body: requestData
    })

    const result = await Promise.race([sendPromise, timeoutPromise])
    const { data, error } = result as { data: KakaoSendResponse | null; error: Error | null }

    if (error) {
      console.error('카카오톡 Edge Function 호출 실패:', error)
      throw new Error(`카카오톡 발송 실패: ${error.message}`)
    }

    // 응답 데이터 검증
    if (!data || !data.success) {
      throw new Error('카카오톡 발송 응답이 올바르지 않습니다.')
    }

    return data as KakaoSendResponse
  } catch (error) {
    console.error('승인 완료 카카오톡 발송 에러:', {
      error: error instanceof Error ? error.message : error,
      phone: requesterPhone,
      approver: approverName,
      site: siteName,
      product: productName,
      category: category,
      timestamp: new Date().toISOString()
    })
    throw error
  }
}
```

### 2. **supabase/functions/send-kakao/index.ts** - Edge Function 업데이트

#### 새로운 타입 처리 추가 (61번 라인 이후)
```typescript
// 프로젝트 승인 완료 타입 처리
if (type === "project-approval-approved") {
  const result = await sendKakaoAlimtalk(data, messageService);
  return new Response(JSON.stringify({ success: true, data: result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

### 3. **lib/services/approval.service.ts** - 승인 시 카카오톡 발송 로직 추가

#### respondToApprovalRequest 메서드 수정 (466번 라인 이후 추가)
```typescript
// 7-1. 카카오톡 알림톡 발송 (승인 완료의 경우)
if (
  status === "approved" &&
  requesterData?.phone &&
  kakaoClientService.canSendKakao(requesterData.phone)
) {
  try {
    await kakaoClientService.sendProjectApprovalApproved(
      requesterData.phone,
      approverName,
      projectData?.site_name || "현장",
      projectData?.product_name || "프로젝트",
      logData?.category || "승인요청"
    );
    console.log('승인 완료 카카오톡 발송 성공');
  } catch (error) {
    // 카카오톡 발송 실패해도 승인은 정상 처리
    console.error('승인 완료 카카오톡 발송 실패:', error);
  }
}

// 7-2. 카카오톡 알림톡 발송 (승인 반려의 경우) - 기존 코드
if (
  status === "rejected" &&
  requesterData?.phone &&
  kakaoClientService.canSendKakao(requesterData.phone)
) {
  // ... 기존 반려 처리 코드 ...
}
```

## 구현 순서

1. **kakao.client.service.ts** 파일에 승인 완료 메서드 추가
2. **supabase/functions/send-kakao/index.ts** Edge Function에 새 타입 처리 추가
3. **approval.service.ts** 파일에서 승인 시 카카오톡 발송 로직 추가
4. 테스트 및 검증

## 주의사항

### 에러 처리
- 카카오톡 발송 실패가 전체 승인 프로세스를 막지 않도록 try-catch로 처리
- 발송 실패 시 콘솔 로그만 기록하고 프로세스는 계속 진행

### 유효성 검사
- 전화번호가 없거나 유효하지 않은 경우 자동으로 스킵
- `kakaoClientService.canSendKakao()` 메서드로 사전 검증

### 로깅
- 성공/실패 여부를 콘솔에 기록
- 실패 시 상세 에러 정보 포함

## 테스트 시나리오

1. **정상 케이스**
   - 대시보드에서 승인 버튼 클릭
   - 승인 완료 시 카카오톡 정상 발송
   - 이메일과 카카오톡 모두 발송 확인

2. **예외 케이스**
   - 전화번호 없는 사용자: 이메일만 발송
   - 잘못된 전화번호: 이메일만 발송, 카카오톡 스킵
   - 카카오톡 API 오류: 이메일은 정상 발송, 에러 로그 기록

3. **검증 항목**
   - 템플릿 변수가 올바르게 전달되는지 확인
   - 한국 시간 형식이 정확한지 확인
   - 카테고리 정보가 제대로 표시되는지 확인

## 추가 고려사항

### 카테고리 정보 소스
현재 구현에서는 `history_logs` 테이블에서 카테고리 정보를 조회하고 있음:
- 승인 요청 시 생성된 로그에서 카테고리 정보 조회
- 타임스탬프 기반으로 매칭 (±2초 범위)
- 찾지 못한 경우 기본값 "승인요청" 사용

### 성능 최적화
- 카카오톡 발송은 비동기로 처리하되, await로 완료까지 대기
- 타임아웃 설정 (30초)으로 무한 대기 방지
- 발송 실패가 승인 프로세스를 차단하지 않도록 구현

### 보안
- 전화번호 형식 검증 철저히 수행
- API 키와 시크릿 키는 환경 변수로 관리 (이미 구현됨)
- 템플릿 ID는 코드에 하드코딩되어 있으나, 추후 환경 변수로 이동 고려

## 예상 결과

구현 완료 시:
1. 사용자가 대시보드에서 승인 요청을 승인할 때
2. 요청자에게 이메일과 함께 카카오톡 알림톡이 발송됨
3. 승인 완료 메시지와 함께 프로젝트 정보 확인 가능
4. 시스템 로그에 발송 성공/실패 기록

## 관련 파일 목록

- `/lib/services/kakao.client.service.ts` - 카카오톡 클라이언트 서비스
- `/supabase/functions/send-kakao/index.ts` - Edge Function
- `/lib/services/approval.service.ts` - 승인 서비스
- `/components/dashboard/PendingApprovals.tsx` - 대시보드 승인 UI
- `/types/kakao.ts` - 카카오톡 타입 정의 (필요 시 수정)