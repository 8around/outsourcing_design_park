import { createClient } from "@/lib/supabase/client";
import { AuthError, User } from "@supabase/supabase-js";
import { approvalService } from "@/lib/services/approval.service";

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User | null;
  error?: string;
}

export interface ResetPasswordRequestData {
  email: string;
}

export interface ResetPasswordConfirmData {
  newPassword: string;
}

export class AuthService {
  private supabase = createClient();

  /**
   * 이메일 중복 체크
   */
  async checkEmailExists(
    email: string
  ): Promise<{ exists: boolean; message?: string }> {
    try {
      // .single() 대신 일반 쿼리 사용
      const { data, error } = await this.supabase
        .from("users")
        .select("id, email, is_approved")
        .eq("email", email);

      if (error) {
        console.error("Email check query error:", error);
        throw error;
      }

      // 데이터가 없는 경우 (사용 가능한 이메일)
      if (!data || data.length === 0) {
        return { exists: false };
      }

      // 이메일이 이미 존재하는 경우 (첫 번째 레코드 확인)
      const user = data[0];

      // 승인 대기 중인 계정인 경우
      if (!user.is_approved) {
        return {
          exists: true,
          message: "이미 등록된 이메일입니다. 관리자 승인 대기 중입니다.",
        };
      }

      // 이미 활성화된 계정인 경우
      return {
        exists: true,
        message: "이미 사용 중인 이메일입니다. 다른 이메일을 사용해주세요.",
      };
    } catch (error) {
      console.error("Email check error:", error);
      // 에러가 발생해도 회원가입을 막지 않기 위해 false 반환
      return { exists: false };
    }
  }

  /**
   * 회원가입
   */
  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      // 1. 이메일 중복 체크
      const emailCheck = await this.checkEmailExists(data.email);

      if (emailCheck.exists) {
        return {
          success: false,
          error: emailCheck.message || "이미 사용 중인 이메일입니다.",
        };
      }

      // 2. Supabase Auth에 사용자 생성
      const { data: authData, error: authError } =
        await this.supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              name: data.name,
              phone: data.phone,
            },
          },
        });

      if (authError) throw authError;

      // 프로필 레코드는 DB 트리거가 자동 생성하므로 별도 삽입하지 않음

      // 관리자에게 신규 가입 알림 발송
      if (authData.user) {
        await approvalService.notifyAdminsOfNewSignup(
          authData.user.id,
          data.name
        );
      }

      return {
        success: true,
        user: authData.user,
      };
    } catch (error) {
      console.error("SignUp error:", error);
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * 로그인
   */
  async signIn(data: SignInData): Promise<AuthResponse> {
    try {
      const { data: authData, error } =
        await this.supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      // 로그인 실패 시 더 구체적인 에러 확인
      if (error) {
        // Invalid login credentials인 경우 추가 확인
        if (error.message === "Invalid login credentials") {
          // 사용자가 존재하는지 확인
          const { data: existingUser } = await this.supabase
            .from("users")
            .select("id, is_approved, email")
            .eq("email", data.email)
            .single();

          if (!existingUser) {
            throw new Error(
              "등록되지 않은 이메일입니다. 회원가입을 진행해주세요."
            );
          }

          // 승인되지 않은 계정 확인
          if (!existingUser.is_approved) {
            throw new Error(
              "관리자 승인 대기 중입니다. 승인 완료 후 로그인이 가능합니다."
            );
          }

          // 그 외의 경우 (비밀번호 오류)
          throw new Error("비밀번호가 올바르지 않습니다.");
        }

        throw error;
      }

      // 사용자 승인 상태 확인
      if (authData.user) {
        const { data: userData, error: userError } = await this.supabase
          .from("users")
          .select("is_approved")
          .eq("id", authData.user.id)
          .single();

        if (userError) throw userError;

        if (!userData?.is_approved) {
          // 미승인 사용자는 로그아웃
          await this.signOut();
          throw new Error(
            "관리자 승인 대기 중입니다. 승인 완료 후 로그인이 가능합니다."
          );
        }
      }

      return {
        success: true,
        user: authData.user,
      };
    } catch (error) {
      console.error("SignIn error:", error);
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * 로그아웃
   */
  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  /**
   * 현재 세션 가져오기
   */
  async getSession() {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    return session;
  }

  /**
   * 현재 사용자 정보 가져오기
   */
  async getCurrentUser() {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (user) {
      const { data: userData } = await this.supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      return userData;
    }

    return null;
  }

  /**
   * 사용자 승인 상태 체크
   */
  async checkUserApprovalStatus(userId: string): Promise<{
    status: "pending" | "approved" | "rejected";
    message: string;
  }> {
    const { data, error } = await this.supabase
      .from("users")
      .select("is_approved, approved_at")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return {
        status: "pending",
        message: "사용자 정보를 확인할 수 없습니다.",
      };
    }

    if (data.is_approved) {
      return {
        status: "approved",
        message: "승인된 사용자입니다.",
      };
    } else if (data.approved_at) {
      return {
        status: "rejected",
        message: "승인이 거절되었습니다. 관리자에게 문의하세요.",
      };
    } else {
      return {
        status: "pending",
        message: "관리자 승인 대기 중입니다.",
      };
    }
  }

  /**
   * Auth 상태 변경 구독
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null);
    });
  }

  /**
   * 비밀번호 재설정 이메일 발송
   */
  async sendPasswordResetEmail(
    data: ResetPasswordRequestData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo: `${window.location.origin}/reset-password/confirm`,
        }
      );
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  /**
   * 비밀번호 재설정(메일 링크 클릭 후 새 비밀번호 저장)
   * - URL의 access_token/refresh_token 처리 및 recovery 세션은 @supabase/ssr 설정으로 자동 처리됨
   */
  async updatePassword(
    data: ResetPasswordConfirmData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: data.newPassword,
      });
      if (error) throw error;
      // 비밀번호 변경 후에는 로그인 유지가 아닌 재로그인 유도
      // (미들웨어에서 /login 접근 리다이렉트를 피하기 위해 세션 종료)
      try {
        await this.supabase.auth.signOut();
      } catch (e) {
        // signOut 실패는 UX에 큰 영향이 없으므로 로깅만
        console.error("Sign out after password update failed", e);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  /**
   * 사용자 프로필 업데이트 (이름, 전화번호)
   */
  async updateUserProfile(
    data: { name: string; phone: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 현재 로그인한 사용자 정보 가져오기
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('로그인이 필요합니다.');
      }

      // users 테이블 업데이트
      const { error: updateError } = await this.supabase
        .from('users')
        .update({
          name: data.name,
          phone: data.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  /**
   * 에러 메시지 처리
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof AuthError) {
      switch (error.message) {
        case "Invalid login credentials":
          return "로그인 정보를 확인해주세요.";
        case "Email not confirmed":
          return "이메일 인증이 필요합니다. 가입 시 받은 이메일을 확인해주세요.";
        case "User already registered":
          return "이미 등록된 이메일입니다.";
        case "Email rate limit exceeded":
          return "너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.";
        case "User not found":
          return "등록되지 않은 계정입니다.";
        default:
          // 기타 Auth 에러
          if (error.message.includes("email")) {
            return "이메일 관련 오류가 발생했습니다.";
          }
          if (error.message.includes("password")) {
            return "비밀번호 관련 오류가 발생했습니다.";
          }
          return error.message;
      }
    }

    if (error instanceof Error) {
      // 커스텀 에러 메시지는 그대로 반환
      return error.message;
    }

    return "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
}

// 싱글톤 인스턴스
export const authService = new AuthService();
