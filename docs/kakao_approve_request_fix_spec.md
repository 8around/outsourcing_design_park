# SOLAPI 카카오톡 알림톡 발송 오류 해결 방안

## 1. 문제 현황

### 오류 메시지
```json
{
  "status": 400,
  "statusText": "Bad Request",
  "data": {
    "errorCode": "SignatureDoesNotMatch",
    "errorMessage": "생성한 signature를 확인하세요."
  }
}
```

### 오류 발생 위치
- **파일**: `/supabase/functions/send-kakao/index.ts`
- **함수**: `generateSignature` (line 169-189)
- **발생 시점**: 프로젝트 상세페이지 히스토리 로그 작성 시

## 2. 근본 원인 분석

### 현재 코드 문제점
```typescript
// 현재 잘못된 코드 (line 172)
const data = date + salt
```

### 문제 설명
1. SOLAPI API는 HMAC-SHA256 서명 생성 시 `apiKey + date + salt` 형식을 요구
2. 현재 코드는 API 키를 서명 데이터에 포함하지 않음
3. Authorization 헤더(line 109)와 실제 서명이 불일치하여 서버 검증 실패

## 3. 해결 방안

### 코드 수정 내용

#### `/supabase/functions/send-kakao/index.ts` 수정

**수정 전 (line 169-189):**
```typescript
async function generateSignature(date: string, salt: string): Promise<string> {
  const data = date + salt  // ❌ API 키 누락
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
```

**수정 후:**
```typescript
async function generateSignature(date: string, salt: string): Promise<string> {
  const data = SOLAPI_API_KEY + date + salt  // ✅ API 키 포함
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
```

### 핵심 변경사항
- **Line 172**: `const data = date + salt` → `const data = SOLAPI_API_KEY + date + salt`

## 4. 구현 절차

1. **코드 수정**
   - `/supabase/functions/send-kakao/index.ts` 파일 열기
   - Line 172 수정: API 키를 서명 데이터에 포함

2. **Supabase Edge Function 재배포**
   ```bash
   supabase functions deploy send-kakao
   ```

3. **테스트 및 검증**
   - 프로젝트 상세페이지에서 히스토리 로그 작성
   - 카카오톡 알림톡 정상 발송 확인
   - Supabase 로그에서 오류 메시지 확인

## 5. 예상 결과

### 수정 전
- SOLAPI 서버에서 "SignatureDoesNotMatch" 오류 반환
- 카카오톡 알림톡 발송 실패

### 수정 후
- SOLAPI 서명 검증 통과
- 카카오톡 알림톡 정상 발송
- 히스토리 로그 작성 시 관련자에게 알림 전달

## 6. 추가 고려사항

### 환경 변수 확인
- `SOLAPI_API_KEY`: 올바른 API 키 설정 확인
- `SOLAPI_SECRET_KEY`: 올바른 시크릿 키 설정 확인

### SOLAPI 인증 패턴
- HMAC-SHA256 서명: `apiKey + date + salt` 문자열을 시크릿 키로 해시
- Authorization 헤더: `HMAC-SHA256 apiKey={key}, date={date}, salt={salt}, signature={signature}`
- 서명은 Base64로 인코딩되어야 함

## 7. 참고 자료

- SOLAPI 공식 문서: HMAC-SHA256 인증 방식
- 오류 발생 시점: 프로젝트 승인 요청 시 카카오톡 알림 발송
- 관련 파일: `/lib/services/logs.service.ts` (카카오톡 발송 트리거)