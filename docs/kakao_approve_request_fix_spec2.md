# SOLAPI NPM 패키지를 활용한 카카오톡 알림톡 구현 방안

## 1. 개요

### 현재 상황
- **현재 구현**: 수동 API 호출 방식 (HMAC-SHA256 서명 직접 생성)
- **제안 사항**: `solapi` npm 패키지를 사용한 구현 간소화
- **환경**: Supabase Edge Functions (Deno 런타임)

### SOLAPI NPM 패키지 정보
- **패키지명**: `solapi`
- **최신 버전**: 5.5.1
- **공식 문서**: https://solapi.github.io/solapi-nodejs/
- **GitHub**: https://github.com/solapi/solapi-nodejs
- **라이선스**: MIT

## 2. Supabase Edge Function에서 NPM 패키지 사용 방법

### 2.1 기본 개념
- **Deno 런타임**: Edge Functions는 Node.js가 아닌 Deno에서 실행
- **설치 불필요**: `npm install` 명령어 사용 불가
- **자동 로드**: import 시 Deno가 자동으로 패키지 다운로드

### 2.2 Import 방식

#### 방법 1: npm: 지정자 (권장)
```typescript
import { SolapiMessageService } from 'npm:solapi@5.5.1'
```

#### 방법 2: ESM CDN
```typescript
import { SolapiMessageService } from 'https://esm.sh/solapi@5.5.1'
```

#### 방법 3: deno.json 설정
```json
{
  "imports": {
    "solapi": "npm:solapi@5.5.1"
  }
}
```

## 3. 구현 코드

### 3.1 현재 구현 (수동 API 호출)
```typescript
// /supabase/functions/send-kakao/index.ts (현재 버전)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SOLAPI_API_KEY = Deno.env.get('SOLAPI_API_KEY')!
const SOLAPI_SECRET_KEY = Deno.env.get('SOLAPI_SECRET_KEY')!
const SOLAPI_BASE_URL = 'https://api.solapi.com'

// HMAC-SHA256 서명 생성 (수동 구현)
async function generateSignature(date: string, salt: string): Promise<string> {
  const data = SOLAPI_API_KEY + date + salt  // 수정된 부분
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

// 카카오톡 발송
async function sendKakaoAlimtalk(data: any) {
  const date = new Date().toISOString()
  const salt = crypto.randomUUID()
  const signature = await generateSignature(date, salt)
  
  const response = await fetch(`${SOLAPI_BASE_URL}/messages/v4/send`, {
    method: 'POST',
    headers: {
      'Authorization': `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(messageData)
  })
  
  // ... 응답 처리
}
```

### 3.2 NPM 패키지 사용 구현 (제안)
```typescript
// /supabase/functions/send-kakao/index.ts (NPM 패키지 버전)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SolapiMessageService } from 'npm:solapi@5.5.1'

