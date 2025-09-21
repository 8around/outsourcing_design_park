/**
 * Supabase Edge Function for sending Kakao Alimtalk notifications
 * SOLAPI NPM 패키지를 통한 카카오톡 알림톡 발송
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SolapiMessageService } from "npm:solapi@5.5.1";

const SOLAPI_API_KEY = Deno.env.get("SOLAPI_API_KEY")!;
const SOLAPI_SECRET_KEY = Deno.env.get("SOLAPI_SECRET_KEY")!;

// CORS 헤더 설정
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // POST 요청만 허용
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    // 요청 데이터 파싱
    const { type, data } = await req.json();

    // SolapiMessageService 인스턴스 생성
    const messageService = new SolapiMessageService(
      SOLAPI_API_KEY,
      SOLAPI_SECRET_KEY
    );

    // 프로젝트 승인 요청 타입만 처리
    if (type === "project-approval-request") {
      const result = await sendKakaoAlimtalk(data, messageService);
      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown message type: ${type}`);
  } catch (error) {
    console.error("Kakao send error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

/**
 * SOLAPI NPM 패키지를 통한 카카오톡 알림톡 발송
 */
async function sendKakaoAlimtalk(data: any, messageService: any) {
  const { to, templateId, variables } = data;

  // 필수 파라미터 검증
  if (!to || !templateId || !variables) {
    throw new Error(
      "필수 파라미터가 누락되었습니다. (to, templateId, variables)"
    );
  }

  // SOLAPI API 키 검증
  if (!SOLAPI_API_KEY || !SOLAPI_SECRET_KEY) {
    throw new Error("SOLAPI API 키가 설정되지 않았습니다.");
  }

  console.log("Sending Kakao message via SOLAPI SDK:", {
    to: formatPhoneNumber(to),
    templateId,
    variables,
  });

  // SOLAPI SDK를 사용한 카카오톡 알림톡 발송 (간소화된 버전)
  const result = await messageService.sendOne({
    from: "010-5217-1768", // 발신번호 (사전 등록 필요)
    to: formatPhoneNumber(to),
    type: "ATA", // 알림톡 타입
    kakaoOptions: {
      pfId: "KA01PF250919013917706NRMNHh8buyY", // 플러스친구 ID
      templateId: templateId,
      variables: variables,
    },
  });

  console.log("Kakao message sent successfully via SDK:", result);
  return result;
}

/**
 * 전화번호를 010-1234-5678 형식으로 변환
 */
function formatPhoneNumber(phone: string): string {
  // 숫자만 추출
  const cleaned = phone.replace(/[^0-9]/g, "");

  // 국가코드가 있는 경우 제거 (82로 시작하는 경우)
  let phoneNumber = cleaned;
  if (cleaned.startsWith("82")) {
    phoneNumber = "0" + cleaned.substring(2);
  }

  // 휴대폰 번호 형식 검증 및 포맷팅
  if (phoneNumber.startsWith("010") && phoneNumber.length === 11) {
    // 010-1234-5678 형식으로 변환
    return `${phoneNumber.substring(0, 3)}-${phoneNumber.substring(3, 7)}-${phoneNumber.substring(7)}`;
  }

  // 기타 휴대폰 번호 (011, 016, 017, 018, 019)
  if (phoneNumber.startsWith("01") && phoneNumber.length === 11) {
    return `${phoneNumber.substring(0, 3)}-${phoneNumber.substring(3, 7)}-${phoneNumber.substring(7)}`;
  }

  // 지역번호 처리
  if (phoneNumber.startsWith("02") && phoneNumber.length >= 9) {
    // 서울 지역번호: 02-1234-5678 또는 02-123-4567
    if (phoneNumber.length === 9) {
      return `${phoneNumber.substring(0, 2)}-${phoneNumber.substring(2, 5)}-${phoneNumber.substring(5)}`;
    } else if (phoneNumber.length === 10) {
      return `${phoneNumber.substring(0, 2)}-${phoneNumber.substring(2, 6)}-${phoneNumber.substring(6)}`;
    }
  }

  // 3자리 지역번호 (031, 032, 033 등)
  if (phoneNumber.startsWith("0") && phoneNumber.length >= 10) {
    if (phoneNumber.length === 10) {
      return `${phoneNumber.substring(0, 3)}-${phoneNumber.substring(3, 6)}-${phoneNumber.substring(6)}`;
    } else if (phoneNumber.length === 11) {
      return `${phoneNumber.substring(0, 3)}-${phoneNumber.substring(3, 7)}-${phoneNumber.substring(7)}`;
    }
  }

  // 형식에 맞지 않는 경우 원본 반환
  return phone;
}
