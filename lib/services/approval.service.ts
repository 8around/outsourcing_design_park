import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/database/types/supabase";
import { emailClientService } from "@/lib/services/email.client.service";
import { kakaoClientService } from "@/lib/services/kakao.client.service";

type User = Database["public"]["Tables"]["users"]["Row"];
type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

export class ApprovalService {
  private supabase = createClient();

  /**
   * 승인 대기 중인 사용자 목록 조회
   */
  async getPendingUsers(): Promise<User[]> {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("is_approved", false)
      .is("approved_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending users:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * 상태별 사용자 목록 조회
   */
  async getUsersByStatus(
    status: "pending" | "approved" | "rejected"
  ): Promise<User[]> {
    console.log(`Fetching users with status: ${status}`);
    let query = this.supabase.from("users").select("*");

    switch (status) {
      case "pending":
        query = query.eq("is_approved", false).is("approved_at", null);
        break;
      case "approved":
        query = query.eq("is_approved", true);
        break;
      case "rejected":
        query = query.eq("is_approved", false).not("approved_at", "is", null);
        break;
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error(`Error fetching ${status} users:`, error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} ${status} users:`, data);
    return data || [];
  }

  /**
   * 사용자 승인
   */
  async approveUser(userId: string, adminId: string): Promise<boolean> {
    try {
      console.log("Approving user:", { userId, adminId });

      // For re-approval cases, we need to ensure the update actually changes something
      // First check if this is a re-approval (user was previously rejected)
      const { data: currentUser } = await this.supabase
        .from("users")
        .select("is_approved, approved_at")
        .eq("id", userId)
        .single();

      const isReApproval =
        currentUser && !currentUser.is_approved && currentUser.approved_at;

      if (isReApproval) {
        console.log("Re-approval detected, using two-step update process");

        // Step 1: Clear the approval fields to ensure the next update will detect changes
        const { error: clearError } = await this.supabase
          .from("users")
          .update({
            approved_at: null,
            approved_by: null,
          } as UserUpdate)
          .eq("id", userId);

        if (clearError) {
          console.error("Error clearing approval fields:", clearError);
        }

        // Small delay to ensure the trigger updates updated_at
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Step 2: Set the approval fields
      const updatePayload: UserUpdate = {
        is_approved: true,
        approved_by: adminId,
        approved_at: new Date().toISOString(),
      };

      // 1. 사용자 정보 업데이트
      const { data: updateData, error: updateError } = await this.supabase
        .from("users")
        .update(updatePayload)
        .eq("id", userId)
        .select();

      if (updateError) {
        console.error("Error approving user - Database error:", updateError);
        console.error("Error details:", {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        });
        throw updateError;
      }

      if (!updateData || updateData.length === 0) {
        console.error("Error approving user - No rows updated");
        throw new Error("Failed to update user - no rows affected");
      }

      console.log("User approval update successful:", updateData);

      // 2. 사용자 정보 조회 (알림용)
      const { data: userData } = await this.supabase
        .from("users")
        .select("email, name")
        .eq("id", userId)
        .single();

      // 3. 알림 생성
      if (userData) {
        await this.createApprovalNotification(
          userId,
          "approved",
          `귀하의 계정이 승인되었습니다. 이제 시스템을 이용하실 수 있습니다.`
        );

        // 이메일 발송 기능 제거됨 - 사용자 승인 이메일은 더 이상 발송하지 않음
        // await emailClientService.sendUserApprovalEmail(
        //   userData.email,
        //   userData.name,
        //   "approved"
        // );
      }

      return true;
    } catch (error) {
      console.error("Error in approveUser:", error);
      return false;
    }
  }

  /**
   * 사용자 거절
   */
  async rejectUser(
    userId: string,
    adminId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      console.log("Rejecting user:", { userId, adminId, reason });

      // 1. 사용자 정보 업데이트
      // Add a small delay to ensure updated_at is different from any existing timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const now = new Date();
      const updatePayload: UserUpdate = {
        is_approved: false,
        approved_by: adminId,
        approved_at: now.toISOString(),
        updated_at: new Date(now.getTime() + 1).toISOString(), // Ensure updated_at is slightly different
      };

      const { data: updateData, error: updateError } = await this.supabase
        .from("users")
        .update(updatePayload)
        .eq("id", userId)
        .select();

      if (updateError) {
        console.error("Error rejecting user - Database error:", updateError);
        console.error("Error details:", {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        });
        throw updateError;
      }

      if (!updateData || updateData.length === 0) {
        console.error("Error rejecting user - No rows updated");
        throw new Error("Failed to update user - no rows affected");
      }

      console.log("User rejection update successful:", updateData);

      // 2. 사용자 정보 조회 (알림용)
      const { data: userData } = await this.supabase
        .from("users")
        .select("email, name")
        .eq("id", userId)
        .single();

      // 3. 알림 생성
      if (userData) {
        const message = reason
          ? `귀하의 계정 승인이 거절되었습니다. 사유: ${reason}`
          : `귀하의 계정 승인이 거절되었습니다. 자세한 사항은 관리자에게 문의하세요.`;

        await this.createApprovalNotification(userId, "rejected", message);

        // 이메일 발송 기능 제거됨 - 사용자 거절 이메일은 더 이상 발송하지 않음
        // await emailClientService.sendUserApprovalEmail(
        //   userData.email,
        //   userData.name,
        //   "rejected",
        //   reason
        // );
      }

      return true;
    } catch (error) {
      console.error("Error in rejectUser:", error);
      return false;
    }
  }

  /**
   * 모든 사용자 목록 조회 (관리자용)
   */
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all users:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * 사용자 승인 상태 확인
   */
  async checkUserApprovalStatus(
    userId: string
  ): Promise<"pending" | "approved" | "rejected" | null> {
    const { data, error } = await this.supabase
      .from("users")
      .select("is_approved, approved_at")
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.error("Error checking user approval status:", error);
      return null;
    }

    if (data.is_approved) {
      return "approved";
    } else if (data.approved_at) {
      return "rejected";
    } else {
      return "pending";
    }
  }

  /**
   * 프로젝트 승인 요청 응답 처리
   */
  async respondToApprovalRequest(
    requestId: string,
    approverId: string,
    approverName: string,
    status: "approved" | "rejected",
    responseMemo: string
  ): Promise<boolean> {
    try {
      // 1. 승인 요청 정보 조회
      const { data: requestData, error: fetchError } = await this.supabase
        .from("approval_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError || !requestData) {
        console.error("Error fetching approval request:", fetchError);
        throw fetchError || new Error("Approval request not found");
      }

      // 2. approval_requests 테이블 업데이트
      const { error: updateError } = await this.supabase
        .from("approval_requests")
        .update({
          status: status,
          response_memo: responseMemo,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) {
        console.error("Error updating approval request:", updateError);
        throw updateError;
      }

      // 3. 승인 응답 로그 생성 - 제거됨
      // 데이터베이스 트리거가 자동으로 history_logs에 로그를 생성하므로
      // 수동으로 로그를 생성하면 중복이 발생합니다.
      // 트리거가 approval_requests 테이블 업데이트 시 자동으로 처리합니다.

      // 4. 요청자 정보 조회 (이메일과 전화번호)
      const { data: requesterData } = await this.supabase
        .from("users")
        .select("email, phone")
        .eq("id", requestData.requester_id)
        .single();

      // 5. 프로젝트 정보 조회
      const { data: projectData } = await this.supabase
        .from("projects")
        .select("site_name, product_name")
        .eq("id", requestData.project_id)
        .single();

      // 5-1. 승인 요청 로그에서 카테고리 정보 조회
      const { data: logData } = await this.supabase
        .from("history_logs")
        .select("category")
        .eq("project_id", requestData.project_id)
        .eq("log_type", "approval_request")
        .eq("author_id", requestData.requester_id)
        .eq("target_user_id", requestData.approver_id)
        .gte(
          "created_at",
          new Date(
            new Date(requestData.created_at).getTime() - 2000
          ).toISOString()
        )
        .lte(
          "created_at",
          new Date(
            new Date(requestData.created_at).getTime() + 2000
          ).toISOString()
        )
        .single();

      // 6. 이메일 발송
      if (requesterData?.email) {
        const projectName = projectData
          ? `${projectData.site_name} - ${projectData.product_name}`
          : "프로젝트";

        if (status === "approved") {
          await emailClientService.sendProjectApprovalApproved(
            requesterData.email,
            approverName,
            projectName,
            requestData.project_id,
            logData?.category || "승인"
          );
        } else {
          await emailClientService.sendProjectApprovalRejected(
            requesterData.email,
            approverName,
            projectName,
            requestData.project_id,
            logData?.category || "반려",
            responseMemo
          );
        }
      }

      // 7-1. 카카오톡 알림톡 발송 (승인 완료의 경우)
      let kakaoApprovedResult = null;
      if (
        status === "approved" &&
        requesterData?.phone &&
        kakaoClientService.canSendKakao(requesterData.phone)
      ) {
        try {
          kakaoApprovedResult =
            await kakaoClientService.sendProjectApprovalApproved(
              requesterData.phone,
              approverName,
              projectData?.site_name || "현장",
              projectData?.product_name || "프로젝트",
              logData?.category || "승인요청"
            );
          console.log("승인 완료 카카오톡 발송 성공");
        } catch (error) {
          // 카카오톡 발송 실패해도 승인은 정상 처리
          console.error("승인 완료 카카오톡 발송 실패:", error);
        }
      }

      // 7-2. 카카오톡 알림톡 발송 (승인 반려의 경우)
      let kakaoRejectedResult = null;
      if (
        status === "rejected" &&
        requesterData?.phone &&
        kakaoClientService.canSendKakao(requesterData.phone)
      ) {
        try {
          kakaoRejectedResult =
            await kakaoClientService.sendProjectApprovalRejection(
              requesterData.phone,
              approverName,
              projectData?.site_name || "현장",
              projectData?.product_name || "프로젝트",
              logData?.category || "승인요청", // history_logs에서 조회한 카테고리 사용
              responseMemo
            );
          console.log("승인 반려 카카오톡 발송 성공");
        } catch (error) {
          // 카카오톡 발송 실패해도 승인 반려는 정상 처리
          console.error("승인 반려 카카오톡 발송 실패:", error);
        }
      }

      // 8. 알림 생성 (요청자에게)
      const statusText = status === "approved" ? "승인" : "반려";
      const title =
        status === "approved" ? "승인 요청 승인됨" : "승인 요청 반려됨";

      await this.createProjectNotification(
        requestData.requester_id,
        "approval_response",
        title,
        `${approverName}님이 프로젝트 승인 요청을 ${statusText}했습니다: ${responseMemo}`,
        requestId,
        "approval_request",
        status === "approved"
          ? kakaoApprovedResult?.success
          : kakaoRejectedResult?.success,
        status === "approved"
          ? kakaoApprovedResult?.success
            ? new Date().toISOString()
            : null
          : kakaoRejectedResult?.success
            ? new Date().toISOString()
            : null
      );

      return true;
    } catch (error) {
      console.error("Error in respondToApprovalRequest:", error);
      return false;
    }
  }

  /**
   * 사용자 삭제 (관리자 전용 - 미승인 사용자 삭제용)
   */
  async deleteUser(userId: string, adminId: string): Promise<boolean> {
    try {
      // 사용자 삭제 (users 테이블)
      const { error } = await this.supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (error) {
        console.error("Error deleting user:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in deleteUser:", error);
      return false;
    }
  }

  /**
   * 승인 요청 삭제 (관리자 전용)
   */
  async deleteApprovalRequest(
    requestId: string,
    adminId: string
  ): Promise<boolean> {
    try {
      console.log("deleteApprovalRequest called:", { requestId, adminId });

      // 승인 요청 정보 조회
      const { data: requestData, error: fetchError } = await this.supabase
        .from("approval_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      console.log("Approval request data:", requestData);
      console.log("Fetch error:", fetchError);

      if (fetchError || !requestData) {
        console.error("Error fetching approval request:", fetchError);
        throw fetchError || new Error("Approval request not found");
      }

      // 1. 승인 요청과 관련된 로그 삭제 (승인 요청 로그)
      const { error: requestLogDeleteError } = await this.supabase
        .from("history_logs")
        .update({
          is_deleted: true,
          deleted_by: adminId,
          deleted_at: new Date().toISOString(),
        })
        .match({
          project_id: requestData.project_id,
          author_id: requestData.requester_id,
          target_user_id: requestData.approver_id,
          log_type: "approval_request",
        });

      if (requestLogDeleteError) {
        console.error("Error deleting request logs:", requestLogDeleteError);
      }

      // 2. 승인 응답 로그도 삭제 (있는 경우)
      if (requestData.status !== "pending") {
        const { error: responseLogDeleteError } = await this.supabase
          .from("history_logs")
          .update({
            is_deleted: true,
            deleted_by: adminId,
            deleted_at: new Date().toISOString(),
          })
          .match({
            project_id: requestData.project_id,
            author_id: requestData.approver_id,
            target_user_id: requestData.requester_id,
            log_type: "approval_response",
          });

        if (responseLogDeleteError) {
          console.error(
            "Error deleting response logs:",
            responseLogDeleteError
          );
        }
      }

      // 3. 승인 요청 삭제 (실제 삭제)
      const { error: deleteError } = await this.supabase
        .from("approval_requests")
        .delete()
        .eq("id", requestId);

      if (deleteError) {
        console.error("Error deleting approval request:", deleteError);
        throw deleteError;
      }

      return true;
    } catch (error) {
      console.error("Error in deleteApprovalRequest:", error);
      return false;
    }
  }

  /**
   * 프로젝트 승인 관련 알림 생성
   */
  private async createProjectNotification(
    userId: string,
    type: "approval_request" | "approval_response",
    title: string,
    message: string,
    relatedId?: string,
    relatedType?: "project" | "approval_request",
    kakaoSent?: boolean,
    kakaoSentAt?: string | null,
    emailSent?: boolean,
    emailSentAt?: string | null
  ): Promise<void> {
    try {
      await this.supabase.from("notifications").insert({
        user_id: userId,
        title,
        message,
        type,
        related_id: relatedId,
        related_type: relatedType,
        is_read: false,
        kakao_sent: kakaoSent || false,
        kakao_sent_at: kakaoSentAt || null,
        email_sent: emailSent || false,
        email_sent_at: emailSentAt || null,
      });
    } catch (error) {
      console.error("Error creating project notification:", error);
    }
  }

  /**
   * 승인 관련 알림 생성
   */
  private async createApprovalNotification(
    userId: string,
    type: "approved" | "rejected",
    message: string
  ): Promise<void> {
    try {
      await this.supabase.from("notifications").insert({
        user_id: userId,
        title: type === "approved" ? "계정 승인 완료" : "계정 승인 거절",
        message,
        type: "system",
        is_read: false,
      });
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  }

  /**
   * 관리자에게 신규 가입 알림
   */
  async notifyAdminsOfNewSignup(
    newUserId: string,
    newUserName: string,
    newUserEmail?: string
  ): Promise<void> {
    try {
      // 모든 관리자 조회
      const { data: admins } = await this.supabase
        .from("users")
        .select("id, email")
        .eq("role", "admin")
        .eq("is_approved", true);

      if (!admins || admins.length === 0) return;

      // 각 관리자에게 알림 생성
      const notifications = admins.map((admin) => ({
        user_id: admin.id,
        title: "신규 사용자 가입",
        message: `${newUserName}님이 가입했습니다. 승인이 필요합니다.`,
        type: "system" as const,
        related_id: newUserId,
        related_type: "user" as const,
        is_read: false,
      }));

      await this.supabase.from("notifications").insert(notifications);

      // 관리자들에게 이메일 발송 기능 제거됨 - 신규 가입 알림 이메일은 더 이상 발송하지 않음
      // const adminEmails = admins
      //   .map((admin) => admin.email)
      //   .filter(Boolean) as string[];
      // if (adminEmails.length > 0 && newUserEmail) {
      //   await emailClientService.sendNewSignupNotification(
      //     adminEmails,
      //     newUserName,
      //     newUserEmail
      //   );
      // }
    } catch (error) {
      console.error("Error notifying admins:", error);
    }
  }

  /**
   * 현재 사용자의 승인 대기 목록 조회
   */
  async getPendingApprovalsForUser(userId: string): Promise<{
    userApprovals: Record<string, unknown>[];
    projectApprovals: Record<string, unknown>[];
    total: number;
  }> {
    try {
      // 1. 사용자 승인 대기 목록 (관리자인 경우만)
      let userApprovals: Record<string, unknown>[] = [];
      const { data: currentUser } = await this.supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (currentUser?.role === "admin") {
        const { data: pendingUsers } = await this.supabase
          .from("users")
          .select("id, email, name, created_at")
          .eq("is_approved", false)
          .is("approved_at", null)
          .order("created_at", { ascending: false })
          .limit(10);

        userApprovals = (pendingUsers || []).map((user) => ({
          id: user.id,
          type: "user" as const,
          title: "신규 사용자 가입 승인",
          description: `${user.email} 사용자가 가입 승인을 기다리고 있습니다.`,
          requester_id: user.id,
          requester_name: user.name || user.email,
          requester_email: user.email,
          status: "pending" as const,
          priority: "high" as const,
          created_at: user.created_at,
          requestType: "received" as const, // 관리자가 받은 승인 요청
        }));
      }

      // 2. 프로젝트 승인 요청 목록 - 내가 받은 요청
      // 먼저 approval_requests를 가져온 후 history_logs와 매칭
      const { data: receivedApprovals } = await this.supabase
        .from("approval_requests")
        .select(
          `
          *,
          project:projects(site_name, product_name)
        `
        )
        .eq("approver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      // 각 approval에 대해 history_logs 조회 (첨부파일 포함)
      const receivedApprovalsWithCategory = await Promise.all(
        (receivedApprovals || []).map(async (approval) => {
          const { data: logData } = await this.supabase
            .from("history_logs")
            .select(
              `
              category,
              attachments:history_log_attachments(
                id,
                file_name,
                file_path,
                file_size,
                mime_type,
                created_at
              )
            `
            )
            .eq("project_id", approval.project_id)
            .eq("log_type", "approval_request")
            .eq("author_id", approval.requester_id)
            .eq("target_user_id", approval.approver_id)
            .gte(
              "created_at",
              new Date(
                new Date(approval.created_at).getTime() - 2000
              ).toISOString()
            )
            .lte(
              "created_at",
              new Date(
                new Date(approval.created_at).getTime() + 2000
              ).toISOString()
            )
            .single();

          return {
            ...approval,
            history_logs: logData ? [logData] : [],
          };
        })
      );

      const formattedReceivedApprovals = (
        receivedApprovalsWithCategory || []
      ).map((approval) => ({
        id: approval.id,
        type: "project" as const,
        title: "프로젝트 승인 요청",
        description: approval.memo || "승인이 필요한 프로젝트가 있습니다.",
        requester_id: approval.requester_id,
        requester_name: approval.requester_name,
        approver_id: approval.approver_id,
        approver_name: approval.approver_name,
        status: "pending" as const,
        priority: "medium" as const,
        created_at: approval.created_at,
        project_id: approval.project_id,
        project_name: approval.project
          ? `${approval.project.site_name} - ${approval.project.product_name}`
          : "프로젝트",
        category: approval.history_logs?.[0]?.category || null, // 로그 카테고리 추가
        attachments: approval.history_logs?.[0]?.attachments || [], // 첨부파일 추가
        requestType: "received" as const, // 내가 받은 승인 요청
      }));

      // 3. 프로젝트 승인 요청 목록 - 내가 보낸 요청
      const { data: sentApprovals } = await this.supabase
        .from("approval_requests")
        .select(
          `
          *,
          project:projects(site_name, product_name)
        `
        )
        .eq("requester_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      // 각 approval에 대해 history_logs 조회 (첨부파일 포함)
      const sentApprovalsWithCategory = await Promise.all(
        (sentApprovals || []).map(async (approval) => {
          const { data: logData } = await this.supabase
            .from("history_logs")
            .select(
              `
              category,
              attachments:history_log_attachments(
                id,
                file_name,
                file_path,
                file_size,
                mime_type,
                created_at
              )
            `
            )
            .eq("project_id", approval.project_id)
            .eq("log_type", "approval_request")
            .eq("author_id", approval.requester_id)
            .eq("target_user_id", approval.approver_id)
            .gte(
              "created_at",
              new Date(
                new Date(approval.created_at).getTime() - 2000
              ).toISOString()
            )
            .lte(
              "created_at",
              new Date(
                new Date(approval.created_at).getTime() + 2000
              ).toISOString()
            )
            .single();

          return {
            ...approval,
            history_logs: logData ? [logData] : [],
          };
        })
      );

      const formattedSentApprovals = (sentApprovalsWithCategory || []).map(
        (approval) => ({
          id: approval.id,
          type: "project" as const,
          title: "프로젝트 승인 요청 (대기중)",
          description: approval.memo || "승인 대기 중인 요청입니다.",
          requester_id: approval.requester_id,
          requester_name: approval.requester_name,
          approver_id: approval.approver_id,
          approver_name: approval.approver_name,
          status: "pending" as const,
          priority: "low" as const, // 내가 보낸 요청은 낮은 우선순위
          created_at: approval.created_at,
          project_id: approval.project_id,
          project_name: approval.project
            ? `${approval.project.site_name} - ${approval.project.product_name}`
            : "프로젝트",
          category: approval.history_logs?.[0]?.category || null, // 로그 카테고리 추가
          attachments: approval.history_logs?.[0]?.attachments || [], // 첨부파일 추가
          requestType: "sent" as const, // 내가 보낸 승인 요청
        })
      );

      // 모든 프로젝트 승인 요청을 합치기
      const allProjectApprovals = [
        ...formattedReceivedApprovals,
        ...formattedSentApprovals,
      ];

      const total = userApprovals.length + allProjectApprovals.length;

      return {
        userApprovals,
        projectApprovals: allProjectApprovals,
        total,
      };
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      throw error;
    }
  }
}

export const approvalService = new ApprovalService();
