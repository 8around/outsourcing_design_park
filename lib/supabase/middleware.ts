import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          supabaseResponse.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 인증이 필요한 경로 정의
  const protectedPaths = [
    "/dashboard",
    "/projects",
    "/admin",
    "/gantt",
    "/calendar",
    "/notifications",
  ];
  
  // Admin 전용 경로 정의
  const adminOnlyPaths = [
    "/admin/users",
    "/admin/reports",
    "/admin/settings"
  ];
  const authPaths = ["/login", "/signup", "/reset-password"];
  const pathname = request.nextUrl.pathname;

  // 이메일 인증 후 대시보드로 오는 경우 처리
  if (pathname === "/dashboard" || pathname === "/") {
    const verified = request.nextUrl.searchParams.get("verified");
    const message = request.nextUrl.searchParams.get("message");
    
    if (verified === "true" || message === "approval_pending") {
      // 이메일 인증 완료 후 로그인 페이지로 리다이렉트
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("verified", "true");
      url.searchParams.delete("message");
      return NextResponse.redirect(url);
    }
  }

  // 보호된 경로에 미인증 사용자가 접근하려고 할 때
  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(url);
    }

    // 사용자 정보 조회 (role과 is_approved 체크)
    const { data: userData } = await supabase
      .from("users")
      .select("role, is_approved, approved_at")
      .eq("id", session.user.id)
      .single();

    if (userData) {
      // 미승인 사용자 체크
      if (!userData.is_approved) {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        
        // 승인 상태에 따른 메시지 설정
        if (userData.approved_at) {
          // 거절된 경우
          url.searchParams.set("message", "approval_rejected");
        } else {
          // 대기 중인 경우
          url.searchParams.set("message", "approval_pending");
        }
        return NextResponse.redirect(url);
      }

      // Admin 경로 접근 권한 체크
      if (pathname.startsWith("/admin") || adminOnlyPaths.some(path => pathname.startsWith(path))) {
        if (userData.role !== "admin") {
          // 일반 사용자가 admin 경로에 접근하려는 경우
          const url = request.nextUrl.clone();
          url.pathname = "/";
          url.searchParams.set("message", "unauthorized");
          return NextResponse.redirect(url);
        }
      }
    }
  }

  // 인증된 사용자가 인증 페이지에 접근하려고 할 때
  if (authPaths.some((path) => pathname.startsWith(path))) {
    // 비밀번호 재설정 확인 페이지는 세션이 있어도 접근 허용 (recovery 세션 처리용)
    const isResetConfirm = pathname.startsWith("/reset-password/confirm");
    if (session && !isResetConfirm) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
