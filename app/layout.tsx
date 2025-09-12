import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ConfigProvider } from 'antd'
import ko_KR from 'antd/locale/ko_KR'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { Toaster } from 'react-hot-toast'
import NavigationProgress, { NavigationProgressStyles } from '@/components/common/NavigationProgress'
import '../styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '프로젝트 현장 관리 솔루션',
  description: '제조업체 프로젝트 현장 관리를 위한 웹 기반 솔루션',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <ConfigProvider locale={ko_KR}>
          <AuthProvider>
            <NavigationProgressStyles />
            <NavigationProgress />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  style: {
                    background: '#10b981',
                  },
                },
                error: {
                  style: {
                    background: '#ef4444',
                  },
                },
              }}
            />
            {children}
          </AuthProvider>
        </ConfigProvider>
      </body>
    </html>
  )
}