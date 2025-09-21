import { create } from 'zustand'
import { notificationService } from '@/lib/services/notification.service'
import type { Notification } from '@/lib/services/notification.service'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  subscription: RealtimeChannel | null
  
  // Actions
  setNotifications: (notifications: Notification[]) => void
  setUnreadCount: (count: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // API calls
  fetchNotifications: (userId: string) => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markMultipleAsRead: (notificationIds: string[]) => Promise<void>
  markAllAsRead: (userId: string) => Promise<void>
  
  // Real-time subscription
  subscribeToNotifications: (userId: string) => void
  unsubscribe: () => void
  
  // Utils
  addNotification: (notification: Notification) => void
  updateNotification: (notificationId: string, updates: Partial<Notification>) => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  subscription: null,
  
  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  fetchNotifications: async (userId: string) => {
    if (!userId) {
      set({ notifications: [], unreadCount: 0, loading: false })
      return
    }
    
    try {
      set({ loading: true, error: null })
      
      const [notificationsData, count] = await Promise.all([
        notificationService.getNotifications(userId),
        notificationService.getUnreadCount(userId)
      ])
      
      set({
        notifications: notificationsData || [],
        unreadCount: count,
        loading: false
      })
    } catch (err) {
      console.error('Error fetching notifications:', err)
      set({ 
        error: '알림을 불러오는데 실패했습니다',
        loading: false 
      })
    }
  },
  
  markAsRead: async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId)
      
      const { notifications, unreadCount } = get()
      const updatedNotifications = notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      )
      
      // 해당 알림이 읽지 않은 상태였는지 확인
      const wasUnread = notifications.find(n => n.id === notificationId && !n.is_read)
      const newUnreadCount = wasUnread ? Math.max(0, unreadCount - 1) : unreadCount
      
      set({ 
        notifications: updatedNotifications,
        unreadCount: newUnreadCount
      })
    } catch (err) {
      console.error('Error marking notification as read:', err)
      throw new Error('알림 읽음 처리에 실패했습니다')
    }
  },
  
  markMultipleAsRead: async (notificationIds: string[]) => {
    try {
      await notificationService.markMultipleAsRead(notificationIds)
      
      const { notifications, unreadCount } = get()
      
      // 읽지 않은 알림 중에서 읽음 처리될 개수 계산
      const markedCount = notifications.filter(
        n => !n.is_read && notificationIds.includes(n.id)
      ).length
      
      const updatedNotifications = notifications.map(n => 
        notificationIds.includes(n.id) ? { ...n, is_read: true } : n
      )
      
      set({ 
        notifications: updatedNotifications,
        unreadCount: Math.max(0, unreadCount - markedCount)
      })
    } catch (err) {
      console.error('Error marking notifications as read:', err)
      throw new Error('알림 읽음 처리에 실패했습니다')
    }
  },
  
  markAllAsRead: async (userId: string) => {
    if (!userId) return
    
    try {
      await notificationService.markAllAsRead(userId)
      
      const { notifications } = get()
      const updatedNotifications = notifications.map(n => ({ ...n, is_read: true }))
      
      set({ 
        notifications: updatedNotifications,
        unreadCount: 0
      })
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      throw new Error('모든 알림 읽음 처리에 실패했습니다')
    }
  },
  
  
  subscribeToNotifications: (userId: string) => {
    if (!userId) return
    
    // 기존 구독 해제
    const { subscription } = get()
    if (subscription) {
      subscription.unsubscribe()
    }
    
    // 새 구독 설정
    const newSubscription = notificationService.subscribeToNotifications(
      userId,
      (newNotification) => {
        const { notifications, unreadCount } = get()
        const updatedNotifications = [newNotification, ...notifications]
        const newUnreadCount = !newNotification.is_read ? unreadCount + 1 : unreadCount
        
        set({ 
          notifications: updatedNotifications,
          unreadCount: newUnreadCount
        })
      }
    )
    
    set({ subscription: newSubscription })
  },
  
  unsubscribe: () => {
    const { subscription } = get()
    if (subscription) {
      subscription.unsubscribe()
      set({ subscription: null })
    }
  },
  
  addNotification: (notification: Notification) => {
    const { notifications, unreadCount } = get()
    set({ 
      notifications: [notification, ...notifications],
      unreadCount: !notification.is_read ? unreadCount + 1 : unreadCount
    })
  },
  
  updateNotification: (notificationId: string, updates: Partial<Notification>) => {
    const { notifications } = get()
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, ...updates } : n
    )
    set({ notifications: updatedNotifications })
  }
}))