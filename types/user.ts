export interface User {
  id: string
  email: string
  name?: string
  role?: 'admin' | 'user'
  is_approved?: boolean
  created_at?: string
  updated_at?: string
}

export interface AuthUser extends User {
  access_token?: string
  refresh_token?: string
}