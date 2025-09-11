'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  BellOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { Button, Badge, Avatar, Input, Dropdown, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'

const { Text } = Typography
const { Search } = Input

interface HeaderProps {
  onMobileMenuToggle?: () => void
  showMobileMenuButton?: boolean
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
  sidebarWidth?: number
}

// 페이지 제목 매핑
const getPageTitle = (pathname: string): string => {
  if (pathname === '/' || pathname === '/dashboard') return '대시보드'
  if (pathname === '/projects' || pathname.startsWith('/projects')) return '프로젝트'
  if (pathname === '/gantt' || pathname.startsWith('/gantt')) return '간트차트'
  if (pathname === '/calendar' || pathname.startsWith('/calendar')) return '캘린더'
  if (pathname === '/notifications' || pathname.startsWith('/notifications')) return '알림'
  if (pathname.startsWith('/admin/users')) return '사용자 관리'
  if (pathname.startsWith('/admin/reports')) return '리포트'
  if (pathname.startsWith('/settings')) return '설정'
  return '대시보드'
}

export default function Header({ 
  onMobileMenuToggle, 
  showMobileMenuButton = false,
  collapsed,
  sidebarWidth = 280
}: HeaderProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  
  // 사이드바 너비 계산
  const sidebarOffset = showMobileMenuButton ? 0 : (collapsed ? 80 : sidebarWidth)

  // 사용자 드롭다운 메뉴
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: '프로필',
      icon: <UserOutlined />,
    },
    {
      key: 'settings',
      label: '설정',
      icon: <SettingOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: '로그아웃',
      icon: <UserOutlined />,
      danger: true,
    },
  ]

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'profile':
        console.log('프로필 클릭')
        break
      case 'settings':
        console.log('설정 클릭')
        break
      case 'logout':
        console.log('로그아웃 클릭')
        break
    }
  }

  return (
    <header 
      className="fixed top-0 right-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between" 
      style={{ 
        height: '72px',
        left: `${sidebarOffset}px`,
        transition: 'left 0.2s ease',
        zIndex: 10, // Lower than sidebar (1000) but higher than content
      }}>
      {/* 왼쪽 영역 */}
      <div className="flex items-center space-x-4">
        {/* 모바일 메뉴 버튼 */}
        {showMobileMenuButton && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onMobileMenuToggle}
            className="lg:hidden"
          />
        )}

        {/* 페이지 제목 */}
        <div>
          <Text className="text-2xl font-bold text-gray-900">
            {getPageTitle(pathname)}
          </Text>
          <Text className="text-sm text-gray-500 block">
            {user?.role === 'admin' ? '관리자 권한' : '일반 사용자'}
          </Text>
        </div>
      </div>

      {/* 오른쪽 영역 */}
      <div className="flex items-center space-x-3">
        {/* 검색 버튼 (모바일) */}
        <Button
          type="text"
          icon={<SearchOutlined />}
          className="md:hidden"
          size="large"
        />

        {/* 알림 버튼 */}
        <Badge count={5} size="small">
          <Button
            type="text"
            icon={<BellOutlined />}
            size="large"
            className="text-gray-600 hover:text-gray-900"
          />
        </Badge>

        {/* 설정 버튼 */}
        <Button
          type="text"
          icon={<SettingOutlined />}
          size="large"
          className="text-gray-600 hover:text-gray-900"
        />

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
            <div className="hidden sm:block">
              <Text className="text-sm font-medium text-gray-900 block">
                {user?.email?.split('@')[0] || '사용자'}
              </Text>
              <Text className="text-xs text-gray-500">
                {user?.role === 'admin' ? '관리자' : '사용자'}
              </Text>
            </div>
          </div>
        </Dropdown>
      </div>

      <style jsx>{`
        /* 반응형 스타일 */
        @media (max-width: 768px) {
          header {
            padding: 1rem 1rem;
          }
        }
      `}</style>
    </header>
  )
}