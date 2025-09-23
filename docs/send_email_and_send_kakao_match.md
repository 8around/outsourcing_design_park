# 이메일과 카카오톡 알림 템플릿 동기화 문서

## 📋 개요
이 문서는 이메일 발송 서비스(`supabase/functions/send-email`)와 카카오톡 발송 서비스(`lib/services/kakao.client.service.ts`, `supabase/functions/send-kakao`) 간의 템플릿 및 타입 동기화를 위한 분석 및 개선 계획을 담고 있습니다.

## 🔍 현재 상황 분석

### 이메일 서비스 (send-email/index.ts)
현재 지원하는 알림 타입:
- `project-approval-request` - 프로젝트 승인 요청 알림
- `project-approval-result` - 프로젝트 승인/반려 결과 (status 필드로 구분)
- `user-approval` - 사용자 승인/거절 알림
- `new-signup` - 신규 회원가입 알림 (관리자에게)

### 카카오톡 서비스 (kakao.client.service.ts & send-kakao/index.ts)
현재 지원하는 알림 타입:
- `project-approval-request` - 프로젝트 승인 요청 알림
- `project-approval-rejection` - 프로젝트 승인 반려 알림
- `project-approval-approved` - 프로젝트 승인 완료 알림

## ⚠️ 주요 문제점

### 1. 타입 명명 불일치
- **이메일**: `project-approval-result` (통합 처리, status로 구분)
- **카카오톡**: `project-approval-rejection`, `project-approval-approved` (개별 처리)

### 2. 지원 범위 차이
- 사용자 관련 알림(`user-approval`, `new-signup`)이 카카오톡에는 없음
- 이메일만 사용자 승인/거절 및 신규 가입 알림 지원

### 3. 데이터 구조 차이
```typescript
// 이메일 데이터 구조
{
  projectId: string,
  projectName: string,
  requesterName: string,
  approverEmail: string,
  memo: string,
  category: string
}

// 카카오톡 실제 Variables 구조
{
  // 프로젝트 승인 요청 (project-approval-request)
  site_name: string,        // 현장명
  product_name: string,     // 제품명
  requester_name: string,   // 요청자명
  category: string,         // 카테고리
  memo: string,            // 메모
  created_at: string       // 생성 시간 (YYYY-MM-DD HH:mm)

  // 프로젝트 승인 반려 (project-approval-rejection)
  site_name: string,
  product_name: string,
  rejector_name: string,    // 반려자명
  category: string,
  response_memo: string,    // 반려 사유
  rejected_at: string      // 반려 시간 (YYYY-MM-DD HH:mm)

  // 프로젝트 승인 완료 (project-approval-approved)
  site_name: string,
  product_name: string,
  approver_name: string,    // 승인자명
  category: string,
  approved_at: string      // 승인 시간 (YYYY-MM-DD HH:mm)
}
```

## 🎯 개선 목표
1. 이메일과 카카오톡 알림 타입 명명 규칙 통일
2. 모든 알림 유형을 양쪽 서비스에서 동일하게 지원
3. 데이터 구조 표준화 및 매핑 로직 구현
4. 템플릿 내용과 형식의 일관성 확보

## 📝 상세 개선 계획

### 1. 통일된 타입 명명 규칙

#### 프로젝트 승인 관련
| 현재 (이메일) | 현재 (카카오톡) | 개선안 |
|-------------|--------------|--------|
| project-approval-request | project-approval-request | `project-approval-request` |
| project-approval-result (approved) | project-approval-approved | `project-approval-approved` |
| project-approval-result (rejected) | project-approval-rejected | `project-approval-rejected` |

#### 사용자 관리 관련
| 현재 (이메일) | 현재 (카카오톡) | 개선안 |
|-------------|--------------|--------|
| new-signup | 미지원 | `new-signup` (유지) |
| user-approval (approved) | 미지원 | `user-approval` (유지) |
| user-approval (rejected) | 미지원 | `user-approval` (유지) |

**주요 방침**: 카카오톡 서비스는 수정하지 않고, 이메일 서비스만 카카오톡 형식에 맞춤

### 2. 파일별 수정 내용

