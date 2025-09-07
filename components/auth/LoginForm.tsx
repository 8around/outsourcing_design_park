'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Form, Input, Button, Alert, Typography } from 'antd'
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'

const { Title, Text } = Typography

interface LoginFormData {
  email: string
  password: string
}

interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => Promise<void>
}

export default function LoginForm({ onSubmit }: LoginFormProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (values: LoginFormData) => {
    setLoading(true)
    setError(null)

    try {
      if (onSubmit) {
        await onSubmit(values)
      } else {
        // 임시: 개발용 로그인 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1500))
        console.log('로그인 시도:', values)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="text-center">
        <Title level={3} className="!text-gray-900 !mb-3 !font-bold">
          로그인
        </Title>
        <Text className="text-gray-600 text-base">
          계정에 로그인하여 프로젝트를 관리하세요
        </Text>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          className="mb-6 !rounded-soft border-error-200 bg-error-50"
        />
      )}

      {/* Login Form */}
      <Form
        form={form}
        name="login"
        onFinish={handleSubmit}
        autoComplete="off"
        layout="vertical"
        size="large"
        className="space-y-1"
      >
        {/* Email Field */}
        <Form.Item
          name="email"
          label={<span className="text-gray-700 font-semibold">이메일</span>}
          rules={[
            { required: true, message: '이메일을 입력해주세요!' },
            { type: 'email', message: '올바른 이메일 형식이 아닙니다!' }
          ]}
          className="mb-5"
        >
          <Input
            prefix={<UserOutlined className="text-gray-400 mr-1" />}
            placeholder="example@company.com"
            autoComplete="email"
            className="h-12 px-4 text-gray-900 bg-white border-gray-200 hover:border-primary-400 focus:border-primary-600 rounded-soft transition-smooth"
          />
        </Form.Item>

        {/* Password Field */}
        <Form.Item
          name="password"
          label={<span className="text-gray-700 font-semibold">비밀번호</span>}
          rules={[
            { required: true, message: '비밀번호를 입력해주세요!' },
            { min: 6, message: '비밀번호는 최소 6자 이상이어야 합니다!' }
          ]}
          className="mb-6"
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400 mr-1" />}
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
            className="h-12 px-4 text-gray-900 bg-white border-gray-200 hover:border-primary-400 focus:border-primary-600 rounded-soft transition-smooth"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        {/* Login Button */}
        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="w-full h-12 text-base font-semibold bg-primary-600 hover:bg-primary-500 active:bg-primary-700 border-primary-600 hover:border-primary-500 rounded-soft shadow-soft hover:shadow-soft-md transition-smooth"
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </span>
          </Button>
        </Form.Item>
      </Form>

      {/* Form Footer */}
      <div className="space-y-5 text-center">
        {/* Reset Password Link */}
        <Link
          href="/reset-password"
          className="inline-block text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline transition-smooth"
        >
          비밀번호를 잊으셨나요?
        </Link>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">또는</span>
          </div>
        </div>

        {/* Sign Up Link */}
        <div>
          <Text className="text-gray-600">
            계정이 없으신가요?{' '}
            <Link
              href="/signup"
              className="text-primary-600 hover:text-primary-700 font-semibold hover:underline transition-smooth"
            >
              회원가입
            </Link>
          </Text>
        </div>
      </div>
    </div>
  )
}