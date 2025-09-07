import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/database/types/supabase';
import { emailService } from '@/lib/services/email.service';

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
}

export const approvalService = new ApprovalService();