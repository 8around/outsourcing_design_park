'use client'

import { useState, useEffect } from 'react'
import { Card, List, Avatar, Typography, Tag, Space, Button, Empty, Skeleton, Badge, Tooltip, message } from 'antd'
import {
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { approvalService } from '@/lib/services/approval.service'
import { useAuth } from '@/lib/hooks/useAuth'

const { Text, Title } = Typography

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
  memo?: string
  requestType: 'sent' | 'received'  // 요청 타입 추가
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
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)

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
      const allApprovals: ApprovalItem[] = [
        ...response.userApprovals.map(approval => ({
          ...approval,
          memo: undefined, // 사용자 승인은 메모가 없음
          requestType: approval.requestType || 'received' as const
        })),
        ...response.projectApprovals.map(approval => ({
          ...approval,
          memo: approval.description, // 프로젝트 승인의 설명을 메모로 사용
          requestType: approval.requestType || 'received' as const
        }))
      ]

      // 생성 시간 기준으로 정렬
      allApprovals.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      // limit 적용
      setApprovals(allApprovals.slice(0, limit))
    } catch (error) {
      console.error('승인 목록 로드 실패:', error)
      message.error('승인 대기 목록을 불러오는데 실패했습니다.')
      setApprovals([])
    } finally {
      setLoading(false)
    }
  }

  // 초기 로드 및 사용자 변경 시 재로드
  useEffect(() => {
    loadApprovals()
  }, [limit, user])

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
        // 목록에서 제거
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

  // 거절 처리
  const handleReject = async (id: string) => {
    if (!user) return

    const approval = approvals.find(a => a.id === id)
    if (!approval) return

    setProcessing(id)
    try {
      let success = false
      
      if (approval.type === 'user') {
        // 사용자 거절
        success = await approvalService.rejectUser(id, user.id, '관리자에 의해 거절되었습니다.')
      } else if (approval.type === 'project') {
        // 프로젝트 거절
        success = await approvalService.respondToApprovalRequest(
          id,
          user.id,
          userData?.name || user.email || 'Unknown',
          'rejected',
          '거절되었습니다.'
        )
      }

      if (success) {
        message.success('거절이 완료되었습니다.')
        if (onReject) {
          onReject(id)
        }
        // 목록에서 제거
        setApprovals(prev => prev.filter(item => item.id !== id))
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

  // 상세 보기
  const handleView = (approval: ApprovalItem) => {
    if (approval.type === 'user') {
      router.push('/admin/users')
    } else if (approval.project_id) {
      router.push(`/projects/${approval.project_id}`)
    }
  }

  // 승인 아이템 렌더링
  const renderApprovalItem = (approval: ApprovalItem) => {
    const config = typeConfig[approval.type]
    const isProcessing = processing === approval.id
    const isReceivedRequest = approval.requestType === 'received'  // 내가 받은 요청인지 확인

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
    ] : showActions && !isReceivedRequest ? [
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
      <Tag color="blue" key="status">대기중</Tag>
    ] : undefined

    return (
      <List.Item
        key={approval.id}
        onClick={() => handleView(approval)}
        style={{ cursor: 'pointer' }}
        className="approval-item-clickable"
        actions={actions}
      >
        <List.Item.Meta
          avatar={
            <Badge 
              dot 
              color={priorityColors[approval.priority]}
              offset={[-5, 5]}
            >
              <Avatar 
                icon={config.icon}
                style={{ backgroundColor: `var(--ant-color-${config.color})` }}
              />
            </Badge>
          }
          title={
            <Space>
              <Text strong>{approval.title}</Text>
              <Tag color={config.color}>{config.label}</Tag>
              {approval.priority === 'high' && (
                <Tag color="red">긴급</Tag>
              )}
            </Space>
          }
          description={
            <div className="space-y-1">
              <Text>{approval.description}</Text>
              {approval.project_name && (
                <div>
                  <Tag color="blue" className="mt-1">
                    {approval.project_name}
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
            {!loading && approvals.length > 0 && (
              <Badge count={approvals.length} />
            )}
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
    </Card>
  )
}