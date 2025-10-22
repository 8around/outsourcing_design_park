'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { message, Alert, Button } from 'antd'
import { ExclamationCircleOutlined, CloseCircleOutlined, WarningOutlined, MailOutlined } from '@ant-design/icons'
import LoginForm from '@/components/auth/LoginForm'
import { authService } from '@/lib/services/auth.service'
import { useAuthStore } from '@/lib/store/auth.store'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useAuthStore(state => state.setUser)
  const setUserData = useAuthStore(state => state.setUserData)
  const [statusAlert, setStatusAlert] = useState<{type: 'warning' | 'error' | 'info', message: string, description?: string} | null>(null)
  const [emailVerificationError, setEmailVerificationError] = useState<{email: string} | null>(null)
  const [isResending, setIsResending] = useState(false)

  React.useEffect(() => {
    // Check for email verification success
    // Check URL Hash for resended email verification
    const currentUrl = new URL(window.location.href);
    const hashParams = new URLSearchParams(currentUrl.hash.slice(1))

    currentUrl.hash = '';
    
    if (searchParams.get('verified') === 'true' || hashParams.get('access_token')) {
      message.success('이메일 인증이 완료되었습니다. 이제 로그인할 수 있습니다.')
      // Clean up URL params
      const newUrl = currentUrl;
      newUrl.searchParams.delete('verified')
      window.history.replaceState({}, '', newUrl.toString())
      return
    }
    
    // Check for password reset success
    if (searchParams.get('reset') === 'success') {
      message.success('비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.')
      const newUrl = currentUrl;
      newUrl.searchParams.delete('reset')
      window.history.replaceState({}, '', newUrl.toString())
      return
    }

    // Check for error with custom message
    const errorType = searchParams.get('error')
    const hashErrorType = hashParams.get('error')

    const errorMessageOriginal = searchParams.get('error_message')?.split('\n')
    const errorMessage = errorMessageOriginal?.[0]
    const errorMessageDescription = errorMessageOriginal?.[1]
    
    if (errorType === 'link_expired' || hashErrorType === 'access_denied') {
      setStatusAlert({
        type: 'warning',
        message: errorMessage || '인증 링크가 만료되었습니다.',
        description: errorMessageDescription || '로그인 시도 시 이메일 재발송이 가능합니다.'
      })
      return
    } else if (errorType === 'verification_failed') {
      setStatusAlert({
        type: 'error',
        message: errorMessage || '이메일 인증에 실패했습니다. 다시 시도해주세요.'
      })
      return
    } else if (errorType === 'invalid_request') {
      setStatusAlert({
        type: 'error',
        message: errorMessage || '잘못된 인증 요청입니다.'
      })
      return
    }
    
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
      // 이메일 미인증 에러인 경우
      if (response.needsEmailVerification && response.email) {
        setEmailVerificationError({ email: response.email })
        message.error(response.error || '이메일 인증이 필요합니다.')
      } else {
        setEmailVerificationError(null)
        message.error(response.error || '로그인에 실패했습니다.')
      }
    }
  }

  const handleResendVerification = async () => {
    if (!emailVerificationError?.email) return

    setIsResending(true)
    const response = await authService.resendVerificationEmail(emailVerificationError.email)
    setIsResending(false)

    if (response.success) {
      message.success('인증 이메일이 발송되었습니다. 이메일을 확인해주세요.')
      setEmailVerificationError(null)
    } else {
      message.error(response.error || '이메일 발송에 실패했습니다.')
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
    newUrl.searchParams.delete('error')
    newUrl.searchParams.delete('error_message')
    newUrl.searchParams.delete('verified')
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
          description={statusAlert.description}
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

      {emailVerificationError && (
        <Alert
          message="인증 이메일이 만료되었나요?"
          description={
            <div className="space-y-2">
              <Button
                type="primary"
                icon={<MailOutlined />}
                onClick={handleResendVerification}
                loading={isResending}
                size="small"
              >
                이메일 재발송
              </Button>
            </div>
          }
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          closable
          onClose={() => setEmailVerificationError(null)}
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