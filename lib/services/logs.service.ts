import { createClient } from '@/lib/supabase/client'
import type { 
  CreateLogRequest, 
  CreateApprovalRequestLog, 
  CreateApprovalResponseLog,
  HistoryLog,
  HistoryLogWithAttachments,
  AttachmentFile,
  LogFilter,
  LogListResponse 
} from '@/types/log'

class LogService {
  /**
   * 직접 로그 생성 (수동 입력) - 첨부파일 포함
   */
  async createManualLog(data: Omit<CreateLogRequest, 'log_type'>): Promise<HistoryLogWithAttachments> {
    const supabase = createClient()
    
    console.log('createManualLog 호출:', {
      hasAttachments: !!(data.attachments && data.attachments.length > 0),
      attachmentCount: data.attachments?.length || 0,
      attachments: data.attachments?.map(a => ({
        fileName: a.file_name,
        fileSize: a.file_size,
        mimeType: a.mime_type,
        hasFile: !!a.file,
        fileType: a.file?.constructor?.name
      }))
    })
    
    // 로그 생성
    const { data: log, error: logError } = await supabase
      .from('history_logs')
      .insert({
        project_id: data.project_id,
        category: data.category,
        content: data.content,
        author_id: data.author_id,
        author_name: data.author_name,
        log_type: 'manual'
      })
      .select()
      .single()

    if (logError) {
      console.error('로그 생성 실패:', logError)
      throw new Error('로그 생성에 실패했습니다.')
    }

    console.log('로그 생성 성공:', log.id)

    // 첨부파일이 있으면 업로드
    let attachments = []
    if (data.attachments && data.attachments.length > 0) {
      console.log('첨부파일 업로드 시작...')
      try {
        attachments = await this.uploadAttachments(log.id, data.attachments, data.author_id)
        console.log('첨부파일 업로드 완료:', attachments.length)
      } catch (error) {
        console.error('첨부파일 업로드 중 오류:', error)
        // 첨부파일 업로드 실패해도 로그는 생성되도록 처리
      }
    }

    return { ...log, attachments }
  }

