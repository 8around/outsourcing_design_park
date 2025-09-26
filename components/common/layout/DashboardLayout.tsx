'use client'

import { useState, useEffect, ReactNode } from 'react'
import { Layout, FloatButton } from 'antd'
import { UpOutlined } from '@ant-design/icons'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import Sidebar from './Sidebar'
import Header from './Header'

const { Content } = Layout

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const sidebarWidth = 280
  const collapsedWidth = 80

  // 반응형 처리
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
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

  // 사이드바 토글 핸들러
  const handleCollapse = (isCollapsed: boolean) => {
    setCollapsed(isCollapsed)
  }

  // 모바일에서 사이드바 바깥 영역 클릭 시 닫기
  const handleContentClick = () => {
    if (isMobile && !collapsed) {
      setCollapsed(true)
    }
  }

  return (
    <ThemeProvider>
      <Layout className="dashboard-layout min-h-screen">
        {/* 사이드바 */}
        <Sidebar
          collapsed={collapsed}
          onCollapse={handleCollapse}
          className={isMobile ? 'mobile-sidebar' : ''}
          isMobile={isMobile}
        />

        {/* 메인 레이아웃 */}
        <Layout
          className="main-layout"
          style={{
            marginLeft: isMobile ? 0 : (collapsed ? collapsedWidth : sidebarWidth),
            transition: 'margin-left 0.2s ease',
            minHeight: '100vh',
            width: '100%',
            position: 'relative',
          }}
        >
          {/* 헤더 */}
          <Header
            collapsed={collapsed}
            onCollapse={handleCollapse}
            sidebarWidth={sidebarWidth}
            showMobileMenuButton={isMobile}
            onMobileMenuToggle={() => setCollapsed(!collapsed)}
          />

          {/* 메인 콘텐츠 */}
          <Content
            className="main-content"
            style={{
              marginTop: '72px', // 헤더 높이
              padding: '24px',
              paddingBottom: '24px',
              minHeight: 'calc(100vh - 72px)',
              background: 'var(--background-secondary)',
              position: 'relative',
              zIndex: 1, // Lower z-index than sidebar
            }}
            onClick={handleContentClick}
          >
            {/* 콘텐츠 래퍼 */}
            <div
              className="content-wrapper"
              style={{
                background: 'var(--background-primary)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-color)',
                minHeight: 'calc(100vh - 144px)', // 헤더 + 패딩 고려
                padding: '24px',
                position: 'relative',
                zIndex: 1, // Ensure proper stacking context
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
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
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

          /* 반응형 스타일 */
          @media (max-width: 1200px) {
            .main-content {
              padding: 20px;
            }
            
            .content-wrapper {
              padding: 20px;
              min-height: calc(100vh - 132px);
            }
          }

          @media (max-width: 768px) {
            .main-content {
              padding: 16px;
            }

            .content-wrapper {
              padding: 16px;
              min-height: calc(100vh - 120px);
              border-radius: 12px;
            }
          }

          @media (max-width: 480px) {
            .main-content {
              padding: 12px;
            }

            .content-wrapper {
              padding: 12px;
              min-height: calc(100vh - 108px);
              border-radius: 8px;
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