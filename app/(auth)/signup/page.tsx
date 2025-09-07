'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { message, Modal } from 'antd'
import SignupForm from '@/components/auth/SignupForm'
import { authService } from '@/lib/services/auth.service'

export default function SignupPage() {
  const router = useRouter()
  const [isModalVisible, setIsModalVisible] = useState(false)

  const handleSignup = async (values: {
    email: string
    password: string
    name: string
    phone: string
  }) => {
    try {
      const response = await authService.signUp(values)
      
      if (response.success) {
        setIsModalVisible(true)
      } else {
        // 에러가 발생한 경우 에러 메시지 표시
        message.error(response.error || '회원가입에 실패했습니다.')
        // 에러를 throw하여 SignupForm에서 catch할 수 있도록 함
        throw new Error(response.error || '회원가입에 실패했습니다.')
      }
    } catch (error) {
      // 이미 message.error로 표시했으므로 여기서는 에러를 다시 throw
      throw error
    }
  }

  const handleModalOk = () => {
    setIsModalVisible(false)
    router.push('/login')
  }

  return (
    <>
      <SignupForm onSubmit={handleSignup} />
      <Modal
        title="회원가입 완료"
        open={isModalVisible}
        onOk={handleModalOk}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="로그인 페이지로 이동"
        closable={false}
      >
        <p>인증 메일이 발송되었습니다.</p>
        <p>메일함을 확인하여 인증을 완료한 후,</p>
        <p>관리자 승인을 기다려주세요.</p>
      </Modal>
    </>
  )
}