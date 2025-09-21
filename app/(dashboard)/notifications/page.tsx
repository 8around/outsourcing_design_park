'use client'

import { useState, useMemo } from 'react'
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Badge,
  List,
  Tag,
  Select,
  Empty,
  message,
  Spin
} from 'antd'
import {
  BellOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ProjectOutlined,
  ReloadOutlined,
  CheckSquareOutlined
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import moment from 'moment'
import { useNotifications } from '@/lib/hooks/useNotifications'
import type { Notification } from '@/lib/services/notification.service'

const { Title, Text } = Typography
const { Option } = Select

// 알림 타입별 아이콘
const typeIcons = {
  approval_request: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
  approval_response: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  system: <InfoCircleOutlined style={{ color: '#1890ff' }} />
}

// 알림 타입별 색상
const typeColors = {
  approval_request: 'orange',
  approval_response: 'green',
  system: 'blue'
}

// 알림 타입별 라벨
const typeLabels = {
  approval_request: '승인 요청',
  approval_response: '승인 응답',
  system: '시스템'
}

export default function NotificationsPage() {
  const router = useRouter()
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  } = useNotifications()
  
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 필터링된 알림 목록
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications]

    // 읽음/안읽음 필터
    if (filterType === 'unread') {
      filtered = filtered.filter(n => !n.is_read)
    } else if (filterType === 'read') {
      filtered = filtered.filter(n => n.is_read)
    }

    return filtered
  }, [notifications, filterType])

  // 새로고침 처리
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshNotifications()
      message.success('알림을 새로고침했습니다')
    } catch {
      message.error('새로고침에 실패했습니다')
    } finally {
      setIsRefreshing(false)
    }
  }

  // 알림 클릭 처리
  const handleNotificationClick = async (notification: Notification) => {
    // 읽지 않은 알림이면 읽음 처리
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id)
      } catch {
        console.error('Failed to mark as read')
      }
    }

    // 관련 페이지로 이동
    if (notification.related_type === 'project' && notification.related_id) {
      router.push(`/projects/${notification.related_id}`)
    } else if (notification.related_type === 'approval_request' && notification.related_id) {
      // 승인 요청 관련 페이지로 이동
      router.push(`/projects/${notification.related_id}/approval`)
    }
  }



  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      message.success('모든 알림을 읽음 처리했습니다')
    } catch (err) {
      message.error('읽음 처리에 실패했습니다')
    }
  }

  // 선택 토글
  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    )
  }

  // 전체 선택 토글
  const toggleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id))
    }
  }

  // 시간 포맷팅
  const formatTime = (dateString: string) => {
    const now = moment()
    const notificationTime = moment(dateString)
    
    if (now.diff(notificationTime, 'minutes') < 60) {
      return `${now.diff(notificationTime, 'minutes')}분 전`
    } else if (now.diff(notificationTime, 'hours') < 24) {
      return `${now.diff(notificationTime, 'hours')}시간 전`
    } else if (now.diff(notificationTime, 'days') < 7) {
      return `${now.diff(notificationTime, 'days')}일 전`
    } else {
      return notificationTime.format('YYYY-MM-DD')
    }
  }

  return (
    <div className="notifications-page container mx-auto px-6 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <div>
          <Title level={2} className="mb-2 flex items-center gap-3">
            <BellOutlined />
            알림센터
            {unreadCount > 0 && (
              <Badge count={unreadCount} style={{ backgroundColor: '#ff4d4f' }} />
            )}
          </Title>
          <Text type="secondary" className="text-base">
            프로젝트 관련 알림을 확인하세요
          </Text>
        </div>
      </div>

      {/* 컨트롤 패널 */}
      <Card className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* 필터 */}
          <Space wrap>
            <Select
              value={filterType}
              onChange={setFilterType}
              style={{ width: 120 }}
            >
              <Option value="all">전체</Option>
              <Option value="unread">안읽음</Option>
              <Option value="read">읽음</Option>
            </Select>
            
            {unreadCount > 0 && (
              <Button
                icon={<CheckSquareOutlined />}
                onClick={handleMarkAllAsRead}
              >
                모두 읽음 처리
              </Button>
            )}
          </Space>

          {/* 액션 버튼 */}
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={isRefreshing}
            >
              새로고침
            </Button>
            
            {selectedNotifications.length > 0 && (
              <Text type="secondary">{selectedNotifications.length}개 선택됨</Text>
            )}
          </Space>
        </div>
      </Card>

      {/* 알림 목록 */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spin size="large" />
          </div>
        ) : error ? (
          <Empty
            description={error}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : filteredNotifications.length === 0 ? (
          <Empty
            description={filterType === 'unread' ? '읽지 않은 알림이 없습니다' : filterType === 'read' ? '읽은 알림이 없습니다' : '알림이 없습니다'}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <>
            {/* 전체 선택 헤더 */}
            <div className="flex items-center justify-between mb-4 p-2 bg-gray-50 rounded">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
                <Text>전체 선택</Text>
              </label>
              <Text type="secondary">{filteredNotifications.length}개 알림</Text>
            </div>

            <List
              className="notification-list"
              dataSource={filteredNotifications}
              renderItem={(notification) => (
                <List.Item
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''} ${selectedNotifications.includes(notification.id) ? 'selected' : ''}`}
                >
                  <div className="notification-content" onClick={() => handleNotificationClick(notification)}>
                    {/* 체크박스 */}
                    <div 
                      className="notification-checkbox"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.id)}
                        onChange={() => toggleSelection(notification.id)}
                        className="rounded"
                      />
                    </div>

                    {/* 아이콘 */}
                    <div className="notification-icon">
                      {typeIcons[notification.type as keyof typeof typeIcons]}
                    </div>

                    {/* 메인 컨텐츠 */}
                    <div className="notification-main">
                      <div className="notification-header">
                        <div className="flex items-center gap-2">
                          <Text strong className="notification-title">
                            {notification.title}
                          </Text>
                          {!notification.is_read && (
                            <Badge status="processing" />
                          )}
                        </div>
                        <Space size="small">
                          <Tag 
                            color={typeColors[notification.type as keyof typeof typeColors]}
                            icon={typeIcons[notification.type as keyof typeof typeIcons]}
                          >
                            {typeLabels[notification.type as keyof typeof typeLabels]}
                          </Tag>
                          <Text type="secondary" className="notification-time">
                            {formatTime(notification.created_at)}
                          </Text>
                        </Space>
                      </div>

                      <div className="notification-body">
                        <Text className="notification-message">
                          {notification.message}
                        </Text>
                        
                        {/* 관련 정보 표시 */}
                        {notification.related_type === 'project' && notification.related_id && (
                          <div className="notification-project">
                            <ProjectOutlined className="mr-1" />
                            <Text type="secondary">프로젝트 관련</Text>
                          </div>
                        )}
                        
                        {/* 발송 상태 표시 */}
                        <div className="notification-meta">
                          <Space size="small">
                            {notification.kakao_sent && (
                              <Tag color="green" icon={<CheckOutlined />}>
                                카카오톡 발송
                              </Tag>
                            )}
                            {notification.email_sent && (
                              <Tag color="blue" icon={<CheckOutlined />}>
                                이메일 발송
                              </Tag>
                            )}
                          </Space>
                        </div>
                      </div>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </>
        )}
      </Card>

      <style jsx>{`
        .notifications-page {
          min-height: 100vh;
          background: var(--background-primary);
        }

        .notification-list .ant-list-item {
          border: none;
          padding: 0;
          margin-bottom: 1px;
        }

        .notification-item {
          background: var(--background-primary);
          border-left: 3px solid transparent;
          transition: all 0.2s;
          cursor: pointer;
        }

        .notification-item:hover {
          background: var(--background-secondary);
          border-left-color: var(--primary-color);
        }

        .notification-item.unread {
          background: rgba(24, 144, 255, 0.02);
          border-left-color: var(--primary-color);
        }

        .notification-item.selected {
          background: rgba(24, 144, 255, 0.05);
          border-left-color: var(--primary-color);
        }

        .notification-content {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          width: 100%;
        }

        .notification-checkbox {
          display: flex;
          align-items: center;
          margin-top: 2px;
        }

        .notification-icon {
          display: flex;
          align-items: center;
          font-size: 18px;
          margin-top: 2px;
        }

        .notification-main {
          flex: 1;
          min-width: 0;
        }

        .notification-header {
          display: flex;
          items: flex-start;
          justify-content: space-between;
          margin-bottom: 8px;
          gap: 12px;
        }

        .notification-title {
          color: var(--text-primary);
          margin-bottom: 4px;
          line-height: 1.4;
        }

        .notification-time {
          font-size: 12px;
          white-space: nowrap;
        }

        .notification-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .notification-message {
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .notification-project,
        .notification-sender {
          display: flex;
          align-items: center;
          font-size: 12px;
          color: var(--text-muted);
        }

        .space-y-4 > * + * {
          margin-top: 16px;
        }

        .space-y-3 > * + * {
          margin-top: 12px;
        }

        /* 반응형 */
        @media (max-width: 768px) {
          .notification-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .notification-content {
            padding: 12px;
            gap: 8px;
          }

          .notification-title {
            font-size: 14px;
          }

          .notification-message {
            font-size: 13px;
          }
        }

        /* 체크박스 스타일 */
        input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: var(--primary-color);
        }
      `}</style>
    </div>
  )
}