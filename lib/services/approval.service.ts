import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/database/types/supabase';
import { emailService } from '@/lib/services/email.service';
import { logService } from '@/lib/services/logs.service';

type User = Database['public']['Tables']['users']['Row'];
type UserUpdate = Database['public']['Tables']['users']['Update'];

export class ApprovalService {
  private supabase = createClient();

  /**
   * 승인 대기 중인 사용자 목록 조회
   */
  async getPendingUsers(): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('is_approved', false)
      .is('approved_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending users:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * 상태별 사용자 목록 조회
   */
  async getUsersByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<User[]> {
    console.log(`Fetching users with status: ${status}`);
    let query = this.supabase.from('users').select('*');

    switch (status) {
      case 'pending':
        query = query.eq('is_approved', false).is('approved_at', null);
        break;
      case 'approved':
        query = query.eq('is_approved', true);
        break;
      case 'rejected':
        query = query.eq('is_approved', false).not('approved_at', 'is', null);
        break;
    }

    const { data, error } = await query.order('created_at', { ascending: false });

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
      console.log('Approving user:', { userId, adminId });
      
      // For re-approval cases, we need to ensure the update actually changes something
      // First check if this is a re-approval (user was previously rejected)
      const { data: currentUser } = await this.supabase
        .from('users')
        .select('is_approved, approved_at')
        .eq('id', userId)
        .single();
      
      const isReApproval = currentUser && !currentUser.is_approved && currentUser.approved_at;
      
      if (isReApproval) {
        console.log('Re-approval detected, using two-step update process');
        
        // Step 1: Clear the approval fields to ensure the next update will detect changes
        const { error: clearError } = await this.supabase
          .from('users')
          .update({
            approved_at: null,
            approved_by: null,
          } as UserUpdate)
          .eq('id', userId);
        
        if (clearError) {
          console.error('Error clearing approval fields:', clearError);
        }
        
        // Small delay to ensure the trigger updates updated_at
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Step 2: Set the approval fields
      const updatePayload: UserUpdate = {
        is_approved: true,
        approved_by: adminId,
        approved_at: new Date().toISOString(),
      };
      
      // 1. 사용자 정보 업데이트
      const { data: updateData, error: updateError } = await this.supabase
        .from('users')
        .update(updatePayload)
        .eq('id', userId)
        .select();

      if (updateError) {
        console.error('Error approving user - Database error:', updateError);
        console.error('Error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        throw updateError;
      }

      if (!updateData || updateData.length === 0) {
        console.error('Error approving user - No rows updated');
        throw new Error('Failed to update user - no rows affected');
      }

      console.log('User approval update successful:', updateData);

      // 2. 사용자 정보 조회 (알림용)
      const { data: userData } = await this.supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();

      // 3. 알림 생성
      if (userData) {
        await this.createApprovalNotification(
          userId,
          'approved',
          `귀하의 계정이 승인되었습니다. 이제 시스템을 이용하실 수 있습니다.`
        );

        // 이메일 발송 (서버 사이드에서만)
        if (typeof window === 'undefined') {
          await emailService.sendApprovalEmail(userData.email, userData.name, 'approved');
        }
      }

      return true;
    } catch (error) {
      console.error('Error in approveUser:', error);
      return false;
    }
  }

  /**
   * 사용자 거절
   */
  async rejectUser(userId: string, adminId: string, reason?: string): Promise<boolean> {
    try {
      console.log('Rejecting user:', { userId, adminId, reason });
      
      // 1. 사용자 정보 업데이트
      // Add a small delay to ensure updated_at is different from any existing timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const now = new Date();
      const updatePayload: UserUpdate = {
        is_approved: false,
        approved_by: adminId,
        approved_at: now.toISOString(),
        updated_at: new Date(now.getTime() + 1).toISOString(), // Ensure updated_at is slightly different
      };
      
      const { data: updateData, error: updateError } = await this.supabase
        .from('users')
        .update(updatePayload)
        .eq('id', userId)
        .select();

      if (updateError) {
        console.error('Error rejecting user - Database error:', updateError);
        console.error('Error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        throw updateError;
      }

      if (!updateData || updateData.length === 0) {
        console.error('Error rejecting user - No rows updated');
        throw new Error('Failed to update user - no rows affected');
      }

      console.log('User rejection update successful:', updateData);

      // 2. 사용자 정보 조회 (알림용)
      const { data: userData } = await this.supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();

      // 3. 알림 생성
      if (userData) {
        const message = reason 
          ? `귀하의 계정 승인이 거절되었습니다. 사유: ${reason}`
          : `귀하의 계정 승인이 거절되었습니다. 자세한 사항은 관리자에게 문의하세요.`;
        
        await this.createApprovalNotification(userId, 'rejected', message);

        // 이메일 발송 (서버 사이드에서만)
        if (typeof window === 'undefined') {
          await emailService.sendApprovalEmail(userData.email, userData.name, 'rejected', reason);
        }
      }

      return true;
    } catch (error) {
      console.error('Error in rejectUser:', error);
      return false;
    }
  }

  /**
   * 모든 사용자 목록 조회 (관리자용)
   */
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * 사용자 승인 상태 확인
   */
  async checkUserApprovalStatus(userId: string): Promise<'pending' | 'approved' | 'rejected' | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('is_approved, approved_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Error checking user approval status:', error);
      return null;
    }

    if (data.is_approved) {
      return 'approved';
    } else if (data.approved_at) {
      return 'rejected';
    } else {
      return 'pending';
    }
  }

  /**
   * 프로젝트 승인 요청 생성
   */
  async createApprovalRequest(
    projectId: string,
    requesterId: string,
    requesterName: string,
    approverId: string,
    approverName: string,
    memo: string
  ): Promise<boolean> {
    try {
      // 1. approval_requests 테이블에 승인 요청 생성
      const { data: approvalData, error: approvalError } = await this.supabase
        .from('approval_requests')
        .insert({
          project_id: projectId,
          requester_id: requesterId,
          requester_name: requesterName,
          approver_id: approverId,
          approver_name: approverName,
          memo: memo,
          status: 'pending'
        })
        .select()
        .single();

      if (approvalError) {
        console.error('Error creating approval request:', approvalError);
        throw approvalError;
      }

      // 2. 승인 요청 로그 생성
      try {
        await logService.createApprovalRequestLog({
          project_id: projectId,
          requester_id: requesterId,
          requester_name: requesterName,
          approver_id: approverId,
          approver_name: approverName,
          memo: memo
        });
      } catch (logError) {
        console.error('Error creating approval request log:', logError);
        // 로그 생성 실패는 승인 요청 생성을 막지 않음
      }

      // 3. 알림 생성 (승인자에게)
      // approval_request는 notifications 테이블의 type에만 있고 createApprovalNotification의 타입과 다름
      // 이 부분은 별도 알림 생성 메서드를 사용하거나 타입을 수정해야 함
      // 일단 주석 처리
      // await this.createApprovalNotification(
      //   approverId,
      //   'approval_request',
      //   `${requesterName}님이 프로젝트 승인을 요청했습니다: ${memo}`
      // );

      return true;
    } catch (error) {
      console.error('Error in createApprovalRequest:', error);
      return false;
    }
  }

  /**
   * 프로젝트 승인 요청 응답 처리
   */
  async respondToApprovalRequest(
    requestId: string,
    approverId: string,
    approverName: string,
    status: 'approved' | 'rejected',
    responseMemo: string
  ): Promise<boolean> {
    try {
      // 1. 승인 요청 정보 조회
      const { data: requestData, error: fetchError } = await this.supabase
        .from('approval_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !requestData) {
        console.error('Error fetching approval request:', fetchError);
        throw fetchError || new Error('Approval request not found');
      }

      // 2. approval_requests 테이블 업데이트
      const { error: updateError } = await this.supabase
        .from('approval_requests')
        .update({
          status: status,
          response_memo: responseMemo,
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating approval request:', updateError);
        throw updateError;
      }

      // 3. 승인 응답 로그 생성 - 제거됨
      // 데이터베이스 트리거가 자동으로 history_logs에 로그를 생성하므로
      // 수동으로 로그를 생성하면 중복이 발생합니다.
      // 트리거가 approval_requests 테이블 업데이트 시 자동으로 처리합니다.

      // 4. 알림 생성 (요청자에게)
      const statusText = status === 'approved' ? '승인' : '반려';
      // 타입 문제로 주석 처리
      // await this.createApprovalNotification(
      //   requestData.requester_id,
      //   'approval_response',
      //   `${approverName}님이 프로젝트 승인 요청을 ${statusText}했습니다: ${responseMemo}`
      // );

      return true;
    } catch (error) {
      console.error('Error in respondToApprovalRequest:', error);
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
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteUser:', error);
      return false;
    }
  }

  /**
   * 승인 요청 삭제 (관리자 전용)
   */
  async deleteApprovalRequest(requestId: string, adminId: string): Promise<boolean> {
    try {
      console.log('deleteApprovalRequest called:', { requestId, adminId });
      
      // 승인 요청 정보 조회 (history_log_id 포함)
      const { data: requestData, error: fetchError } = await this.supabase
        .from('approval_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      console.log('Approval request data:', requestData);
      console.log('Fetch error:', fetchError);

      if (fetchError || !requestData) {
        console.error('Error fetching approval request:', fetchError);
        throw fetchError || new Error('Approval request not found');
      }

      // 1. history_log_id가 있으면 연결된 로그 완전 삭제
      // 승인 요청이 삭제되면 관련 로그도 완전히 삭제되어야 함
      if (requestData.history_log_id) {
        console.log('Deleting related history log:', requestData.history_log_id);
        
        // 먼저 로그의 첨부파일 정보 조회
        const { data: attachments } = await this.supabase
          .from('log_attachments')
          .select('file_path')
          .eq('log_id', requestData.history_log_id);
        
        // 첨부파일이 있으면 스토리지에서도 삭제
        if (attachments && attachments.length > 0) {
          const filePaths = attachments.map(a => a.file_path);
          await this.supabase.storage
            .from('log-attachments')
            .remove(filePaths);
          
          // 첨부파일 레코드 삭제
          await this.supabase
            .from('log_attachments')
            .delete()
            .eq('log_id', requestData.history_log_id);
        }
        
        // 로그 완전 삭제
        const { error: logDeleteError } = await this.supabase
          .from('history_logs')
          .delete()
          .eq('id', requestData.history_log_id);

        if (logDeleteError) {
          console.error('Error deleting related log:', logDeleteError);
          // 로그 삭제 실패해도 계속 진행
        }
      }

      // 2. 승인 응답 로그도 삭제 (있는 경우 - 이것은 별도로 생성되므로 history_log_id로 연결되지 않음)
      if (requestData.status !== 'pending') {
        const { error: responseLogDeleteError } = await this.supabase
          .from('history_logs')
          .update({ 
            is_deleted: true,
            deleted_by: adminId,
            deleted_at: new Date().toISOString()
          })
          .match({
            project_id: requestData.project_id,
            author_id: requestData.approver_id,
            target_user_id: requestData.requester_id,
            log_type: 'approval_response'
          });

        if (responseLogDeleteError) {
          console.error('Error deleting response logs:', responseLogDeleteError);
        }
      }

      // 3. 승인 요청 삭제 (실제 삭제)
      // 만약 history_logs를 하드 삭제하고 싶다면, CASCADE DELETE가 자동으로 처리
      const { error: deleteError } = await this.supabase
        .from('approval_requests')
        .delete()
        .eq('id', requestId);

      if (deleteError) {
        console.error('Error deleting approval request:', deleteError);
        throw deleteError;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteApprovalRequest:', error);
      return false;
    }
  }

  /**
   * 승인 관련 알림 생성
   */
  private async createApprovalNotification(
    userId: string,
    type: 'approved' | 'rejected',
    message: string
  ): Promise<void> {
    try {
      await this.supabase.from('notifications').insert({
        user_id: userId,
        title: type === 'approved' ? '계정 승인 완료' : '계정 승인 거절',
        message,
        type: 'system',
        is_read: false,
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  /**
   * 관리자에게 신규 가입 알림
   */
  async notifyAdminsOfNewSignup(newUserId: string, newUserName: string): Promise<void> {
    try {
      // 모든 관리자 조회
      const { data: admins } = await this.supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .eq('is_approved', true);

      if (!admins || admins.length === 0) return;

      // 각 관리자에게 알림 생성
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        title: '신규 사용자 가입',
        message: `${newUserName}님이 가입했습니다. 승인이 필요합니다.`,
        type: 'system' as const,
        related_id: newUserId,
        related_type: 'user' as const,
        is_read: false,
      }));

      await this.supabase.from('notifications').insert(notifications);
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  }

  /**
   * 현재 사용자의 승인 대기 목록 조회
   */
  async getPendingApprovalsForUser(userId: string): Promise<{
    userApprovals: any[];
    projectApprovals: any[];
    total: number;
  }> {
    try {
      // 1. 사용자 승인 대기 목록 (관리자인 경우만)
      let userApprovals: any[] = [];
      const { data: currentUser } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (currentUser?.role === 'admin') {
        const { data: pendingUsers } = await this.supabase
          .from('users')
          .select('id, email, name, created_at')
          .eq('is_approved', false)
          .is('approved_at', null)
          .order('created_at', { ascending: false })
          .limit(10);

        userApprovals = (pendingUsers || []).map(user => ({
          id: user.id,
          type: 'user' as const,
          title: '신규 사용자 가입 승인',
          description: `${user.email} 사용자가 가입 승인을 기다리고 있습니다.`,
          requester_id: user.id,
          requester_name: user.name || user.email,
          requester_email: user.email,
          status: 'pending' as const,
          priority: 'high' as const,
          created_at: user.created_at,
          requestType: 'received' as const  // 관리자가 받은 승인 요청
        }));
      }

      // 2. 프로젝트 승인 요청 목록 - 내가 받은 요청
      // 먼저 approval_requests를 가져온 후 history_logs와 매칭
      const { data: receivedApprovals } = await this.supabase
        .from('approval_requests')
        .select(`
          *,
          project:projects(site_name, product_name)
        `)
        .eq('approver_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      // 각 approval에 대해 history_logs 조회 (첨부파일 포함)
      const receivedApprovalsWithCategory = await Promise.all(
        (receivedApprovals || []).map(async (approval) => {
          const { data: logData } = await this.supabase
            .from('history_logs')
            .select(`
              category,
              attachments:history_log_attachments(
                id,
                file_name,
                file_path,
                file_size,
                mime_type,
                created_at
              )
            `)
            .eq('project_id', approval.project_id)
            .eq('log_type', 'approval_request')
            .eq('author_id', approval.requester_id)
            .eq('target_user_id', approval.approver_id)
            .gte('created_at', new Date(new Date(approval.created_at).getTime() - 2000).toISOString())
            .lte('created_at', new Date(new Date(approval.created_at).getTime() + 2000).toISOString())
            .single();
          
          return {
            ...approval,
            history_logs: logData ? [logData] : []
          };
        })
      );

      const formattedReceivedApprovals = (receivedApprovalsWithCategory || []).map(approval => ({
        id: approval.id,
        type: 'project' as const,
        title: '프로젝트 승인 요청',
        description: approval.memo || '승인이 필요한 프로젝트가 있습니다.',
        requester_id: approval.requester_id,
        requester_name: approval.requester_name,
        approver_id: approval.approver_id,
        approver_name: approval.approver_name,
        status: 'pending' as const,
        priority: 'medium' as const,
        created_at: approval.created_at,
        project_id: approval.project_id,
        project_name: approval.project ? 
          `${approval.project.site_name} - ${approval.project.product_name}` : 
          '프로젝트',
        category: approval.history_logs?.[0]?.category || null,  // 로그 카테고리 추가
        attachments: approval.history_logs?.[0]?.attachments || [],  // 첨부파일 추가
        requestType: 'received' as const  // 내가 받은 승인 요청
      }));

      // 3. 프로젝트 승인 요청 목록 - 내가 보낸 요청
      const { data: sentApprovals } = await this.supabase
        .from('approval_requests')
        .select(`
          *,
          project:projects(site_name, product_name)
        `)
        .eq('requester_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      // 각 approval에 대해 history_logs 조회 (첨부파일 포함)
      const sentApprovalsWithCategory = await Promise.all(
        (sentApprovals || []).map(async (approval) => {
          const { data: logData } = await this.supabase
            .from('history_logs')
            .select(`
              category,
              attachments:history_log_attachments(
                id,
                file_name,
                file_path,
                file_size,
                mime_type,
                created_at
              )
            `)
            .eq('project_id', approval.project_id)
            .eq('log_type', 'approval_request')
            .eq('author_id', approval.requester_id)
            .eq('target_user_id', approval.approver_id)
            .gte('created_at', new Date(new Date(approval.created_at).getTime() - 2000).toISOString())
            .lte('created_at', new Date(new Date(approval.created_at).getTime() + 2000).toISOString())
            .single();
          
          return {
            ...approval,
            history_logs: logData ? [logData] : []
          };
        })
      );

      const formattedSentApprovals = (sentApprovalsWithCategory || []).map(approval => ({
        id: approval.id,
        type: 'project' as const,
        title: '프로젝트 승인 요청 (대기중)',
        description: approval.memo || '승인 대기 중인 요청입니다.',
        requester_id: approval.requester_id,
        requester_name: approval.requester_name,
        approver_id: approval.approver_id,
        approver_name: approval.approver_name,
        status: 'pending' as const,
        priority: 'low' as const,  // 내가 보낸 요청은 낮은 우선순위
        created_at: approval.created_at,
        project_id: approval.project_id,
        project_name: approval.project ? 
          `${approval.project.site_name} - ${approval.project.product_name}` : 
          '프로젝트',
        category: approval.history_logs?.[0]?.category || null,  // 로그 카테고리 추가
        attachments: approval.history_logs?.[0]?.attachments || [],  // 첨부파일 추가
        requestType: 'sent' as const  // 내가 보낸 승인 요청
      }));

      // 모든 프로젝트 승인 요청을 합치기
      const allProjectApprovals = [...formattedReceivedApprovals, ...formattedSentApprovals];

      const total = userApprovals.length + allProjectApprovals.length;

      return {
        userApprovals,
        projectApprovals: allProjectApprovals,
        total
      };
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      throw error;
    }
  }
}

export const approvalService = new ApprovalService();