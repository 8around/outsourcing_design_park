import { useState, useEffect, useCallback } from 'react'
import { notificationService } from '@/lib/services/notification.service'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Notification } from '@/lib/services/notification.service'

export interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (notificationId: string) => Promise<void>
  markMultipleAsRead: (notificationIds: string[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  deleteMultipleNotifications: (notificationIds: string[]) => Promise<void>
  refreshNotifications: () => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 알림 목록 가져오기
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const [notificationsData, count] = await Promise.all([
        notificationService.getNotifications(user.id),
        notificationService.getUnreadCount(user.id)
      ])
      
      setNotifications(notificationsData || [])
      setUnreadCount(count)
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError('알림을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // 알림 읽음 처리
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId)
      
      // 로컬 상태 업데이트
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
      throw new Error('알림 읽음 처리에 실패했습니다')
    }
  }, [])

  // 여러 알림 읽음 처리
  const markMultipleAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      await notificationService.markMultipleAsRead(notificationIds)
      
      // 로컬 상태 업데이트
      setNotifications(prev => 
        prev.map(n => 
          notificationIds.includes(n.id) ? { ...n, is_read: true } : n
        )
      )
      
      // 읽지 않은 알림 중에서 읽음 처리된 개수 계산
      const markedCount = notifications.filter(
        n => !n.is_read && notificationIds.includes(n.id)
      ).length
      
      setUnreadCount(prev => Math.max(0, prev - markedCount))
    } catch (err) {
      console.error('Error marking notifications as read:', err)
      throw new Error('알림 읽음 처리에 실패했습니다')
    }
  }, [notifications])

  // 모든 알림 읽음 처리
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return

    try {
      await notificationService.markAllAsRead(user.id)
      
      // 로컬 상태 업데이트
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      throw new Error('모든 알림 읽음 처리에 실패했습니다')
    }
  }, [user?.id])

  // 알림 삭제
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId)
      
      // 로컬 상태 업데이트
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      // 삭제된 알림이 읽지 않은 상태였다면 카운트 감소
      const deletedNotification = notifications.find(n => n.id === notificationId)
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Error deleting notification:', err)
      throw new Error('알림 삭제에 실패했습니다')
    }
  }, [notifications])

  // 여러 알림 삭제
  const deleteMultipleNotifications = useCallback(async (notificationIds: string[]) => {
    try {
      await notificationService.deleteMultipleNotifications(notificationIds)
      
      // 삭제된 알림 중 읽지 않은 알림 개수 계산
      const deletedUnreadCount = notifications.filter(
        n => !n.is_read && notificationIds.includes(n.id)
      ).length
      
      // 로컬 상태 업데이트
      setNotifications(prev => 
        prev.filter(n => !notificationIds.includes(n.id))
      )
      setUnreadCount(prev => Math.max(0, prev - deletedUnreadCount))
    } catch (err) {
      console.error('Error deleting notifications:', err)
      throw new Error('알림 삭제에 실패했습니다')
    }
  }, [notifications])

  // 알림 새로고침
  const refreshNotifications = useCallback(async () => {
    await fetchNotifications()
  }, [fetchNotifications])

  // 초기 로드 및 실시간 구독
  useEffect(() => {
    fetchNotifications()

    // 실시간 구독 설정
    if (user?.id) {
      const subscription = notificationService.subscribeToNotifications(
        user.id,
        (newNotification) => {
          setNotifications(prev => [newNotification, ...prev])
          if (!newNotification.is_read) {
            setUnreadCount(prev => prev + 1)
          }
        }
      )

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user?.id, fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    deleteNotification,
    deleteMultipleNotifications,
    refreshNotifications
  }
}