#### 2.1 supabase/functions/send-email/index.ts
```typescript
// 변경 전
case "project-approval-result":
  result = await sendProjectApprovalResult(data);
  break;

// 변경 후
case "project-approval-approved":
  result = await sendProjectApprovalApproved(data);
  break;
case "project-approval-rejected":
  result = await sendProjectApprovalRejected(data);
  break;
```

**주요 변경 사항 (이메일 서비스만 수정):**
- `sendProjectApprovalResult` 함수를 `sendProjectApprovalApproved`와 `sendProjectApprovalRejected`로 분리
- 카카오톡과 동일한 데이터 구조 사용
- HTML 템플릿에서 현장명/제품명을 분리하여 표시

**구체적인 함수 수정:**

```typescript
// 1. 프로젝트 승인 요청 (수정)
async function sendProjectApprovalRequest(data: any) {
  const { approverEmail, requesterName, projectName, projectId, memo, category } = data;

  // projectName을 현장명과 제품명으로 분리
  const [siteName, productName] = projectName.includes(' - ')
    ? projectName.split(' - ')
    : [projectName, ''];

  const createdAt = new Date().toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });

  const html = `
    ...
    <p><strong>현장명:</strong> ${siteName}</p>
    <p><strong>제품명:</strong> ${productName}</p>
    <p><strong>요청자:</strong> ${requesterName}</p>
    <p><strong>카테고리:</strong> ${category}</p>
    <p><strong>요청 시간:</strong> ${createdAt}</p>
    ...
  `;
  // Resend로 이메일 발송
}

// 2. 프로젝트 승인 완료 (새로 생성)
async function sendProjectApprovalApproved(data: any) {
  const { requesterEmail, approverName, projectName, projectId, category } = data;

  const [siteName, productName] = projectName.includes(' - ')
    ? projectName.split(' - ')
    : [projectName, ''];

  const approvedAt = new Date().toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });

  const html = `
    ...
    <h1>프로젝트 승인 알림</h1>
    ...
    <p><strong>현장명:</strong> ${siteName}</p>
    <p><strong>제품명:</strong> ${productName}</p>
    <p><strong>승인자:</strong> ${approverName}</p>
    <p><strong>카테고리:</strong> ${category}</p>
    <p><strong>승인 시간:</strong> ${approvedAt}</p>
    ...
  `;
}

// 3. 프로젝트 승인 반려 (새로 생성)
async function sendProjectApprovalRejected(data: any) {
  const { requesterEmail, approverName, projectName, projectId, memo, category } = data;

  const [siteName, productName] = projectName.includes(' - ')
    ? projectName.split(' - ')
    : [projectName, ''];

  const rejectedAt = new Date().toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });

  const html = `
    ...
    <h1>프로젝트 반려 알림</h1>
    ...
    <p><strong>현장명:</strong> ${siteName}</p>
    <p><strong>제품명:</strong> ${productName}</p>
    <p><strong>반려자:</strong> ${approverName}</p>
    <p><strong>카테고리:</strong> ${category}</p>
    <p><strong>반려 사유:</strong> ${memo}</p>
    <p><strong>반려 시간:</strong> ${rejectedAt}</p>
    ...
  `;
}
```

#### 2.2 lib/services/kakao.client.service.ts
```typescript
// 카카오톡 서비스는 수정하지 않음 (현재 구현된 대로 유지)
// - sendProjectApprovalRequest (유지)
// - sendProjectApprovalRejection (유지)
// - sendProjectApprovalApproved (유지)
```

**참고**: 카카오톡 서비스는 이미 잘 구현되어 있으므로 수정하지 않습니다.

#### 2.3 supabase/functions/send-kakao/index.ts
```typescript
// 카카오톡 Edge Function도 수정하지 않음 (현재 구현된 대로 유지)
// 지원하는 타입:
// - project-approval-request
// - project-approval-rejection
// - project-approval-approved
```

**참고**: 사용자 관련 알림은 현재 카카오톡 템플릿이 등록되지 않아 이메일로만 발송

### 3. 데이터 구조 표준화 전략

