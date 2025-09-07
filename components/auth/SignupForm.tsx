'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Form, Input, Button, Alert, Typography, Progress } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'

const { Title, Text } = Typography

interface SignupFormData {
  email: string
  password: string
  confirmPassword: string
  name: string
  phone: string
}

interface SignupFormProps {
  onSubmit?: (data: Omit<SignupFormData, 'confirmPassword'>) => Promise<void>
}

export default function SignupForm({ onSubmit }: SignupFormProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState(0)

  // 비밀번호 강도 체크
  const checkPasswordStrength = (password: string): number => {
    let strength = 0
    if (password.length >= 8) strength += 20
    if (password.length >= 12) strength += 10
    if (/[a-z]/.test(password)) strength += 15
    if (/[A-Z]/.test(password)) strength += 15
    if (/[0-9]/.test(password)) strength += 15
    if (/[^A-Za-z0-9]/.test(password)) strength += 25
    return Math.min(strength, 100)
  }

  const getPasswordStrengthColor = (strength: number): string => {
    if (strength < 30) return 'red'
    if (strength < 60) return 'orange'
    if (strength < 80) return 'blue'
    return 'green'
  }

  const getPasswordStrengthText = (strength: number): string => {
    if (strength < 30) return '매우 약함'
    if (strength < 60) return '약함'
    if (strength < 80) return '보통'
    return '강함'
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value
    setPasswordStrength(checkPasswordStrength(password))
  }

  const handleSubmit = async (values: SignupFormData) => {
    setLoading(true)
    setError(null)

    try {
      const { confirmPassword, ...submitData } = values
      
      if (onSubmit) {
        await onSubmit(submitData)
        // onSubmit이 성공적으로 완료되면 부모 컴포넌트에서 모달을 처리
        form.resetFields()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="text-center">
        <Title level={3} className="!text-gray-900 !mb-3 !font-bold">
          회원가입
        </Title>
        <Text className="text-gray-600 text-base">
          계정을 생성하여 프로젝트 관리를 시작하세요
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

      {/* Signup Form */}
      <Form
        form={form}
        name="signup"
        onFinish={handleSubmit}
        autoComplete="off"
        layout="vertical"
        size="large"
        className="space-y-1"
      >
        {/* Name Field */}
        <Form.Item
          name="name"
          label={<span className="text-gray-700 font-semibold">이름</span>}
          rules={[
            { required: true, message: '이름을 입력해주세요!' },
            { min: 2, message: '이름은 최소 2자 이상이어야 합니다!' }
          ]}
          className="mb-4"
        >
          <Input
            prefix={<UserOutlined className="text-gray-400 mr-1" />}
            placeholder="홍길동"
            autoComplete="name"
            className="h-11 px-4 text-gray-900 bg-white border-gray-200 hover:border-primary-400 focus:border-primary-600 rounded-soft transition-smooth"
          />
        </Form.Item>

        {/* Email Field */}
        <Form.Item
          name="email"
          label={<span className="text-gray-700 font-semibold">이메일</span>}
          rules={[
            { required: true, message: '이메일을 입력해주세요!' },
            { type: 'email', message: '올바른 이메일 형식이 아닙니다!' }
          ]}
          className="mb-4"
        >
          <Input
            prefix={<MailOutlined className="text-gray-400 mr-1" />}
            placeholder="example@company.com"
            autoComplete="email"
            className="h-11 px-4 text-gray-900 bg-white border-gray-200 hover:border-primary-400 focus:border-primary-600 rounded-soft transition-smooth"
          />
        </Form.Item>

        {/* Phone Field */}
        <Form.Item
          name="phone"
          label={<span className="text-gray-700 font-semibold">전화번호</span>}
          rules={[
            { required: true, message: '전화번호를 입력해주세요!' },
            { 
              pattern: /^01[016789]-?\d{3,4}-?\d{4}$/, 
              message: '올바른 전화번호 형식이 아닙니다! (예: 010-1234-5678)' 
            }
          ]}
          className="mb-4"
        >
          <Input
            prefix={<PhoneOutlined className="text-gray-400 mr-1" />}
            placeholder="010-1234-5678"
            autoComplete="tel"
            className="h-11 px-4 text-gray-900 bg-white border-gray-200 hover:border-primary-400 focus:border-primary-600 rounded-soft transition-smooth"
          />
        </Form.Item>

        {/* Password Field */}
        <Form.Item
          name="password"
          label={<span className="text-gray-700 font-semibold">비밀번호</span>}
          rules={[
            { required: true, message: '비밀번호를 입력해주세요!' },
            { min: 8, message: '비밀번호는 최소 8자 이상이어야 합니다!' },
            {
              validator: (_, value) => {
                const strength = checkPasswordStrength(value || '')
                if (strength < 60) {
                  return Promise.reject(new Error('더 강한 비밀번호를 설정해주세요!'))
                }
                return Promise.resolve()
              }
            }
          ]}
          className="mb-2"
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400 mr-1" />}
            placeholder="비밀번호를 입력하세요 (8자 이상)"
            autoComplete="new-password"
            onChange={handlePasswordChange}
            className="h-11 px-4 text-gray-900 bg-white border-gray-200 hover:border-primary-400 focus:border-primary-600 rounded-soft transition-smooth"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        {/* Password Strength Indicator */}
        {passwordStrength > 0 && (
          <div className="mb-5 p-4 bg-gray-50 rounded-soft border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <Text className="text-xs font-medium text-gray-700">비밀번호 강도</Text>
              <Text className="text-xs font-semibold" style={{ color: getPasswordStrengthColor(passwordStrength) }}>
                {getPasswordStrengthText(passwordStrength)}
              </Text>
            </div>
            <Progress
              percent={passwordStrength}
              strokeColor={getPasswordStrengthColor(passwordStrength)}
              showInfo={false}
              size="small"
              className="mb-2"
            />
            <Text className="text-xs text-gray-600">
              영문 대소문자, 숫자, 특수문자를 조합해서 8자 이상 입력하세요
            </Text>
          </div>
        )}

        {/* Confirm Password Field */}
        <Form.Item
          name="confirmPassword"
          label={<span className="text-gray-700 font-semibold">비밀번호 확인</span>}
          dependencies={['password']}
          rules={[
            { required: true, message: '비밀번호를 다시 입력해주세요!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('비밀번호가 일치하지 않습니다!'))
              },
            }),
          ]}
          className="mb-6"
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400 mr-1" />}
            placeholder="비밀번호를 다시 입력하세요"
            autoComplete="new-password"
            className="h-11 px-4 text-gray-900 bg-white border-gray-200 hover:border-primary-400 focus:border-primary-600 rounded-soft transition-smooth"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        {/* Submit Button */}
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
                  회원가입 중...
                </>
              ) : (
                '회원가입'
              )}
            </span>
          </Button>
        </Form.Item>
      </Form>

      {/* Form Footer */}
      <div className="text-center">
        <Text className="text-gray-600">
          이미 계정이 있으신가요?{' '}
          <Link
            href="/login"
            className="text-primary-600 hover:text-primary-700 font-semibold hover:underline transition-smooth"
          >
            로그인
          </Link>
        </Text>
      </div>
    </div>
  )
}