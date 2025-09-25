# 📋 주간 리포트 Excel 자동 발송 기능 개발 계획

## 🎯 개발 목표
리포트 설정 페이지에서 발송 시간을 설정하면, 매주 설정된 시간에 자동으로 주간 리포트를 Excel 파일로 생성하여 이메일로 발송하는 기능 구현

## 📊 현재 상태 분석

### ✅ 이미 구현된 부분
- 데이터베이스 스키마 (weekly_report_config, weekly_report_history 테이블)
- 서비스 레이어 (report.service.ts - CRUD 기능 완료)
- 관리자 페이지 (/admin/reports - 탭 구조 완료)
- UI 컴포넌트 (ReportConfiguration, ReportHistoryList - 퍼블리싱 완료)
- 이메일 서비스 (email.service.ts, Resend 연동)
- Excel 유틸리티 구조 (lib/utils/excel.ts - 기본 구조)

### ❌ 구현이 필요한 부분
- Edge Function (generate-weekly-report)
- Excel 생성 로직 구체화
- Cron Job 설정 (pg_cron 스케줄링)

---

## 🔧 Phase 1: UI 컴포넌트 (✅ 완료)

### 1.1 ReportConfiguration 컴포넌트 (구현됨)
**파일:** `components/reports/ReportConfiguration.tsx`

**구현된 기능:**
- ✅ 발송 활성화/비활성화 토글
- ✅ 발송 요일 선택 (드롭다운: 일~토)
- ✅ 발송 시간 설정 (시:분 선택)
- ✅ 수신자 이메일 관리 (추가/삭제 UI)
- ✅ 이메일 유효성 검증
- ✅ 리포트 제목 템플릿 설정
- ✅ 테스트 발송 버튼
- ✅ 설정 저장 버튼

### 1.2 ReportHistoryList 컴포넌트 (구현됨)
**파일:** `components/reports/ReportHistoryList.tsx`

**구현된 기능:**
- ✅ 발송 이력 테이블 (리포트 기간, 파일명, 수신자, 상태, 발송시간)
- ✅ 필터링 옵션 (기간 선택, 상태 필터)
- ✅ 페이지네이션
- ✅ 재발송 버튼 (실패한 리포트)
- ✅ Excel 다운로드 링크
- ✅ 상세보기 모달

### 1.3 관리자 페이지 (구현됨)
**파일:** `app/(dashboard)/admin/reports/page.tsx`

**구현된 기능:**
- ✅ 탭 구조 (발송 설정 / 발송 내역)
- ✅ 관리자 권한 체크
- ✅ 컴포넌트 통합

---

## 🚀 Phase 2: Edge Function 개발 (구현 필요)

### 2.1 generate-weekly-report Function
**파일:** `supabase/functions/generate-weekly-report/index.ts`

**주요 구조 (send-email 패턴 참고):**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import * as ExcelJS from "npm:exceljs";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
const fromEmail = "noreply@dpaworld.net";

