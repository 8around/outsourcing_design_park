import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  // 리다이렉트 URL 준비 (토큰 파라미터 제거)
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("next");

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // 이메일 인증 성공
      console.log("Email verification successful");
      
      // 인증 성공 페이지로 리다이렉트 (로그인 페이지로 이동)
      redirectTo.pathname = "/login";
      redirectTo.searchParams.set("verified", "true");
      return NextResponse.redirect(redirectTo);
    } else {
      console.error("Email verification failed:", error);
    }
  }

  // 에러가 발생한 경우 에러 페이지로 리다이렉트
  redirectTo.pathname = "/login";
  redirectTo.searchParams.set("error", "verification_failed");
  return NextResponse.redirect(redirectTo);
}