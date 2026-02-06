// UserRole 타입 정의
export type UserRole = 'admin' | 'manager' | 'user';

export enum ENUM_USER_ROLE {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user'
}

export interface User {
  id: string
  email: string
  name?: string
  role?: UserRole
  is_approved?: boolean
  created_at?: string
  updated_at?: string
}

export interface AuthUser extends User {
  access_token?: string
  refresh_token?: string
}