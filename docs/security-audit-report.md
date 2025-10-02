# 🔒 보안 검사 결과 및 개선 계획

**검사 일자**: 2025-10-02
**검사 범위**: 프로젝트 현장 관리 솔루션 전체
**검사 방법**: 정적 코드 분석, 보안 패턴 검증, 아키텍처 리뷰

---

## 📋 종합 보안 평가

**전반적 보안 수준**: ⚠️ **중간** (8개 주요 취약점 발견)

---

## 🚨 발견된 보안 취약점

### 1. 🔴 **HIGH: 민감 정보 하드코딩**

**파일**: `supabase/functions/send-kakao/index.ts`

**문제**: 발신번호와 플러스친구 ID가 코드에 하드코딩됨 (108, 112줄)

```typescript
from: "****", // 발신번호 하드코딩
pfId: "********", // 플러스친구 ID 하드코딩
```

**위험도**: 🔴 HIGH
- 코드 유출 시 민감 정보 노출
- 변경 시 재배포 필요
- 보안 감사 시 컴플라이언스 문제 발생 가능

**권장 조치**:
```typescript
// 환경 변수로 이동
const SOLAPI_FROM_NUMBER = Deno.env.get("SOLAPI_FROM_NUMBER")!;
const SOLAPI_PF_ID = Deno.env.get("SOLAPI_PF_ID")!;

// 사용
from: SOLAPI_FROM_NUMBER,
kakaoOptions: {
  pfId: SOLAPI_PF_ID,
  // ...
}
```

---

### 2. 🔴 **HIGH: 환경 변수 검증 부재**

**파일**:
- `lib/supabase/client.ts` (5-6줄)
- `lib/supabase/server.ts` (8-9줄)
- `lib/supabase/middleware.ts` (10-11줄)

**문제**: Non-null assertion (`!`) 사용으로 환경 변수 검증 없음

```typescript
process.env.NEXT_PUBLIC_SUPABASE_URL!,  // 검증 없이 ! 사용
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
```

**위험도**: 🔴 HIGH
- 환경 변수 누락 시 런타임 에러 발생
- 프로덕션 배포 시 치명적인 장애 가능성
- 디버깅 어려움

**권장 조치**:

```typescript
// lib/config/env.ts 생성
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is missing`);
  }
  return value;
}

// 사용
const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
```

---

### 3. 🟡 **MEDIUM: 비밀번호 재설정 보안 강화 필요**

**파일**: `lib/services/auth.service.ts` (296-336줄)

**현재 상태**:
- ✅ PKCE flow 사용 (client.ts:10)
- ✅ 이메일 인증 후 세션 종료 (328줄)
- ⚠️ Rate limiting 없음
- ⚠️ 재설정 링크 유효시간 명시 없음

**위험도**: 🟡 MEDIUM
- 무차별 대입 공격(brute force) 가능성
- 이메일 스팸 발송 악용 가능

**권장 개선**:

1. **Rate Limiting 추가**
```typescript
// lib/utils/rate-limiter.ts
export class RateLimiter {
  private attempts = new Map<string, { count: number; resetAt: number }>();

