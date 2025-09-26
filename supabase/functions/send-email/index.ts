import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
const fromEmail = "noreply@dpaworld.net";

serve(async (req) => {
  // CORS 헤더 설정
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  // OPTIONS 요청 처리
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();

    let result;

    switch (type) {
      case "project-approval-request":
        result = await sendProjectApprovalRequest(data);
        break;
      case "project-approval-approved":
        result = await sendProjectApprovalApproved(data);
        break;
      case "project-approval-rejected":
        result = await sendProjectApprovalRejected(data);
        break;
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

// 프로젝트 승인 요청 이메일
async function sendProjectApprovalRequest(data: any) {
  const { approverEmail, requesterName, projectName, memo, category } = data;

  // projectName을 현장명과 제품명으로 분리
  const [siteName, productName] = projectName.includes(" - ")
    ? projectName.split(" - ")
    : [projectName, ""];

  const createdAt = new Date().toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f4f4f4; padding: 20px; border-radius: 0 0 5px 5px; }
        .project-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .memo-box { background: #FFF3E0; padding: 15px; border-left: 4px solid #FF9800; margin: 15px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>프로젝트 승인 요청</h1>
        </div>
        <div class="content">
          <h2>승인이 필요한 항목이 있습니다</h2>
          <div class="project-info">
            <p><strong>프로젝트:</strong> ${siteName}-${productName}</p>
            <p><strong>요청자:</strong> ${requesterName}</p>
            <p><strong>카테고리:</strong> ${category}</p>
            <p><strong>요청 시간:</strong> ${createdAt}</p>
          </div>
          <div class="memo-box">
            <strong>요청 메모:</strong>
            <p>${memo || "메모 없음"}</p>
          </div>
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
    to: approverEmail,
    subject: `[승인 요청] ${siteName}${productName ? ` - ${productName}` : ""} - ${category}`,
    html,
  });

  if (error) throw error;
  return emailData;
}

// 프로젝트 승인 완료 이메일
async function sendProjectApprovalApproved(data: any) {
  const { requesterEmail, approverName, projectName, projectId, category } =
    data;

  // projectName을 현장명과 제품명으로 분리
  const [siteName, productName] = projectName.includes(" - ")
    ? projectName.split(" - ")
    : [projectName, ""];

  const approvedAt = new Date().toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f4f4f4; padding: 20px; border-radius: 0 0 5px 5px; }
        .project-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>프로젝트 승인 알림</h1>
        </div>
        <div class="content">
          <h2>요청하신 항목이 승인되었습니다</h2>
          <div class="project-info">
            <p><strong>프로젝트:</strong> ${siteName}-${productName}</p>
            <p><strong>승인자:</strong> ${approverName}</p>
            <p><strong>카테고리:</strong> ${category}</p>
            <p><strong>승인 시간:</strong> ${approvedAt}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const { data: emailData, error } = await resend.emails.send({
    from: fromEmail,
    to: requesterEmail,
    subject: `[승인] ${siteName}${productName ? ` - ${productName}` : ""}`,
    html,
  });

  if (error) throw error;
  return emailData;
}

// 프로젝트 승인 반려 이메일
async function sendProjectApprovalRejected(data: any) {
  const {
    requesterEmail,
    approverName,
    projectName,
    projectId,
    memo,
    category,
  } = data;

  // projectName을 현장명과 제품명으로 분리
  const [siteName, productName] = projectName.includes(" - ")
    ? projectName.split(" - ")
    : [projectName, ""];

  const rejectedAt = new Date().toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f4f4f4; padding: 20px; border-radius: 0 0 5px 5px; }
        .project-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .memo-box { background: #FFEBEE; padding: 15px; border-left: 4px solid #f44336; margin: 15px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #f44336; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>프로젝트 반려 알림</h1>
        </div>
        <div class="content">
          <h2>요청하신 항목이 반려되었습니다</h2>
          <div class="project-info">
            <p><strong>프로젝트:</strong> ${siteName}-${productName}</p>
            <p><strong>반려자:</strong> ${approverName}</p>
            <p><strong>카테고리:</strong> ${category}</p>
            <p><strong>반려 시간:</strong> ${rejectedAt}</p>
          </div>
          ${
            memo
              ? `
            <div class="memo-box">
              <strong>반려 사유:</strong>
              <p>${memo}</p>
            </div>
          `
              : ""
          }
        </div>
      </div>
    </body>
    </html>
  `;

  const { data: emailData, error } = await resend.emails.send({
    from: fromEmail,
    to: requesterEmail,
    subject: `[반려] ${siteName}${productName ? ` - ${productName}` : ""}`,
    html,
  });

  if (error) throw error;
  return emailData;
}
