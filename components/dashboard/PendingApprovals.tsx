'use client'

import { useState, useEffect } from 'react'
import { Card, List, Avatar, Typography, Tag, Space, Button, Empty, Skeleton, Badge, Tooltip } from 'antd'
import {
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

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
  status: ApprovalStatus
  priority: 'high' | 'medium' | 'low'
  created_at: string
  project_id?: string
  project_name?: string
  memo?: string
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
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  // 승인 대기 목록 로드
  const loadApprovals = async () => {
    setLoading(true)
    try {
      // TODO: 실제 Supabase API 호출로 대체
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // 임시 데이터
      const mockApprovals: ApprovalItem[] = [
        {
          id: '1',
          type: 'user',
          title: '신규 사용자 가입 승인',
          description: 'test@company.com 사용자가 가입 승인을 기다리고 있습니다.',
          requester_id: 'user1',
          requester_name: '김철수',
          requester_email: 'test@company.com',
          status: 'pending',
          priority: 'high',
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
        {
          id: '2',
          type: 'project',
          title: '프로젝트 단계 변경 승인',
          description: 'ABC 제조공장 프로젝트의 용접 단계 완료 승인이 필요합니다.',
          requester_id: 'user2',
          requester_name: '이영희',
          status: 'pending',
          priority: 'medium',
          created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          project_id: 'proj1',
          project_name: 'ABC 제조공장',
          memo: '품질 검사 완료, 다음 단계 진행 가능',
        },
        {
          id: '3',
          type: 'stage',
          title: '도면 설계 승인',
          description: 'XYZ 물류센터 프로젝트의 도면 설계 승인이 필요합니다.',
          requester_id: 'user3',
          requester_name: '박민수',
          status: 'pending',
          priority: 'high',
          created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          project_id: 'proj2',
          project_name: 'XYZ 물류센터',
        },
        {
          id: '4',
          type: 'document',
          title: '계약서 승인',
          description: 'DEF 시설 개선 프로젝트 계약서 최종 승인이 필요합니다.',
          requester_id: 'user4',
          requester_name: '최지훈',
          status: 'pending',
          priority: 'medium',
          created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
          project_id: 'proj3',
          project_name: 'DEF 시설 개선',
        },
      ]

      setApprovals(mockApprovals.slice(0, limit))
    } catch (error) {
      console.error('승인 목록 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 초기 로드
  useEffect(() => {
    loadApprovals()
  }, [limit])

  // 승인 처리
  const handleApprove = async (id: string) => {
    setProcessing(id)
    try {
      // TODO: 실제 승인 API 호출
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (onApprove) {
        onApprove(id)
      }
      
      // 목록에서 제거
      setApprovals(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      console.error('승인 실패:', error)
    } finally {
      setProcessing(null)
    }
  }

  // 거절 처리
  const handleReject = async (id: string) => {
    setProcessing(id)
    try {
      // TODO: 실제 거절 API 호출
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (onReject) {
        onReject(id)
      }
      
      // 목록에서 제거
      setApprovals(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      console.error('거절 실패:', error)
    } finally {
      setProcessing(null)
    }
  }

  // 상세 보기
  const handleView = (approval: ApprovalItem) => {
    if (approval.type === 'user') {
      router.push('/admin/users')
    } else if (approval.project_id) {
      router.push(`/projects/${approval.project_id}/approval`)
    }
  }

  // 승인 아이템 렌더링
  const renderApprovalItem = (approval: ApprovalItem) => {
    const config = typeConfig[approval.type]
    const isProcessing = processing === approval.id

    return (
      <List.Item
        key={approval.id}
        actions={showActions ? [
          <Tooltip title="상세 보기" key="view">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleView(approval)}
              disabled={isProcessing}
            />
          </Tooltip>,
          <Button
            type="primary"
            icon={<CheckOutlined />}
            size="small"
            onClick={() => handleApprove(approval.id)}
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
            onClick={() => handleReject(approval.id)}
            loading={isProcessing}
            disabled={isProcessing}
            key="reject"
          >
            거절
          </Button>,
        ] : undefined}
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
                <Text type="secondary">
                  요청자: {approval.requester_name}
                  {approval.requester_email && ` (${approval.requester_email})`}
                </Text>
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
          <Button
            type="link"
            size="small"
            onClick={() => router.push('/admin/users')}
          >
            전체 보기
          </Button>
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