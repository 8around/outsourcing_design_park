'use client'

import { useState, useEffect } from 'react'
import { Card, List, Avatar, Typography, Tag, Space, Button, Empty, Skeleton, Badge, Tooltip, message, Pagination, Modal, Input } from 'antd'
import {
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  PaperClipOutlined,
  DownloadOutlined,
  // DeleteOutlined, // 삭제 기능 제거
} from '@ant-design/icons'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { approvalService } from '@/lib/services/approval.service'
import { useAuth } from '@/lib/hooks/useAuth'

const { Text, Title } = Typography
const { TextArea } = Input

// 승인 타입
type ApprovalType = 'user' | 'project' | 'stage' | 'document' | 'other'

// 승인 상태
type ApprovalStatus = 'pending' | 'approved' | 'rejected'

// 승인 아이템 인터페이스
interface ApprovalItem {
  id: string
  type: ApprovalType
  title: string
  description: string
  requester_id: string
  requester_name: string
  requester_email?: string
  approver_id?: string
  approver_name?: string
  status: ApprovalStatus
  priority: 'high' | 'medium' | 'low'
  created_at: string
  project_id?: string
  project_name?: string
  category?: string | null  // 로그 카테고리 추가
  memo?: string
  requestType: 'sent' | 'received'  // 요청 타입 추가
  attachments?: Array<{  // 첨부파일 추가
    id: string
    file_name: string
    file_path: string
    file_size: number
    mime_type: string | null
    created_at?: string | null
  }>
}

// 타입별 설정
const typeConfig = {
  user: { color: 'purple', icon: <UserOutlined />, label: '사용자' },
  project: { color: 'blue', icon: <FileTextOutlined />, label: '프로젝트' },
  stage: { color: 'green', icon: <ClockCircleOutlined />, label: '공정' },
  document: { color: 'orange', icon: <FileTextOutlined />, label: '문서' },
  other: { color: 'default', icon: <ExclamationCircleOutlined />, label: '기타' },
}

// 우선순위 색상
const priorityColors = {
  high: 'red',
  medium: 'orange',
  low: 'default',
}

// 카테고리 색상 (LogList 컴포넌트와 동일하게 설정)
const categoryColors: Record<string, string> = {
  '사양변경': 'purple',
  '도면설계': 'blue',
  '구매발주': 'green',
  '생산제작': 'gold',
  '상하차': 'orange',
  '현장설치시공': 'red',
  '설치인증': 'purple',
  '승인요청': 'magenta',
  '승인처리': 'cyan',
}

interface PendingApprovalsProps {
  limit?: number
  showActions?: boolean
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
}

