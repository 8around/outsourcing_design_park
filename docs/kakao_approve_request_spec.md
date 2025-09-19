# 카카오톡 승인 요청 알림 기능 명세서

## 1. 기능 개요

### 1.1 목적
프로젝트 상세 페이지에서 로그 작성 시 승인 요청을 생성하면, 승인자에게 카카오톡 알림톡을 발송하여 신속한 승인 처리를 유도합니다.

### 1.2 기본 정보
- **템플릿 ID**: `KA01TP250919055855314funPPq4lwbZ`
- **메시지 유형**: 알림톡 (승인 요청)
- **발송 서비스**: SOLAPI
- **발송 시점**: 승인 요청 로그 생성 시

### 1.3 템플릿 내용
```
승인 요청 메시지입니다.

프로젝트: #{site_name} - #{product_name}
요청자: #{requester_name}
카테고리: #{category}
요청 사유: #{memo}
요청 시간: #{created_at}

시스템에서 상세 내용을 확인해 주세요.
```

- site_name: 현장명
- product_name: 제품명
- requester_name: 로그 생성시 요청한 사용자 이름
- category: 로그 작성시 선택한 카테고리
- memo: 로그 내용
- created_at: 로그 작성 시간

## 2. 시스템 아키텍처

### 2.1 기존 시스템 흐름
```
사용자 → 로그 작성 폼 → 승인 요청 추가 → logService.createApprovalRequestLog() 
→ history_logs 생성 → approval_requests 생성 → 이메일 발송
```

### 2.2 개선된 시스템 흐름
```
사용자 → 로그 작성 폼 → 승인 요청 추가 → logService.createApprovalRequestLog() 
→ history_logs 생성 → approval_requests 생성 → 이메일 발송 + 카카오톡 발송
```

### 2.3 컴포넌트 구조
```
┌─────────────────────┐
│  Project Detail     │
│     (page.tsx)      │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   LogFormSimple     │
│  (component.tsx)    │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│    Log Service      │
│ (logs.service.ts)   │
└─────┬───────────────┘
      │
      ├─► Email Service (기존)
      │
      └─► Kakao Service (신규)
           │
           └─► Supabase Edge Function
                 │
                 └─► SOLAPI API
```

## 3. 구현 상세

### 3.1 파일 구조
```
projectAdminManagment/
├── lib/
│   └── services/
│       ├── kakao.service.ts          # 신규 - Kakao 서비스 (서버)
│       ├── kakao.client.service.ts   # 신규 - Kakao 클라이언트
│       └── logs.service.ts           # 수정 - 카카오톡 발송 추가
│
├── supabase/
│   └── functions/
│       └── send-kakao/               # 신규 - Edge Function
│           └── index.ts
│
└── types/
    └── kakao.ts                      # 신규 - 타입 정의
```

### 3.2 Kakao Service 구현 (`lib/services/kakao.service.ts`)

```typescript
import { createClient } from '@/lib/supabase/server'
import type { KakaoApprovalRequest } from '@/types/kakao'

class KakaoService {
  /**
   * 프로젝트 승인 요청 카카오톡 발송
   */
  async sendProjectApprovalRequest(data: KakaoApprovalRequest) {
    const supabase = createClient()
    
    try {
      const { data: result, error } = await supabase.functions.invoke('send-kakao', {
        body: {
          type: 'project-approval-request',
          data: {
            to: data.approverPhone,
            templateId: 'KA01TP250919055855314funPPq4lwbZ',
            variables: {
              site_name: data.siteName,
              product_name: data.productName,
              requester_name: data.requesterName,
              category: data.category,
              memo: data.memo,
              created_at: new Date().toLocaleString('ko-KR')
            }
          }
        }
      })
      
      if (error) throw error
      return result
    } catch (error) {
      console.error('카카오톡 발송 실패:', error)
      // 실패해도 프로세스는 계속 진행
      return null
    }
  }
}

export const kakaoService = new KakaoService()
```

