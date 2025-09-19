/**
 * Supabase Edge Function for sending Kakao Alimtalk notifications
 * SOLAPI를 통한 카카오톡 알림톡 발송
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SOLAPI_API_KEY = Deno.env.get('SOLAPI_API_KEY')!
const SOLAPI_SECRET_KEY = Deno.env.get('SOLAPI_SECRET_KEY')!
const SOLAPI_BASE_URL = 'https://api.solapi.com'

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
    
    // 프로젝트 승인 요청 타입만 처리
    if (type === 'project-approval-request') {
      const result = await sendKakaoAlimtalk(data)
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

/**
 * SOLAPI를 통한 카카오톡 알림톡 발송
 */
async function sendKakaoAlimtalk(data: any) {
  const { to, templateId, variables } = data
  
  // 필수 파라미터 검증
  if (!to || !templateId || !variables) {
    throw new Error('필수 파라미터가 누락되었습니다. (to, templateId, variables)')
  }

  // SOLAPI API 키 검증
  if (!SOLAPI_API_KEY || !SOLAPI_SECRET_KEY) {
    throw new Error('SOLAPI API 키가 설정되지 않았습니다.')
  }
  
  // HMAC-SHA256 서명 생성
  const date = new Date().toISOString()
  const salt = crypto.randomUUID()
  const signature = await generateSignature(date, salt)
  
  // 메시지 발송 요청 데이터
  const messageData = {
    message: {
      to: formatPhoneNumber(to),
      from: '0212345678', // 발신번호 (사전 등록 필요)
      kakaoOptions: {
        pfId: 'KA01PF240919055756314twPhCJSUBgZ', // 플러스친구 ID
        templateId: templateId,
        variables: variables
      }
    }
  }

  console.log('Sending Kakao message:', {
    to: formatPhoneNumber(to),
    templateId,
    variables
  })
  
  // SOLAPI API 호출
  const response = await fetch(`${SOLAPI_BASE_URL}/messages/v4/send`, {
    method: 'POST',
    headers: {
      'Authorization': `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(messageData)
  })
  
  const responseData = await response.json()
  
  if (!response.ok) {
    console.error('SOLAPI API error:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData
    })
    throw new Error(`SOLAPI API 오류: ${response.status} ${response.statusText}`)
  }
  
  console.log('Kakao message sent successfully:', responseData)
  return responseData
}

/**
 * 전화번호를 국제 형식으로 변환
 */
function formatPhoneNumber(phone: string): string {
  // 숫자만 추출
  const cleaned = phone.replace(/[^0-9]/g, '')
  
  // 이미 국가코드가 있는 경우
  if (cleaned.startsWith('82')) {
    return cleaned
  }
  
  // 010으로 시작하는 한국 번호
  if (cleaned.startsWith('010')) {
    return '82' + cleaned.substring(1)
  }
  
  // 기타 한국 번호 (011, 016, 017, 018, 019)
  if (cleaned.startsWith('01')) {
    return '82' + cleaned.substring(1)
  }
  
  // 일반 지역번호 (02, 031, 032 등)
  if (cleaned.length >= 9) {
    // 02로 시작하는 서울 번호
    if (cleaned.startsWith('02')) {
      return '82' + cleaned.substring(1)
    }
    // 3자리 지역번호
    if (cleaned.startsWith('0')) {
      return '82' + cleaned.substring(1)
    }
  }
  
  // 기본적으로 그대로 반환
  return cleaned
}

/**
 * HMAC-SHA256 서명 생성
 */
async function generateSignature(date: string, salt: string): Promise<string> {
  const data = date + salt
  const encoder = new TextEncoder()
  
  // HMAC 키 생성
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SOLAPI_SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  // 서명 생성
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  
  // Base64 인코딩
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}