serve(async (req) => {
  // CORS 헤더 설정
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Supabase 클라이언트 초기화
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. 설정 확인
    const { data: config } = await supabaseClient
      .from('weekly_report_config')
      .select('*')
      .single();

    if (!config || !config.is_enabled) {
      return new Response(
        JSON.stringify({ success: false, message: "Report generation is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. 현재 시간이 설정된 시간인지 확인
    const now = new Date();
    const isScheduledTime = checkScheduledTime(config, now);

    if (!isScheduledTime) {
      return new Response(
        JSON.stringify({ success: false, message: "Not scheduled time" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. 주간 데이터 수집
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const { data: logs } = await supabaseClient
      .from('history_logs')
      .select(`
        *,
        projects(name, pm_name, sales_representative),
        users!author_id(name, email)
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    // 4. Excel 파일 생성
    const buffer = await generateExcelReport(logs, startDate, new Date());

    // 5. Storage에 저장
    const fileName = `weekly-report-${formatDate(new Date())}.xlsx`;
    const { data: upload, error: uploadError } = await supabaseClient.storage
      .from('reports')
      .upload(fileName, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

    if (uploadError) throw uploadError;

    // Public URL 생성
    const { data: { publicUrl } } = supabaseClient.storage
      .from('reports')
      .getPublicUrl(fileName);

    // 6. 이메일 발송 (send-email 패턴 사용)
    const emailResult = await sendWeeklyReport({
      recipientEmails: config.recipient_emails,
      reportTitle: config.report_title_template,
      startDate,
      endDate: new Date(),
      fileUrl: publicUrl,
      buffer
    });

    // 7. 이력 저장
    await supabaseClient.from('weekly_report_history').insert({
      report_period_start: startDate,
      report_period_end: new Date(),
      file_name: fileName,
      file_url: publicUrl,
      recipient_emails: config.recipient_emails,
      send_status: emailResult ? 'sent' : 'failed',
      sent_at: emailResult ? new Date() : null,
      error_message: emailResult ? null : 'Email sending failed'
    });

    return new Response(
      JSON.stringify({ success: true, data: emailResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-weekly-report:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

// 이메일 발송 함수 (send-email/index.ts 패턴 참고)
async function sendWeeklyReport(data: any) {
  const { recipientEmails, reportTitle, startDate, endDate, fileUrl, buffer } = data;

  const dateRange = `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
  const subject = reportTitle.replace('{date_range}', dateRange);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f4f4f4; padding: 20px; border-radius: 0 0 5px 5px; }
        .info-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>주간 프로젝트 현장 관리 리포트</h1>
        </div>
        <div class="content">
          <h2>금주 활동 요약 리포트입니다</h2>
          <div class="info-box">
            <p><strong>리포트 기간:</strong> ${dateRange}</p>
            <p><strong>생성 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
          </div>
          <p>첨부된 Excel 파일에서 상세 내용을 확인하실 수 있습니다.</p>
          <a href="${fileUrl}" class="button">리포트 다운로드</a>
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            이 이메일은 프로젝트 현장 관리 시스템에서 자동으로 발송되었습니다.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const { data: emailData, error } = await resend.emails.send({
    from: fromEmail,
    to: recipientEmails,
    subject,
    html,
    attachments: [
      {
        filename: `weekly-report-${dateRange}.xlsx`,
        content: buffer.toString('base64'),
        encoding: 'base64'
      }
    ]
  });

  if (error) throw error;
  return emailData;
}

// Excel 생성 함수
async function generateExcelReport(logs: any[], startDate: Date, endDate: Date) {
  const workbook = new ExcelJS.Workbook();

  // 요약 시트
  const summarySheet = workbook.addWorksheet('요약');
  // ... Excel 생성 로직

  // Buffer로 변환
  return await workbook.xlsx.writeBuffer();
}

// 유틸리티 함수들
function checkScheduledTime(config: any, now: Date): boolean {
  return config.send_day_of_week === now.getDay() &&
         config.send_hour === now.getHours() &&
         config.send_minute === now.getMinutes();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ko-KR');
}
```

### 2.2 Excel 생성 구현 (간단 버전)
**Edge Function 내부에서 직접 구현 (Deno 환경)**

```typescript
// Excel 생성 함수 - 간단한 활동 내역만 포함
async function generateExcelReport(logs: any[], startDate: Date, endDate: Date) {
  const workbook = new ExcelJS.Workbook();

  // 워크북 속성 설정
  workbook.creator = 'Project Admin System';
  workbook.created = new Date();

  // 활동 내역 시트 (단일 시트)
  const sheet = workbook.addWorksheet('주간 활동 내역');

  // 컬럼 정의
  sheet.columns = [
    { header: '일시', key: 'createdAt', width: 20 },
    { header: '프로젝트', key: 'projectName', width: 30 },
    { header: '작성자', key: 'authorName', width: 15 },
    { header: '카테고리', key: 'category', width: 15 },
    { header: '내용', key: 'description', width: 50 },
    { header: '메모', key: 'memo', width: 30 }
  ];

  // 데이터 추가
  logs.forEach(log => {
    sheet.addRow({
      createdAt: formatDateTime(log.created_at),
      projectName: log.projects?.name || '-',
      authorName: log.users?.name || '-',
      category: log.category || '-',
      description: log.description || '-',
      memo: log.memo || '-'
    });
  });

  // 헤더 스타일 적용
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Buffer로 변환
  return await workbook.xlsx.writeBuffer();
}

// 날짜 포맷 함수
function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
```

---

## ⏰ Phase 3: Cron Job 설정 (구현 필요)

### 3.1 pg_cron 스케줄 설정
**실행 위치:** Supabase SQL Editor

```sql
-- 매시간 실행하여 설정 시간 체크
SELECT cron.schedule(
  'check-weekly-report',
  '0 * * * *', -- 매시간 정각
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/generate-weekly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
  $$
);
```

### 3.2 Vault 설정
```sql
-- 프로젝트 URL과 서비스 키 저장
SELECT vault.create_secret('https://[PROJECT-REF].supabase.co', 'project_url');
SELECT vault.create_secret('[YOUR-SERVICE-ROLE-KEY]', 'service_role_key');
```

### 3.3 Cron 관리 명령어
```sql
-- 등록된 cron job 확인
SELECT * FROM cron.job;

-- Cron job 삭제 (필요시)
SELECT cron.unschedule('check-weekly-report');
```

---

## 📁 파일 구조 변경사항

### 이미 구현된 파일 (✅):
```
app/(dashboard)/admin/reports/
└── page.tsx                   # ✅ 리포트 관리 페이지 (완료)

components/reports/
├── ReportConfiguration.tsx    # ✅ 발송 설정 컴포넌트 (완료)
└── ReportHistoryList.tsx      # ✅ 발송 이력 컴포넌트 (완료)

lib/services/
└── report.service.ts          # ✅ 리포트 서비스 (완료)

types/
└── report.ts                  # ✅ 리포트 관련 타입 정의 (완료)
```

### 새로 생성될 파일 (❌):
```
supabase/functions/generate-weekly-report/
└── index.ts                   # ❌ Edge Function 메인 로직 (구현 필요)
                               # → Resend 이메일 발송 + Excel 생성 통합
```

---

## 🔄 구현 순서 (UI 완료 기준)

### ~~Step 1: 타입 정의 (완료)~~
```typescript
// types/report.ts
export interface WeeklyReportConfig {
  id: string;
  is_enabled: boolean;
  send_day_of_week: number;
  send_hour: number;
  send_minute: number;
  recipient_emails: string[];
  report_title_template: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReportHistory {
  id: string;
  report_period_start: string;
  report_period_end: string;
  file_name: string;
  file_url: string;
  recipient_emails: string[];
  send_status: 'pending' | 'sent' | 'failed';
  send_attempts: number;
  last_attempt_at?: string;
  sent_at?: string;
  error_message?: string;
  created_at: string;
}
```

### ~~Step 2: UI 컴포넌트 구현 (완료)~~
~~1. ReportConfiguration 컴포넌트 개발~~
~~2. ReportHistoryList 컴포넌트 개발~~
~~3. 서비스 레이어와 연동 테스트~~

### Step 3: Edge Function 구현 (3-4시간) ⬅️ 다음 단계
1. generate-weekly-report 함수 생성
2. Resend 이메일 발송 통합 (send-email 패턴 참고)
3. Excel 생성 로직 구현 (Edge Function 내부)
4. Storage 업로드 및 이력 저장
5. 로컬 테스트 (`supabase functions serve`)

### Step 4: Cron Job 설정 (1시간)
1. Vault 시크릿 설정
2. pg_cron 스케줄 등록
3. 전체 플로우 테스트

### Step 5: 배포 및 검증 (1시간)
1. Edge Function 배포
2. 프로덕션 환경 테스트
3. 모니터링 설정

**총 예상 소요 시간: ~~8-10시간~~ → 4-6시간 (UI 완료 및 Excel 유틸리티 Edge Function 통합)**

---

## ⚠️ 주의사항

### 보안
- Service Role Key는 절대 클라이언트에 노출되어서는 안 됨
- Vault를 사용하여 안전하게 시크릿 관리
- RLS 정책 확인 (admin만 설정 변경 가능)

### 성능
- Edge Function 타임아웃: 기본 150초 (필요시 연장 고려)
- Excel 파일 크기 제한: Storage 한계 확인
- 대용량 데이터 처리시 스트리밍 방식 고려

### 에러 처리
```typescript
// 재시도 로직
const MAX_RETRIES = 3;
let attempts = 0;

while (attempts < MAX_RETRIES) {
  try {
    await sendEmail();
    break;
  } catch (error) {
    attempts++;
    if (attempts === MAX_RETRIES) {
      // 최종 실패 처리
      await notifyAdmin(error);
    }
    await delay(1000 * attempts); // 지수 백오프
  }
}
```

### 테스트 체크리스트
- [ ] 로컬 환경에서 Edge Function 테스트
- [ ] 다양한 데이터 크기로 Excel 생성 테스트
- [ ] 이메일 발송 테스트 (테스트 계정 사용)
- [ ] Cron Job 실행 테스트
- [ ] 에러 시나리오 테스트
- [ ] 재발송 기능 테스트

---

## 🔗 관련 문서
- [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md) - 데이터베이스 스키마
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [pg_cron 문서](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [ExcelJS 문서](https://github.com/exceljs/exceljs)