'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, List, Avatar, Typography, Tag, Space, Button, Empty, Skeleton, message, Pagination, Select } from 'antd'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PaperClipOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { logService } from '@/lib/services/logs.service'
import { projectService } from '@/lib/services/projects.service'
import { useAuth } from '@/lib/hooks/useAuth'
import UserSelectModal from '@/components/common/UserSelectModal'
import type { User } from '@/types/user'

const { Text, Title } = Typography

// 데이터베이스 카테고리 타입 (실제 데이터베이스 값)
type DBCategory = '사양변경' | '도면설계' | '구매발주' | '생산제작' | '상하차' | '현장설치시공' | '설치인증' | '설비' | '기타' | '승인요청' | '승인처리'

// 첨부파일 정보 인터페이스
interface AttachmentInfo {
  id: string
  file_path: string
  file_name: string
  file_size: number
  mime_type: string
}

// 로그 아이템 인터페이스
interface LogItem {
  id: string
  author_id: string
  author_name?: string
  target_user_id?: string
  target_user_name?: string
  category: DBCategory | string  // 실제 DB 카테고리 사용
  action?: string
  content: string
  attachments?: AttachmentInfo[]
  created_at: string
  project_id?: string
  project_name?: string
  log_type?: string
  approval_status?: string
}

// 카테고리별 색상 및 아이콘 매핑 (LogList와 동일한 색상 사용)
const categoryConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  '사양변경': { color: 'purple', icon: <EditOutlined />, label: '사양변경' },
  '도면설계': { color: 'blue', icon: <FileTextOutlined />, label: '도면설계' },
  '구매발주': { color: 'green', icon: <ClockCircleOutlined />, label: '구매발주' },
  '생산제작': { color: 'gold', icon: <ClockCircleOutlined />, label: '생산제작' },
  '상하차': { color: 'orange', icon: <ClockCircleOutlined />, label: '상하차' },
  '현장설치시공': { color: 'red', icon: <ClockCircleOutlined />, label: '현장설치시공' },
  '설치인증': { color: 'purple', icon: <CheckCircleOutlined />, label: '설치인증' },
  '설비': { color: 'volcano', icon: <ClockCircleOutlined />, label: '설비' },
  '기타': { color: 'default', icon: <EditOutlined />, label: '기타' },
  '승인요청': { color: 'magenta', icon: <CheckCircleOutlined />, label: '확인요청' },
  '승인처리': { color: 'cyan', icon: <CheckCircleOutlined />, label: '확인처리' },
}

interface GlobalLogFeedProps {
  limit?: number
  showRefresh?: boolean
  autoRefresh?: boolean
  refreshInterval?: number // 초 단위
}

