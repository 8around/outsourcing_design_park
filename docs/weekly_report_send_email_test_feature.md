# 주간 리포트 테스트 발송 기능 분석 및 수정 계획

## 📊 현재 구현 상태 분석

### ✅ 구현 완료된 부분

#### 1. UI 컴포넌트 (ReportConfiguration.tsx)
- **위치**: `components/reports/ReportConfiguration.tsx`
- **구현 내용**:
  - 테스트 이메일 입력 필드 (279-285번 줄)
  - "테스트 발송" 버튼 (287-294번 줄)
  - `handleTestEmail` 이벤트 핸들러 (102-125번 줄)
  - 테스트 발송 중 로딩 상태 표시
  - 성공/실패 메시지 표시

#### 2. Edge Function (generate-weekly-report/index.ts)
- **위치**: `supabase/functions/generate-weekly-report/index.ts`
- **테스트 모드 지원 기능**:
  ```typescript
  // 요청 본문에서 테스트 모드 확인 (29-31번 줄)
  const body = await req.json().catch(() => ({ trigger: "cron" }));
  const isTestMode = body.test === true;
  const testEmails = body.emails || [];
  ```
  - 테스트 모드에서 설정 시간 체크 건너뛰기 (56-66번 줄)
  - 테스트 이메일 주소로만 발송 (120번 줄)
  - 테스트 모드에서는 이력 저장 안 함 (133-150번 줄)
  - 응답에 `isTestMode` 플래그 포함 (158번 줄)

### ❌ 미구현 부분

#### ReportService의 testEmailSending 함수
- **위치**: `lib/services/report.service.ts` (243-264번 줄)
- **문제점**: 실제 Edge Function을 호출하지 않고 시뮬레이션만 수행
  ```typescript
  async testEmailSending(testEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      // 주석 처리된 실제 구현 코드 (249-251번 줄)
      // const { data, error } = await this.supabase.functions.invoke('send-test-report', {
      //   body: { email: testEmail }
      // });

      // 현재는 단순 시뮬레이션만 반환
      return {
        success: true,
        message: `테스트 이메일이 ${testEmail}로 발송되었습니다.`
      };
    } catch (error) {
      // ...
    }
  }
  ```

## 🔧 수정 계획

### 1. report.service.ts 수정

#### 수정할 함수: `testEmailSending`
```typescript
/**
 * Test email sending with current configuration
 * 실제로 Edge Function을 호출하여 테스트 리포트를 발송합니다.
 */
async testEmailSending(testEmail: string): Promise<{ success: boolean; message: string }> {
  try {
    // generate-weekly-report Edge Function을 테스트 모드로 호출
    const { data, error } = await this.supabase.functions.invoke('generate-weekly-report', {
      body: {
        test: true,           // 테스트 모드 활성화
        emails: [testEmail]   // 테스트 이메일 주소 배열
      }
    });

    if (error) {
      console.error('Edge Function error:', error);
      throw error;
    }

    // Edge Function 응답 확인
    if (data?.success) {
      return {
        success: true,
        message: `테스트 리포트가 ${testEmail}로 발송되었습니다. 잠시 후 이메일을 확인해주세요.`
      };
    } else {
      return {
        success: false,
        message: data?.error || '테스트 이메일 발송에 실패했습니다.'
      };
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return {
      success: false,
      message: '테스트 이메일 발송에 실패했습니다. 다시 시도해주세요.'
    };
  }
}
```

## 📋 전체 동작 흐름

### 테스트 발송 프로세스
1. **사용자 액션**
   - 리포트 관리 페이지(`/admin/reports`) 접속
   - "발송 설정" 탭 선택
   - 테스트 이메일 주소 입력
   - "테스트 발송" 버튼 클릭

2. **프론트엔드 처리**
   - `ReportConfiguration.handleTestEmail()` 호출
   - 이메일 유효성 검증
   - `reportService.testEmailSending(testEmail)` 호출
   - 로딩 상태 표시

3. **서비스 레이어**
   - `supabase.functions.invoke('generate-weekly-report', { test: true, emails: [testEmail] })` 호출
   - Edge Function 응답 대기

4. **Edge Function 처리**
   - 테스트 모드 감지 (`body.test === true`)
   - 설정 시간 체크 건너뛰기
   - 최근 7일간의 로그 데이터 수집
   - Excel 파일 생성
   - Storage에 파일 저장
   - Resend API로 이메일 발송 (테스트 이메일 주소로만)
   - 이력 저장 건너뛰기 (테스트 모드이므로)
   - 성공 응답 반환

5. **결과 표시**
   - 성공/실패 메시지 표시
   - 테스트 이메일 필드 초기화 (성공 시)

## 🧪 테스트 시나리오

### 1. 정상 케이스
- 유효한 이메일 주소 입력 → 테스트 발송 → 이메일 수신 확인
- 리포트에 최근 7일간의 실제 데이터 포함 확인
- Excel 첨부 파일 확인

### 2. 예외 케이스
- 잘못된 이메일 형식 → 프론트엔드 유효성 검증 실패
- Edge Function 오류 → 에러 메시지 표시
- 네트워크 오류 → 타임아웃 처리

### 3. 확인 사항
- 테스트 발송은 `weekly_report_history` 테이블에 저장되지 않아야 함
- 실제 수신자 목록이 아닌 테스트 이메일로만 발송되어야 함
- 설정된 발송 시간과 무관하게 즉시 발송되어야 함

## 📝 구현 우선순위

1. **높음**: `report.service.ts`의 `testEmailSending` 함수 수정
2. **중간**: 에러 처리 및 사용자 피드백 개선
3. **낮음**: 테스트 발송 로그 또는 별도 이력 관리 (선택사항)

## 🚀 예상 효과

- 관리자가 리포트 설정 후 즉시 테스트 가능
- 실제 데이터로 리포트 형식과 내용 미리 확인 가능
- 이메일 주소 유효성 사전 검증 가능
- 주간 리포트 자동 발송 전 수동 테스트로 안정성 확보