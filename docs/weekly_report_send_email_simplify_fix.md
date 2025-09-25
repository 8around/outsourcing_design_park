# 주간 리포트 이메일 발송 간소화 수정 계획

## 📋 개요
주간 리포트 다운로드 버튼으로 인한 캐싱 문제를 해결하기 위해, Storage 업로드와 다운로드 버튼을 제거하고 이메일 첨부파일로만 리포트를 제공하도록 수정

## 🎯 목표
- Storage 업로드 로직 제거
- Public URL 생성 제거
- 이메일 본문의 다운로드 버튼 제거
- 첨부파일로만 리포트 제공

## 📁 수정 대상 파일
`supabase/functions/generate-weekly-report/index.ts`

## 🛠️ 상세 수정 내용

### 1. Storage 업로드 로직 삭제 (100-112번째 줄)
```typescript
// ❌ 삭제할 코드
const fileName = `weekly-report-${formatDate(new Date())}.xlsx`;
const { data: upload, error: uploadError } = await supabaseClient.storage
  .from('reports')
  .upload(fileName, buffer, {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    upsert: true
  });

if (uploadError) {
  console.error("Storage upload error:", uploadError);
  throw uploadError;
}
```

### 2. Public URL 생성 로직 삭제 (114-117번째 줄)
```typescript
// ❌ 삭제할 코드
const { data: { publicUrl } } = supabaseClient.storage
  .from('reports')
  .getPublicUrl(fileName);
```

### 3. 이메일 HTML의 다운로드 버튼 삭제 (219번째 줄)
```html
<!-- ❌ 삭제할 HTML -->
<a href="${fileUrl}" class="button">리포트 다운로드</a>
```

### 4. History 테이블 저장 로직 수정 (133-150번째 줄)
```typescript
// ✅ 수정 후 코드
const { error: historyError } = await supabaseClient
  .from('weekly_report_history')
  .insert({
    report_period_start: startDate.toISOString(),
    report_period_end: endDate.toISOString(),
    file_name: null,  // Storage를 사용하지 않으므로 null
    file_url: null,   // Public URL이 없으므로 null
    recipient_emails: recipientEmails,
    send_status: emailResult ? 'sent' : 'failed',
    sent_at: emailResult ? new Date().toISOString() : null,
    error_message: emailResult ? null : 'Email sending failed'
  });
```

### 5. Response에서 fileUrl 제거 (152-161번째 줄)
```typescript
// ✅ 수정 후 코드
return new Response(
  JSON.stringify({
    success: true,
    data: emailResult,
    // fileUrl 제거됨
    logsCount: logs.length,
    isTestMode
  }),
  { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
);
```

## ✅ 유지되는 기능
- Excel 파일 생성 (`generateExcelReport` 함수)
- 이메일 발송 로직 (`sendWeeklyReport` 함수)
- 첨부파일 추가 로직 (238-244번째 줄)
  ```typescript
  attachments: [
    {
      filename: `weekly-report-${formatDate(startDate)}_${formatDate(endDate)}.xlsx`,
      content: base64Content  // buffer를 Base64로 변환한 내용
    }
  ]
  ```

## 📊 변경 전후 비교

### Before (기존)
1. Excel 생성 → Buffer
2. Buffer → Storage 업로드
3. Storage → Public URL 생성
4. 이메일 본문에 다운로드 버튼 (Public URL 링크)
5. 이메일에 Excel 첨부파일
6. History 테이블에 file_url 저장

### After (변경 후)
1. Excel 생성 → Buffer
2. ~~Storage 업로드~~ (삭제)
3. ~~Public URL 생성~~ (삭제)
4. ~~이메일 본문 다운로드 버튼~~ (삭제)
5. 이메일에 Excel 첨부파일 ✅
6. History 테이블에 null 저장

## 🎯 기대 효과
- **캐싱 문제 완전 해결**: Public URL을 사용하지 않으므로 캐싱 문제 없음
- **시스템 간소화**: Storage 사용하지 않아 복잡도 감소
- **비용 절감**: Supabase Storage 사용량 감소
- **보안 향상**: 직접 URL 접근 불가능
- **사용자 경험 단순화**: 첨부파일만 확인하면 됨

## ⚠️ 주의사항
- `weekly_report_history` 테이블의 `file_name`, `file_url` 컬럼이 nullable이어야 함
- 기존에 저장된 History 데이터의 file_url은 더 이상 유효하지 않음
- 관리자가 과거 리포트를 다시 다운로드할 수 없음 (필요시 재생성 필요)

## 📝 테스트 항목
1. [ ] 주간 리포트 생성 API 호출 성공
2. [ ] 이메일 발송 확인
3. [ ] 첨부파일 정상 첨부 확인
4. [ ] 첨부파일 다운로드 및 열기 성공
5. [ ] History 테이블 저장 확인 (null 값 포함)
6. [ ] 이메일 본문에 다운로드 버튼 없음 확인
7. [ ] Storage에 파일 업로드되지 않음 확인