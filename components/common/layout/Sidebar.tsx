'use client'

import React, { useState, useCallback } from 'react'
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
  LogoutOutlined,
  FileTextOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons'
import { Badge, Tooltip } from 'antd'
import {
  SIDEBAR_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
  Z_INDEX,
} from '@/lib/config/layout.constants'
import { message } from 'antd/lib'

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

export default function Sidebar({ collapsed, className, isMobile = false }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { userData, signOut } = useAuth()
  const { unreadCount } = useNotifications()

  // 현재 경로에서 선택된 키 결정
  const getSelectedKey = () => {
    if (pathname === '/' || pathname === '/dashboard') return 'dashboard'
    if (pathname.startsWith('/profile')) return 'profile'
    if (pathname.startsWith('/gantt')) return 'gantt'
    if (pathname.startsWith('/calendar')) return 'calendar'
    if (pathname.startsWith('/notifications')) return 'notifications'
    if (pathname === '/projects' || pathname.startsWith('/projects')) return 'projects'
    if (pathname.startsWith('/admin/users')) return 'admin'
    if (pathname.startsWith('/admin/reports')) return 'reports'
    return 'dashboard'
  }

  const selectedKey = getSelectedKey()
  const isProfileActive = selectedKey === 'profile'

  // 로그아웃 핸들러
  const handleLogout = useCallback(async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      message.error('로그아웃 실패')
    }
  }, [signOut, router])

  // 권한별 메뉴 필터링
  const filteredMenuItems = menuItems.filter((item) => {
    if (item.adminOnly) {
      return userData?.role === 'admin'
    }
    return true
  })

  // Collapsed 상태의 메뉴 아이템 렌더링
  const renderCollapsedMenuItem = (item: MenuItemType) => {
    const isSelected = selectedKey === item.key
    const badgeCount = item.key === 'notifications' ? unreadCount : item.badge
    const shouldShowBadge = badgeCount !== undefined && badgeCount !== null && badgeCount > 0

    return (
      <Tooltip key={item.key} title={item.label} placement="right" mouseEnterDelay={0} mouseLeaveDelay={0}>
        <Link
          href={item.path}
          className={`collapsed-menu-item ${isSelected ? 'active' : ''}`}
        >
          <div className="icon-wrapper">
            {shouldShowBadge ? (
              <Badge count={badgeCount} size="small" offset={[8, -4]} showZero={false}>
                {item.icon}
              </Badge>
            ) : (
              item.icon
            )}
          </div>
        </Link>
      </Tooltip>
    )
  }

  // Expanded 상태의 메뉴 아이템 렌더링
  const renderExpandedMenuItem = (item: MenuItemType) => {
    const isSelected = selectedKey === item.key
    const badgeCount = item.key === 'notifications' ? unreadCount : item.badge
    const shouldShowBadge = badgeCount !== undefined && badgeCount !== null && badgeCount > 0

    return (
      <Link
        key={item.key}
        href={item.path}
        className={`expanded-menu-item ${isSelected ? 'active' : ''}`}
      >
        <div className="icon-wrapper">{item.icon}</div>
        <span className="menu-label">{item.label}</span>
        {shouldShowBadge && (
          <Badge
            count={badgeCount}
            size="small"
            className="ml-auto"
            showZero={false}
            style={{ backgroundColor: '#ff4d4f' }}
          />
        )}
      </Link>
    )
  }

  return (
    <>
      <aside
        className={`sidebar-container ${className || ''}`}
        style={{
          width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
          transform: isMobile && collapsed ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* 네비게이션 메뉴 */}
        <nav className="nav-section">
          {collapsed
            ? filteredMenuItems.map(renderCollapsedMenuItem)
            : filteredMenuItems.map(renderExpandedMenuItem)}
        </nav>

        {/* 하단 액션 */}
        <div className="bottom-actions">
          {collapsed ? (
            <>
              <Tooltip title="프로필" placement="right" mouseEnterDelay={0} mouseLeaveDelay={0}>
                <div
                  className={`collapsed-action-item profile ${isProfileActive ? 'active' : ''}`}
                  onClick={() => router.push('/profile')}
                >
                  <div className="icon-wrapper">
                    <UserOutlined />
                  </div>
                </div>
              </Tooltip>
              <Tooltip title="로그아웃" placement="right" mouseEnterDelay={0} mouseLeaveDelay={0}>
                <div className="collapsed-action-item logout" onClick={handleLogout}>
                  <div className="icon-wrapper">
                    <LogoutOutlined />
                  </div>
                </div>
              </Tooltip>
            </>
          ) : (
            <>
              <div
                className={`expanded-action-item profile ${isProfileActive ? 'active' : ''}`}
                onClick={() => router.push('/profile')}
              >
                <div className="icon-wrapper">
                  <UserOutlined />
                </div>
                <span>프로필</span>
              </div>
              <div className="expanded-action-item logout" onClick={handleLogout}>
                <div className="icon-wrapper">
                  <LogoutOutlined />
                </div>
                <span>로그아웃</span>
              </div>
            </>
          )}
        </div>
      </aside>

      <style jsx>{`
        .sidebar-container {
          position: fixed;
          left: 0;
          top: var(--header-height);
          height: calc(100vh - var(--header-height));
          background: white;
          border-right: 1px solid #e5e7eb;
          z-index: ${Z_INDEX.SIDEBAR};
          display: flex;
          flex-direction: column;
        }

        .nav-section {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 16px 0;
          scrollbar-width: thin;
          scrollbar-color: #e5e7eb #ffffff;
        }

        .nav-section::-webkit-scrollbar {
          width: 6px;
        }

        .nav-section::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
        }

        .nav-section::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }

        .nav-section::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        .bottom-actions {
          padding: 16px 0;
          border-top: 1px solid #f3f4f6;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* Collapsed 메뉴 아이템 */
        :global(.collapsed-menu-item) {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 48px;
          margin: 4px 12px;
          border-radius: 8px;
          color: #6b7280;
          text-decoration: none;
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        :global(.collapsed-menu-item:hover) {
          background-color: #eff6ff;
          color: #2563eb;
        }

        :global(.collapsed-menu-item.active) {
          background-color: #dbeafe;
          color: #1d4ed8;
        }

        /* Expanded 메뉴 아이템 */
        :global(.expanded-menu-item) {
          display: flex;
          align-items: center;
          gap: 12px;
          height: 48px;
          padding: 0 16px;
          margin: 4px 12px;
          border-radius: 8px;
          color: #374151;
          text-decoration: none;
          transition: background-color 0.2s ease, color 0.2s ease;
          font-weight: 500;
        }

        :global(.expanded-menu-item:hover) {
          background-color: #eff6ff;
          color: #2563eb;
        }

        :global(.expanded-menu-item.active) {
          background-color: #dbeafe;
          color: #1d4ed8;
        }

        /* 아이콘 래퍼 */
        :global(.icon-wrapper) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          font-size: 16px;
        }

        /* Collapsed 액션 아이템 - 상단 메뉴와 동일한 margin 적용 */
        .collapsed-action-item {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 48px;
          margin: 4px 12px;
          border-radius: 8px;
          color: #6b7280;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        /* 프로필 버튼 - primary blue 호버/활성 */
        .collapsed-action-item.profile:hover {
          background-color: #eff6ff;
          color: #2563eb;
        }

        .collapsed-action-item.profile.active {
          background-color: #dbeafe;
          color: #1d4ed8;
        }

        /* 로그아웃 버튼 - error red 호버 */
        .collapsed-action-item.logout:hover {
          background-color: #fef2f2;
          color: #dc2626;
        }

        /* Expanded 액션 아이템 - 상단 메뉴와 동일한 높이/margin 적용 */
        .expanded-action-item {
          display: flex;
          align-items: center;
          gap: 12px;
          height: 48px;
          padding: 0 16px;
          margin: 4px 12px;
          border-radius: 8px;
          color: #374151;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
          font-weight: 500;
        }

        /* 프로필 버튼 - primary blue 호버/활성 */
        .expanded-action-item.profile:hover {
          background-color: #eff6ff;
          color: #2563eb;
        }

        .expanded-action-item.profile.active {
          background-color: #dbeafe;
          color: #1d4ed8;
        }

        /* 로그아웃 버튼 - error red 호버 */
        .expanded-action-item.logout:hover {
          background-color: #fef2f2;
          color: #dc2626;
        }

        /* 메뉴 라벨 */
        :global(.menu-label) {
          flex: 1;
        }
      `}</style>
    </>
  )
}
