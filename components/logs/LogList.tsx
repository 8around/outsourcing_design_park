'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logService } from '@/lib/services/logs.service'
import { useAuth } from '@/lib/hooks/useAuth'
import { CalendarIcon, PaperClipIcon, UserIcon, CheckCircleIcon, XCircleIcon, TrashIcon, ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

interface HistoryLog {
  id: string
  project_id: string
  category: string
  content: string
  author_id: string
  author_name: string
  target_user_id?: string | null
  target_user_name?: string | null
  log_type: string
  approval_status?: string | null
  created_at: string | null
  is_deleted: boolean | null
  attachments?: Array<{
    id: string
    file_name: string
    file_path: string
    file_size: number
    mime_type: string | null
    created_at?: string | null
    history_log_id?: string
    uploaded_by?: string
  }>
}

interface LogListProps {
  projectId: string
  refreshTrigger?: number
  onRefresh?: () => void
}

export default function LogList({ projectId, refreshTrigger = 0, onRefresh }: LogListProps) {
  const { user, userData } = useAuth()
  const [logs, setLogs] = useState<HistoryLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 5 // 한 페이지에 5개씩 표시

  useEffect(() => {
    fetchLogs()
  }, [projectId, refreshTrigger, currentPage])

  // refreshTrigger가 변경되면 페이지를 1로 리셋 (새 로그 추가 시)
  useEffect(() => {
    if (refreshTrigger > 0) {
      setCurrentPage(1)
    }
  }, [refreshTrigger])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const result = await logService.getProjectLogs(projectId, currentPage, pageSize)
      setLogs(result.logs)
      setTotalCount(result.total)
    } catch (error) {
      console.error('로그 조회 실패:', error)
      toast.error('로그를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 페이지 정보 계산
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalCount)

  const toggleExpand = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleDelete = async (logId: string) => {
    if (!user) return

    // 삭제 확인 다이얼로그
    if (!window.confirm('정말로 이 로그를 삭제하시겠습니까?')) {
      return
    }

    try {
      setDeletingLogId(logId)
      await logService.deleteLog(logId, user.id)
      toast.success('로그가 삭제되었습니다.')
      
      // 로그 목록 새로고침
      await fetchLogs()
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('로그 삭제 실패:', error)
      toast.error('로그 삭제에 실패했습니다.')
    } finally {
      setDeletingLogId(null)
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '사양변경': 'bg-purple-100 text-purple-800',
      '도면설계': 'bg-blue-100 text-blue-800',
      '구매발주': 'bg-green-100 text-green-800',
      '생산제작': 'bg-yellow-100 text-yellow-800',
      '상하차': 'bg-orange-100 text-orange-800',
      '현장설치시공': 'bg-red-100 text-red-800',
      '설치인증': 'bg-indigo-100 text-indigo-800',
      '승인요청': 'bg-pink-100 text-pink-800',
      '승인처리': 'bg-teal-100 text-teal-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (logs.length === 0 && totalCount === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">히스토리 로그</h2>
        <div className="text-center py-8 text-gray-500">
          아직 로그가 없습니다.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">히스토리 로그</h2>
        <span className="text-sm text-gray-500">
          총 {totalCount}개의 로그 ({startIndex}-{endIndex} 표시)
        </span>
      </div>

      <div className="space-y-4">
        {logs.map((log) => {
          const isExpanded = expandedLogs.has(log.id)
          const isApprovalLog = log.log_type === 'approval_request' || log.log_type === 'approval_response'
          
          return (
            <div
              key={log.id}
              className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleExpand(log.id)}
              >
                {/* 로그 헤더 */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(log.category)}`}>
                      {log.category}
                    </span>
                    {isApprovalLog && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        {log.log_type === 'approval_request' ? '승인 요청' : '승인 응답'}
                      </span>
                    )}
                    {log.approval_status && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        log.approval_status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.approval_status === 'approved' ? '승인' : '반려'}
                      </span>
                    )}
                    {log.attachments && log.attachments.length > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                        <PaperClipIcon className="h-3 w-3" />
                        {log.attachments.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-xs text-gray-500">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {formatDate(log.created_at)}
                    </div>
                    {/* 관리자인 경우 삭제 버튼 표시 */}
                    {userData?.role === 'admin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(log.id)
                        }}
                        disabled={deletingLogId === log.id}
                        className="p-1 rounded hover:bg-red-100 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="로그 삭제"
                      >
                        <TrashIcon className={`h-4 w-4 ${deletingLogId === log.id ? 'animate-pulse' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 작성자 정보 */}
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    <span className="font-medium">{log.author_name}</span>
                  </div>
                  {log.target_user_name && (
                    <>
                      <span>→</span>
                      <div className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        <span className="font-medium">{log.target_user_name}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* 로그 내용 미리보기 */}
                <p className={`text-sm text-gray-700 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                  {log.content}
                </p>
              </div>

              {/* 확장된 내용 */}
              {isExpanded && (
                <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                  {/* 첨부파일 목록 */}
                  {log.attachments && log.attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">첨부파일:</p>
                      <div className="space-y-1">
                        {log.attachments.map((attachment) => {
                          // Supabase storage public URL 생성
                          const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/log-attachments/${attachment.file_path}`
                          
                          // 파일 다운로드 핸들러
                          const handleDownload = async (e: React.MouseEvent) => {
                            e.preventDefault()
                            e.stopPropagation()
                            
                            try {
                              // 먼저 public URL로 시도
                              const response = await fetch(publicUrl)
                              
                              if (!response.ok) {
                                // Public URL이 실패하면 signed URL 생성
                                const signedUrl = await logService.getAttachmentDownloadUrl(attachment.file_path)
                                if (signedUrl) {
                                  window.open(signedUrl, '_blank')
                                } else {
                                  throw new Error('파일 다운로드 URL 생성 실패')
                                }
                              } else {
                                // Public URL이 성공하면 직접 다운로드
                                const blob = await response.blob()
                                const url = window.URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = attachment.file_name
                                document.body.appendChild(a)
                                a.click()
                                window.URL.revokeObjectURL(url)
                                document.body.removeChild(a)
                              }
                            } catch (error) {
                              console.error('파일 다운로드 실패:', error)
                              toast.error('파일 다운로드에 실패했습니다.')
                            }
                          }
                          
                          return (
                            <div
                              key={attachment.id}
                              className="flex items-center gap-2 p-2 bg-white rounded hover:bg-gray-100 transition-colors group"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <PaperClipIcon className="h-4 w-4 text-gray-500" />
                              <a
                                href={publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline flex-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {attachment.file_name}
                              </a>
                              <span className="text-xs text-gray-500">
                                {formatFileSize(attachment.file_size)}
                              </span>
                              <button
                                onClick={handleDownload}
                                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all"
                                title="다운로드"
                              >
                                <ArrowDownTrayIcon className="h-4 w-4 text-gray-600" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 로그 타입별 추가 정보 */}
                  {isApprovalLog && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        {log.log_type === 'approval_request' 
                          ? '이 로그는 승인 요청으로 생성되었습니다.'
                          : '이 로그는 승인 응답으로 생성되었습니다.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 페이지네이션 컨트롤 */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              이전
            </button>
            
            {/* 페이지 번호 표시 */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  // 현재 페이지 주변 2개씩만 표시
                  if (totalPages <= 5) return true
                  if (page === 1 || page === totalPages) return true
                  if (Math.abs(page - currentPage) <= 1) return true
                  return false
                })
                .map((page, index, array) => (
                  <div key={page} className="flex items-center">
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                ))}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              다음
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="text-sm text-gray-600">
            페이지 {currentPage} / {totalPages}
          </div>
        </div>
      )}
    </div>
  )
}