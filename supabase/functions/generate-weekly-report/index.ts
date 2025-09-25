import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
// @deno-types="npm:@types/exceljs"
import ExcelJS from "npm:exceljs@4.3.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
const fromEmail = "noreply@dpaworld.net";

serve(async (req) => {
  // CORS 헤더 설정
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
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

    // 요청 본문 파싱 (테스트 발송 시 사용)
    let body;
    try {
      const contentType = req.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        body = await req.json();
      } else {
        body = { trigger: "cron" };
      }
    } catch (error) {
      console.log("Body parsing error, using default:", error);
      body = { trigger: "cron" };
    }
    const isTestMode = body.test === true;
    const testEmails = body.emails || [];

    // 1. 설정 확인
    const { data: config, error: configError } = await supabaseClient
      .from("weekly_report_config")
      .select("*")
      .single();

    if (configError || !config) {
      console.error("Config fetch error:", configError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Report configuration not found",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // 테스트 모드가 아닌 경우 항상 실행 (cron job으로 제어)
    console.log(isTestMode ? "Running in test mode" : "Running via cron job schedule");

    // 3. 주간 데이터 수집
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const { data: logs, error: logsError } = await supabaseClient
      .from("history_logs")
      .select(
        `
        *,
        projects:project_id(site_name, product_name, site_manager, sales_manager),
        users:author_id(name, email)
      `
      )
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    if (logsError) {
      console.error("Logs fetch error:", logsError);
      throw logsError;
    }

    if (!logs || logs.length === 0) {
      console.log("No logs found for the period");
      return new Response(
        JSON.stringify({
          success: false,
          message: "No logs found for the report period",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 4. Excel 파일 생성
    const buffer = await generateExcelReport(logs, startDate, endDate);

    // 5. Storage에 저장 - 타임스탬프 포함한 고유 파일명 생성
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -5); // 2025-01-25T14-30-45
    const baseFileName = `weekly-report-${formatDate(startDate)}_${formatDate(endDate)}-${timestamp}.xlsx`;
    const fileName = await generateUniqueFileName(baseFileName, supabaseClient);
    const { data: upload, error: uploadError } = await supabaseClient.storage
      .from("reports")
      .upload(fileName, buffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: false, // 덮어쓰기 방지
        cacheControl: "1", // 1초 캐시 (최신 파일 보장)
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw uploadError;
    }

    // Public URL 생성 - cache-buster 파라미터 추가
    const {
      data: { publicUrl },
    } = supabaseClient.storage.from("reports").getPublicUrl(fileName);

    const publicUrlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

    // 6. 이메일 발송 (테스트 모드일 경우 테스트 이메일로 발송)
    const recipientEmails = isTestMode ? testEmails : config.recipient_emails;

    const emailResult = await sendWeeklyReport({
      recipientEmails,
      reportTitle: "프로젝트 현장 관리 주간 리포트 - {date_range}", // 고정 템플릿
      startDate,
      endDate,
      fileUrl: publicUrlWithCacheBuster, // cache-buster URL 사용
      buffer,
      logsCount: logs.length,
    });

    // 7. 이력 저장 (테스트 모드가 아닌 경우만)
    if (!isTestMode) {
      const { error: historyError } = await supabaseClient
        .from("weekly_report_history")
        .insert({
          report_period_start: startDate.toISOString(),
          report_period_end: endDate.toISOString(),
          file_name: fileName,
          file_url: publicUrlWithCacheBuster, // cache-buster URL 사용
          recipient_emails: recipientEmails,
          send_status: emailResult ? "sent" : "failed",
          sent_at: emailResult ? new Date().toISOString() : null,
          error_message: emailResult ? null : "Email sending failed",
        });

      if (historyError) {
        console.error("History save error:", historyError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: emailResult,
        fileUrl: publicUrlWithCacheBuster, // cache-buster URL 반환
        fileName: fileName, // 실제 파일명 정보 추가
        logsCount: logs.length,
        isTestMode,
        generatedAt: new Date().toISOString(), // 생성 시간 정보 추가
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate", // 캐시 방지
          Pragma: "no-cache",
          Expires: "0",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in generate-weekly-report:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

// 이메일 발송 함수
async function sendWeeklyReport(data: any) {
  const {
    recipientEmails,
    reportTitle,
    startDate,
    endDate,
    fileUrl,
    buffer,
    logsCount,
  } = data;

  const dateRange = `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
  const subject = reportTitle.replace("{date_range}", dateRange);

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
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }
        .stat-item { background: white; padding: 10px; border-radius: 5px; text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #2196F3; }
        .stat-label { font-size: 12px; color: #666; }
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
            <p><strong>생성 시간:</strong> ${new Date().toLocaleString("ko-KR")}</p>
          </div>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-number">${logsCount}</div>
              <div class="stat-label">전체 활동 건수</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">7</div>
              <div class="stat-label">활동 기간(일)</div>
            </div>
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

  try {
    // Buffer를 Base64로 변환
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    const { data: emailData, error } = await resend.emails.send({
      from: fromEmail,
      to: recipientEmails,
      subject,
      html,
      attachments: [
        {
          filename: `weekly-report-${formatDate(startDate)}_${formatDate(endDate)}.xlsx`,
          content: base64Content,
        },
      ],
    });

    if (error) {
      console.error("Email send error:", error);
      throw error;
    }

    return emailData;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

// Excel 생성 함수
async function generateExcelReport(
  logs: any[],
  startDate: Date,
  endDate: Date
) {
  const workbook = new ExcelJS.Workbook();

  // 워크북 속성 설정
  workbook.creator = "Project Admin System";
  workbook.created = new Date();

  // 활동 내역 시트
  const sheet = workbook.addWorksheet("주간 활동 내역");

  // 컬럼 정의
  sheet.columns = [
    { header: "일시", key: "createdAt", width: 20 },
    { header: "프로젝트", key: "projectName", width: 30 },
    { header: "작성자", key: "authorName", width: 15 },
    { header: "카테고리", key: "category", width: 15 },
    { header: "내용", key: "description", width: 60 },
  ];

  // 데이터 추가
  logs.forEach((log) => {
    const projectName = log.projects
      ? `${log.projects.site_name || ""} - ${log.projects.product_name || ""}`.trim()
      : "-";

    sheet.addRow({
      createdAt: formatDateTime(log.created_at),
      projectName:
        projectName === "-" || projectName === " - " ? "-" : projectName,
      authorName: log.author_name || log.users?.name || "-",
      category: log.category || "-",
      description: log.content || "-",
    });
  });

  // 헤더 스타일 적용
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 12 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  // 모든 데이터 행에 대해 기본 스타일 적용
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      // 헤더 제외
      row.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
      };
      row.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
  });

  // 요약 시트 추가
  const summarySheet = workbook.addWorksheet("요약");

  // 프로젝트별 활동 통계
  const projectStats = logs.reduce((acc: any, log: any) => {
    const projectName = log.projects
      ? `${log.projects.site_name || ""} - ${log.projects.product_name || ""}`.trim()
      : "기타";

    const key =
      projectName === "-" || projectName === " - " ? "기타" : projectName;

    if (!acc[key]) {
      acc[key] = {
        name: key,
        count: 0,
        categories: new Set(),
      };
    }
    acc[key].count++;
    if (log.category) {
      acc[key].categories.add(log.category);
    }
    return acc;
  }, {});

  summarySheet.columns = [
    { header: "프로젝트명", key: "projectName", width: 30 },
    { header: "활동 건수", key: "count", width: 15 },
    { header: "카테고리 수", key: "categoryCount", width: 15 },
  ];

  Object.values(projectStats).forEach((stat: any) => {
    summarySheet.addRow({
      projectName: stat.name,
      count: stat.count,
      categoryCount: stat.categories.size,
    });
  });

  // 요약 시트 헤더 스타일
  const summaryHeaderRow = summarySheet.getRow(1);
  summaryHeaderRow.font = { bold: true, size: 12 };
  summaryHeaderRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2196F3" },
  };
  summaryHeaderRow.font.color = { argb: "FFFFFFFF" };
  summaryHeaderRow.alignment = { vertical: "middle", horizontal: "center" };

  // Buffer로 변환
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

// 파일 존재 여부 확인 후 고유명 생성 함수
async function generateUniqueFileName(
  baseFileName: string,
  supabaseClient: any
): Promise<string> {
  let finalFileName = baseFileName;
  let counter = 1;

  while (true) {
    const { data: existingFiles } = await supabaseClient.storage
      .from("reports")
      .list("", { search: finalFileName.split(".")[0] });

    if (
      !existingFiles ||
      existingFiles.length === 0 ||
      !existingFiles.some((file: any) => file.name === finalFileName)
    ) {
      break;
    }

    const nameWithoutExt = baseFileName.replace(".xlsx", "");
    finalFileName = `${nameWithoutExt}-${counter}.xlsx`;
    counter++;
  }

  return finalFileName;
}

// 유틸리티 함수들

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return dateString;
  }
}
