'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form, Input, Button, Alert, Typography } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import { authService } from '@/lib/services/auth.service'
import { message } from 'antd'

const { Title, Text } = Typography

export default function ResetPasswordRequestPage() {
  const [form] = Form.useForm()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFinish = async (values: { email: string }) => {
    setLoading(true)
    setError(null)
    try {
      // 실제 결과와 무관하게 성공 메시지 노출 (계정 존재 여부 비노출)
      await authService.sendPasswordResetEmail({ email: values.email })
      message.success('비밀번호 재설정 이메일을 발송했습니다. 메일함을 확인해주세요.')
      // 잠시 후 로그인으로 이동
      setTimeout(() => router.replace('/login'), 1200)
    } catch (e) {
      // 내부적으로 실패해도 동일 UX 유지, 단 로컬 표시만 선택적으로
      setError(
        e instanceof Error ? e.message : '요청 처리 중 오류가 발생했습니다.'
      )
      message.success('비밀번호 재설정 이메일을 발송했습니다. 메일함을 확인해주세요.')
      setTimeout(() => router.replace('/login'), 1200)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto w-full">
      <div className="text-center mb-6">
        <Title level={3} className="!mb-2 !font-bold">
          비밀번호 재설정
        </Title>
        <Text className="text-gray-600">
          계정 이메일을 입력하면 재설정 링크를 보내드립니다.
        </Text>
      </div>

      {error && (
        <Alert
          message={error}
          type="warning"
          showIcon
          className="mb-4 !rounded-soft"
        />
      )}

      <Form
        form={form}
        layout="vertical"
        size="large"
        onFinish={onFinish}
        className="space-y-1"
      >
        <Form.Item
          name="email"
          label={<span className="font-semibold">이메일</span>}
          rules={[
            { required: true, message: '이메일을 입력해주세요!' },
            { type: 'email', message: '올바른 이메일 형식이 아닙니다!' },
          ]}
          className="mb-5"
        >
          <Input
            prefix={<MailOutlined className="text-gray-400 mr-1" />}
            placeholder="example@company.com"
            autoComplete="email"
            className="h-12"
          />
        </Form.Item>

        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="w-full h-12 font-semibold"
          >
            재설정 이메일 보내기
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}


