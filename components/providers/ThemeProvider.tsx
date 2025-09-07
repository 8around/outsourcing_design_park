'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { ConfigProvider, theme } from 'antd'
import ko_KR from 'antd/locale/ko_KR'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // 시스템 다크모드 감지
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      if (theme === 'system') {
        const isDark = mediaQuery.matches
        setResolvedTheme(isDark ? 'dark' : 'light')
        updateDOM(isDark ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    handleChange() // 초기 실행

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // 로컬 스토리지에서 테마 불러오기
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(storageKey) as Theme
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeState(savedTheme)
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error)
    }
  }, [storageKey])

  // DOM 업데이트
  const updateDOM = (resolvedTheme: 'light' | 'dark') => {
    const root = window.document.documentElement
    
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    
    // CSS 변수 업데이트 (옵션)
    const isDark = resolvedTheme === 'dark'
    root.style.setProperty('--background-primary', isDark ? '#1a1a1a' : '#ffffff')
    root.style.setProperty('--background-secondary', isDark ? '#2a2a2a' : '#f9fafb')
    root.style.setProperty('--background-tertiary', isDark ? '#3a3a3a' : '#f3f4f6')
    root.style.setProperty('--text-primary', isDark ? '#ffffff' : '#111827')
    root.style.setProperty('--text-secondary', isDark ? '#d1d5db' : '#374151')
    root.style.setProperty('--text-muted', isDark ? '#9ca3af' : '#6b7280')
    root.style.setProperty('--border-color', isDark ? '#374151' : '#e5e7eb')
    root.style.setProperty('--border-light', isDark ? '#4b5563' : '#f3f4f6')
  }

  // 테마 설정
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    
    try {
      localStorage.setItem(storageKey, newTheme)
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error)
    }

    let resolved: 'light' | 'dark'
    
    if (newTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      resolved = isDark ? 'dark' : 'light'
    } else {
      resolved = newTheme
    }
    
    setResolvedTheme(resolved)
    updateDOM(resolved)
  }

  // 테마 토글
  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  // Ant Design 테마 설정
  const antTheme = {
    algorithm: resolvedTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      // 기본 색상
      colorPrimary: '#2563eb',
      colorSuccess: '#16a34a',
      colorWarning: '#d97706',
      colorError: '#dc2626',
      colorInfo: '#2563eb',
      
      // 배경 색상
      colorBgContainer: resolvedTheme === 'dark' ? '#1a1a1a' : '#ffffff',
      colorBgElevated: resolvedTheme === 'dark' ? '#2a2a2a' : '#ffffff',
      colorBgLayout: resolvedTheme === 'dark' ? '#0f0f0f' : '#f9fafb',
      
      // 테두리
      colorBorder: resolvedTheme === 'dark' ? '#374151' : '#e5e7eb',
      colorBorderSecondary: resolvedTheme === 'dark' ? '#4b5563' : '#f3f4f6',
      
      // 텍스트
      colorText: resolvedTheme === 'dark' ? '#ffffff' : '#111827',
      colorTextSecondary: resolvedTheme === 'dark' ? '#d1d5db' : '#374151',
      colorTextTertiary: resolvedTheme === 'dark' ? '#9ca3af' : '#6b7280',
      
      // 기타
      borderRadius: 8,
      wireframe: false,
    },
    components: {
      Layout: {
        bodyBg: resolvedTheme === 'dark' ? '#0f0f0f' : '#f9fafb',
        headerBg: resolvedTheme === 'dark' ? '#1a1a1a' : '#ffffff',
        siderBg: resolvedTheme === 'dark' ? '#1a1a1a' : '#ffffff',
      },
      Menu: {
        darkItemBg: resolvedTheme === 'dark' ? '#1a1a1a' : '#ffffff',
        darkItemSelectedBg: resolvedTheme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.1)',
        darkItemHoverBg: resolvedTheme === 'dark' ? '#2a2a2a' : '#f9fafb',
      },
      Card: {
        colorBgContainer: resolvedTheme === 'dark' ? '#1a1a1a' : '#ffffff',
      },
      Button: {
        colorBgContainer: resolvedTheme === 'dark' ? '#2a2a2a' : '#ffffff',
      },
    },
  }

  const value = {
    theme,
    setTheme,
    resolvedTheme,
    toggleTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider 
        locale={ko_KR}
        theme={antTheme}
      >
        <div 
          className={`theme-wrapper ${resolvedTheme}`}
          style={{
            backgroundColor: resolvedTheme === 'dark' ? '#0f0f0f' : '#f9fafb',
            transition: 'background-color 0.3s ease, color 0.3s ease',
          }}
        >
          {children}
        </div>
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}