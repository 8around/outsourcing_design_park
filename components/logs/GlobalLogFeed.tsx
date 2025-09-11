'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, List, Avatar, Typography, Tag, Space, Button, Empty, Skeleton, message, Pagination } from 'antd'
import {
  FileTextOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PaperClipOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { logService } from '@/lib/services/logs.service'
import { projectService } from '@/lib/services/projects.service'
import type { HistoryLog } from '@/types/log'

const { Text, Title } = Typography

// 데이터베이스 카테고리 타입 (실제 데이터베이스 값)
type DBCategory = '사양변경' | '도면설계' | '구매발주' | '생산제작' | '상하차' | '현장설치시공' | '설치인증' | '승인요청' | '승인처리'

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
  '승인요청': { color: 'magenta', icon: <CheckCircleOutlined />, label: '승인요청' },
  '승인처리': { color: 'cyan', icon: <CheckCircleOutlined />, label: '승인처리' },
  '기타': { color: 'default', icon: <EditOutlined />, label: '기타' },
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
  const [logs, setLogs] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // 로그 데이터 로드
  const loadLogs = async (page = currentPage, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      // 글로벌 로그 피드 조회
      const response = await logService.getGlobalLogFeed(page, limit)
      
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
          ? log.attachments.map((att: any) => ({
              id: att.id,
              file_path: att.file_path,
              file_name: att.file_name,
              file_size: att.file_size,
              mime_type: att.mime_type
            }))
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

  // 초기 로드
  useEffect(() => {
    loadLogs(1)
  }, [limit])

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

  // 로그 클릭 시 프로젝트 상세 페이지로 이동
  const handleLogClick = (log: LogItem) => {
    if (log.project_id) {
      router.push(`/projects/${log.project_id}`)
    }
  }

  // 첨부파일 다운로드
  const handleDownloadAttachment = async (attachment: AttachmentInfo, e: React.MouseEvent) => {
    e.stopPropagation() // 로그 클릭 이벤트 전파 방지
    
    try {
      const downloadUrl = await logService.getAttachmentDownloadUrl(attachment.file_path)
      if (downloadUrl) {
        // 다운로드 링크 생성 및 클릭
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = attachment.file_name
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        message.success(`${attachment.file_name} 다운로드를 시작합니다.`)
      } else {
        message.error('파일 다운로드 URL을 가져올 수 없습니다.')
      }
    } catch (error) {
      console.error('파일 다운로드 실패:', error)
      message.error('파일 다운로드에 실패했습니다.')
    }
  }

  // 로그 아이템 렌더링
  const renderLogItem = (log: LogItem) => {
    const config = categoryConfig[log.category] || categoryConfig['기타']
    
    // 로그 타입과 승인 상태에 따른 액션 텍스트 생성
    let actionText = ''
    if (log.log_type === 'approval_request') {
      actionText = '승인 요청'
    } else if (log.log_type === 'approval_response') {
      actionText = log.approval_status === 'approved' ? '승인 완료' : '승인 거절'
    } else if (log.category === '승인요청') {
      actionText = '승인 요청'
    } else if (log.category === '승인처리') {
      actionText = '승인 처리'
    } else if (['도면설계', '구매발주', '생산제작', '상하차', '현장설치시공', '설치인증'].includes(log.category)) {
      actionText = '공정 진행'
    } else if (log.category === '사양변경') {
      actionText = '사양 변경'
    }
    
    return (
      <List.Item 
        key={log.id}
        onClick={() => handleLogClick(log)}
        style={{ cursor: log.project_id ? 'pointer' : 'default' }}
        className="log-item-clickable"
      >
        <List.Item.Meta
          avatar={
            <Avatar 
              icon={config.icon} 
              style={{ backgroundColor: `var(--ant-color-${config.color})` }}
            />
          }
          title={
            <Space>
              <Text strong>{log.author_name}</Text>
              {actionText && <Text type="secondary">{actionText}</Text>}
              {log.target_user_name && (
                <>
                  <Text type="secondary">→</Text>
                  <Text strong>{log.target_user_name}</Text>
                </>
              )}
              <Tag color={config.color}>{config.label}</Tag>
              {log.approval_status === 'approved' && (
                <Tag color="green">승인됨</Tag>
              )}
              {log.approval_status === 'rejected' && (
                <Tag color="red">거절됨</Tag>
              )}
            </Space>
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
              {log.attachments && log.attachments.length > 0 && (
                <div className="mt-2">
                  <Space direction="vertical" size="small">
                    {log.attachments.map((attachment) => (
                      <Button
                        key={attachment.id}
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={(e) => handleDownloadAttachment(attachment, e)}
                        className="attachment-download-btn"
                      >
                        {attachment.file_name} ({(attachment.file_size / 1024).toFixed(1)}KB)
                      </Button>
                    ))}
                  </Space>
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
          <Title level={4} className="mb-0">전체 활동 로그</Title>
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

        .log-list :global(.attachment-download-btn) {
          background-color: #f0f0f0;
          border-color: #d9d9d9;
        }

        .log-list :global(.attachment-download-btn:hover) {
          background-color: #e6f7ff;
          border-color: #1890ff;
          color: #1890ff;
        }

        .pagination-container {
          padding: 16px;
          border-top: 1px solid var(--border-light);
          display: flex;
          justify-content: center;
          background-color: #fafafa;
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