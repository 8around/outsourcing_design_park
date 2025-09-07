'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else {
        // 인증된 사용자는 대시보드 페이지로 리다이렉트
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          {/* Modern Loading Spinner */}
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-primary-600 rounded-full animate-spin"></div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-700">로딩 중...</p>
            <p className="text-sm text-gray-500">시스템을 준비하고 있습니다</p>
          </div>
        </div>
      </main>
    )
  }

  return null
}