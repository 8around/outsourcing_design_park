import { createClient } from '@/lib/supabase/client'

export class EmailClientService {
  private supabase = createClient();
  /**
   * 프로젝트 승인 요청 이메일 발송
   */
  async sendProjectApprovalRequest(
    approverEmail: string,
    requesterName: string,
    projectName: string,
    projectId: string,
    memo: string,
    category: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.functions.invoke('send-email', {
        body: {
          type: 'project-approval-request',
          data: {
            approverEmail,
            requesterName,
            projectName,
            projectId,
            memo,
            category
          }
        }
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error sending project approval request email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '이메일 발송에 실패했습니다.'
      }
    }
  }

  /**
   * 프로젝트 승인 완료 이메일 발송
   */
  async sendProjectApprovalApproved(
    requesterEmail: string,
    approverName: string,
    projectName: string,
    projectId: string,
    category: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.functions.invoke('send-email', {
        body: {
          type: 'project-approval-approved',
          data: {
            requesterEmail,
            approverName,
            projectName,
            projectId,
            category
          }
        }
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error sending project approval approved email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '이메일 발송에 실패했습니다.'
      }
    }
  }

  /**
   * 프로젝트 승인 반려 이메일 발송
   */
  async sendProjectApprovalRejected(
    requesterEmail: string,
    approverName: string,
    projectName: string,
    projectId: string,
    category: string,
    memo?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.functions.invoke('send-email', {
        body: {
          type: 'project-approval-rejected',
          data: {
            requesterEmail,
            approverName,
            projectName,
            projectId,
            category,
            memo
          }
        }
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error sending project approval rejected email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '이메일 발송에 실패했습니다.'
      }
    }
  }

  /**
   * 사용자 승인/거절 이메일 발송 (제거됨 - 더 이상 사용하지 않음)
   * 프로젝트 관련 이메일만 처리하는 정책에 따라 제거
   */
  // async sendUserApprovalEmail(
  //   email: string,
  //   userName: string,
  //   status: 'approved' | 'rejected',
  //   reason?: string
  // ): Promise<{ success: boolean; error?: string }> {
  //   try {
  //     const { data, error } = await this.supabase.functions.invoke('send-email', {
  //       body: {
  //         type: 'user-approval',
  //         data: {
  //           email,
  //           userName,
  //           status,
  //           reason
  //         }
  //       }
  //     })

  //     if (error) throw error

  //     return { success: true }
  //   } catch (error) {
  //     console.error('Error sending user approval email:', error)
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : '이메일 발송에 실패했습니다.'
  //     }
  //   }
  // }

  /**
   * 관리자에게 신규 가입 알림 이메일 발송 (제거됨 - 더 이상 사용하지 않음)
   * 프로젝트 관련 이메일만 처리하는 정책에 따라 제거
   */
  // async sendNewSignupNotification(
  //   adminEmails: string[],
  //   newUserName: string,
  //   newUserEmail: string
  // ): Promise<{ success: boolean; error?: string }> {
  //   try {
  //     const { data, error } = await this.supabase.functions.invoke('send-email', {
  //       body: {
  //         type: 'new-signup',
  //         data: {
  //           adminEmails,
  //           newUserName,
  //           newUserEmail
  //         }
  //       }
  //     })

  //     if (error) throw error

  //     return { success: true }
  //   } catch (error) {
  //     console.error('Error sending new signup notification:', error)
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : '이메일 발송에 실패했습니다.'
  //     }
  //   }
  // }
}

export const emailClientService = new EmailClientService()