import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        detectSessionInUrl: true, // URL에서 세션 자동 감지 (비밀번호 재설정 링크 처리)
        flowType: "pkce", // PKCE 플로우 사용 (보안 강화)
      },
    }
  );
}
