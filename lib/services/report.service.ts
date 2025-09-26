import { createClient } from "@/lib/supabase/client";
import { WeeklyReportConfig, WeeklyReportHistory } from "@/types/report";

export class ReportService {
  private supabase = createClient();

  /**
   * Get weekly report configuration
   */
  async getReportConfig(): Promise<WeeklyReportConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from("weekly_report_config")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error fetching report config:", error);
      throw error;
    }
  }

  /**
   * Create or update weekly report configuration
   */
  async upsertReportConfig(
    config: Partial<WeeklyReportConfig>
  ): Promise<WeeklyReportConfig> {
    try {
      // Check if config exists
      const { data: existingConfig } = await this.supabase
        .from("weekly_report_config")
        .select("id")
        .single();

      let result;
      if (existingConfig) {
        // Update existing config
        const { data, error } = await this.supabase
          .from("weekly_report_config")
          .update({
            ...config,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingConfig.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new config
        const { data, error } = await this.supabase
          .from("weekly_report_config")
          .insert({
            ...config,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return result;
    } catch (error) {
      console.error("Error upserting report config:", error);
      throw error;
    }
  }

  /**
   * Get weekly report history with pagination and filtering
   */
  async getReportHistory(
    params: {
      page?: number;
      pageSize?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{
    data: WeeklyReportHistory[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      const { page = 1, pageSize = 10, status, startDate, endDate } = params;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = this.supabase
        .from("weekly_report_history")
        .select("*", { count: "exact" });

      // Apply filters
      if (status) {
        query = query.eq("send_status", status);
      }

      if (startDate) {
        query = query.gte("created_at", startDate);
      }

      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      // Apply pagination and sorting
      query = query.order("created_at", { ascending: false }).range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page,
        pageSize,
      };
    } catch (error) {
      console.error("Error fetching report history:", error);
      throw error;
    }
  }

  /**
   * Get single report history item
   */
  async getReportHistoryById(id: string): Promise<WeeklyReportHistory | null> {
    try {
      const { data, error } = await this.supabase
        .from("weekly_report_history")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error fetching report history item:", error);
      throw error;
    }
  }

  /**
   * Retry sending a failed report
   */
  async retryReport(historyId: string): Promise<void> {
    try {
      // Update the status to pending to trigger resend
      const { error } = await this.supabase
        .from("weekly_report_history")
        .update({
          send_status: "pending",
          send_attempts: 0,
          error_message: null,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", historyId);

      if (error) throw error;

      // Here you would typically trigger the email sending function
      // For now, we'll just update the status
      // In production, this would call an Edge Function or API endpoint
    } catch (error) {
      console.error("Error retrying report:", error);
      throw error;
    }
  }

  /**
   * Delete report history item
   */
  async deleteReportHistory(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("weekly_report_history")
        .delete()
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting report history:", error);
      throw error;
    }
  }

  /**
   * Get report statistics
   */
  async getReportStatistics(): Promise<{
    totalSent: number;
    successfulSent: number;
    failedSent: number;
    pendingSent: number;
    lastSentDate: string | null;
  }> {
    try {
      const { data, error } = await this.supabase
        .from("weekly_report_history")
        .select("send_status, sent_at");

      if (error) throw error;

      const stats = {
        totalSent: data?.length || 0,
        successfulSent:
          data?.filter((r) => r.send_status === "sent").length || 0,
        failedSent: data?.filter((r) => r.send_status === "failed").length || 0,
        pendingSent:
          data?.filter((r) => r.send_status === "pending").length || 0,
        lastSentDate: null as string | null,
      };

      // Find last successful sent date
      const lastSent = data
        ?.filter((r) => r.send_status === "sent" && r.sent_at)
        .sort(
          (a, b) =>
            new Date(b.sent_at!).getTime() - new Date(a.sent_at!).getTime()
        )[0];

      if (lastSent?.sent_at) {
        stats.lastSentDate = lastSent.sent_at;
      }

      return stats;
    } catch (error) {
      console.error("Error fetching report statistics:", error);
      throw error;
    }
  }

  /**
   * Test email sending with current configuration
   * 실제로 Edge Function을 호출하여 테스트 리포트를 발송합니다.
   */
  async testEmailSending(
    testEmail: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // generate-weekly-report Edge Function을 테스트 모드로 호출
      const { data, error } = await this.supabase.functions.invoke(
        "generate-weekly-report",
        {
          body: {
            test: false, // 테스트 모드 활성화
            emails: [testEmail], // 테스트 이메일 주소 배열
          },
        }
      );

      if (error) {
        console.error("Edge Function error:", error);
        throw error;
      }

      // Edge Function 응답 확인
      if (data?.success) {
        return {
          success: true,
          message: `테스트 리포트가 ${testEmail}로 발송되었습니다. 잠시 후 이메일을 확인해주세요.`,
        };
      } else {
        return {
          success: false,
          message: data?.error || "테스트 이메일 발송에 실패했습니다.",
        };
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      return {
        success: false,
        message: "테스트 이메일 발송에 실패했습니다. 다시 시도해주세요.",
      };
    }
  }
}

// Export singleton instance
export const reportService = new ReportService();
