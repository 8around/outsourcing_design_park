'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { message, Alert } from 'antd'
import { ExclamationCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons'
import LoginForm from '@/components/auth/LoginForm'
import { authService } from '@/lib/services/auth.service'
import { useAuthStore } from '@/lib/store/auth.store'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useAuthStore(state => state.setUser)
  const setUserData = useAuthStore(state => state.setUserData)
  const [statusAlert, setStatusAlert] = useState<{type: 'warning' | 'error' | 'info', message: string} | null>(null)

  React.useEffect(() => {
    // Check for approval status messages
    if (searchParams.get('approval_pending')) {
      setStatusAlert({
        type: 'warning',
        message: '관리자 승인 대기 중입니다. 승인 완료 후 로그인이 가능합니다.'
      })
    } else if (searchParams.get('approval_rejected')) {
      setStatusAlert({
        type: 'error',
        message: '승인이 거절되었습니다. 관리자에게 문의하세요.'
      })
    } else if (searchParams.get('unauthorized')) {
      setStatusAlert({
        type: 'error',
        message: '접근 권한이 없습니다.'
      })
    }
    
    // Legacy message handling
    const msg = searchParams.get('message')
    if (msg === 'approval_required') {
      setStatusAlert({
        type: 'warning',
        message: '관리자 승인이 필요합니다. 승인 완료 후 로그인해주세요.'
      })
    }
  }, [searchParams])

  const handleLogin = async (values: { email: string; password: string }) => {
    const response = await authService.signIn(values)
    
    if (response.success && response.user) {
      const userData = await authService.getCurrentUser()
      setUser(response.user)
      setUserData(userData)
      
      message.success('로그인 성공!')
      const redirectTo = searchParams.get('redirectedFrom') || '/'
      router.push(redirectTo)
    } else {
      message.error(response.error || '로그인에 실패했습니다.')
    }
  }

  const handleCloseAlert = () => {
    setStatusAlert(null)
    // Clean up URL params
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete('approval_pending')
    newUrl.searchParams.delete('approval_rejected')
    newUrl.searchParams.delete('unauthorized')
    newUrl.searchParams.delete('message')
    window.history.replaceState({}, '', newUrl.toString())
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <WarningOutlined />
      case 'error':
        return <CloseCircleOutlined />
      default:
        return <ExclamationCircleOutlined />
    }
  }

  return (
    <div className="space-y-4">
      {statusAlert && (
        <Alert
          message={statusAlert.message}
          type={statusAlert.type}
          icon={getAlertIcon(statusAlert.type)}
          showIcon
          closable
          onClose={handleCloseAlert}
          className="!mb-6 !rounded-lg"
          style={{
            fontSize: '14px',
            fontWeight: '500'
          }}
        />
      )}
      <LoginForm onSubmit={handleLogin} />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}