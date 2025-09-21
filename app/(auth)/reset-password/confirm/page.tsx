'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form, Input, Button, Alert, Typography } from 'antd'
import { LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import { authService } from '@/lib/services/auth.service'
import { createClient } from '@/lib/supabase/client'
import { message } from 'antd'

const { Title, Text } = Typography

export default function ResetPasswordConfirmPage() {
  const [form] = Form.useForm()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // URL 프래그먼트의 토큰을 @supabase/ssr 클라이언트가 자동 처리함
    // 세션이 존재하는지 간단 확인 후 폼 표시
    const checkSession = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
          setError('유효하지 않은 접근입니다. 메일의 링크를 통해 다시 시도해주세요.')
        }
      } catch {
        setError('세션 확인 중 오류가 발생했습니다.')
      } finally {
        setReady(true)
      }
    }
    checkSession()
  }, [])

  const onFinish = async (values: { newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      form.setFields([
        { name: 'confirmPassword', errors: ['비밀번호가 일치하지 않습니다.'] }
      ])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await authService.updatePassword({ newPassword: values.newPassword })
      if (!result.success) {
        throw new Error(result.error || '비밀번호 변경에 실패했습니다.')
      }
      message.success('비밀번호가 변경되었습니다. 다시 로그인해주세요.')
      // 로그인 페이지로 이동하며 성공 플래그 전달
      router.replace('/login?reset=success')
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto w-full">
      <div className="text-center mb-6">
        <Title level={3} className="!mb-2 !font-bold">
          새 비밀번호 설정
        </Title>
        <Text className="text-gray-600">
          새 비밀번호를 입력하고 저장해주세요.
        </Text>
      </div>

      {!ready && (
        <div className="mb-4 text-gray-600">확인 중...</div>
      )}

      {ready && error && (
        <Alert message={error} type="error" showIcon className="mb-4 !rounded-soft" />
      )}

      {ready && !error && (
        <Form form={form} layout="vertical" size="large" onFinish={onFinish} className="space-y-1">
          <Form.Item
            name="newPassword"
            label={<span className="font-semibold">새 비밀번호</span>}
            rules={[
              { required: true, message: '새 비밀번호를 입력해주세요!' },
              { min: 6, message: '비밀번호는 최소 6자 이상이어야 합니다!' },
            ]}
            className="mb-5"
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400 mr-1" />}
              placeholder="새 비밀번호"
              autoComplete="new-password"
              className="h-12"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={<span className="font-semibold">새 비밀번호 확인</span>}
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: '비밀번호 확인을 입력해주세요!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('비밀번호가 일치하지 않습니다.'))
                },
              }),
            ]}
            className="mb-6"
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400 mr-1" />}
              placeholder="새 비밀번호 확인"
              autoComplete="new-password"
              className="h-12"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button type="primary" htmlType="submit" loading={loading} className="w-full h-12 font-semibold">
              비밀번호 변경하기
            </Button>
          </Form.Item>
        </Form>
      )}
    </div>
  )
}