export default function GlobalLogFeed({ 
  limit = 10, 
  showRefresh = true,
  autoRefresh = false,
  refreshInterval = 30
}: GlobalLogFeedProps) {
  const router = useRouter()
  const { user, userData } = useAuth()
  const [logs, setLogs] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null)
  const [filterUserId, setFilterUserId] = useState<string | null>(null)
  const [filterUser, setFilterUser] = useState<User | null>(null)
  const [showUserSelectModal, setShowUserSelectModal] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  // 로그 데이터 로드
  const loadLogs = async (page = currentPage, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      // 글로벌 로그 피드 조회 (사용자 필터링 + 카테고리 필터링 적용)
      const response = await logService.getGlobalLogFeed(
        page,
        limit,
        filterUserId || undefined,
        filterCategory || undefined
      )
      
      // 프로젝트 정보 조회를 위한 프로젝트 ID 수집
      const projectIds = [...new Set(response.logs.filter(log => log.project_id).map(log => log.project_id!))]
      
      // 프로젝트 정보 조회
      const projectInfo: Record<string, string> = {}
      for (const projectId of projectIds) {
        try {
          const project = await projectService.getProject(projectId)
          if (project) {
            projectInfo[projectId] = `${project.site_name} - ${project.product_name}`
          }
        } catch (error) {
          console.error(`프로젝트 정보 조회 실패 (${projectId}):`, error)
        }
      }

      // 로그 데이터 매핑
      const formattedLogs: LogItem[] = response.logs.map(log => ({
        id: log.id,
        author_id: log.author_id,
        author_name: log.author_name || '시스템',
        target_user_id: log.target_user_id || undefined,
        target_user_name: log.target_user_name || undefined,
        category: log.category || '기타',  // 실제 카테고리 그대로 사용
        content: log.content,
        created_at: log.created_at || new Date().toISOString(),
        project_id: log.project_id || undefined,
        project_name: log.project_id ? projectInfo[log.project_id] : undefined,
        log_type: log.log_type,
        approval_status: log.approval_status || undefined,
        attachments: log.attachments && log.attachments.length > 0 
          ? log.attachments.map((att: Record<string, unknown>) => ({
              id: att.id as string,
              file_path: att.file_path as string,
              file_name: att.file_name as string,
              file_size: att.file_size as number,
              mime_type: att.mime_type as string
            } as AttachmentInfo))
          : undefined,
      }))

      setLogs(formattedLogs)
      setTotalCount(response.total)
    } catch (error) {
      console.error('로그 로드 실패:', error)
      // 에러 발생 시 빈 배열로 설정
      setLogs([])
      setTotalCount(0)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 초기 로드 및 필터 변경 시 재로드
  useEffect(() => {
    setCurrentPage(1)
    loadLogs(1)
  }, [limit, filterUserId, filterCategory])

  // 자동 새로고침
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        loadLogs(currentPage, true)
      }, refreshInterval * 1000)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, currentPage])

  // 수동 새로고침
  const handleRefresh = () => {
    loadLogs(currentPage, true)
  }

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadLogs(page)
  }

  // 사용자 필터 선택 핸들러
  const handleUserSelect = (user: User) => {
    setFilterUser(user)
    setFilterUserId(user.id)
    setShowUserSelectModal(false)
    message.success(`${user.name}님의 로그를 필터링합니다.`)
  }

  // 필터 초기화
  const handleResetFilter = () => {
    setFilterUser(null)
    setFilterUserId(null)
    setFilterCategory(null)
    message.info('전체 로그를 표시합니다.')
  }

  // 로그 클릭 시 프로젝트 상세 페이지로 이동
  const handleLogClick = (log: LogItem) => {
    if (log.project_id) {
      router.push(`/projects/${log.project_id}`)
    }
  }

  // 파일 크기 포맷팅 함수
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // 로그 삭제 핸들러 (관리자만)
  const handleDeleteLog = async (logId: string, e: React.MouseEvent) => {
    e.stopPropagation() // 로그 클릭 이벤트 전파 방지
    
    if (!user || userData?.role !== 'admin') {
      message.error('관리자만 삭제할 수 있습니다.')
      return
    }

    setDeletingLogId(logId)
    try {
      await logService.deleteLog(logId, user.id)
      message.success('로그가 삭제되었습니다.')
      
      // 목록에서 제거
      setLogs(prev => prev.filter(log => log.id !== logId))
      setTotalCount(prev => prev - 1)
    } catch (error) {
      console.error('로그 삭제 실패:', error)
      message.error('로그 삭제에 실패했습니다.')
    } finally {
      setDeletingLogId(null)
    }
  }

  // 첨부파일 다운로드 (PendingApprovals와 동일한 방식)
  const handleDownloadAttachment = async (attachment: AttachmentInfo, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // 로그 클릭 이벤트 전파 방지
    
    try {
      // Supabase storage public URL 생성
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/log-attachments/${attachment.file_path}`
      
      const response = await fetch(publicUrl)
      
      if (!response.ok) {
        throw new Error('파일 다운로드 실패')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('파일 다운로드 실패:', error)
      message.error('파일 다운로드에 실패했습니다.')
    }
  }

  // 로그 아이템 렌더링
  const renderLogItem = (log: LogItem) => {
    const config = categoryConfig[log.category] || categoryConfig['기타']
    const isDeleting = deletingLogId === log.id
    const isAdmin = userData?.role === 'admin'
    
    // 로그 타입과 승인 상태에 따른 액션 텍스트 생성
    let actionText = ''
    if (log.log_type === 'approval_request') {
      actionText = '확인 요청'
    } else if (log.log_type === 'approval_response') {
      actionText = log.approval_status === 'approved' ? '확인 완료' : '보류/재조정필요';
    } else if (log.category === '승인요청') {
      actionText = '확인 요청'
    } else if (log.category === '승인처리') {
      actionText = '확인 처리'
    } else if (['도면설계', '구매발주', '생산제작', '상하차', '현장설치시공', '설치인증'].includes(log.category)) {
      actionText = '공정 진행'
    } else if (log.category === '사양변경') {
      actionText = '사양 변경'
    }
    
    // 관리자일 경우 삭제 버튼 포함
    const actions = isAdmin ? [
      <Button
        key="delete"
        danger
        size="small"
        icon={<DeleteOutlined />}
        onClick={(e) => handleDeleteLog(log.id, e)}
        loading={isDeleting}
        disabled={isDeleting}
      >
        삭제
      </Button>
    ] : undefined
    
    return (
      <List.Item 
        key={log.id}
        onClick={() => handleLogClick(log)}
        style={{ cursor: log.project_id ? 'pointer' : 'default' }}
        className="log-item-clickable"
        actions={actions}
      >
        <List.Item.Meta
          avatar={
            <Avatar 
              icon={config.icon} 
              style={{ backgroundColor: `var(--ant-color-${config.color})` }}
            />
          }
          title={
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'nowrap',
              whiteSpace: 'nowrap',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}>
              <Text strong style={{ flexShrink: 0 }}>{log.author_name}</Text>
              {actionText && <Text type="secondary" style={{ flexShrink: 0 }}>{actionText}</Text>}
              {log.target_user_name && (
                <>
                  <Text type="secondary" style={{ flexShrink: 0 }}>→</Text>
                  <Text strong style={{ flexShrink: 0 }}>{log.target_user_name}</Text>
                </>
              )}
              <Tag color={config.color} style={{ flexShrink: 0 }}>{config.label}</Tag>
              {log.approval_status === 'approved' && (
                <Tag color="green" style={{ flexShrink: 0 }}>확인됨</Tag>
              )}
              {log.approval_status === 'rejected' && (
                <Tag color="red" style={{ flexShrink: 0 }}>보류/재조정필요</Tag>
              )}
              {log.attachments && log.attachments.length > 0 && (
                <Tag
                  icon={<PaperClipOutlined />}
                  color="blue"
                  style={{ flexShrink: 0 }}
                >
                  첨부 {log.attachments.length}
                </Tag>
              )}
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
            </div>
          }
          description={
            <div className="space-y-1">
              <Text>{log.content}</Text>
              {log.project_name && (
                <div>
                  <Tag color="blue" className="mt-1">
                    {log.project_name}
                  </Tag>
                </div>
              )}
              {/* 첨부파일 표시 - PendingApprovals와 동일한 스타일 */}
              {log.attachments && log.attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="space-y-2">
                    <Text type="secondary" className="text-sm font-medium">첨부파일:</Text>
                    <div className="space-y-1">
                      {log.attachments.map((attachment) => {
                        // Supabase storage public URL 생성
                        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/log-attachments/${attachment.file_path}`
                        
                        return (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <PaperClipOutlined className="text-gray-500" />
                            <a
                              href={publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {attachment.file_name}
                            </a>
                            <Text type="secondary" className="text-xs">
                              {formatFileSize(attachment.file_size)}
                            </Text>
                            <Button
                              type="text"
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={(e) => handleDownloadAttachment(attachment, e)}
                              title="다운로드"
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
              <Text type="secondary" className="text-xs">
                {formatDistanceToNow(new Date(log.created_at), { 
                  addSuffix: true, 
                  locale: ko 
                })}
              </Text>
            </div>
          }
        />
      </List.Item>
    )
  }

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Title level={4} className="mb-0">전체 활동 로그</Title>
            {filterUser && (
              <Tag
                color="blue"
                closable
                onClose={handleResetFilter}
                className="ml-2"
              >
                {filterUser.name} 필터링 중
              </Tag>
            )}
            {filterCategory && (
              <Tag
                color="green"
                closable
                onClose={() => setFilterCategory(null)}
                className="ml-2"
              >
                {filterCategory} 필터링 중
              </Tag>
            )}
          </div>
          <Space>
            {/* 카테고리 필터 Select 추가 */}
            <Select
              placeholder="카테고리 선택"
              allowClear
              style={{ width: 140 }}
              size="small"
              value={filterCategory}
              onChange={(value) => setFilterCategory(value || null)}
            >
              <Select.Option value="사양변경">사양변경</Select.Option>
              <Select.Option value="도면설계">도면설계</Select.Option>
              <Select.Option value="구매발주">구매발주</Select.Option>
              <Select.Option value="생산제작">생산제작</Select.Option>
              <Select.Option value="상하차">상하차</Select.Option>
              <Select.Option value="현장설치시공">현장설치시공</Select.Option>
              <Select.Option value="설치인증">설치인증</Select.Option>
              <Select.Option value="설비">설비</Select.Option>
              <Select.Option value="기타">기타</Select.Option>
            </Select>

            {/* 관리자인 경우에만 사용자 필터 버튼 표시 */}
            {userData?.role === 'admin' && (
              <Button
                icon={<FilterOutlined />}
                onClick={() => setShowUserSelectModal(true)}
                size="small"
                type={filterUserId ? "primary" : "default"}
              >
                사용자 필터
              </Button>
            )}
            {/* 필터가 적용된 경우 초기화 버튼 표시 */}
            {(filterUserId || filterCategory) && (
              <Button
                icon={<CloseCircleOutlined />}
                onClick={handleResetFilter}
                size="small"
                danger
              >
                초기화
              </Button>
            )}
            {showRefresh && (
              <Button
                type="text"
                icon={<ReloadOutlined spin={refreshing} />}
                onClick={handleRefresh}
                loading={refreshing}
                size="small"
              >
                새로고침
              </Button>
            )}
          </Space>
        </div>
      }
      className="global-log-feed"
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : logs.length > 0 ? (
        <>
          <List
            dataSource={logs}
            renderItem={renderLogItem}
            className="log-list"
          />
          {totalCount > limit && (
            <div className="pagination-container">
              <Pagination
                current={currentPage}
                total={totalCount}
                pageSize={limit}
                onChange={handlePageChange}
                showSizeChanger={false}
                showTotal={(total, range) => `${range[0]}-${range[1]} / 전체 ${total}개`}
                size="small"
                disabled={refreshing}
              />
            </div>
          )}
        </>
      ) : (
        <Empty description="활동 로그가 없습니다." />
      )}

      {/* 사용자 선택 모달 */}
      <UserSelectModal
        visible={showUserSelectModal}
        onClose={() => setShowUserSelectModal(false)}
        onSelect={handleUserSelect}
        selectedUserId={filterUserId}
      />

      <style jsx>{`
        .global-log-feed :global(.ant-card-body) {
          padding: 0;
          max-height: 500px;
          overflow-y: auto;
        }

        .log-list :global(.ant-list-item) {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-light);
          transition: background-color 0.2s;
        }

        .log-list :global(.log-item-clickable:hover) {
          background-color: #f5f5f5;
          cursor: pointer;
        }

        .log-list :global(.ant-list-item:last-child) {
          border-bottom: none;
        }

        .pagination-container {
          padding: 16px;
          border-top: 1px solid var(--border-light);
          display: flex;
          justify-content: center;
          background-color: #fafafa;
        }

        /* 로그 제목 영역 스크롤바 숨김 */
        .global-log-feed :global(.ant-list-item-meta-title) {
          overflow-x: visible;
        }

        @media (max-width: 768px) {
          .global-log-feed :global(.ant-card-body) {
            max-height: 400px;
          }

          .log-list :global(.ant-list-item) {
            padding: 12px 16px;
          }

          .pagination-container {
            padding: 12px;
          }

        }
      `}</style>
    </Card>
  )
}