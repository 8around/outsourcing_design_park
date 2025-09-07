'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Modal,
  Tag,
  Descriptions
} from 'antd'
import {
  CalendarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ProjectOutlined
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import moment, { Moment } from 'moment'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import koLocale from '@fullcalendar/core/locales/ko'
import { EventClickArg } from '@fullcalendar/core'

const { Title, Text } = Typography

interface CalendarEvent {
  id: string
  title: string
  start: Date | string
  end?: Date | string
  allDay?: boolean
  description?: string
  type: 'milestone' | 'meeting' | 'deadline' | 'task' | 'approval'
  priority: 'high' | 'medium' | 'low'
  projectId: string
  projectName: string
  assignee: string
  color?: string
  backgroundColor?: string
  borderColor?: string
  status: 'scheduled' | 'completed' | 'cancelled'
  extendedProps?: {
    type: string
    priority: string
    projectId: string
    projectName: string
    assignee: string
    status: string
    description?: string
  }
}

const eventTypeColors = {
  milestone: '#722ed1',
  meeting: '#13c2c2',
  deadline: '#ff4d4f',
  task: '#1890ff',
  approval: '#fa8c16'
}

const eventTypeLabels = {
  milestone: '마일스톤',
  meeting: '회의',
  deadline: '마감일',
  task: '작업',
  approval: '승인'
}

export default function CalendarPage() {
  const router = useRouter()
  const calendarRef = useRef<FullCalendar>(null)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [eventModalVisible, setEventModalVisible] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [currentView, setCurrentView] = useState('dayGridMonth')

  // 임시 캘린더 데이터
  useEffect(() => {
    const mockEvents: CalendarEvent[] = [
      {
        id: '1',
        title: '프로젝트 킥오프 미팅',
        start: '2024-01-15T09:00:00',
        end: '2024-01-15T11:00:00',
        allDay: false,
        type: 'meeting',
        priority: 'high',
        projectId: '1',
        projectName: 'ABC 제조공장 설비 구축',
        assignee: '김철수',
        backgroundColor: eventTypeColors.meeting,
        borderColor: eventTypeColors.meeting,
        status: 'completed',
        extendedProps: {
          type: 'meeting',
          priority: 'high',
          projectId: '1',
          projectName: 'ABC 제조공장 설비 구축',
          assignee: '김철수',
          status: 'completed',
          description: 'ABC 제조공장 설비 구축 프로젝트 시작 회의'
        }
      },
      {
        id: '2',
        title: '도면 승인 마감',
        start: '2024-03-10',
        allDay: true,
        type: 'deadline',
        priority: 'high',
        projectId: '1',
        projectName: 'ABC 제조공장 설비 구축',
        assignee: '이영희',
        backgroundColor: eventTypeColors.deadline,
        borderColor: eventTypeColors.deadline,
        status: 'scheduled',
        extendedProps: {
          type: 'deadline',
          priority: 'high',
          projectId: '1',
          projectName: 'ABC 제조공장 설비 구축',
          assignee: '이영희',
          status: 'scheduled',
          description: '상세 도면 작성 완료 및 승인 요청'
        }
      },
      {
        id: '3',
        title: '자재 발주 완료',
        start: '2024-03-20',
        allDay: true,
        type: 'milestone',
        priority: 'medium',
        projectId: '1',
        projectName: 'ABC 제조공장 설비 구축',
        assignee: '박민수',
        backgroundColor: eventTypeColors.milestone,
        borderColor: eventTypeColors.milestone,
        status: 'scheduled',
        extendedProps: {
          type: 'milestone',
          priority: 'medium',
          projectId: '1',
          projectName: 'ABC 제조공장 설비 구축',
          assignee: '박민수',
          status: 'scheduled'
        }
      },
      {
        id: '4',
        title: '레이저 가공 시작',
        start: '2024-03-15T08:00:00',
        end: '2024-03-15T17:00:00',
        allDay: false,
        type: 'task',
        priority: 'high',
        projectId: '1',
        projectName: 'ABC 제조공장 설비 구축',
        assignee: '정수진',
        backgroundColor: eventTypeColors.task,
        borderColor: eventTypeColors.task,
        status: 'scheduled',
        extendedProps: {
          type: 'task',
          priority: 'high',
          projectId: '1',
          projectName: 'ABC 제조공장 설비 구축',
          assignee: '정수진',
          status: 'scheduled'
        }
      },
      {
        id: '5',
        title: '중간 검토 회의',
        start: '2024-04-01T14:00:00',
        end: '2024-04-01T16:00:00',
        allDay: false,
        type: 'meeting',
        priority: 'medium',
        projectId: '1',
        projectName: 'ABC 제조공장 설비 구축',
        assignee: '김철수',
        backgroundColor: eventTypeColors.meeting,
        borderColor: eventTypeColors.meeting,
        status: 'scheduled',
        extendedProps: {
          type: 'meeting',
          priority: 'medium',
          projectId: '1',
          projectName: 'ABC 제조공장 설비 구축',
          assignee: '김철수',
          status: 'scheduled',
          description: '프로젝트 진행 상황 검토 및 일정 조정'
        }
      },
      // XYZ 물류센터 이벤트
      {
        id: '6',
        title: '부지 조사 완료',
        start: '2024-02-20',
        allDay: true,
        type: 'milestone',
        priority: 'high',
        projectId: '2',
        projectName: 'XYZ 물류센터 건설',
        assignee: '임지은',
        backgroundColor: eventTypeColors.milestone,
        borderColor: eventTypeColors.milestone,
        status: 'completed',
        extendedProps: {
          type: 'milestone',
          priority: 'high',
          projectId: '2',
          projectName: 'XYZ 물류센터 건설',
          assignee: '임지은',
          status: 'completed'
        }
      },
      {
        id: '7',
        title: '설계 승인 요청',
        start: '2024-03-30',
        allDay: true,
        type: 'approval',
        priority: 'high',
        projectId: '2',
        projectName: 'XYZ 물류센터 건설',
        assignee: '오준석',
        backgroundColor: eventTypeColors.approval,
        borderColor: eventTypeColors.approval,
        status: 'scheduled',
        extendedProps: {
          type: 'approval',
          priority: 'high',
          projectId: '2',
          projectName: 'XYZ 물류센터 건설',
          assignee: '오준석',
          status: 'scheduled'
        }
      },
      {
        id: '8',
        title: '기초 공사 시작',
        start: '2024-03-25T07:00:00',
        end: '2024-03-25T18:00:00',
        allDay: false,
        type: 'task',
        priority: 'medium',
        projectId: '2',
        projectName: 'XYZ 물류센터 건설',
        assignee: '송미래',
        backgroundColor: eventTypeColors.task,
        borderColor: eventTypeColors.task,
        status: 'scheduled',
        extendedProps: {
          type: 'task',
          priority: 'medium',
          projectId: '2',
          projectName: 'XYZ 물류센터 건설',
          assignee: '송미래',
          status: 'scheduled'
        }
      }
    ]

    setTimeout(() => {
      setEvents(mockEvents)
      setLoading(false)
    }, 1000)
  }, [])


  // FullCalendar 이벤트 클릭 핸들러 - 상세 정보 보기용
  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event
    const extendedProps = event.extendedProps as any
    
    const selectedEventData: CalendarEvent = {
      id: event.id,
      title: event.title,
      start: event.start || new Date(),
      end: event.end || event.start || new Date(),
      allDay: event.allDay,
      type: extendedProps.type,
      priority: extendedProps.priority,
      projectId: extendedProps.projectId,
      projectName: extendedProps.projectName,
      assignee: extendedProps.assignee,
      status: extendedProps.status,
      description: extendedProps.description
    }
    
    setSelectedEvent(selectedEventData)
    setEventModalVisible(true)
  }

  // 우선순위 라벨
  const priorityLabels: Record<string, string> = {
    high: '높음',
    medium: '보통',
    low: '낮음'
  }

  // 상태 라벨
  const statusLabels: Record<string, string> = {
    scheduled: '예정',
    completed: '완료',
    cancelled: '취소'
  }

  // FullCalendar 커스텀 이벤트 렌더링
  const renderEventContent = (eventInfo: any) => {
    return (
      <div className="fc-event-custom">
        <div className="fc-event-time">{eventInfo.timeText}</div>
        <div className="fc-event-title">{eventInfo.event.title}</div>
        {eventInfo.event.extendedProps.assignee && (
          <div className="fc-event-assignee">
            <UserOutlined /> {eventInfo.event.extendedProps.assignee}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="calendar-page container mx-auto px-6 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title level={2} className="mb-2">프로젝트 캘린더</Title>
          <Text type="secondary" className="text-base">
            프로젝트 일정을 한눈에 확인하세요
          </Text>
        </div>
      </div>


      {/* 캘린더 뷰 */}
      <Card className="calendar-container" loading={loading}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={currentView}
          locale={koLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={events}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          height="auto"
          weekends={true}
          editable={false}
          selectable={false}
          selectMirror={false}
          dayMaxEvents={3}
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5],
            startTime: '09:00',
            endTime: '18:00'
          }}
          buttonText={{
            today: '오늘',
            month: '월',
            week: '주',
            day: '일'
          }}
          views={{
            dayGridMonth: {
              titleFormat: { year: 'numeric', month: 'long' }
            },
            timeGridWeek: {
              titleFormat: { year: 'numeric', month: 'short', day: 'numeric' }
            }
          }}
          eventMouseEnter={(info) => {
            info.el.style.cursor = 'pointer'
          }}
          datesSet={(dateInfo) => {
            setCurrentView(dateInfo.view.type)
          }}
        />
      </Card>

      {/* 범례 */}
      <Card className="mt-4">
        <div className="flex flex-wrap gap-6">
          <div>
            <Title level={5} className="mb-2">이벤트 유형</Title>
            <Space wrap>
              {Object.entries(eventTypeLabels).map(([key, label]) => (
                <Tag key={key} color={eventTypeColors[key as keyof typeof eventTypeColors]}>
                  {label}
                </Tag>
              ))}
            </Space>
          </div>
        </div>
      </Card>

      {/* 이벤트 상세 정보 모달 (읽기 전용) */}
      <Modal
        title="이벤트 상세 정보"
        open={eventModalVisible}
        onCancel={() => {
          setEventModalVisible(false)
          setSelectedEvent(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setEventModalVisible(false)
            setSelectedEvent(null)
          }}>
            닫기
          </Button>
        ]}
        width={600}
      >
        {selectedEvent && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="제목">
              <strong>{selectedEvent.title}</strong>
            </Descriptions.Item>
            
            <Descriptions.Item label="프로젝트">
              <Space>
                <ProjectOutlined />
                {selectedEvent.projectName}
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="유형">
              <Tag color={eventTypeColors[selectedEvent.type]}>
                {eventTypeLabels[selectedEvent.type]}
              </Tag>
            </Descriptions.Item>
            
            <Descriptions.Item label="우선순위">
              <Tag color={
                selectedEvent.priority === 'high' ? 'red' : 
                selectedEvent.priority === 'medium' ? 'orange' : 'green'
              }>
                {priorityLabels[selectedEvent.priority]}
              </Tag>
            </Descriptions.Item>
            
            <Descriptions.Item label="상태">
              <Tag color={
                selectedEvent.status === 'completed' ? 'green' :
                selectedEvent.status === 'cancelled' ? 'red' : 'blue'
              }>
                {statusLabels[selectedEvent.status]}
              </Tag>
            </Descriptions.Item>
            
            <Descriptions.Item label="담당자">
              <Space>
                <UserOutlined />
                {selectedEvent.assignee}
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="시작">
              <Space>
                <ClockCircleOutlined />
                {moment(selectedEvent.start).format(
                  selectedEvent.allDay ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm'
                )}
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="종료">
              <Space>
                <ClockCircleOutlined />
                {moment(selectedEvent.end).format(
                  selectedEvent.allDay ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm'
                )}
              </Space>
            </Descriptions.Item>
            
            {selectedEvent.description && (
              <Descriptions.Item label="설명">
                {selectedEvent.description}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      <style jsx global>{`
        .calendar-page {
          min-height: 100vh;
          background: #f5f5f5;
        }

        .calendar-container {
          overflow: visible;
        }

        /* FullCalendar 스타일 커스터마이징 */
        .fc {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .fc-theme-standard th {
          background: #fafafa;
          font-weight: 600;
          font-size: 13px;
        }

        .fc-col-header-cell {
          padding: 12px 0;
        }

        .fc-daygrid-day-number {
          font-size: 14px;
          font-weight: 500;
          padding: 8px;
        }

        .fc-daygrid-day.fc-day-today {
          background: rgba(24, 144, 255, 0.05) !important;
        }

        .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
          background: #1890ff;
          color: white;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 4px;
        }

        .fc-event {
          border: none;
          padding: 2px 4px;
          font-size: 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .fc-event:hover {
          opacity: 0.8;
        }

        .fc-event-custom {
          padding: 2px 4px;
        }

        .fc-event-custom .fc-event-time {
          font-size: 10px;
          opacity: 0.9;
        }

        .fc-event-custom .fc-event-title {
          font-weight: 500;
          font-size: 11px;
          margin-top: 1px;
        }

        .fc-event-custom .fc-event-assignee {
          font-size: 10px;
          opacity: 0.8;
          margin-top: 2px;
        }

        .fc-timegrid-event {
          border-radius: 4px;
          padding: 4px;
        }

        .fc-timegrid-event .fc-event-title {
          font-weight: 500;
        }

        .fc-more-link {
          font-size: 11px;
          color: #1890ff;
          font-weight: 500;
        }

        .fc-button-primary {
          background-color: #1890ff;
          border-color: #1890ff;
        }

        .fc-button-primary:hover {
          background-color: #40a9ff;
          border-color: #40a9ff;
        }

        .fc-button-primary:disabled {
          background-color: #1890ff;
          border-color: #1890ff;
        }

        .fc-button-active {
          background-color: #096dd9 !important;
          border-color: #096dd9 !important;
        }

        .fc-toolbar-title {
          font-size: 20px;
          font-weight: 600;
        }

        .fc-daygrid-day-frame {
          min-height: 100px;
        }

        .fc-timegrid-slot {
          height: 50px;
        }

        .fc-timegrid-slot-label {
          font-size: 11px;
        }

        .fc-scrollgrid {
          border: 1px solid #e8e8e8;
          border-radius: 8px;
        }

        .fc-view-harness {
          background: white;
          border-radius: 8px;
        }

        /* 주말 스타일 */
        .fc-day-sun .fc-daygrid-day-number,
        .fc-day-sat .fc-daygrid-day-number {
          color: #ff4d4f;
        }

        /* 비즈니스 아워 */
        .fc-non-business {
          background: #fafafa;
        }

        /* 반응형 */
        @media (max-width: 768px) {
          .fc-toolbar {
            flex-direction: column;
            gap: 12px;
          }

          .fc-toolbar-title {
            font-size: 16px;
          }

          .fc-button {
            padding: 4px 8px;
            font-size: 12px;
          }

          .fc-daygrid-day-frame {
            min-height: 80px;
          }
        }
      `}</style>
    </div>
  )
}