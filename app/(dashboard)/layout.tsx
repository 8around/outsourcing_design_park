'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import DashboardLayout from '@/components/common/layout/DashboardLayout'

interface DashboardLayoutPageProps {
  children: ReactNode
}

export default function DashboardLayoutPage({ children }: DashboardLayoutPageProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // 로딩 중이거나 인증되지 않은 경우
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="text-sm text-gray-600">로딩 중...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
}