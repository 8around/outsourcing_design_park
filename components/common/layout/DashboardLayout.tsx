'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Layout, FloatButton } from 'antd'
import { UpOutlined } from '@ant-design/icons'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import Sidebar from './Sidebar'
import Header from './Header'
import {
  SIDEBAR_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
  MIN_RENDERING_WIDTH,
  Z_INDEX,
} from '@/lib/config/layout.constants'

const { Content } = Layout

// localStorage 키 상수
const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const isGanttPage = pathname === '/gantt'

  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // 현재 사이드바 폭 계산
  const currentSidebarWidth = isMobile ? 0 : (collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH)

  // localStorage에서 사이드바 상태 복원 (SSR 안전)
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (stored !== null) {
      setCollapsed(stored === 'true')
    }
  }, [])

  // 반응형 처리
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MIN_RENDERING_WIDTH
      setIsMobile(mobile)

      // 모바일에서는 기본적으로 사이드바 접기
      if (mobile) {
        setCollapsed(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // CSS 변수 업데이트
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--current-sidebar-width',
      `${currentSidebarWidth}px`
    )
  }, [currentSidebarWidth])

  // 사이드바 토글 핸들러 (localStorage에 상태 저장)
  const handleCollapse = useCallback((isCollapsed: boolean) => {
    setCollapsed(isCollapsed)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed))
  }, [])

  // 모바일에서 사이드바 바깥 영역 클릭 시 닫기
  const handleContentClick = useCallback(() => {
    if (isMobile && !collapsed) {
      setCollapsed(true)
    }
  }, [isMobile, collapsed])

  return (
    <ThemeProvider>
      <Layout className="dashboard-layout min-h-screen">
        {/* 헤더 - 최상위, 전체 폭 */}
        <Header
          collapsed={collapsed}
          onCollapse={handleCollapse}
          showMobileMenuButton={isMobile}
          onMobileMenuToggle={() => setCollapsed(!collapsed)}
          isMobile={isMobile}
        />

        {/* 사이드바 - 헤더 아래 */}
        <Sidebar
          collapsed={collapsed}
          className={isMobile ? 'mobile-sidebar' : ''}
          isMobile={isMobile}
        />

        {/* 메인 레이아웃 - 헤더 아래, 사이드바 옆 */}
        <Layout
          className="main-layout"
          style={{
            marginLeft: currentSidebarWidth,
            marginTop: 'var(--header-height)',
            width: `calc(max(100vw, var(--min-rendering-width)) - ${currentSidebarWidth}px)`,
            maxWidth: `calc(max(100vw, var(--min-rendering-width)) - ${currentSidebarWidth}px)`,
            transition: 'margin-left 0.2s ease, width 0.2s ease, max-width 0.2s ease',
            minHeight: 'calc(100vh - var(--header-height))',
            position: 'relative',
            overflowX: 'hidden',
          }}
        >
          {/* 메인 콘텐츠 */}
          <Content
            className="main-content"
            style={{
              padding: isGanttPage ? '0' : '24px',
              paddingBottom: isGanttPage ? '0' : '24px',
              minHeight: 'calc(100vh - var(--header-height))',
              background: 'var(--background-secondary)',
              position: 'relative',
              zIndex: 1,
            }}
            onClick={handleContentClick}
          >
            {/* 콘텐츠 래퍼 - 간트차트 페이지일 때 패딩 최소화 */}
            <div
              className={`content-wrapper ${isGanttPage ? 'gantt-page-wrapper' : ''}`}
              style={{
                background: isGanttPage ? 'transparent' : 'var(--background-primary)',
                borderRadius: isGanttPage ? '0' : 'var(--radius-md)',
                boxShadow: isGanttPage ? 'none' : 'var(--shadow-sm)',
                border: isGanttPage ? 'none' : '1px solid var(--border-color)',
                minHeight: 'calc(100vh - 144px)',
                padding: isGanttPage ? '0' : '24px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {children}
            </div>
          </Content>

          {/* FloatButton - 상단으로 스크롤 */}
          <FloatButton.BackTop
            style={{
              right: 24,
              bottom: 24,
            }}
            icon={<UpOutlined />}
          />
        </Layout>

        {/* 모바일 오버레이 */}
        {isMobile && !collapsed && (
          <div
            className="mobile-overlay"
            style={{
              position: 'fixed',
              top: 'var(--header-height)',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: Z_INDEX.OVERLAY,
            }}
            onClick={() => setCollapsed(true)}
          />
        )}


        <style jsx>{`
          .dashboard-layout {
            background: var(--background-secondary);
            position: relative;
          }

          .main-layout {
            position: relative;
            overflow-x: hidden;
            display: flex;
            flex-direction: column;
          }

          .main-content {
            position: relative;
            overflow-x: auto;
            flex: 1;
          }

          .content-wrapper {
            position: relative;
            z-index: 1;
          }

          /* 간트차트 페이지 전용 스타일 */
          .gantt-page-wrapper {
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          /* 반응형 스타일 - 최소 폭 992px이므로 1200px 이하만 대응 */
          @media (max-width: 1200px) {
            .main-content {
              padding: 20px;
            }

            .content-wrapper {
              padding: 20px;
              min-height: calc(100vh - 132px);
            }

            .content-wrapper.gantt-page-wrapper {
              padding: 0 !important;
            }
          }

          /* 스크롤바 스타일링 */
          .main-content::-webkit-scrollbar {
            width: 6px;
          }

          .main-content::-webkit-scrollbar-track {
            background: var(--background-tertiary);
            border-radius: 3px;
          }

          .main-content::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 3px;
            transition: background 0.2s ease;
          }

          .main-content::-webkit-scrollbar-thumb:hover {
            background: var(--text-muted);
          }

          /* 애니메이션 */
          .content-wrapper {
            animation: fadeInUp 0.3s ease-out;
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* 포커스 관리 */
          .dashboard-layout:focus-within .content-wrapper {
            box-shadow: var(--shadow-md);
          }

          /* 높은 대비 모드 지원 */
          @media (prefers-contrast: high) {
            .content-wrapper {
              border: 2px solid var(--border-color);
            }
          }

          /* 모션 줄임 모드 지원 */
          @media (prefers-reduced-motion: reduce) {
            .main-layout,
            .content-wrapper,
            * {
              transition: none !important;
              animation: none !important;
            }
          }

          /* 다크모드 준비 */
          @media (prefers-color-scheme: dark) {
            .dashboard-layout {
              background: #0f1419;
            }
            
            .content-wrapper {
              background: #1a1a1a;
              border-color: #2a2a2a;
            }
          }
        `}</style>
      </Layout>
    </ThemeProvider>
  )
}