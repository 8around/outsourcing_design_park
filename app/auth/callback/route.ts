import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // PKCE flow - code 파라미터 처리
  const code = searchParams.get("code");

  // Magic Link flow - token_hash와 type 파라미터 처리
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // 에러 처리
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // 리다이렉트 경로
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    next = "/";
  }

  // 리다이렉트 URL 준비
  const redirectTo = request.nextUrl.clone();

  // PKCE flow - code 처리
  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 이메일 인증 성공

      // 세션 유지가 목적이 아닌 이메일 확인만 필요하므로 즉시 로그아웃
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Sign out after verification failed (PKCE flow)", e);
      }
      // 로그인 페이지로 리다이렉트
      redirectTo.pathname = "/login";
      redirectTo.searchParams.set("verified", "true");
      redirectTo.searchParams.delete("code");
      return NextResponse.redirect(redirectTo);
    } else {
      console.error("Code exchange failed:", error);

      // 에러 페이지로 리다이렉트
      redirectTo.pathname = "/login";
      redirectTo.searchParams.set("error", "verification_failed");
      redirectTo.searchParams.set(
        "error_message",
        error.message || "인증에 실패했습니다"
      );
      redirectTo.searchParams.delete("code");
      return NextResponse.redirect(redirectTo);
    }
  }

  // Magic Link flow - token_hash 처리
  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // 이메일 인증 성공

      // 세션 유지가 목적이 아닌 이메일 확인만 필요하므로 즉시 로그아웃
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error(
          "Sign out after verification failed (Magic Link flow)",
          e
        );
      }
      // 로그인 페이지로 리다이렉트
      redirectTo.pathname = "/login";
      redirectTo.searchParams.set("verified", "true");
      redirectTo.searchParams.delete("token_hash");
      redirectTo.searchParams.delete("type");
      return NextResponse.redirect(redirectTo);
    } else {
      console.error("OTP verification failed:", error);
    }
  }

  // 에러 파라미터 처리
  if (error) {
    console.error("Auth callback error:", error, errorDescription);

    // 에러 메시지에 따른 처리
    if (error === "access_denied" && errorDescription?.includes("expired")) {
      redirectTo.pathname = "/login";
      redirectTo.searchParams.set("error", "link_expired");
      redirectTo.searchParams.set(
        "error_message",
        "인증 링크가 만료되었습니다. 다시 시도해주세요."
      );
    } else {
      redirectTo.pathname = "/login";
      redirectTo.searchParams.set("error", "verification_failed");
      redirectTo.searchParams.set(
        "error_message",
        errorDescription || "인증에 실패했습니다"
      );
    }

    // 모든 auth 관련 파라미터 제거
    redirectTo.searchParams.delete("error");
    redirectTo.searchParams.delete("error_code");
    redirectTo.searchParams.delete("error_description");
    redirectTo.searchParams.delete("token_hash");
    redirectTo.searchParams.delete("type");
    redirectTo.searchParams.delete("code");

    return NextResponse.redirect(redirectTo);
  }

  // 파라미터가 없는 경우 에러 페이지로 리다이렉트
  redirectTo.pathname = "/login";
  redirectTo.searchParams.set("error", "invalid_request");
  redirectTo.searchParams.set("error_message", "잘못된 인증 요청입니다");
  return NextResponse.redirect(redirectTo);
}
