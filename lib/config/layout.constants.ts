/**
 * Layout Configuration Constants
 * 중앙화된 레이아웃 상수 정의
 *
 * CSS 변수와 동기화됨:
 * - --sidebar-width
 * - --sidebar-collapsed-width
 * - --header-height
 * - --min-rendering-width
 */

// 사이드바 폭 (px)
export const SIDEBAR_WIDTH = 200
export const SIDEBAR_COLLAPSED_WIDTH = 75

// Header 높이 (px)
export const HEADER_HEIGHT = 72

// 최소 렌더링 폭 (px) - 이 값 미만에서 모바일 모드 활성화
export const MIN_RENDERING_WIDTH = 992

/**
 * Z-Index 레이어 정의
 * Header보다 Modal/Drawer가 위에 표시되어야 함
 */
export const Z_INDEX = {
  OVERLAY: 1000,
  SIDEBAR: 1050,
  HEADER: 1100,
  MODAL: 1200,
  DRAWER: 1200,
  DROPDOWN: 1300,
  TOOLTIP: 1400,
} as const