  checkLimit(email: string, maxAttempts = 3, windowMs = 3600000): boolean {
    const now = Date.now();
    const record = this.attempts.get(email);

    if (!record || now > record.resetAt) {
      this.attempts.set(email, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }
}
```

2. **재설정 링크 유효시간 명시**
```typescript
const { error } = await this.supabase.auth.resetPasswordForEmail(
  data.email,
  {
    redirectTo: `${window.location.origin}/reset-password/confirm`,
    // Supabase 기본값: 1시간
  }
);
```

3. **재설정 완료 알림 이메일**
```typescript
// 비밀번호 변경 완료 후
await emailService.sendPasswordResetConfirmation(user.email);
```

---

### 4. 🟡 **MEDIUM: 승인 워크플로우 권한 강화 필요**

**파일**: `lib/supabase/middleware.ts` (123-132줄)

**현재 상태**:
- ✅ Admin 경로 접근 제어 구현
- ⚠️ 승인 요청 생성 시 대상자 검증 부재
- ⚠️ 프로젝트 접근 권한 검증 부재

**위험도**: 🟡 MEDIUM
- 권한 없는 사용자가 임의의 승인 요청 생성 가능
- 권한 없는 프로젝트에 대한 승인 요청 가능

**권장 개선**:

```typescript
// lib/services/approval.service.ts
async createApprovalRequest(data: ApprovalRequestData) {
  // 1. approver_id가 실제 admin인지 검증
  const { data: approver } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.approverId)
    .single();

  if (approver?.role !== 'admin') {
    throw new Error('승인자는 관리자여야 합니다.');
  }

  // 2. 요청자가 해당 프로젝트에 접근 권한이 있는지 검증
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', data.projectId)
    .single();

  if (!project) {
    throw new Error('프로젝트 접근 권한이 없습니다.');
  }

  // 승인 요청 생성
  // ...
}
```

---

### 5. 🟡 **MEDIUM: XSS 방어 강화**

**현재 상태**:
- ✅ `dangerouslySetInnerHTML` 사용 없음
- ✅ Next.js 자동 escaping 활용
- ⚠️ 사용자 입력 데이터 sanitization 부재
- ⚠️ Content Security Policy (CSP) 헤더 없음

**위험도**: 🟡 MEDIUM
- 악의적인 스크립트 삽입 가능성
- XSS 공격 벡터 존재

**권장 개선**:

1. **사용자 입력 Sanitization**
```typescript
// lib/utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // 태그 허용 안함
    ALLOWED_ATTR: [],
  });
}

// 사용 예시
const sanitizedContent = sanitizeInput(userInput);
```

2. **CSP 헤더 추가** (next.config.js)
```javascript
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*.supabase.co;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim() },
      ],
    },
  ];
}
```

---

### 6. 🟡 **MEDIUM: 파일 업로드 보안 강화**

**파일**: `components/logs/GlobalLogFeed.tsx`, `LogList.tsx`

**현재 상태**:
- ✅ Supabase Storage 사용
- ⚠️ 파일 타입 검증 미흡
- ⚠️ 파일 크기 제한 클라이언트만 의존
- ⚠️ 파일명 sanitization 없음

**위험도**: 🟡 MEDIUM
- 악성 파일 업로드 가능성
- Path traversal 공격 가능성
- 서버 리소스 고갈 가능성

**권장 개선**:

1. **Edge Function에서 파일 검증**
```typescript
// supabase/functions/validate-file/index.ts
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

async function validateFile(file: File) {
  // MIME type 검증
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('허용되지 않은 파일 형식입니다.');
  }

  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기가 20MB를 초과합니다.');
  }

  // 파일명 sanitization
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);

  return { isValid: true, sanitizedName };
}
```

2. **파일 확장자 검증**
```typescript
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];

function validateExtension(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return ALLOWED_EXTENSIONS.includes(ext);
}
```

---

### 7. 🟢 **LOW: Rate Limiting 부재**

**파일**: Edge Functions 전체

**현재 상태**:
- ⚠️ API rate limiting 미구현

**위험도**: 🟢 LOW
- API 남용 가능성
- DDoS 공격에 취약

**권장 개선**:

```typescript
// Edge Function에 rate limiting 추가
import { RateLimiter } from "https://deno.land/x/rate_limiter@v1.0.0/mod.ts";

const limiter = new RateLimiter({
  windowMs: 60000, // 1분
  maxRequests: 10, // 1분에 10회
});

