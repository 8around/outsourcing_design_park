import { useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useNotificationStore } from '@/lib/store/notifications.store'

export interface UseNotificationsReturn {
  notifications: ReturnType<typeof useNotificationStore>['notifications']
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
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead: storeMarkAsRead,
    markMultipleAsRead: storeMarkMultipleAsRead,
    markAllAsRead: storeMarkAllAsRead,
    deleteNotification: storeDeleteNotification,
    deleteMultipleNotifications: storeDeleteMultipleNotifications,
    subscribeToNotifications,
    unsubscribe
  } = useNotificationStore()

  // 알림 새로고침
  const refreshNotifications = useCallback(async () => {
    if (user?.id) {
      await fetchNotifications(user.id)
    }
  }, [user?.id, fetchNotifications])

  // 알림 읽음 처리 (스토어 함수 래핑)
  const markAsRead = useCallback(async (notificationId: string) => {
    await storeMarkAsRead(notificationId)
  }, [storeMarkAsRead])

  // 여러 알림 읽음 처리 (스토어 함수 래핑)
  const markMultipleAsRead = useCallback(async (notificationIds: string[]) => {
    await storeMarkMultipleAsRead(notificationIds)
  }, [storeMarkMultipleAsRead])

  // 모든 알림 읽음 처리 (스토어 함수 래핑)
  const markAllAsRead = useCallback(async () => {
    if (user?.id) {
      await storeMarkAllAsRead(user.id)
    }
  }, [user?.id, storeMarkAllAsRead])

  // 알림 삭제 (스토어 함수 래핑)
  const deleteNotification = useCallback(async (notificationId: string) => {
    await storeDeleteNotification(notificationId)
  }, [storeDeleteNotification])

  // 여러 알림 삭제 (스토어 함수 래핑)
  const deleteMultipleNotifications = useCallback(async (notificationIds: string[]) => {
    await storeDeleteMultipleNotifications(notificationIds)
  }, [storeDeleteMultipleNotifications])

  // 초기 로드 및 실시간 구독
  useEffect(() => {
    if (user?.id) {
      // 알림 목록 가져오기
      fetchNotifications(user.id)
      
      // 실시간 구독 설정
      subscribeToNotifications(user.id)
    }

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      unsubscribe()
    }
  }, [user?.id, fetchNotifications, subscribeToNotifications, unsubscribe])

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