#### 3.1 공통 인터페이스 정의
```typescript
// types/notification.ts
interface BaseNotificationData {
  type: string;
  timestamp: string;
}

interface ProjectApprovalRequestData extends BaseNotificationData {
  projectId: string;
  projectName: string;
  siteName?: string;     // 카카오톡용
  productName?: string;  // 카카오톡용
  requesterName: string;
  approverEmail?: string;
  approverPhone?: string;
  category: string;
  memo: string;
}

interface UserApprovalData extends BaseNotificationData {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  status: 'approved' | 'rejected';
  reason?: string;
}
```

#### 3.2 어댑터 패턴 적용
```typescript
// lib/utils/notification-adapter.ts
export class NotificationAdapter {
  static toEmailFormat(data: any): EmailNotificationData {
    return {
      projectId: data.projectId,
      projectName: `${data.site_name} - ${data.product_name}`,
      requesterName: data.requester_name,
      approverEmail: data.approverEmail,
      approverName: data.approver_name || data.rejector_name,
      category: data.category,
      memo: data.memo || data.response_memo,
      status: data.status,
      timestamp: data.created_at || data.approved_at || data.rejected_at
    }
  }

  static toKakaoFormat(data: any): KakaoNotificationData {
    const [siteName, productName] = data.projectName?.split(' - ') || ['', '']
    const timestamp = this.formatKakaoDate(data.timestamp || new Date())

    return {
      site_name: data.siteName || siteName || data.projectName,
      product_name: data.productName || productName || '',
      requester_name: data.requesterName,
      approver_name: data.approverName,
      rejector_name: data.approverName, // 반려 시에는 같은 값
      category: data.category,
      memo: data.memo,
      response_memo: data.memo, // 반려 시 사유
      created_at: timestamp,
      approved_at: timestamp,
      rejected_at: timestamp
    }
  }

  private static formatKakaoDate(date: Date | string): string {
    const d = new Date(date)
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }
}
```

### 4. 카카오톡 템플릿 ID 매핑

#### 4.1 현재 등록된 템플릿
```typescript
const KAKAO_TEMPLATE_IDS = {
  'project-approval-request': 'KA01TP250919055855314funPPq4lwbZ',
  'project-approval-rejection': 'KA01TP250919062830851iHHImWx687U',
  'project-approval-approved': 'KA01TP250919063658041BaQdwc5qwmQ',
  // 추가 등록 필요
  'user-signup-notification': '등록 필요',
  'user-approval-approved': '등록 필요',
  'user-approval-rejected': '등록 필요'
}
```

#### 4.2 이메일과 카카오톡 데이터 매핑 전략

**프로젝트 승인 요청 (project-approval-request):**
- 이메일: `projectName` → 카카오톡: `site_name` + `product_name`
- 이메일: `requesterName` → 카카오톡: `requester_name`
- 이메일: `memo` → 카카오톡: `memo`
- 이메일: `category` → 카카오톡: `category`
- 이메일: 생성시간 → 카카오톡: `created_at`

**프로젝트 승인 완료 (project-approval-approved):**
- 이메일: `approverName` → 카카오톡: `approver_name`
- 이메일: 처리시간 → 카카오톡: `approved_at`

**프로젝트 승인 반려 (project-approval-rejected):**
- 이메일: `approverName` → 카카오톡: `rejector_name`
- 이메일: `memo` → 카카오톡: `response_memo`
- 이메일: 처리시간 → 카카오톡: `rejected_at`

### 5. 템플릿 내용 동기화

#### 5.1 공통 정보 요소
모든 알림에 포함되어야 할 정보:
- 제목/헤더: 알림 유형 명확히 표시
- 주요 정보: 프로젝트명, 요청자, 승인자 등
- 시간 정보: 한국 시간 기준 (YYYY-MM-DD HH:mm 형식)
- 액션: 관련 페이지로 이동 링크/버튼
- 푸터: 자동 발송 안내 문구