serve(async (req) => {
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  if (!limiter.check(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429 }
    );
  }

  // 정상 처리
  // ...
});
```

**또는 Supabase Auth Rate Limit 활용**:
```sql
-- Supabase Dashboard > Authentication > Rate Limits
-- Email/Password: 5 attempts per hour
-- SMS: 3 attempts per hour
```

---

### 8. 🟢 **LOW: Security Headers 미흡**

**파일**: `next.config.js`

**현재 상태**:
- ⚠️ 보안 헤더 설정 없음

**위험도**: 🟢 LOW
- Clickjacking 공격 가능성
- MIME sniffing 공격 가능성

**권장 개선**:

```javascript
// next.config.js
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Clickjacking 방어
          { key: 'X-Frame-Options', value: 'DENY' },

          // MIME sniffing 방어
          { key: 'X-Content-Type-Options', value: 'nosniff' },

          // XSS 필터 활성화
          { key: 'X-XSS-Protection', value: '1; mode=block' },

          // Referrer 정책
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          // Permissions 정책
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
          },

          // HSTS (HTTPS 강제)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
        ],
      },
    ];
  },

  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '**',
      },
    ],
  },
}

module.exports = nextConfig
```

---

## ✅ 잘 구현된 보안 요소

### 1. **인증/인가 시스템**
- ✅ Supabase Auth 기반 JWT 토큰 인증
- ✅ PKCE flow 사용 (OAuth 2.0 보안 강화)
- ✅ 미들웨어 기반 라우트 보호
- ✅ 승인 기반 접근 제어 (is_approved)
- ✅ 역할 기반 접근 제어 (admin/user)
- ✅ 미승인 사용자 자동 로그아웃
- ✅ 비밀번호 재설정 후 세션 종료

**구현 상세**:
```typescript
// middleware.ts - 라우트 보호
const protectedPaths = ['/dashboard', '/projects', '/admin', ...];
if (protectedPaths.some(path => pathname.startsWith(path))) {
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 승인 상태 확인
  const { data: userData } = await supabase
    .from('users')
    .select('is_approved, role')
    .eq('id', session.user.id)
    .single();

  if (!userData?.is_approved) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?message=approval_pending', request.url));
  }
}
```

### 2. **데이터베이스 보안**
- ✅ Row Level Security (RLS) 정책 완벽 구현
- ✅ Foreign Key 제약조건으로 참조 무결성 보장
- ✅ CASCADE 삭제로 고아 레코드 방지
- ✅ 논리 삭제 (is_deleted) 구현
- ✅ Auth와 Users 테이블 FK 동기화

**RLS 정책 예시**:
```sql
-- 승인된 사용자만 프로젝트 조회 가능
CREATE POLICY "Approved users can view projects"
ON projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 관리자만 로그 삭제 가능
CREATE POLICY "Admins can delete logs"
ON history_logs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

### 3. **세션 관리**
- ✅ 안전한 쿠키 기반 세션 관리
- ✅ HttpOnly, Secure 쿠키 속성 활용
- ✅ 세션 자동 갱신 (Supabase SSR)
- ✅ 이메일 인증 후 재로그인 유도

### 4. **API 보안**
- ✅ CORS 헤더 적절히 구성
- ✅ Edge Functions에서 환경 변수로 API 키 관리
- ✅ 메서드 검증 (OPTIONS, POST만 허용)
- ✅ 입력 데이터 파싱 및 검증

**Edge Function 보안 패턴**:
```typescript
// CORS 설정
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OPTIONS 요청 처리
if (req.method === "OPTIONS") {
  return new Response("ok", { headers: corsHeaders });
}

// 메서드 검증
if (req.method !== "POST") {
  return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    { status: 405, headers: corsHeaders }
  );
}
```

---

## 📝 개선 계획 (우선순위별)

### Phase 1: 긴급 조치 (1-2일) 🔴

**목표**: 즉각적인 보안 위험 제거

1. **환경 변수 검증 로직 추가**
   - 파일: `lib/config/env.ts` 생성
   - 영향: `lib/supabase/client.ts`, `server.ts`, `middleware.ts`
   - 작업 시간: 2시간

2. **하드코딩된 민감 정보 제거**
   - 파일: `supabase/functions/send-kakao/index.ts`
   - 환경 변수 추가: `SOLAPI_FROM_NUMBER`, `SOLAPI_PF_ID`
   - 작업 시간: 1시간

