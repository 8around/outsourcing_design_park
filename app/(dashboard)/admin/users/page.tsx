'use client'

import { Suspense } from 'react'
import { Typography, Spin } from 'antd'
import { UserSwitchOutlined } from '@ant-design/icons'
import UsersManagement from '@/components/admin/UsersManagement'

const { Title, Text } = Typography

export default function AdminUsersPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <Title level={2} className="mb-2 flex items-center gap-3">
          <UserSwitchOutlined />
          사용자 관리
        </Title>
        <Text type="secondary" className="text-base">
          사용자 승인 및 관리를 수행할 수 있습니다
        </Text>
      </div>

      {/* 콘텐츠 */}
      <Suspense fallback={
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      }>
        <UsersManagement />
      </Suspense>
    </div>
  )
}
