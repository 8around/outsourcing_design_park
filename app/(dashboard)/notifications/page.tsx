'use client'

import { useState, useEffect } from 'react'
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Badge,
  List,
  Avatar,
  Tag,
  Tooltip,
  Switch,
  Select,
  Divider,
  Empty,
  message,
  Modal
} from 'antd'
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  FilterOutlined,
  SettingOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ProjectOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TeamOutlined
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import moment from 'moment'

const { Title, Text } = Typography
const { Option } = Select

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  category: 'project' | 'approval' | 'deadline' | 'meeting' | 'system'
  priority: 'high' | 'medium' | 'low'
  isRead: boolean
  createdAt: Date
  projectId?: string
  projectName?: string
  actionUrl?: string
  sender?: string
  metadata?: Record<string, any>
}

const notificationIcons = {
  info: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
  success: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  warning: <WarningOutlined style={{ color: '#faad14' }} />,
  error: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
}

const categoryIcons = {
  project: <ProjectOutlined />,
  approval: <CheckOutlined />,
  deadline: <ClockCircleOutlined />,
  meeting: <TeamOutlined />,
  system: <SettingOutlined />
}

const categoryColors = {
  project: 'blue',
  approval: 'orange',
  deadline: 'red',
  meeting: 'green',
  system: 'purple'
}

const categoryLabels = {
  project: '프로젝트',
  approval: '승인',
  deadline: '마감일',
  meeting: '회의',
  system: '시스템'
}

