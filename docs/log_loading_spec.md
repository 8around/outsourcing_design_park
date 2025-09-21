# 로그 작성 시 로딩 상태 관리 구현 계획서

## 📋 문제 정의

### 현재 문제점
- 프로젝트 상세 페이지에서 승인자를 선택하여 히스토리 로그 작성 시
- Edge Function을 통한 카카오톡 알림톡 발송이 비동기로 처리됨
- 로그가 즉시 추가되지 않고 카카오톡 발송 완료 후 갑자기 나타남
- 사용자가 혼란을 겪고 있음

### 요구사항
- 승인자 선택하여 로그 작성 시 전체 화면 로딩 표시
- 카카오톡 발송까지 완료될 때까지 사용자가 대기하도록 함
- 일반 로그 작성 시에는 기존과 동일하게 처리

## 🎯 해결 방안

### 1. 로딩 상태 관리 구조
```typescript
// 프로젝트 상세 페이지 상태 추가
const [isApprovalLoading, setIsApprovalLoading] = useState(false)
```

### 2. 워크플로우 변경
```
현재: 로그 작성 → DB 저장 → 이메일 발송 → 카카오톡 발송(비동기) → UI 완료 처리
변경: 로그 작성 → 로딩 시작 → DB 저장 → 이메일 발송 → 카카오톡 발송(동기) → 로딩 종료 → UI 완료 처리
```

## 🔧 구현 계획

### Phase 1: logs.service.ts 수정
**파일**: `/lib/services/logs.service.ts`

#### 변경사항
1. `createApprovalRequestLog` 함수에서 카카오톡 발송을 await로 처리
2. 카카오톡 발송 결과를 로그와 함께 반환
3. 에러 처리 개선

```typescript
// 변경 전
try {
  await kakaoClientService.sendProjectApprovalRequest(...)
  console.log('승인 요청 카카오톡 발송 성공')
} catch (error) {
  console.error('승인 요청 카카오톡 발송 실패:', error)
}

// 변경 후  
let kakaoSendResult = null
try {
  console.log('카카오톡 발송 시작...')
  kakaoSendResult = await kakaoClientService.sendProjectApprovalRequest(...)
  console.log('승인 요청 카카오톡 발송 성공:', kakaoSendResult)
} catch (error) {
  console.error('승인 요청 카카오톡 발송 실패:', error)
  // 에러를 상위로 전파하지 않음 (승인 요청 생성은 유지)
}
```

### Phase 2: 프로젝트 상세 페이지 수정
**파일**: `/app/(dashboard)/projects/[id]/page.tsx`

#### 상태 관리 추가
```typescript
// 로딩 상태 추가
const [isApprovalLoading, setIsApprovalLoading] = useState(false)
```

#### handleLogSubmit 함수 수정
```typescript
const handleLogSubmit = async (data: {
  category: string
  content: string
  attachments?: AttachmentFile[]
  approvalRequestTo?: { id: string; name: string }
}) => {
  if (!user || !project) return

  try {
    // 승인 요청인 경우 전체 화면 로딩 시작
    if (data.approvalRequestTo) {
      setIsApprovalLoading(true)
    }

    if (data.approvalRequestTo) {
      // 승인 요청 로그 생성 (카카오톡 발송까지 대기)
      await logService.createApprovalRequestLog({
        project_id: project.id,
        memo: data.content,
        requester_id: user.id,
        requester_name: userData?.name || user.email || 'Unknown',
        approver_id: data.approvalRequestTo.id,
        approver_name: data.approvalRequestTo.name,
        attachments: data.attachments,
        category: data.category as LogCategory
      })
      toast.success('승인 요청이 생성되었습니다.')
    } else {
      // 일반 로그 생성 (기존과 동일)
      await logService.createManualLog({
        project_id: project.id,
        category: data.category as LogCategory,
        content: data.content,
        author_id: user.id,
        author_name: userData?.name || user.email || 'Unknown',
        attachments: data.attachments
      })
      toast.success('히스토리 로그가 생성되었습니다.')
    }

    setShowLogForm(false)
    setRefreshLogs(prev => prev + 1) // 로그 목록 새로고침
  } catch (error) {
    console.error('로그 생성 실패:', error)
    toast.error('로그 생성에 실패했습니다.')
  } finally {
    // 승인 요청인 경우 로딩 종료
    if (data.approvalRequestTo) {
      setIsApprovalLoading(false)
    }
  }
}
```

