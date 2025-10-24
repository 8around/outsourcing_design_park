import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type NotificationTable = Database['public']['Tables']['notifications']
export type Notification = NotificationTable['Row']
export type NotificationInsert = NotificationTable['Insert']
export type NotificationUpdate = NotificationTable['Update']

export class NotificationService {
  private static instance: NotificationService
  
  private constructor() {}
  
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * 사용자의 알림 목록 조회
   */
  async getNotifications(userId: string) {
    const supabase = createClient()
    
    // 알림만 먼저 조회 (직접적인 외래키 관계가 없으므로 join 제거)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching notifications:', error)
      throw error
    }
    
    // 필요시 related_type과 related_id를 기반으로 
    // 추가 데이터를 개별적으로 조회할 수 있음
    
    return data
  }

  /**
   * 읽지 않은 알림 개수 조회
   */
  async getUnreadCount(userId: string): Promise<number> {
    const supabase = createClient()
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    
    if (error) {
      console.error('Error fetching unread count:', error)
      throw error
    }
    
    return count || 0
  }

  /**
   * 알림 읽음 처리
   */
  async markAsRead(notificationId: string): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
    
    if (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  /**
   * 여러 알림 읽음 처리
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', notificationIds)
    
    if (error) {
      console.error('Error marking notifications as read:', error)
      throw error
    }
  }

  /**
   * 모든 알림 읽음 처리
   */
  async markAllAsRead(userId: string): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    
    if (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  /**
   * 알림 삭제 (실제로는 DB에서 삭제)
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
    
    if (error) {
      console.error('Error deleting notification:', error)
      throw error
    }
  }

  /**
   * 여러 알림 삭제
   */
  async deleteMultipleNotifications(notificationIds: string[]): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', notificationIds)
    
    if (error) {
      console.error('Error deleting notifications:', error)
      throw error
    }
  }

  /**
   * 새 알림 생성
   */
  async createNotification(notification: NotificationInsert): Promise<Notification> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating notification:', error)
      throw error
    }
    
    return data
  }

  /**
   * 승인 요청 알림 생성
   */
  async createApprovalNotification(
    userId: string,
    projectId: string,
    projectName: string,
    approvalRequestId: string,
    requestType: 'request' | 'response',
    message: string
  ): Promise<Notification> {
    const type = requestType === 'request' ? 'approval_request' : 'approval_response'
    
    return this.createNotification({
      user_id: userId,
      title: requestType === 'request' ? '확인 요청' : '확인 응답',
      message,
      type,
      related_id: approvalRequestId,
      related_type: 'approval_request',
      is_read: false,
      kakao_sent: false,
      email_sent: false
    })
  }

  /**
   * 시스템 알림 생성
   */
  async createSystemNotification(
    userId: string,
    title: string,
    message: string
  ): Promise<Notification> {
    return this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'system',
      is_read: false,
      kakao_sent: false,
      email_sent: false
    })
  }

  /**
   * 실시간 구독 설정
   */
  subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
  ) {
    const supabase = createClient()
    
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Notification)
        }
      )
      .subscribe()
  }
}

export const notificationService = NotificationService.getInstance()