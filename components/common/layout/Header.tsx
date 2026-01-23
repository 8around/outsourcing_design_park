'use client'

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  UserOutlined,
  MenuOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { Button, Avatar, Dropdown, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { HEADER_HEIGHT } from '@/lib/config/layout.constants'

const { Text } = Typography

interface HeaderProps {
  onMobileMenuToggle?: () => void
  showMobileMenuButton?: boolean
  collapsed: boolean
  onCollapse: (collapsed: boolean) => void
  isMobile: boolean
}

export default function Header({
  onMobileMenuToggle,
  showMobileMenuButton = false,
  collapsed,
  onCollapse,
  isMobile,
}: HeaderProps) {
  const router = useRouter()
  const { user, userData, signOut } = useAuth()

  // 사용자 드롭다운 메뉴
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: '프로필',
      icon: <UserOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: '로그아웃',
      icon: <LogoutOutlined />,
      danger: true,
    },
  ]

  const handleUserMenuClick = useCallback<NonNullable<MenuProps['onClick']>>(async ({ key }) => {
    switch (key) {
      case 'profile':
        router.push('/profile')
        break
      case 'logout':
        try {
          await signOut()
          router.push('/login')
        } catch (error) {
          console.error('로그아웃 실패:', error)
        }
        break
    }
  }, [router, signOut])

  return (
    <header
      className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between"
      style={{
        height: 'var(--header-height)',
        zIndex: 1100,
      }}
    >
      {/* 왼쪽 영역: Collapse 토글 + 로고 + 브랜드 */}
      <div className="flex items-center gap-4">
        {/* 모바일 메뉴 버튼 */}
        {showMobileMenuButton && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onMobileMenuToggle}
            className="flex items-center justify-center"
          />
        )}

        {/* Collapse 토글 버튼 - 데스크탑에서만 표시 (먼저!) */}
        {!isMobile && (
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => onCollapse(!collapsed)}
            className="flex items-center justify-center"
          />
        )}

        {/* 로고 - 헤더 높이의 절반, 비율 자동 유지 */}
        <div
          className="relative rounded-lg overflow-hidden"
          style={{ height: HEADER_HEIGHT / 2, aspectRatio: '961/390'}}
        >
          <Image
            src="/images/logo.png"
            alt="디자인파크"
            fill
            className="object-contain"
            priority
            unoptimized
          />
        </div>

        {/* 브랜드 텍스트 - sm(640px) 이상에서만 표시 */}
        <div className="hidden sm:block">
          <Text strong className="text-gray-900 block leading-tight">
            프로젝트 관리 시스템
          </Text>
          <Text className="text-xs text-gray-500">(주)디자인파크</Text>
        </div>
      </div>

      {/* 오른쪽 영역 */}
      <div className="flex items-center space-x-3">
        {/* 사용자 드롭다운 */}
        <Dropdown
          menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
          placement="bottomRight"
          arrow
        >
          <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2 transition-all duration-200">
            <Avatar
              size={32}
              icon={<UserOutlined />}
              className="bg-primary-100 text-primary-600"
            />
            {/* 사용자 정보 텍스트 - sm(640px) 이상에서만 표시 */}
            <div className="hidden sm:block">
              <Text className="text-sm font-medium text-gray-900 block">
                {userData?.name || '사용자'} ({user?.email})
              </Text>
              <Text className="text-xs text-gray-500">
                {userData?.role === 'admin' ? '관리자' : '일반 사용자'}
              </Text>
            </div>
          </div>
        </Dropdown>
      </div>

    </header>
  )
}