3. **보안 헤더 추가**
   - 파일: `next.config.js`
   - 헤더: X-Frame-Options, X-Content-Type-Options, CSP 등
   - 작업 시간: 1시간

**완료 기준**:
- [ ] 모든 환경 변수 검증 통과
- [ ] 하드코딩된 민감 정보 0건
- [ ] 보안 헤더 적용 확인 (브라우저 개발자 도구)

---

### Phase 2: 중요 개선 (1주일) 🟡

**목표**: 핵심 보안 취약점 해결

4. **승인 워크플로우 권한 검증 강화**
   - 파일: `lib/services/approval.service.ts`
   - 기능: approver 검증, 프로젝트 접근 권한 검증
   - 작업 시간: 4시간

5. **파일 업로드 보안 강화**
   - 파일: `supabase/functions/validate-file/index.ts` 생성
   - 기능: MIME type 검증, 크기 제한, 파일명 sanitization
   - 작업 시간: 6시간

6. **사용자 입력 데이터 Sanitization**
   - 파일: `lib/utils/sanitize.ts` 생성
   - 라이브러리: DOMPurify
   - 영향 범위: 로그, 메모, 프로젝트명 등
   - 작업 시간: 4시간

**완료 기준**:
- [ ] 승인 요청 시 권한 검증 테스트 통과
- [ ] 악성 파일 업로드 차단 확인
- [ ] XSS 공격 시나리오 테스트 통과

---

### Phase 3: 권장 개선 (2주일) 🟢

**목표**: 종합적인 보안 강화

7. **Rate Limiting 구현**
   - 대상: Edge Functions 전체
   - 기능: IP 기반 요청 제한
   - 작업 시간: 8시간

8. **비밀번호 재설정 보안 강화**
   - 파일: `lib/utils/rate-limiter.ts`, `lib/services/auth.service.ts`
   - 기능: Rate limiting, 알림 이메일
   - 작업 시간: 4시간

9. **Content Security Policy (CSP) 헤더 추가**
   - 파일: `next.config.js`
   - 기능: 엄격한 CSP 정책 적용
   - 작업 시간: 3시간

**완료 기준**:
- [ ] Rate limiting 동작 확인
- [ ] 비밀번호 재설정 공격 시나리오 차단
- [ ] CSP 정책 위반 없음 확인

---

## 🎯 보안 검사 도구 및 자동화

### 1. 의존성 취약점 스캔

```bash
# 의존성 취약점 검사
npm audit

# 자동 수정 (주의: 호환성 확인 필요)
npm audit fix

# 상세 보고서
npm audit --json > audit-report.json
```

**권장 주기**: 주 1회

### 2. 정적 분석 도구

```bash
# ESLint Security Plugin 설치
npm install --save-dev eslint-plugin-security

# .eslintrc.json 설정
{
  "plugins": ["security"],
  "extends": ["plugin:security/recommended"]
}

# 실행
npm run lint
```

**권장 주기**: 매 커밋마다 (pre-commit hook)

### 3. Supabase 보안 검사

```bash
# 데이터베이스 Lint
supabase db lint

# RLS 정책 검사
supabase inspect db --check-rls

# 마이그레이션 검증
supabase db diff
```

**권장 주기**: 배포 전 필수

### 4. CI/CD 파이프라인 통합

```yaml
# .github/workflows/security-check.yml
name: Security Check

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Dependency Audit
        run: npm audit --audit-level=moderate

      - name: Security Lint
        run: npm run lint

      - name: Supabase RLS Check
        run: supabase inspect db --check-rls
```

---

## 📊 보안 점수