export default function NotificationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all')

  // 임시 알림 데이터
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: '프로젝트 승인 요청',
        message: 'ABC 제조공장 설비 구축 프로젝트의 도면 승인이 필요합니다.',
        type: 'warning',
        category: 'approval',
        priority: 'high',
        isRead: false,
        createdAt: new Date('2024-03-01T10:30:00'),
        projectId: '1',
        projectName: 'ABC 제조공장 설비 구축',
        actionUrl: '/projects/1/approval',
        sender: '이영희',
        metadata: { stage: '도면설계', approvalType: 'design' }
      },
      {
        id: '2',
        title: '마감일 임박 알림',
        message: '자재 발주 작업이 3일 후 마감됩니다.',
        type: 'warning',
        category: 'deadline',
        priority: 'high',
        isRead: false,
        createdAt: new Date('2024-03-01T09:15:00'),
        projectId: '1',
        projectName: 'ABC 제조공장 설비 구축',
        actionUrl: '/projects/1',
        metadata: { daysLeft: 3, taskName: '자재 발주' }
      },
      {
        id: '3',
        title: '회의 일정 알림',
        message: '내일 오후 2시 프로젝트 중간 검토 회의가 있습니다.',
        type: 'info',
        category: 'meeting',
        priority: 'medium',
        isRead: false,
        createdAt: new Date('2024-02-29T16:00:00'),
        actionUrl: '/calendar',
        metadata: { meetingTime: '2024-03-02T14:00:00', location: '회의실 A' }
      },
      {
        id: '4',
        title: '작업 완료 보고',
        message: '레이저 가공 작업이 완료되었습니다.',
        type: 'success',
        category: 'project',
        priority: 'medium',
        isRead: true,
        createdAt: new Date('2024-02-29T14:30:00'),
        projectId: '1',
        projectName: 'ABC 제조공장 설비 구축',
        actionUrl: '/projects/1',
        sender: '정수진',
        metadata: { stage: '레이저', completionRate: 100 }
      },
      {
        id: '5',
        title: '새 댓글',
        message: 'XYZ 물류센터 건설 프로젝트에 새 댓글이 등록되었습니다.',
        type: 'info',
        category: 'project',
        priority: 'low',
        isRead: true,
        createdAt: new Date('2024-02-29T11:20:00'),
        projectId: '2',
        projectName: 'XYZ 물류센터 건설',
        actionUrl: '/projects/2/logs',
        sender: '송미래'
      },
      {
        id: '6',
        title: '시스템 업데이트',
        message: '시스템 유지보수가 완료되었습니다.',
        type: 'success',
        category: 'system',
        priority: 'low',
        isRead: true,
        createdAt: new Date('2024-02-28T23:00:00'),
        metadata: { updateVersion: '1.2.3', downtime: '30분' }
      },
      {
        id: '7',
        title: '예산 초과 경고',
        message: 'DEF 생산라인 확장 프로젝트의 예산이 90%에 도달했습니다.',
        type: 'error',
        category: 'project',
        priority: 'high',
        isRead: false,
        createdAt: new Date('2024-02-28T15:45:00'),
        projectId: '3',
        projectName: 'DEF 생산라인 확장',
        actionUrl: '/projects/3',
        metadata: { budgetUsed: 90, budgetRemaining: 10 }
      },
      {
        id: '8',
        title: '문서 승인 완료',
        message: '품질관리 시스템 계약서가 승인되었습니다.',
        type: 'success',
        category: 'approval',
        priority: 'medium',
        isRead: false,
        createdAt: new Date('2024-02-28T13:20:00'),
        projectId: '4',
        projectName: 'GHI 품질관리 시스템',
        actionUrl: '/projects/4',
        sender: '관리자'
      }
    ]

    setTimeout(() => {
      setNotifications(mockNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
      setLoading(false)
    }, 1000)
  }, [])

  // 필터링 로직
  useEffect(() => {
    let filtered = notifications

    // 읽음/안읽음 필터
    if (filterType === 'unread') {
      filtered = filtered.filter(n => !n.isRead)
    } else if (filterType === 'read') {
      filtered = filtered.filter(n => n.isRead)
    }

    setFilteredNotifications(filtered)
  }, [notifications, filterType])

  // 안읽은 알림 수
  const unreadCount = notifications.filter(n => !n.isRead).length

  // 알림 읽음 처리
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(notification =>
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification
    ))
  }

  // 알림 삭제
  const deleteNotification = (notificationId: string) => {
    Modal.confirm({
      title: '알림 삭제',
      content: '이 알림을 삭제하시겠습니까?',
      onOk: () => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        setSelectedNotifications(prev => prev.filter(id => id !== notificationId))
        message.success('알림이 삭제되었습니다')
      }
    })
  }

  // 선택된 알림 삭제
  const deleteSelectedNotifications = () => {
    if (selectedNotifications.length === 0) {
      message.warning('삭제할 알림을 선택하세요')
      return
    }

    Modal.confirm({
      title: '알림 삭제',
      content: `선택한 ${selectedNotifications.length}개의 알림을 삭제하시겠습니까?`,
      onOk: () => {
        setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n.id)))
        setSelectedNotifications([])
        message.success('선택한 알림들이 삭제되었습니다')
      }
    })
  }

  // 알림 클릭 처리
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl)
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
  const formatTime = (date: Date) => {
    const now = moment()
    const notificationTime = moment(date)
    
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
          </Space>

          {/* 액션 버튼 */}
          <Space>
            {selectedNotifications.length > 0 && (
              <>
                <Text type="secondary">{selectedNotifications.length}개 선택됨</Text>
                <Button 
                  danger
                  icon={<DeleteOutlined />}
                  onClick={deleteSelectedNotifications}
                >
                  선택 삭제
                </Button>
              </>
            )}
          </Space>
        </div>
      </Card>

      {/* 알림 목록 */}
      <Card>
        {filteredNotifications.length === 0 ? (
          <Empty
            description="알림이 없습니다"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <>
            {/* 전체 선택 헤더 */}
            <div className="flex items-center justify-between mb-4 p-2 bg-gray-50 rounded">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedNotifications.length === filteredNotifications.length}
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
                  className={`notification-item ${!notification.isRead ? 'unread' : ''} ${selectedNotifications.includes(notification.id) ? 'selected' : ''}`}
                  actions={[
                    <Tooltip title="삭제" key="delete">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                      />
                    </Tooltip>
                  ]}
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
                      {notificationIcons[notification.type]}
                    </div>

                    {/* 메인 컨텐츠 */}
                    <div className="notification-main">
                      <div className="notification-header">
                        <div className="flex items-center gap-2">
                          <Text strong className="notification-title">
                            {notification.title}
                          </Text>
                          {!notification.isRead && (
                            <Badge status="processing" />
                          )}
                        </div>
                        <Space size="small">
                          <Tag 
                            color={categoryColors[notification.category]}
                            icon={categoryIcons[notification.category]}
                          >
                            {categoryLabels[notification.category]}
                          </Tag>
                          {notification.priority === 'high' && (
                            <Tag color="red">긴급</Tag>
                          )}
                          <Text type="secondary" className="notification-time">
                            {formatTime(notification.createdAt)}
                          </Text>
                        </Space>
                      </div>

                      <div className="notification-body">
                        <Text className="notification-message">
                          {notification.message}
                        </Text>
                        
                        {notification.projectName && (
                          <div className="notification-project">
                            <ProjectOutlined className="mr-1" />
                            <Text type="secondary">{notification.projectName}</Text>
                          </div>
                        )}
                        
                        {notification.sender && (
                          <div className="notification-sender">
                            <UserOutlined className="mr-1" />
                            <Text type="secondary">{notification.sender}</Text>
                          </div>
                        )}
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