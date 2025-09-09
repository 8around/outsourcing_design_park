import { Database } from './database.types'

// 로그 카테고리 타입
export type LogCategory = 
  | '사양변경' 
  | '도면설계' 
  | '구매발주' 
  | '생산제작' 
  | '상하차' 
  | '현장설치시공' 
  | '설치인증' 
  | '승인요청' 
  | '승인처리'

// 로그 타입
export type LogType = 'manual' | 'approval_request' | 'approval_response'

// 승인 상태 타입
export type ApprovalStatus = 'approved' | 'rejected'

// 히스토리 로그 데이터베이스 타입
export type HistoryLog = Database['public']['Tables']['history_logs']['Row']
export type HistoryLogInsert = Database['public']['Tables']['history_logs']['Insert']
export type HistoryLogUpdate = Database['public']['Tables']['history_logs']['Update']

// 로그 생성 요청 타입
export interface CreateLogRequest {
  project_id: string
  category: LogCategory
  content: string
  author_id: string
  author_name: string
  target_user_id?: string | null
  target_user_name?: string | null
  log_type: LogType
  approval_status?: ApprovalStatus | null
  attachment_urls?: string[] | null
}

// 승인 요청 로그 생성 타입
export interface CreateApprovalRequestLog {
  project_id: string
  requester_id: string
  requester_name: string
  approver_id: string
  approver_name: string
  memo: string
}

// 승인 응답 로그 생성 타입
export interface CreateApprovalResponseLog {
  project_id: string
  approver_id: string
  approver_name: string
  requester_id: string
  requester_name: string
  response_memo: string
  approval_status: ApprovalStatus
}

// 로그 필터 타입
export interface LogFilter {
  project_id?: string
  author_id?: string
  target_user_id?: string
  category?: LogCategory
  log_type?: LogType
  approval_status?: ApprovalStatus
  start_date?: string
  end_date?: string
}

// 로그 목록 응답 타입
export interface LogListResponse {
  logs: HistoryLog[]
  total: number
  page: number
  page_size: number
}