import { createClient } from '@/lib/supabase/client'
import type { 
  CreateLogRequest, 
  CreateApprovalRequestLog, 
  CreateApprovalResponseLog,
  HistoryLog,
  LogFilter,
  LogListResponse 
} from '@/types/log'

class LogService {
  /**
   * 직접 로그 생성 (수동 입력)
   */
  async createManualLog(data: Omit<CreateLogRequest, 'log_type'>) {
    const supabase = createClient()
    
    const { data: log, error } = await supabase
      .from('history_logs')
      .insert({
        project_id: data.project_id,
        category: data.category,
        content: data.content,
        author_id: data.author_id,
        author_name: data.author_name,
        log_type: 'manual',
        attachment_urls: data.attachment_urls || null
      })
      .select()
      .single()

    if (error) {
      console.error('로그 생성 실패:', error)
      throw new Error('로그 생성에 실패했습니다.')
    }

    return log
  }

  /**
   * 승인 요청 로그 생성
   */
  async createApprovalRequestLog(data: CreateApprovalRequestLog) {
    const supabase = createClient()
    
    const { data: log, error } = await supabase
      .from('history_logs')
      .insert({
        project_id: data.project_id,
        category: '승인요청',
        content: data.memo,
        author_id: data.requester_id,
        author_name: data.requester_name,
        target_user_id: data.approver_id,
        target_user_name: data.approver_name,
        log_type: 'approval_request'
      })
      .select()
      .single()

    if (error) {
      console.error('승인 요청 로그 생성 실패:', error)
      throw new Error('승인 요청 로그 생성에 실패했습니다.')
    }

    return log
  }

  /**
   * 승인 응답 로그 생성
   */
  async createApprovalResponseLog(data: CreateApprovalResponseLog) {
    const supabase = createClient()
    
    const { data: log, error } = await supabase
      .from('history_logs')
      .insert({
        project_id: data.project_id,
        category: '승인처리',
        content: data.response_memo,
        author_id: data.approver_id,
        author_name: data.approver_name,
        target_user_id: data.requester_id,
        target_user_name: data.requester_name,
        log_type: 'approval_response',
        approval_status: data.approval_status
      })
      .select()
      .single()

    if (error) {
      console.error('승인 응답 로그 생성 실패:', error)
      throw new Error('승인 응답 로그 생성에 실패했습니다.')
    }

    return log
  }

  /**
   * 프로젝트별 로그 목록 조회
   */
  async getProjectLogs(projectId: string, page = 1, pageSize = 20): Promise<LogListResponse> {
    const supabase = createClient()
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    // 전체 개수 조회
    const { count } = await supabase
      .from('history_logs')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('is_deleted', false)

    // 데이터 조회
    const { data: logs, error } = await supabase
      .from('history_logs')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(start, end)

    if (error) {
      console.error('로그 목록 조회 실패:', error)
      throw new Error('로그 목록 조회에 실패했습니다.')
    }

    return {
      logs: logs || [],
      total: count || 0,
      page,
      page_size: pageSize
    }
  }

  /**
   * 글로벌 로그 피드 조회 (모든 프로젝트)
   */
  async getGlobalLogFeed(page = 1, pageSize = 20): Promise<LogListResponse> {
    const supabase = createClient()
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    // 전체 개수 조회
    const { count } = await supabase
      .from('history_logs')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false)

    // 데이터 조회
    const { data: logs, error } = await supabase
      .from('history_logs')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(start, end)

    if (error) {
      console.error('글로벌 로그 피드 조회 실패:', error)
      throw new Error('글로벌 로그 피드 조회에 실패했습니다.')
    }

    return {
      logs: logs || [],
      total: count || 0,
      page,
      page_size: pageSize
    }
  }

  /**
   * 사용자별 활동 로그 조회
   */
  async getUserActivityLogs(userId: string, page = 1, pageSize = 20): Promise<LogListResponse> {
    const supabase = createClient()
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    // 전체 개수 조회
    const { count } = await supabase
      .from('history_logs')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId)
      .eq('is_deleted', false)

    // 데이터 조회
    const { data: logs, error } = await supabase
      .from('history_logs')
      .select('*')
      .eq('author_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(start, end)

    if (error) {
      console.error('사용자 활동 로그 조회 실패:', error)
      throw new Error('사용자 활동 로그 조회에 실패했습니다.')
    }

    return {
      logs: logs || [],
      total: count || 0,
      page,
      page_size: pageSize
    }
  }

  /**
   * 로그 필터링 조회
   */
  async getFilteredLogs(filter: LogFilter, page = 1, pageSize = 20): Promise<LogListResponse> {
    const supabase = createClient()
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    let query = supabase
      .from('history_logs')
      .select('*', { count: 'exact' })
      .eq('is_deleted', false)

    // 필터 적용
    if (filter.project_id) query = query.eq('project_id', filter.project_id)
    if (filter.author_id) query = query.eq('author_id', filter.author_id)
    if (filter.target_user_id) query = query.eq('target_user_id', filter.target_user_id)
    if (filter.category) query = query.eq('category', filter.category)
    if (filter.log_type) query = query.eq('log_type', filter.log_type)
    if (filter.approval_status) query = query.eq('approval_status', filter.approval_status)
    if (filter.start_date) query = query.gte('created_at', filter.start_date)
    if (filter.end_date) query = query.lte('created_at', filter.end_date)

    // 전체 개수 조회
    const { count } = await query

    // 데이터 조회
    const { data: logs, error } = await query
      .order('created_at', { ascending: false })
      .range(start, end)

    if (error) {
      console.error('필터링된 로그 조회 실패:', error)
      throw new Error('필터링된 로그 조회에 실패했습니다.')
    }

    return {
      logs: logs || [],
      total: count || 0,
      page,
      page_size: pageSize
    }
  }

  /**
   * 로그 삭제 (소프트 삭제)
   */
  async deleteLog(logId: string, userId: string) {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('history_logs')
      .update({
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date().toISOString()
      })
      .eq('id', logId)
      .select()
      .single()

    if (error) {
      console.error('로그 삭제 실패:', error)
      throw new Error('로그 삭제에 실패했습니다.')
    }

    return data
  }

  /**
   * 로그 수정 (내용만 수정 가능)
   */
  async updateLog(logId: string, content: string) {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('history_logs')
      .update({ content })
      .eq('id', logId)
      .select()
      .single()

    if (error) {
      console.error('로그 수정 실패:', error)
      throw new Error('로그 수정에 실패했습니다.')
    }

    return data
  }
}

export const logService = new LogService()