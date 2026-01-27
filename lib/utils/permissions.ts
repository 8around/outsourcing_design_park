/**
 * 사용자 역할 기반 권한 관리 유틸리티
 */

// types/user.ts에서 UserRole import
import type { UserRole } from "@/types/user";
import { ENUM_USER_ROLE } from "@/types/user";

/**
 * admin 역할 체크
 */
export const isAdmin = (role: UserRole | string | undefined): boolean =>
  role === ENUM_USER_ROLE.ADMIN;

/**
 * admin 또는 manager 역할 체크
 */
export const isManager = (role: UserRole | string | undefined): boolean =>
  role === ENUM_USER_ROLE.ADMIN || role === ENUM_USER_ROLE.MANAGER;

/**
 * role 표시 라벨 (admin/manager 모두 '관리자'로 통일)
 */
export const getRoleLabel = (role: UserRole | string | undefined): string => {
  switch (role) {
    case ENUM_USER_ROLE.ADMIN:
    case ENUM_USER_ROLE.MANAGER:
      return "관리자";
    default:
      return "사용자";
  }
};

/**
 * role 색상 (Ant Design Tag color)
 * admin: red, manager: blue, user: default
 */
export const getRoleColor = (role: UserRole | string | undefined): string => {
  switch (role) {
    case ENUM_USER_ROLE.ADMIN:
      return "red";
    case ENUM_USER_ROLE.MANAGER:
      return "blue";
    default:
      return "default";
  }
};