const SOLAPI_API_KEY = Deno.env.get('SOLAPI_API_KEY')!
const SOLAPI_SECRET_KEY = Deno.env.get('SOLAPI_SECRET_KEY')!

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405 
      }
    )
  }

  try {
    // 요청 데이터 파싱
    const { type, data } = await req.json()
    
    // SolapiMessageService 인스턴스 생성
    const messageService = new SolapiMessageService(
      SOLAPI_API_KEY,
      SOLAPI_SECRET_KEY
    )
    
    // 프로젝트 승인 요청 처리
    if (type === 'project-approval-request') {
      const { to, templateId, variables } = data
      
      // 카카오톡 알림톡 발송 (간소화된 버전)
      const result = await messageService.sendOne({
        to: formatPhoneNumber(to),
        from: '0212345678',  // 발신번호 (사전 등록 필요)
        type: 'ATA',  // 알림톡 타입
        kakaoOptions: {
          pfId: 'KA01PF240919055756314twPhCJSUBgZ',  // 플러스친구 ID
          templateId: templateId,
          variables: variables
        }
      })
      
      console.log('Kakao message sent successfully:', result)
      
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    throw new Error(`Unknown message type: ${type}`)
  } catch (error) {
    console.error('Kakao send error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

// 전화번호 포맷팅 함수는 그대로 유지
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '')
  
  if (cleaned.startsWith('82')) {
    return cleaned
  }
  
  if (cleaned.startsWith('010')) {
    return '82' + cleaned.substring(1)
  }
  
  if (cleaned.startsWith('01')) {
    return '82' + cleaned.substring(1)
  }
  
  if (cleaned.length >= 9) {
    if (cleaned.startsWith('02')) {
      return '82' + cleaned.substring(1)
    }
    if (cleaned.startsWith('0')) {
      return '82' + cleaned.substring(1)
    }
  }
  
  return cleaned
}
```

## 4. 장단점 분석

### 4.1 NPM 패키지 사용 시 장점
- ✅ **코드 간소화**: HMAC 서명 생성 로직 불필요
- ✅ **유지보수 용이**: API 변경 시 패키지 업데이트로 대응
- ✅ **타입 안전성**: TypeScript 타입 정의 제공
- ✅ **에러 처리**: SDK 레벨의 에러 처리 제공
- ✅ **추가 기능**: SMS, LMS, MMS 등 다양한 메시지 타입 지원

### 4.2 NPM 패키지 사용 시 단점
- ⚠️ **호환성 불확실**: Deno 환경에서 완전히 작동하는지 테스트 필요
- ⚠️ **디버깅 어려움**: 패키지 내부 문제 발생 시 수정 불가
- ⚠️ **의존성 리스크**: 패키지 업데이트로 인한 breaking changes 가능
- ⚠️ **성능 오버헤드**: 추가 추상화 레이어로 인한 성능 저하 가능

### 4.3 현재 구현 유지 시 장점
- ✅ **검증된 동작**: 현재 프로덕션에서 작동 중
- ✅ **완전한 제어**: 모든 로직을 직접 관리
- ✅ **의존성 없음**: 외부 패키지 의존성 없음
- ✅ **Deno 네이티브**: Deno 환경에 최적화

## 5. 호환성 테스트 방안

### 5.1 로컬 테스트
```bash
# Deno 설치 (macOS)
brew install deno

# 테스트 파일 생성
cat > test-solapi.ts << EOF
import { SolapiMessageService } from 'npm:solapi@5.5.1'

const messageService = new SolapiMessageService(
  'test-api-key',
  'test-secret-key'
)

console.log('SolapiMessageService loaded successfully')
console.log('Available methods:', Object.getOwnPropertyNames(messageService))
EOF

# 실행
deno run --allow-all test-solapi.ts
```

### 5.2 Edge Function 테스트
```bash
# Edge Function 로컬 테스트
supabase functions serve send-kakao --env-file .env.local

# 별도 터미널에서 테스트 요청
curl -X POST http://localhost:54321/functions/v1/send-kakao \
  -H "Content-Type: application/json" \
  -d '{
    "type": "project-approval-request",
    "data": {
      "to": "01012345678",
      "templateId": "KA01TP240919055756314vJleVa6G4J0",
      "variables": {
        "requester": "테스트",
        "site_name": "테스트 프로젝트"
      }
    }
  }'
```

## 6. 구현 결정 기준

### NPM 패키지 사용을 권장하는 경우
- 빠른 개발이 필요한 경우
- 다양한 메시지 타입 (SMS, LMS, MMS) 지원이 필요한 경우
- SOLAPI의 다른 기능들도 활용 예정인 경우
- 팀에 Deno 경험이 있는 경우

### 현재 구현 유지를 권장하는 경우
- 이미 안정적으로 작동 중인 경우 ✅ (현재 상황)
- 카카오톡 알림톡만 필요한 경우 ✅ (현재 상황)
- 외부 의존성을 최소화하려는 경우 ✅
- 완전한 제어권이 필요한 경우 ✅

## 7. 최종 권장사항

### 🎯 현재 구현 유지 권장

**이유:**
1. **작동 확인**: 서명 문제 수정 후 정상 작동 중
2. **단순한 요구사항**: 카카오톡 알림톡만 필요
3. **리스크 최소화**: 검증되지 않은 Deno 호환성 리스크 회피
4. **유지보수 용이**: 직접 작성한 코드로 문제 발생 시 즉시 대응 가능

### 📝 추후 고려사항

NPM 패키지 도입을 고려할 시점:
- SMS, LMS 등 다른 메시지 타입 추가 시
- SOLAPI의 복잡한 기능 (대량 발송, 예약 발송 등) 필요 시
- Deno의 npm 호환성이 더욱 안정화된 이후

### 🔄 마이그레이션 전략 (필요 시)

1. **개발 환경 테스트**: 로컬 Deno 환경에서 호환성 검증
2. **스테이징 배포**: 별도 Edge Function으로 테스트
3. **A/B 테스트**: 일부 트래픽만 새 구현으로 라우팅
4. **점진적 전환**: 안정성 확인 후 완전 전환

## 8. 참고 자료

- [SOLAPI 공식 문서](https://solapi.github.io/solapi-nodejs/)
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [Deno npm 호환성 가이드](https://docs.deno.com/runtime/manual/node/npm_specifiers)
- [SOLAPI GitHub Repository](https://github.com/solapi/solapi-nodejs)