#### 로딩 UI 추가
```jsx
// Loading 컴포넌트 import
import { Loading } from '@/components/common/ui/Loading'

// 컴포넌트 반환부에 로딩 조건부 렌더링 추가
{isApprovalLoading && (
  <Loading 
    fullScreen={true}
    message="승인 요청을 처리하고 있습니다..."
    size="large"
  />
)}
```

### Phase 3: Loading 컴포넌트 활용
**파일**: `/components/common/ui/Loading.tsx` (기존 컴포넌트 활용)

#### 전체 화면 로딩 기능
- `fullScreen={true}` 속성으로 전체 화면 로딩 표시
- `message` 속성으로 사용자에게 진행 상황 안내
- `z-50` 클래스로 최상위 레이어에 표시

## 📱 사용자 경험 개선

### 로딩 메시지 단계별 안내
```typescript
const LOADING_MESSAGES = {
  APPROVAL_REQUEST: '승인 요청을 처리하고 있습니다...',
  KAKAO_SENDING: '카카오톡 알림을 발송하고 있습니다...',
  FINALIZING: '작업을 완료하고 있습니다...'
}
```

### 시각적 피드백
- 전체 화면 반투명 오버레이
- 중앙 정렬된 로딩 스피너
- 진행 상황 메시지
- 부드러운 애니메이션 효과

## 🧪 테스트 시나리오

### 테스트 케이스 1: 승인자 선택 로그 작성
1. 프로젝트 상세 페이지 진입
2. "로그 작성" 버튼 클릭
3. 승인 요청 추가 버튼 클릭
4. 승인자 선택
5. 로그 내용 입력 후 제출
6. **예상 결과**: 전체 화면 로딩 표시 → 카카오톡 발송 완료 → 로딩 종료 → 로그 목록에 즉시 반영

### 테스트 케이스 2: 일반 로그 작성
1. 프로젝트 상세 페이지 진입
2. "로그 작성" 버튼 클릭
3. 승인자 선택하지 않음
4. 로그 내용 입력 후 제출
5. **예상 결과**: 기존과 동일하게 즉시 처리

### 테스트 케이스 3: 카카오톡 발송 실패
1. 잘못된 전화번호 또는 네트워크 오류 상황
2. 승인자 선택하여 로그 작성
3. **예상 결과**: 로딩 표시 → 카카오톡 발송 실패해도 로그는 생성 → 로딩 종료

## 🔍 예외 처리

### 네트워크 오류
- 카카오톡 발송 실패 시에도 승인 요청 로그는 생성
- 사용자에게 적절한 오류 메시지 표시
- 로딩 상태는 반드시 해제

### 타임아웃 처리
- Edge Function 호출 시 적절한 타임아웃 설정
- 장시간 로딩 시 사용자에게 안내 메시지

### 사용자 이탈
- 로딩 중 페이지 이탈 시 적절한 정리 작업
- 메모리 누수 방지

## 📈 성능 고려사항

### 로딩 최적화
- 불필요한 리렌더링 방지
- 로딩 상태 최소화
- 적절한 에러 경계 설정

### 사용자 피드백
- 로딩 시간이 길어질 경우 진행 상황 안내
- 예상 소요 시간 표시 (선택사항)

## 🚀 배포 계획

### 단계별 배포
1. **개발 환경 테스트**: 로컬에서 전체 워크플로우 테스트
2. **스테이징 배포**: 실제 카카오톡 발송까지 포함한 종합 테스트
3. **프로덕션 배포**: 점진적 배포로 안정성 확보

### 롤백 계획
- 문제 발생 시 즉시 이전 버전으로 롤백 가능
- 데이터베이스 변경사항 없음으로 안전한 롤백

## 📝 구현 순서

1. **1단계**: `logs.service.ts` 카카오톡 발송 동기 처리 수정
2. **2단계**: 프로젝트 상세 페이지 로딩 상태 관리 추가
3. **3단계**: `handleLogSubmit` 함수 수정
4. **4단계**: 로딩 UI 컴포넌트 통합
5. **5단계**: 종합 테스트 및 버그 수정
6. **6단계**: 사용자 테스트 및 피드백 반영

---

**작성일**: 2025-01-21  
**담당자**: Claude Assistant  
**검토자**: 개발팀  
**상태**: 구현 대기