  /**
   * 승인 요청 로그 생성
   * 먼저 history_logs를 생성하고, 그 ID를 approval_requests에 저장합니다.
   * 사용자가 선택한 카테고리가 적용됩니다.
   */
  async createApprovalRequestLog(data: CreateApprovalRequestLog & { attachments?: AttachmentFile[] }) {
    const supabase = createClient()
    
    // 1. 먼저 history_logs에 로그 생성 (사용자가 선택한 카테고리 사용)
    const { data: historyLog, error: logError } = await supabase
      .from('history_logs')
      .insert({
        project_id: data.project_id,
        category: data.category || '승인요청',
        content: data.memo,
        author_id: data.requester_id,
        author_name: data.requester_name,
        target_user_id: data.approver_id,
        target_user_name: data.approver_name,
        log_type: 'approval_request'
      })
      .select()
      .single()

    if (logError) {
      console.error('승인 요청 로그 생성 실패:', logError)
      throw new Error('승인 요청 로그 생성에 실패했습니다.')
    }

    // 2. approval_requests 테이블에 승인 요청 생성
    const { data: approvalRequest, error: approvalError } = await supabase
      .from('approval_requests')
      .insert({
        project_id: data.project_id,
        requester_id: data.requester_id,
        requester_name: data.requester_name,
        approver_id: data.approver_id,
        approver_name: data.approver_name,
        memo: data.memo,
        status: 'pending'
      })
      .select()
      .single()

    if (approvalError) {
      console.error('승인 요청 생성 실패:', approvalError)
      // 실패 시 생성된 로그도 삭제
      await supabase
        .from('history_logs')
        .delete()
        .eq('id', historyLog.id)
      throw new Error('승인 요청 생성에 실패했습니다.')
    }

    // 3. 첨부파일 업로드
    if (data.attachments && data.attachments.length > 0) {
      await this.uploadAttachments(historyLog.id, data.attachments, data.requester_id)
    }

    return approvalRequest
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
   * 프로젝트별 로그 목록 조회 (첨부파일 포함)
   */
  async getProjectLogs(projectId: string, page = 1, pageSize = 20): Promise<{ logs: HistoryLogWithAttachments[], total: number, page: number, page_size: number }> {
    const supabase = createClient()
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    // 전체 개수 조회
    const { count } = await supabase
      .from('history_logs')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('is_deleted', false)

    // 데이터 조회 (첨부파일 포함)
    const { data: logs, error } = await supabase
      .from('history_logs')
      .select(`
        *,
        attachments:history_log_attachments(*)
      `)
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
  async getGlobalLogFeed(page = 1, pageSize = 20, userId?: string): Promise<{ logs: HistoryLogWithAttachments[], total: number, page: number, page_size: number }> {
    const supabase = createClient()
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    // 기본 쿼리 생성
    let countQuery = supabase
      .from('history_logs')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false)
    
    let dataQuery = supabase
      .from('history_logs')
      .select(`
        *,
        attachments:history_log_attachments(*)
      `)
      .eq('is_deleted', false)

    // 사용자 필터링 적용
    if (userId) {
      // 사용자가 보낸 로그 또는 받은 로그
      countQuery = countQuery.or(`author_id.eq.${userId},target_user_id.eq.${userId}`)
      dataQuery = dataQuery.or(`author_id.eq.${userId},target_user_id.eq.${userId}`)
    }

    // 전체 개수 조회
    const { count } = await countQuery

    // 데이터 조회 (첨부파일 포함)
    const { data: logs, error } = await dataQuery
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
   * 로그 삭제 (완전 삭제)
   * 연관된 승인 요청이 있으면 함께 삭제
   */
  async deleteLog(logId: string, userId: string) {
    const supabase = createClient()
    
    console.log('Deleting log:', logId, 'by user:', userId);
    
    // 1. 먼저 이 로그와 연결된 승인 요청이 있는지 확인
    // history_log_id 컬럼이 제거되었으므로 다른 방식으로 확인
    const { data: logData } = await supabase
      .from('history_logs')
      .select('project_id, author_id, target_user_id, log_type')
      .eq('id', logId)
      .single()
    
    // 승인 요청 로그인 경우, 관련 approval_requests 찾기
    if (logData && logData.log_type === 'approval_request') {
      const { data: approvalRequests } = await supabase
        .from('approval_requests')
        .select('id')
        .eq('project_id', logData.project_id)
        .eq('requester_id', logData.author_id)
        .eq('approver_id', logData.target_user_id)
        .eq('status', 'pending')
      
      console.log('Related approval requests:', approvalRequests);
      
      // 연결된 승인 요청이 있으면 먼저 삭제
      if (approvalRequests && approvalRequests.length > 0) {
        for (const request of approvalRequests) {
          console.log('Deleting approval request:', request.id);
          const { error: approvalDeleteError } = await supabase
            .from('approval_requests')
            .delete()
            .eq('id', request.id)
            
          if (approvalDeleteError) {
            console.error('Error deleting approval request:', approvalDeleteError);
            // 승인 요청 삭제 실패해도 계속 진행 (로그는 삭제할 수 있도록)
          }
        }
      }
    }
    
    // 3. 로그의 첨부파일 정보 조회
    const { data: attachments } = await supabase
      .from('log_attachments')
      .select('file_path')
      .eq('log_id', logId)
    
    // 4. 첨부파일이 있으면 스토리지에서도 삭제
    if (attachments && attachments.length > 0) {
      console.log('Deleting attachments:', attachments);
      const filePaths = attachments.map(a => a.file_path)
      
      const { error: storageError } = await supabase.storage
        .from('log-attachments')
        .remove(filePaths)
        
      if (storageError) {
        console.error('Error deleting files from storage:', storageError);
      }
      
      // 첨부파일 레코드 삭제
      const { error: attachmentDeleteError } = await supabase
        .from('log_attachments')
        .delete()
        .eq('log_id', logId)
        
      if (attachmentDeleteError) {
        console.error('Error deleting attachment records:', attachmentDeleteError);
      }
    }
    
    // 5. 로그 완전 삭제 (소프트 삭제 대신 완전 삭제)
    const { error } = await supabase
      .from('history_logs')
      .delete()
      .eq('id', logId)

    if (error) {
      console.error('로그 삭제 실패:', error)
      throw new Error('로그 삭제에 실패했습니다.')
    }

    console.log('Log deleted successfully');
    return { id: logId }
  }

  /**
   * 로그 수정 (내용만 수정 가능)
   */
  updateLog = async (logId: string, content: string) => {
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

  /**
   * 첨부파일 업로드
   */
  private async uploadAttachments(
    logId: string, 
    attachments: AttachmentFile[], 
    userId: string
  ) {
    const supabase = createClient()
    const uploadedAttachments = []

    console.log('uploadAttachments 시작:', {
      logId,
      attachmentCount: attachments.length,
      userId
    })

    for (const attachment of attachments) {
      try {
        // File 객체 확인
        if (!attachment.file) {
          console.error('File 객체가 없습니다:', attachment)
          continue
        }

        // 파일명 안전하게 처리 (특수문자 제거, 공백을 _로 변경)
        const safeFileName = attachment.file_name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const uniqueFileName = `${logId}/${Date.now()}_${safeFileName}`
        
        console.log('파일 업로드 시작:', {
          originalName: attachment.file_name,
          safeFileName: uniqueFileName,
          fileSize: attachment.file_size,
          mimeType: attachment.mime_type,
          fileType: attachment.file.constructor.name,
          fileInstance: attachment.file instanceof File,
          fileProperties: {
            name: attachment.file.name,
            size: attachment.file.size,
            type: attachment.file.type
          }
        })

        // File 객체를 Blob으로 변환 (브라우저 호환성 향상)
        const fileBlob = new Blob([attachment.file], { type: attachment.mime_type })

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('log-attachments')
          .upload(uniqueFileName, fileBlob, {
            contentType: attachment.mime_type || 'application/octet-stream',
            upsert: false,
            cacheControl: '3600'
          })

        if (uploadError) {
          console.error('파일 업로드 실패:', uploadError)
          // 더 자세한 에러 정보 로깅
          if (uploadError.message) {
            console.error('에러 메시지:', uploadError.message)
          }
          if ((uploadError as any).statusCode) {
            console.error('상태 코드:', (uploadError as any).statusCode)
          }
          throw uploadError
        }

        console.log('파일 업로드 성공:', uploadData)

        // DB에 첨부파일 정보 저장
        const { data: attachmentRecord, error: dbError } = await supabase
          .from('history_log_attachments')
          .insert({
            history_log_id: logId,
            file_path: uniqueFileName,
            file_name: attachment.file_name, // 원본 파일명 유지
            file_size: attachment.file_size,
            mime_type: attachment.mime_type || 'application/octet-stream',
            uploaded_by: userId
          })
          .select()
          .single()

        if (dbError) {
          console.error('DB 저장 실패:', dbError)
          // 업로드된 파일 삭제
          await supabase.storage
            .from('log-attachments')
            .remove([uniqueFileName])
          throw dbError
        }

        // 저장 성공한 레코드 추가
        if (attachmentRecord) {
          uploadedAttachments.push(attachmentRecord)
        }
      } catch (error) {
        console.error('첨부파일 처리 중 오류:', error)
        // 개별 파일 업로드 실패를 사용자에게 알리기 위해 에러 정보 추가
        console.error('실패한 파일:', attachment.file_name)
        // 에러가 발생해도 다음 파일 처리 계속
      }
    }

    console.log('첨부파일 업로드 완료:', {
      총_파일수: attachments.length,
      성공한_파일수: uploadedAttachments.length,
      실패한_파일수: attachments.length - uploadedAttachments.length
    })

    return uploadedAttachments
  }

  /**
   * 첨부파일 삭제
   */
  async deleteAttachment(attachmentId: string) {
    const supabase = createClient()

    // 첨부파일 정보 조회
    const { data: attachment, error: fetchError } = await supabase
      .from('history_log_attachments')
      .select('file_path')
      .eq('id', attachmentId)
      .single()

    if (fetchError || !attachment) {
      throw new Error('첨부파일 정보를 찾을 수 없습니다.')
    }

    // Storage에서 파일 삭제
    const { error: storageError } = await supabase.storage
      .from('log-attachments')
      .remove([attachment.file_path])

    if (storageError) {
      console.error('파일 삭제 실패:', storageError)
    }

    // DB에서 레코드 삭제
    const { error: dbError } = await supabase
      .from('history_log_attachments')
      .delete()
      .eq('id', attachmentId)

    if (dbError) {
      throw new Error('첨부파일 삭제에 실패했습니다.')
    }

    return true
  }

  /**
   * 첨부파일 다운로드 URL 생성
   */
  async getAttachmentUrl(filePath: string): Promise<string> {
    const supabase = createClient()
    
    // Public URL 생성
    const { data } = supabase.storage
      .from('log-attachments')
      .getPublicUrl(filePath)

    return data?.publicUrl || ''
  }

  /**
   * 첨부파일 다운로드 (Private URL)
   */
  async getAttachmentDownloadUrl(filePath: string): Promise<string | null> {
    const supabase = createClient()
    
    // 1시간 유효한 signed URL 생성
    const { data, error } = await supabase.storage
      .from('log-attachments')
      .createSignedUrl(filePath, 3600)

    if (error) {
      console.error('Signed URL 생성 실패:', error)
      return null
    }

    return data?.signedUrl || null
  }

  /**
   * 첨부파일 직접 다운로드
   */
  async downloadAttachment(filePath: string): Promise<Blob | null> {
    const supabase = createClient()
    
    const { data, error } = await supabase.storage
      .from('log-attachments')
      .download(filePath)

    if (error) {
      console.error('파일 다운로드 실패:', error)
      return null
    }

    return data
  }
}

export const logService = new LogService()