export default function PendingApprovals({ 
  limit = 5,
  showActions = true,
  onApprove,
  onReject
}: PendingApprovalsProps) {
  const router = useRouter()
  const { user, userData } = useAuth()
  const [allApprovals, setAllApprovals] = useState<ApprovalItem[]>([])  // 전체 승인 목록
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])  // 현재 페이지에 표시할 목록
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  // const [deletingId, setDeletingId] = useState<string | null>(null) // 삭제 기능 제거
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(limit)  // 페이지당 항목 수
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // 승인 대기 목록 로드
  const loadApprovals = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // 현재 사용자의 승인 대기 목록 조회
      const response = await approvalService.getPendingApprovalsForUser(user.id)
      
      // 사용자 승인과 프로젝트 승인을 합쳐서 정렬
      const combinedApprovals: ApprovalItem[] = [
        ...response.userApprovals.map(approval => ({
          ...approval,
          memo: undefined, // 사용자 승인은 메모가 없음
          attachments: undefined, // 사용자 승인은 첨부파일이 없음
          requestType: approval.requestType || 'received' as const
        })),
        ...response.projectApprovals.map(approval => ({
            ...approval,
            memo: approval.description, // 프로젝트 승인의 설명을 메모로 사용
            category: approval.category, // 로그 카테고리 포함
            attachments: approval.attachments || [], // 첨부파일 포함 (빈 배열로 기본값 설정)
            requestType: approval.requestType || 'received' as const
          }))
      ]

      // 생성 시간 기준으로 정렬
      combinedApprovals.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      // 전체 목록 저장
      setAllApprovals(combinedApprovals)
      
      // 첫 페이지로 리셋
      setCurrentPage(1)
      
      // 현재 페이지의 항목 설정
      const startIndex = 0
      const endIndex = pageSize
      setApprovals(combinedApprovals.slice(startIndex, endIndex))
    } catch (error) {
      console.error('승인 목록 로드 실패:', error)
      message.error('승인 대기 목록을 불러오는데 실패했습니다.')
      setAllApprovals([])
      setApprovals([])
    } finally {
      setLoading(false)
    }
  }

  // 초기 로드 및 사용자 변경 시 재로드
  useEffect(() => {
    loadApprovals()
  }, [user])  // limit 제거 - pageSize를 내부적으로 사용

  // 페이지 변경 시 표시할 항목 업데이트
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    setApprovals(allApprovals.slice(startIndex, endIndex))
  }, [currentPage, allApprovals, pageSize])

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // 새로고침 핸들러
  const handleRefresh = async () => {
    if (refreshing || loading) return
    
    setRefreshing(true)
    try {
      await loadApprovals()
      message.success('새로고침 완료')
    } catch (error) {
      console.error('새로고침 실패:', error)
      message.error('새로고침에 실패했습니다.')
    } finally {
      setRefreshing(false)
    }
  }

  // 승인 처리
  const handleApprove = async (id: string) => {
    if (!user) return

    const approval = approvals.find(a => a.id === id)
    if (!approval) return

    setProcessing(id)
    try {
      let success = false
      
      if (approval.type === 'user') {
        // 사용자 승인
        success = await approvalService.approveUser(id, user.id)
      } else if (approval.type === 'project') {
        // 프로젝트 승인
        success = await approvalService.respondToApprovalRequest(
          id,
          user.id,
          userData?.name || user.email || 'Unknown',
          'approved',
          '승인되었습니다.'
        )
      }

      if (success) {
        message.success('승인이 완료되었습니다.')
        if (onApprove) {
          onApprove(id)
        }
        // 전체 목록과 현재 페이지 목록에서 제거
        setAllApprovals(prev => prev.filter(item => item.id !== id))
        setApprovals(prev => prev.filter(item => item.id !== id))
      } else {
        message.error('승인 처리에 실패했습니다.')
      }
    } catch (error) {
      console.error('승인 실패:', error)
      message.error('승인 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  // 거절 모달 열기
  const handleReject = (id: string) => {
    const approval = approvals.find(a => a.id === id)
    if (!approval) return
    
    setSelectedApproval(approval)
    setRejectReason('')
    setRejectModalVisible(true)
  }

  // 거절 처리 확인
  const confirmReject = async () => {
    if (!user || !selectedApproval) return

    setProcessing(selectedApproval.id)
    try {
      let success = false
      const reasonText = rejectReason.trim() || '관리자에 의해 거절되었습니다.'
      
      if (selectedApproval.type === 'user') {
        // 사용자 거절
        success = await approvalService.rejectUser(
          selectedApproval.id, 
          user.id, 
          reasonText
        )
      } else if (selectedApproval.type === 'project') {
        // 프로젝트 거절
        success = await approvalService.respondToApprovalRequest(
          selectedApproval.id,
          user.id,
          userData?.name || user.email || 'Unknown',
          'rejected',
          reasonText
        )
      }

      if (success) {
        message.success('거절이 완료되었습니다.')
        if (onReject) {
          onReject(selectedApproval.id)
        }
        // 전체 목록과 현재 페이지 목록에서 제거
        setAllApprovals(prev => prev.filter(item => item.id !== selectedApproval.id))
        setApprovals(prev => prev.filter(item => item.id !== selectedApproval.id))
        
        // 모달 닫기 및 상태 초기화
        setRejectModalVisible(false)
        setSelectedApproval(null)
        setRejectReason('')
      } else {
        message.error('거절 처리에 실패했습니다.')
      }
    } catch (error) {
      console.error('거절 실패:', error)
      message.error('거절 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  // 승인 항목 삭제 기능 제거 - 관리자도 삭제 불가
  // 승인 대기 중인 항목은 승인 또는 거절로만 처리 가능

  // 상세 보기
  const handleView = (approval: ApprovalItem) => {
    if (approval.type === 'user') {
      router.push('/admin/users')
    } else if (approval.project_id) {
      router.push(`/projects/${approval.project_id}`)
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

  // 승인 아이템 렌더링
  const renderApprovalItem = (approval: ApprovalItem) => {
    const config = typeConfig[approval.type]
    const isProcessing = processing === approval.id
    // const isDeleting = deletingId === approval.id // 삭제 기능 제거
    const isReceivedRequest = approval.requestType === 'received'  // 내가 받은 요청인지 확인
    const isAdmin = userData?.role === 'admin'

    // 내가 받은 요청인 경우에만 승인/거절 버튼 표시
    const actions = showActions && isReceivedRequest ? [
      <Tooltip title="상세 보기" key="view">
        <Button
          type="text"
          icon={<EyeOutlined />}
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            handleView(approval)
          }}
          disabled={isProcessing}
        />
      </Tooltip>,
      <Button
        type="primary"
        icon={<CheckOutlined />}
        size="small"
        onClick={(e) => {
          e.stopPropagation()
          handleApprove(approval.id)
        }}
        loading={isProcessing}
        disabled={isProcessing}
        key="approve"
      >
        승인
      </Button>,
      <Button
        danger
        icon={<CloseOutlined />}
        size="small"
        onClick={(e) => {
          e.stopPropagation()
          handleReject(approval.id)
        }}
        loading={isProcessing}
        disabled={isProcessing}
        key="reject"
      >
        거절
      </Button>,
      // 삭제 버튼 제거 - 관리자도 삭제 불가
    ].filter(Boolean) : showActions && !isReceivedRequest ? [
      // 내가 보낸 요청인 경우 상세 보기 버튼만 표시
      <Tooltip title="상세 보기" key="view">
        <Button
          type="text"
          icon={<EyeOutlined />}
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            handleView(approval)
          }}
        />
      </Tooltip>,
      <Tag color="blue" key="status">대기중</Tag>,
      // 삭제 버튼 제거 - 관리자도 삭제 불가
    ].filter(Boolean) : undefined

    return (
      <List.Item
        key={approval.id}
        onClick={() => handleView(approval)}
        style={{ cursor: 'pointer' }}
        className="approval-item-clickable"
        actions={actions}
      >
        <List.Item.Meta
          title={
            <Space>
              <Text strong>{approval.title}</Text>
              <Tag color={config.color}>{config.label}</Tag>
              {approval.priority === 'high' && (
                <Tag color="red">긴급</Tag>
              )}
              {approval.attachments && approval.attachments.length > 0 && (
                <Tag 
                  icon={<PaperClipOutlined />} 
                  color="blue"
                >
                  첨부 {approval.attachments.length}
                </Tag>
              )}
            </Space>
          }
          description={
            <div className="space-y-1">
              <Text>{approval.description}</Text>
              {approval.category && (
                <div>
                  <Tag color={categoryColors[approval.category] || 'default'} className="mt-1">
                    {approval.category}
                  </Tag>
                </div>
              )}
              {approval.memo && (
                <div className="mt-1">
                  <Text type="secondary" className="text-xs">
                    메모: {approval.memo}
                  </Text>
                </div>
              )}
              <Space className="text-xs">
                {approval.requestType === 'received' ? (
                  <>
                    <Text type="secondary">
                      요청자: {approval.requester_name}
                      {approval.requester_email && ` (${approval.requester_email})`}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text type="secondary">
                      승인자: {approval.approver_name || '관리자'}
                    </Text>
                    <Text type="secondary">•</Text>
                    <Tag color="orange" className="text-xs">내가 보낸 요청</Tag>
                  </>
                )}
                <Text type="secondary">•</Text>
                <Text type="secondary">
                  {formatDistanceToNow(new Date(approval.created_at), { 
                    addSuffix: true, 
                    locale: ko 
                  })}
                </Text>
              </Space>
              {/* 첨부파일 표시 - 항상 보이기 */}
              {approval.attachments && approval.attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="space-y-2">
                    <Text type="secondary" className="text-sm font-medium">첨부파일:</Text>
                    <div className="space-y-1">
                      {approval.attachments.map((attachment) => {
                        // Supabase storage public URL 생성
                        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/log-attachments/${attachment.file_path}`
                        
                        // 파일 다운로드 핸들러
                        const handleDownload = async (e: React.MouseEvent) => {
                          e.preventDefault()
                          e.stopPropagation()
                          
                          try {
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
                              onClick={handleDownload}
                              title="다운로드"
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
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
          <Space>
            <Title level={4} className="mb-0">승인 대기 목록</Title>
          </Space>
          <Tooltip title="새로고침">
            <Button
              type="text"
              icon={<ReloadOutlined spin={refreshing} />}
              onClick={handleRefresh}
              loading={refreshing}
              disabled={loading}
            >
              새로고침
            </Button>
          </Tooltip>
        </div>
      }
      className="pending-approvals"
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : approvals.length > 0 ? (
        <List
          dataSource={approvals}
          renderItem={renderApprovalItem}
          className="approval-list"
        />
      ) : (
        <Empty description="승인 대기 중인 항목이 없습니다." />
      )}

      {/* 페이지네이션 추가 */}
      {!loading && allApprovals.length > pageSize && (
        <div className="pagination-container">
          <Pagination
            current={currentPage}
            total={allApprovals.length}
            pageSize={pageSize}
            onChange={handlePageChange}
            showSizeChanger={false}
            showQuickJumper={allApprovals.length > pageSize * 5}
            showTotal={(total, range) => `${range[0]}-${range[1]} / 총 ${total}건`}
            className="mt-4"
            size="small"
          />
        </div>
      )}

      <style jsx>{`
        .pending-approvals :global(.ant-card-body) {
          padding: 0;
        }

        .approval-list :global(.ant-list-item) {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-light);
          transition: background-color 0.2s;
        }

        .approval-list :global(.approval-item-clickable:hover) {
          background-color: #f5f5f5;
          cursor: pointer;
        }

        .approval-list :global(.ant-list-item:last-child) {
          border-bottom: none;
        }

        .approval-list :global(.ant-list-item-action) {
          margin-left: auto;
        }

        .pagination-container {
          padding: 16px 20px;
          border-top: 1px solid var(--border-light);
          display: flex;
          justify-content: center;
        }

        .pagination-container :global(.ant-pagination) {
          display: flex;
          align-items: center;
        }

        @media (max-width: 768px) {
          .approval-list :global(.ant-list-item) {
            padding: 12px 16px;
          }

          .approval-list :global(.ant-list-item-action) {
            margin-top: 12px;
            margin-left: 0;
          }
        }
      `}</style>

      {/* 거절 모달 */}
      <Modal
        title={
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 bg-error-100 rounded-soft-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">승인 거절</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedApproval?.type === 'user' ? '사용자 가입 요청' : '프로젝트 승인 요청'}을 거절합니다
              </p>
            </div>
          </div>
        }
        open={rejectModalVisible}
        onOk={confirmReject}
        onCancel={() => {
          setRejectModalVisible(false)
          setSelectedApproval(null)
          setRejectReason('')
        }}
        okText="거절하기"
        cancelText="취소"
        okType="danger"
        className="reject-approval-modal"
        confirmLoading={processing === selectedApproval?.id}
        okButtonProps={{
          className: "bg-error-600 hover:bg-error-700 border-error-600 hover:border-error-700 rounded-soft font-medium h-10 px-6"
        }}
        cancelButtonProps={{
          className: "border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-800 rounded-soft font-medium h-10 px-6"
        }}
      >
        <div className="space-y-6 pt-4">
          {/* Warning Section */}
          <div className="flex items-start gap-3 p-4 bg-error-50 rounded-soft-lg border border-error-200">
            <svg className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-error-800 font-medium">
                {selectedApproval?.type === 'user' ? (
                  <>
                    <strong className="text-error-900">{selectedApproval?.requester_name}</strong>님의 가입을 거절하시겠습니까?
                  </>
                ) : (
                  <>
                    <strong className="text-error-900">{selectedApproval?.requester_name}</strong>님이 요청한 프로젝트 승인을 거절하시겠습니까?
                  </>
                )}
              </p>
              <p className="text-error-700 text-sm mt-1">
                {selectedApproval?.type === 'user' 
                  ? '이 작업은 되돌릴 수 없으며, 해당 사용자는 다시 가입 신청을 해야 합니다.'
                  : '거절된 승인 요청은 다시 제출해야 합니다.'}
              </p>
              {selectedApproval?.type === 'project' && selectedApproval?.project_name && (
                <p className="text-error-700 text-sm mt-2">
                  프로젝트: <strong>{selectedApproval.project_name}</strong>
                </p>
              )}
            </div>
          </div>
          
          {/* Reason Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              거절 사유 (선택사항)
            </label>
            <TextArea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 상세히 입력해주세요..."
              rows={4}
              maxLength={500}
              showCount
              className="resize-none rounded-soft border-gray-200 hover:border-primary-300 focus:border-primary-500 transition-smooth"
            />
            <p className="text-xs text-gray-500 mt-2">
              거절 사유는 요청자에게 전달되며, 향후 재신청 시 참고자료로 활용됩니다.
            </p>
          </div>
        </div>
      </Modal>
    </Card>
  )
}