'use client'

import React, { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { useNotifications } from '@/lib/hooks/useNotifications'
import {
  HomeOutlined,
  ProjectOutlined,
  CalendarOutlined,
  BarChartOutlined,
  UserOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  FileTextOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons'
import { Button, Menu, Layout, Avatar, Typography, Space, Divider, Badge } from 'antd'

const { Sider } = Layout
const { Text } = Typography

interface MenuItemType {
  key: string
  label: string
  icon: React.ReactNode
  path: string
  adminOnly?: boolean
  badge?: number
}

const menuItems: MenuItemType[] = [
  {
    key: 'dashboard',
    label: '대시보드',
    icon: <HomeOutlined />,
    path: '/dashboard',
  },
  {
    key: 'projects',
    label: '프로젝트',
    icon: <ProjectOutlined />,
    path: '/projects',
  },
  {
    key: 'gantt',
    label: '간트차트',
    icon: <BarChartOutlined />,
    path: '/gantt',
  },
  {
    key: 'calendar',
    label: '캘린더',
    icon: <CalendarOutlined />,
    path: '/calendar',
  },
  {
    key: 'notifications',
    label: '알림',
    icon: <BellOutlined />,
    path: '/notifications',
  },
  {
    key: 'admin',
    label: '회원 승인 관리',
    icon: <UserSwitchOutlined />,
    path: '/admin/users',
    adminOnly: true,
  },
  {
    key: 'reports',
    label: '리포트',
    icon: <FileTextOutlined />,
    path: '/admin/reports',
    adminOnly: true,
  },
]

interface SidebarProps {
  collapsed: boolean
  onCollapse: (collapsed: boolean) => void
  className?: string
  isMobile?: boolean
}

export default function Sidebar({ collapsed, onCollapse, className, isMobile = false }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userData, signOut } = useAuth()
  const { unreadCount } = useNotifications()
  const [loading, setLoading] = useState(false)

  // 현재 경로에서 선택된 키 결정
  const getSelectedKey = () => {
    if (pathname === '/' || pathname === '/dashboard') return 'dashboard'
    if (pathname.startsWith('/gantt')) return 'gantt'
    if (pathname.startsWith('/calendar')) return 'calendar'
    if (pathname.startsWith('/notifications')) return 'notifications'
    if (pathname === '/projects' || pathname.startsWith('/projects')) return 'projects'
    if (pathname.startsWith('/admin/users')) return 'admin'
    if (pathname.startsWith('/admin/reports')) return 'reports'
    return 'dashboard'
  }
  
  const selectedKey = getSelectedKey()


  // 로그아웃 핸들러
  const handleLogout = async () => {
    setLoading(true)
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 권한별 메뉴 필터링
  const filteredMenuItems = menuItems.filter(item => {
    if (item.adminOnly) {
      return userData?.role === 'admin'
    }
    return true
  })

  // 메뉴 아이템 렌더링
  const renderMenuItem = (item: MenuItemType) => {
    const isSelected = selectedKey === item.key
    // 알림 메뉴일 경우 실시간 알림 개수 표시
    const badgeCount = item.key === 'notifications' ? unreadCount : item.badge
    const shouldShowBadge = badgeCount !== undefined && badgeCount !== null && badgeCount > 0
    
    return (
      <Link
        key={item.key}
        href={item.path}
        className={`
          group flex items-center px-4 py-3 rounded-lg mx-3 my-1 cursor-pointer no-underline
          transition-all duration-200 hover:bg-primary-50
          ${isSelected ? 'bg-primary-100 text-primary-600' : 'text-gray-700 hover:text-primary-600'}
        `}
        style={{ display: 'flex', textDecoration: 'none' }}
      >
        <div className={`
          flex items-center justify-center w-5 h-5 mr-3 relative
          ${isSelected ? 'text-primary-600' : 'text-gray-500 group-hover:text-primary-600'}
        `}>
          {/* collapsed 상태에서도 알림 개수 표시 */}
          {collapsed && item.key === 'notifications' && shouldShowBadge ? (
            <Badge
              count={badgeCount}
              size="small"
              offset={[0, 0]}
              showZero={false}
              style={{ backgroundColor: '#ff4d4f' }}
            >
              {item.icon}
            </Badge>
          ) : (
            item.icon
          )}
        </div>
        
        {!collapsed && (
          <div className="flex-1 flex items-center justify-between">
            <span className="font-medium">{item.label}</span>
            {shouldShowBadge && (
              <Badge
                count={badgeCount}
                size="small"
                className="ml-2"
                showZero={false}
                style={{ backgroundColor: '#ff4d4f' }}
              />
            )}
          </div>
        )}
      </Link>
    )
  }

  return (
    <>
    <div
      className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 flex flex-col ${className || ''}`}
      style={{
        width: collapsed ? '80px' : '280px',
        transform: isMobile && collapsed ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.3s ease, width 0.2s ease',
        zIndex: 1050, // Higher than overlay (999)
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}>
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <ProjectOutlined className="text-white text-sm" />
              </div>
              <div>
                <Text strong className="text-gray-900">프로젝트 관리</Text>
                <Text className="text-xs text-gray-500 block">제조업 솔루션</Text>
              </div>
            </div>
          )}
          
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => onCollapse(!collapsed)}
            className="flex items-center justify-center"
          />
        </div>
      </div>

      {/* 사용자 정보 */}
      {!collapsed && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <Avatar
              size={40}
              icon={<UserOutlined />}
              className="bg-primary-100 text-primary-600"
            />
            <div className="flex-1 min-w-0">
              <Text strong className="block truncate text-sm">
                {user?.email || '사용자'}
              </Text>
              <Text className="text-xs text-gray-500">
                {userData?.role === 'admin' ? '관리자' : '일반 사용자'}
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* 네비게이션 메뉴 */}
      <div className="py-4 overflow-y-auto overflow-x-hidden" style={{ 
        flex: '1 1 auto',
        minHeight: 0, // Important for flexbox overflow
        maxHeight: 'calc(100vh - 300px)', // 헤더(약 140px) + 하단 액션(약 160px) 제외
        scrollbarWidth: 'thin',
        scrollbarColor: '#e5e7eb #ffffff'
      }}>
        <nav>
          {filteredMenuItems.map(renderMenuItem)}
        </nav>
      </div>

      {/* 하단 액션 */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <div
          className="group flex items-center px-4 py-3 rounded-lg cursor-pointer
                     transition-all duration-200 hover:bg-gray-50 text-gray-700 hover:text-gray-900"
          onClick={() => router.push('/profile')}
        >
          <UserOutlined className="w-5 h-5 mr-3 text-gray-500 group-hover:text-gray-700" />
          {!collapsed && <span className="font-medium">프로필</span>}
        </div>
        
        <div
          className="group flex items-center px-4 py-3 rounded-lg cursor-pointer
                     transition-all duration-200 hover:bg-red-50 text-gray-700 hover:text-red-600"
          onClick={handleLogout}
        >
          <LogoutOutlined className="w-5 h-5 mr-3 text-gray-500 group-hover:text-red-600" />
          {!collapsed && (
            <span className="font-medium">
              {loading ? '로그아웃 중...' : '로그아웃'}
            </span>
          )}
        </div>
      </div>

    </div>
    
    {/* Custom scrollbar styles for sidebar */}
    <style jsx>{`
      .fixed::-webkit-scrollbar {
        width: 6px;
      }
      
      .fixed::-webkit-scrollbar-track {
        background: #f3f4f6;
        border-radius: 3px;
      }
      
      .fixed::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 3px;
      }
      
      .fixed::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }
      
      /* Firefox scrollbar */
      .fixed {
        scrollbar-width: thin;
        scrollbar-color: #d1d5db #f3f4f6;
      }
    `}</style>
    </>
  )
}