| 항목 | 점수 | 상태 | 주요 강점 | 개선 필요 |
|------|------|------|-----------|----------|
| **인증/인가** | 9/10 | ✅ 우수 | PKCE flow, RLS 정책 | Rate limiting |
| **데이터베이스 보안** | 10/10 | ✅ 우수 | 완벽한 RLS, FK 제약 | - |
| **API 보안** | 7/10 | ⚠️ 보통 | CORS 설정, 환경 변수 | 환경 변수 검증, Rate limit |
| **클라이언트 보안** | 6/10 | ⚠️ 보통 | XSS 기본 방어 | CSP, Sanitization |
| **인프라 보안** | 7/10 | ⚠️ 보통 | Supabase 보안 | 보안 헤더, 파일 검증 |
| **세션 관리** | 9/10 | ✅ 우수 | 안전한 쿠키, 자동 갱신 | - |
| **에러 처리** | 8/10 | ✅ 양호 | 적절한 에러 메시지 | 민감 정보 노출 방지 |
| **로깅/모니터링** | 7/10 | ⚠️ 보통 | 활동 추적 | 보안 이벤트 로깅 |

### **전체 평균: 7.8/10** ⚠️ 보통

---

## 🔍 보안 체크리스트

### 배포 전 필수 확인 사항

- [ ] 환경 변수 검증 로직 구현
- [ ] 하드코딩된 민감 정보 제거
- [ ] 보안 헤더 설정 완료
- [ ] RLS 정책 모든 테이블에 적용
- [ ] 관리자 계정 강력한 비밀번호 설정
- [ ] HTTPS 강제 설정 (production)
- [ ] CORS 설정 프로덕션 도메인으로 제한
- [ ] API 키 로테이션 계획 수립
- [ ] 백업 및 복구 절차 수립
- [ ] 보안 모니터링 도구 설정

### 주기적 점검 사항 (월 1회)

- [ ] 의존성 취약점 스캔
- [ ] 접근 로그 검토
- [ ] 비정상 활동 모니터링
- [ ] 사용자 권한 재검토
- [ ] 비밀번호 정책 강화 검토
- [ ] 백업 복구 테스트
- [ ] 보안 패치 적용

---

## 🎓 보안 교육 및 가이드라인

### 개발자 보안 가이드라인

1. **환경 변수 관리**
   - `.env.local`은 절대 Git에 커밋하지 않기
   - `.env.example`에 필요한 변수 목록 유지
   - 프로덕션 환경 변수는 Vercel Dashboard에서만 관리

2. **코드 리뷰 시 체크포인트**
   - 환경 변수 하드코딩 확인
   - SQL Injection 가능성 확인
   - XSS 취약점 확인
   - 권한 검증 로직 확인

3. **보안 우선 개발**
   - 기본적으로 모든 API는 인증 필요
   - 기본적으로 모든 테이블은 RLS 활성화
   - 사용자 입력은 항상 검증 및 sanitize
   - 에러 메시지에 민감 정보 포함하지 않기

---

## 📚 참고 자료

### 공식 문서
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security-best-practices)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

### 보안 도구
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [ESLint Security Plugin](https://github.com/nodesecurity/eslint-plugin-security)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [DOMPurify](https://github.com/cure53/DOMPurify)

---

## 결론

**핵심 요약**:

✅ **강점**:
- 인증/인가 시스템과 데이터베이스 보안이 매우 우수
- RLS 정책이 완벽하게 구현됨
- PKCE flow와 안전한 세션 관리

⚠️ **개선 필요**:
- 환경 변수 검증 및 민감 정보 하드코딩 제거 (긴급)
- 보안 헤더 설정 (긴급)
- 파일 업로드 및 사용자 입력 검증 강화 (중요)
- Rate limiting 구현 (권장)

**권장 조치 순서**:
1. **즉시 (1-2일)**: HIGH 우선순위 항목 해결
2. **1주일 이내**: MEDIUM 우선순위 항목 해결
3. **2주일 이내**: LOW 우선순위 항목 해결
4. **지속적**: 보안 모니터링 및 정기 점검 체계 구축

**목표**: 보안 점수 7.8/10 → 9.0/10 이상으로 향상

---

**작성자**: Claude Code Security Audit
**검사 일자**: 2025-10-02
**다음 검사 예정일**: 2025-11-02
