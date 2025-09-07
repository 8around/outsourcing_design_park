import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store/auth.store'
import { authService } from '@/lib/services/auth.service'

export function useAuth() {
  const { 
    user, 
    userData, 
    isLoading, 
    isInitialized,
    initialize, 
    signOut,
    refreshUserData 
  } = useAuthStore()

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  return {
    user,
    userData,
    isLoading,
    isAuthenticated: !!user && !!userData?.is_approved,
    signOut,
    refreshUserData,
    authService,
  }
}