### 3.3 Supabase Edge Function (`supabase/functions/send-kakao/index.ts`)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SOLAPI_API_KEY = Deno.env.get('SOLAPI_API_KEY')!
const SOLAPI_SECRET_KEY = Deno.env.get('SOLAPI_SECRET_KEY')!
const SOLAPI_BASE_URL = 'https://api.solapi.com'

serve(async (req) => {
  // CORS 설정
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, data } = await req.json()
    
    if (type === 'project-approval-request') {
      const result = await sendKakaoAlimtalk(data)
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    throw new Error(`Unknown type: ${type}`)
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

async function sendKakaoAlimtalk(data: any) {
  const { to, templateId, variables } = data
  
  // HMAC 서명 생성 (SOLAPI 인증)
  const date = new Date().toISOString()
  const salt = crypto.randomUUID()
  const signature = await generateSignature(date, salt)
  
  // 메시지 발송 요청
  const response = await fetch(`${SOLAPI_BASE_URL}/messages/v4/send`, {
    method: 'POST',
    headers: {
      'Authorization': `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        to: formatPhoneNumber(to),
        from: '0212345678', // 발신번호 (사전 등록 필요)
        kakaoOptions: {
          pfId: 'KA01PF240919055756314twPhCJSUBgZ', // 플러스친구 ID
          templateId: templateId,
          variables: variables
        }
      }
    })
  })
  
  if (!response.ok) {
    throw new Error(`SOLAPI error: ${response.statusText}`)
  }
  
  return await response.json()
}

function formatPhoneNumber(phone: string): string {
  // 한국 번호 형식으로 변환
  const cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('82')) {
    return cleaned
  }
  if (cleaned.startsWith('010')) {
    return '82' + cleaned.substring(1)
  }
  return cleaned
}

async function generateSignature(date: string, salt: string): Promise<string> {
  const data = date + salt
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SOLAPI_SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}
```

### 3.4 Client Service (`lib/services/kakao.client.service.ts`)

```typescript
import { createClient } from '@/lib/supabase/client'

class KakaoClientService {
  async sendProjectApprovalRequest(
    approverPhone: string,
    requesterName: string,
    siteName: string,
    productName: string,
    category: string,
    memo: string
  ) {
    const supabase = createClient()
    
    const { data, error } = await supabase.functions.invoke('send-kakao', {
      body: {
        type: 'project-approval-request',
        data: {
          to: approverPhone,
          templateId: 'KA01TP250919055855314funPPq4lwbZ',
          variables: {
            site_name: siteName,
            product_name: productName,
            requester_name: requesterName,
            category: category,
            memo: memo,
            created_at: new Date().toLocaleString('ko-KR')
          }
        }
      }
    })
    
    if (error) throw error
    return data
  }
}

export const kakaoClientService = new KakaoClientService()
```

### 3.5 Log Service 수정 (`lib/services/logs.service.ts`)

```typescript
// 기존 import에 추가
import { kakaoClientService } from '@/lib/services/kakao.client.service'

// createApprovalRequestLog 메서드 수정
async createApprovalRequestLog(data: CreateApprovalRequestLog & { attachments?: AttachmentFile[] }) {
  // ... 기존 코드 (1-143번 줄)

  // 4. 승인자 정보 가져오기 (이메일과 전화번호 포함)
  const { data: approverData } = await supabase
    .from('users')
    .select('email, phone')  // phone 추가
    .eq('id', data.approver_id)
    .single()

  // 5. 프로젝트 정보 가져오기
  const { data: projectData } = await supabase
    .from('projects')
    .select('site_name, product_name')  // product_name 추가
    .eq('id', data.project_id)
    .single()

  // 6. 이메일 발송 (기존)
  if (approverData?.email) {
    try {
      await emailClientService.sendProjectApprovalRequest(
        approverData.email,
        data.requester_name,
        projectData?.site_name || '프로젝트',
        data.project_id,
        data.memo,
        data.category || '승인요청'
      )
      console.log('승인 요청 이메일 발송 성공')
    } catch (error) {
      console.error('승인 요청 이메일 발송 실패:', error)
    }
  }

  // 7. 카카오톡 발송 (신규)
  if (approverData?.phone) {
    try {
      await kakaoClientService.sendProjectApprovalRequest(
        approverData.phone,
        data.requester_name,
        projectData?.site_name || '프로젝트',
        projectData?.product_name || '제품',
        data.category || '승인요청',
        data.memo
      )
      console.log('승인 요청 카카오톡 발송 성공')
    } catch (error) {
      console.error('승인 요청 카카오톡 발송 실패:', error)
    }
  }

  return approvalRequest
}
```

### 3.6 타입 정의 (`types/kakao.ts`)

```typescript
export interface KakaoApprovalRequest {
  approverPhone: string
  siteName: string
  productName: string
  requesterName: string
  category: string
  memo: string
}

export interface KakaoMessage {
  to: string
  templateId: string
  variables: Record<string, string>
}

export interface SolapiResponse {
  groupId: string
  messageId: string
  statusCode: string
  statusMessage: string
}
```

## 4. 환경 설정

### 4.1 환경 변수 (`.env.local`)
```env
# 이미 설정되어 있음
SOLAPI_API_KEY=CK6MLONXADMCRGADPJMIVP2POLIE4O4M
SOLAPI_SECRET_KEY=NCSSFYIOV8WFGF2H
```

### 4.2 Supabase Edge Function 배포
```bash
# Edge Function 생성 및 배포
supabase functions new send-kakao
supabase functions deploy send-kakao
```

## 5. 테스트 시나리오

### 5.1 정상 케이스
1. 전화번호가 있는 승인자에게 승인 요청
   - 이메일 발송 ✓
   - 카카오톡 발송 ✓

### 5.2 부분 실패 케이스
1. 전화번호가 없는 승인자
   - 이메일 발송 ✓
   - 카카오톡 발송 스킵 (에러 없음)

2. 카카오톡 발송 실패
   - 이메일 발송 ✓
   - 카카오톡 발송 실패 (로그만 남기고 계속)
   - 승인 요청은 정상 생성

### 5.3 테스트 데이터
```javascript
// 테스트용 승인 요청 데이터
{
  project_id: "test-project-id",
  category: "사양변경",
  memo: "긴급 사양 변경 승인 필요",
  requester_id: "user-id",
  requester_name: "홍길동",
  approver_id: "approver-id",
  approver_name: "김승인"
}
```

## 6. 보안 및 주의사항

### 6.1 보안
- SOLAPI API 키는 서버 사이드(Edge Function)에서만 사용
- 전화번호는 개인정보이므로 로그에 전체 번호 노출 금지
- HMAC-SHA256 서명으로 API 인증

### 6.2 주의사항
- 발신번호는 SOLAPI에 사전 등록 필요
- 플러스친구 ID와 템플릿 ID 확인 필수
- 국제 전화번호 형식 처리 (한국: 82)
- 알림톡 템플릿 변수명 정확히 매칭

### 6.3 에러 처리
- 카카오톡 발송 실패가 전체 프로세스를 중단시키지 않음
- 각 단계별 try-catch로 격리된 에러 처리
- 실패 시 console.error로 로깅만 수행

## 7. 향후 개선 사항

### 7.1 단기
- [ ] 발송 결과 DB 저장
- [ ] 재발송 기능
- [ ] 발송 상태 확인 UI

### 7.2 장기
- [ ] 다양한 알림 템플릿 지원
- [ ] 사용자별 알림 설정 (이메일/카카오톡 선택)
- [ ] 대량 발송 지원
- [ ] 발송 통계 대시보드

## 8. 참고 자료

### 8.1 API 문서
- [SOLAPI 공식 문서](https://docs.solapi.com/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

### 8.2 템플릿 정보
- 템플릿 ID: `KA01TP250919055855314funPPq4lwbZ`
- 플러스친구: 프로젝트 현장 관리 시스템
- 템플릿 검수 상태: 승인됨

---

*작성일: 2025-09-19*
*작성자: Claude AI Assistant*
*버전: 1.0*