#### 5.2 템플릿 구조 통일
```html
<!-- 이메일 템플릿 구조 -->
<div class="header">[알림 유형]</div>
<div class="content">
  <div class="info">[주요 정보]</div>
  <div class="memo">[추가 정보/메모]</div>
  <a class="button">[액션 버튼]</a>
</div>

<!-- 카카오톡 템플릿 (SOLAPI 등록 필요) -->
[알림 유형]
━━━━━━━━━━━━━━━
[주요 정보]
• 항목1: 값1
• 항목2: 값2
━━━━━━━━━━━━━━━
[추가 정보/메모]
━━━━━━━━━━━━━━━
▶ [액션 링크]
```

## 📊 영향 범위 분석

### 영향을 받는 컴포넌트/서비스
1. `components/approval/*` - 프로젝트 승인 관련 컴포넌트
2. `components/admin/UsersManagement.tsx` - 사용자 관리 컴포넌트
3. `lib/services/approval.service.ts` - 승인 서비스
4. `lib/services/auth.service.ts` - 인증 서비스 (회원가입 시)
5. `lib/services/logs.service.ts` - 로그 서비스 (알림 발송 기록)

### 테스트 필요 항목
- [ ] 프로젝트 승인 요청 (이메일/카카오톡)
- [ ] 프로젝트 승인 완료 (이메일/카카오톡)
- [ ] 프로젝트 승인 반려 (이메일/카카오톡)
- [ ] 신규 회원가입 알림 (이메일/카카오톡)
- [ ] 사용자 승인 (이메일/카카오톡)
- [ ] 사용자 거절 (이메일/카카오톡)

## 🚀 구현 순서

### Phase 1: 이메일 서비스 수정 (우선순위: 높음)
**파일**: `supabase/functions/send-email/index.ts`

1. **switch문 수정**
   ```typescript
   case "project-approval-approved": // 새로 추가
   case "project-approval-rejected": // 새로 추가
   ```

2. **함수 분리**
   - `sendProjectApprovalResult` → `sendProjectApprovalApproved`와 `sendProjectApprovalRejected`로 분리

3. **데이터 매핑 로직 추가**
   - `projectName`을 `siteName`과 `productName`으로 분리
   - 시간 형식을 카카오톡과 동일하게 (YYYY-MM-DD HH:mm)

4. **HTML 템플릿 수정**
   - 현장명/제품명 분리 표시
   - 승인/반려에 따라 다른 메시지 표시

### Phase 2: 호출 코드 확인 (우선순위: 중간)
1. 프로젝트 승인 관련 컴포넌트에서 새로운 타입 사용
2. `project-approval-result` → `project-approval-approved`/`project-approval-rejected` 변경

### Phase 3: 테스트 및 검증 (우선순위: 높음)
1. 이메일 발송 테스트 (승인 요청/승인/반려)
2. 카카오톡과 동일한 정보가 표시되는지 확인
3. 시간 형식 일치 여부 확인

## ⚠️ 주의사항

### 카카오톡 템플릿 등록
- SOLAPI 관리 콘솔에서 새로운 알림톡 템플릿 등록 필요
- 사용자 관련 템플릿 3개 추가 등록 필요
  - 신규 가입 알림 템플릿
  - 사용자 승인 템플릿
  - 사용자 거절 템플릿

### Variables 매핑 일관성
- 이메일과 카카오톡이 동일한 데이터를 사용하도록 필드명 매핑 필요
- 프로젝트명을 `site_name`과 `product_name`으로 분리하는 로직 구현
- 시간 필드 형식 통일 (`created_at`, `approved_at`, `rejected_at`)
- 승인자/반려자 필드명 차이 처리 (`approver_name` vs `rejector_name`)

### 하위 호환성
- 기존 API 호출 코드와의 호환성 유지를 위한 임시 래퍼 함수 제공
- 점진적 마이그레이션 전략 수립

### 환경 변수
- 카카오톡 템플릿 ID를 환경 변수로 관리 검토
- 개발/운영 환경별 템플릿 ID 분리 관리

## 🔄 향후 개선 사항
1. 알림 발송 로그 통합 관리 시스템
2. 알림 템플릿 버전 관리
3. 사용자별 알림 채널 선호도 설정
4. 알림 발송 실패 시 재시도 메커니즘
5. 알림 발송 통계 및 모니터링 대시보드