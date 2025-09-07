import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { authService } from '@/lib/services/auth.service'

interface UserData {
  id: string
  email: string
  name: string
  phone: string
  role: string
  is_approved: boolean
  created_at: string
  updated_at?: string
}

interface AuthState {
  user: User | null
  userData: UserData | null
  isLoading: boolean
  isInitialized: boolean
  setUser: (user: User | null) => void
  setUserData: (userData: UserData | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  initialize: () => Promise<void>
  signOut: () => Promise<void>
  refreshUserData: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userData: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setUserData: (userData) => set({ userData }),
  setLoading: (loading) => set({ isLoading: loading }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),

  initialize: async () => {
    const { isInitialized } = get()
    if (isInitialized) return

    set({ isLoading: true })
    
    try {
      const session = await authService.getSession()
      
      if (session?.user) {
        const userData = await authService.getCurrentUser()
        
        if (userData && userData.is_approved) {
          set({ 
            user: session.user, 
            userData,
            isInitialized: true 
          })
        } else {
          // 미승인 사용자는 로그아웃
          await authService.signOut()
          set({ 
            user: null, 
            userData: null,
            isInitialized: true 
          })
        }
      } else {
        set({ 
          user: null, 
          userData: null,
          isInitialized: true 
        })
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ 
        user: null, 
        userData: null,
        isInitialized: true 
      })
    } finally {
      set({ isLoading: false })
    }
  },

  signOut: async () => {
    await authService.signOut()
    set({ user: null, userData: null })
  },

  refreshUserData: async () => {
    const userData = await authService.getCurrentUser()
    set({ userData })
  },
}))

// Auth 상태 변경 리스너 설정
if (typeof window !== 'undefined') {
  authService.onAuthStateChange(async (user) => {
    if (user) {
      const userData = await authService.getCurrentUser()
      if (userData && userData.is_approved) {
        useAuthStore.getState().setUser(user)
        useAuthStore.getState().setUserData(userData)
      } else {
        // 미승인 사용자 처리
        await authService.signOut()
        useAuthStore.getState().setUser(null)
        useAuthStore.getState().setUserData(null)
      }
    } else {
      useAuthStore.getState().setUser(null)
      useAuthStore.getState().setUserData(null)
    }
  })
}