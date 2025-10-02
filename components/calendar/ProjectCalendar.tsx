'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Card,
  Button,
  Space,
  Typography,
  Modal,
  Tag,
  Descriptions,
  Drawer,
  List,
  message
} from 'antd'
import {
  CalendarOutlined,
  UserOutlined,
  ProjectOutlined,
  ExclamationCircleOutlined,
  PlusOutlined
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import moment from 'moment'
import 'moment/locale/ko'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import koLocale from '@fullcalendar/core/locales/ko'
import { EventClickArg, EventDropArg, EventContentArg } from '@fullcalendar/core'
import { DateClickArg } from '@fullcalendar/interaction'
import { createClient } from '@/lib/supabase/client'
import { Project, ProcessStage, PROCESS_STAGES } from '@/types/project'
import { useAuth } from '@/lib/hooks/useAuth'

const { Title, Text } = Typography

moment.locale('ko')

// 프로젝트 상태 타입
type ProjectStatus = 'normal' | 'delayed' | 'completed' | 'waiting' | 'urgent'

// 캘린더 이벤트 타입
interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  backgroundColor: string
  borderColor: string
  textColor: string
  classNames?: string[]
  extendedProps: {
    projectId: string
    siteName: string
    status: ProjectStatus
    salesManager?: string
    siteManager?: string
    currentStage: string
    isUrgent: boolean
    processStages?: ProcessStage[]
    productName: string
    productQuantity: number
    contractDate?: string
    completionDate?: string
  }
}

// 프로젝트 상태별 색상
const statusColors = {
  normal: '#3B82F6',    // 파란색
  delayed: '#EF4444',   // 빨간색
  completed: '#10B981', // 초록색
  waiting: '#6B7280',   // 회색
  urgent: '#F97316'     // 주황색
}

// 상태 라벨
const statusLabels = {
  normal: '정상 진행',
  delayed: '지연',
  completed: '완료',
  waiting: '대기',
  urgent: '긴급'
}

export default function ProjectCalendar() {
  const router = useRouter()
  const calendarRef = useRef<FullCalendar>(null)
  const { user } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [eventModalVisible, setEventModalVisible] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [currentView, setCurrentView] = useState('dayGridMonth')
  const [dateDrawerVisible, setDateDrawerVisible] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedDateProjects, setSelectedDateProjects] = useState<CalendarEvent[]>([])
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [draggedEvent, setDraggedEvent] = useState<EventDropArg | null>(null)
  
  const isAdmin = user?.role === 'admin'

  // 프로젝트 데이터 가져오기
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      // 먼저 프로젝트 데이터만 가져옵니다
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          process_stages (*)
        `)
        .order('created_at', { ascending: false })

      if (projectsError) {
        console.error('Error fetching projects:', projectsError)
        // 외래 키 관계 없이 기본 데이터만 가져오도록 재시도
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (fallbackError) throw fallbackError
        setProjects(fallbackData || [])
        return
      }
      
      setProjects(projectsData || [])
      
    } catch (error) {
      console.error('Error fetching projects:', error)
      message.error('프로젝트 데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // 프로젝트를 캘린더 이벤트로 변환
  const convertProjectsToEvents = useCallback((projects: Project[]): CalendarEvent[] => {
    return projects.map(project => {
      // 계약 시작일과 준공 종료일 결정
      const contractStage = project.process_stages?.find(s => s.stage_name === 'contract')
      const completionStage = project.process_stages?.find(s => s.stage_name === 'completion')
      
      const startDate = contractStage?.start_date || project.order_date
      const endDate = completionStage?.end_date || project.expected_completion_date
      
      // 프로젝트 상태 결정
      let status: ProjectStatus = 'normal'
      if (project.is_urgent) {
        status = 'urgent'
      } else if (completionStage?.status === 'completed') {
        status = 'completed'
      } else if (project.process_stages?.some(s => s.status === 'delayed')) {
        status = 'delayed'
      } else if (project.process_stages?.some(s => s.status === 'waiting')) {
        status = 'waiting'
      }
      
      return {
        id: project.id,
        title: project.site_name,
        start: startDate,
        end: moment(endDate).add(1, 'day').format('YYYY-MM-DD'), // FullCalendar는 end date를 exclusive로 처리
        allDay: true,
        backgroundColor: statusColors[status],
        borderColor: statusColors[status],
        textColor: '#FFFFFF',
        classNames: status === 'urgent' ? ['urgent-event'] : [],
        extendedProps: {
          projectId: project.id,
          siteName: project.site_name,
          status: status,
          salesManager: project.sales_manager || '',
          siteManager: project.site_manager || '',
          currentStage: PROCESS_STAGES[project.current_process_stage],
          isUrgent: project.is_urgent,
          processStages: project.process_stages,
          productName: project.product_name,
          productQuantity: project.product_quantity,
          contractDate: startDate,
          completionDate: endDate
        }
      }
    })
  }, [])

  // 이벤트 생성
  const filteredEvents = useMemo(() => {
    return convertProjectsToEvents(projects)
  }, [projects, convertProjectsToEvents])

  // 초기 데이터 로드
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // 이벤트 클릭 핸들러
  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const event = clickInfo.event
    const extendedProps = event.extendedProps as Record<string, unknown>
    
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.startStr,
      end: event.endStr,
      allDay: event.allDay,
      backgroundColor: event.backgroundColor || statusColors.normal,
      borderColor: event.borderColor || statusColors.normal,
      textColor: '#FFFFFF',
      extendedProps: extendedProps as CalendarEvent['extendedProps']
    })
    setEventModalVisible(true)
  }, [])

  // 날짜 클릭 핸들러
  const handleDateClick = useCallback((arg: DateClickArg) => {
    const clickedDate = arg.dateStr
    setSelectedDate(clickedDate)
    
    // 해당 날짜에 진행 중인 프로젝트 찾기
    const projectsOnDate = filteredEvents.filter(event => {
      const eventStart = moment(event.start)
      const eventEnd = moment(event.end).subtract(1, 'day') // exclusive end date 보정
      const clickDate = moment(clickedDate)
      
      return clickDate.isSameOrAfter(eventStart, 'day') && 
             clickDate.isSameOrBefore(eventEnd, 'day')
    })
    
    setSelectedDateProjects(projectsOnDate)
    setDateDrawerVisible(true)
  }, [filteredEvents])

  // 드래그 앤 드롭 핸들러
  const handleEventDrop = useCallback((arg: EventDropArg) => {
    if (!isAdmin) {
      message.warning('관리자만 일정을 변경할 수 있습니다')
      arg.revert()
      return
    }
    
    setDraggedEvent(arg)
    setConfirmModalVisible(true)
  }, [isAdmin])

  // 일정 변경 확인
  const confirmScheduleChange = useCallback(async () => {
    if (!draggedEvent) return
    
    try {
      const projectId = draggedEvent.event.extendedProps.projectId
      const newStart = draggedEvent.event.startStr
      const newEnd = moment(draggedEvent.event.endStr).subtract(1, 'day').format('YYYY-MM-DD')
      
      // 프로젝트 업데이트
      const { error } = await supabase
        .from('projects')
        .update({
          order_date: newStart,
          expected_completion_date: newEnd,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
      
      if (error) throw error
      
      message.success('일정이 변경되었습니다')
      setConfirmModalVisible(false)
      setDraggedEvent(null)
      fetchProjects()
    } catch (error) {
      console.error('Error updating schedule:', error)
      message.error('일정 변경에 실패했습니다')
      draggedEvent.revert()
    }
  }, [draggedEvent, supabase, fetchProjects])

  // 커스텀 이벤트 렌더링
  const renderEventContent = useCallback((eventInfo: EventContentArg) => {
    const isUrgent = eventInfo.event.extendedProps.isUrgent
    
    return (
      <div className="fc-event-custom" style={{ 
        padding: '2px 4px', 
        borderRadius: '4px',
        backgroundColor: eventInfo.event.backgroundColor,
        color: '#FFFFFF',
        fontSize: '12px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        position: 'relative'
      }}>
        {isUrgent && (
          <ExclamationCircleOutlined style={{ 
            marginRight: '4px',
            fontSize: '12px'
          }} />
        )}
        <span>{eventInfo.event.title}</span>
      </div>
    )
  }, [])

  return (
    <div className="calendar-page">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title level={2} className="mb-2">프로젝트 캘린더</Title>
          <Text type="secondary" className="text-base">
            프로젝트 일정을 한눈에 확인하고 관리하세요
          </Text>
        </div>
        <Button 
          icon={<PlusOutlined />}
          type="primary"
          onClick={() => router.push('/projects/new')}
        >
          새 프로젝트
        </Button>
      </div>

      {/* 캘린더 뷰 */}
      <Card loading={loading}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={currentView}
          locale={koLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={filteredEvents}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventDrop={handleEventDrop}
          eventContent={renderEventContent}
          height="auto"
          weekends={true}
          editable={isAdmin}
          droppable={isAdmin}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={3}
          eventDisplay="block"
          displayEventTime={false}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false
          }}
          buttonText={{
            today: '오늘',
            month: '월',
            week: '주',
            day: '일'
          }}
          views={{
            dayGridMonth: {
              titleFormat: { year: 'numeric', month: 'long' },
              dayMaxEventRows: 3
            },
            timeGridWeek: {
              titleFormat: { year: 'numeric', month: 'short', day: 'numeric' }
            },
            timeGridDay: {
              titleFormat: { year: 'numeric', month: 'long', day: 'numeric' }
            }
          }}
          datesSet={(dateInfo) => {
            setCurrentView(dateInfo.view.type)
          }}
        />
      </Card>

      {/* 프로젝트 상세 정보 모달 */}
      <Modal
        title={
          <Space>
            <ProjectOutlined />
            프로젝트 상세 정보
          </Space>
        }
        open={eventModalVisible}
        onCancel={() => {
          setEventModalVisible(false)
          setSelectedEvent(null)
        }}
        footer={[
          <Button 
            key="detail" 
            type="primary"
            onClick={() => {
              router.push(`/projects/${selectedEvent?.extendedProps.projectId}`)
            }}
          >
            상세 페이지로 이동
          </Button>,
          <Button 
            key="close" 
            onClick={() => {
              setEventModalVisible(false)
              setSelectedEvent(null)
            }}
          >
            닫기
          </Button>
        ]}
        width={700}
      >
        {selectedEvent && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="현장명" span={2}>
              <strong>{selectedEvent.extendedProps.siteName}</strong>
              {selectedEvent.extendedProps.isUrgent && (
                <Tag color="orange" className="ml-2">
                  <ExclamationCircleOutlined /> 긴급
                </Tag>
              )}
            </Descriptions.Item>
            
            <Descriptions.Item label="상태">
              <Tag color={statusColors[selectedEvent.extendedProps.status]}>
                {statusLabels[selectedEvent.extendedProps.status]}
              </Tag>
            </Descriptions.Item>
            
            <Descriptions.Item label="현재 공정">
              {selectedEvent.extendedProps.currentStage}
            </Descriptions.Item>
            
            <Descriptions.Item label="제품명">
              {selectedEvent.extendedProps.productName}
            </Descriptions.Item>
            
            <Descriptions.Item label="수량">
              {selectedEvent.extendedProps.productQuantity}개
            </Descriptions.Item>
            
            <Descriptions.Item label="영업담당자">
              <Space>
                <UserOutlined />
                {selectedEvent.extendedProps.salesManager || '-'}
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="현장담당자">
              <Space>
                <UserOutlined />
                {selectedEvent.extendedProps.siteManager || '-'}
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="계약일">
              <Space>
                <CalendarOutlined />
                {moment(selectedEvent.extendedProps.contractDate).format('YYYY-MM-DD')}
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="준공예정일">
              <Space>
                <CalendarOutlined />
                {moment(selectedEvent.extendedProps.completionDate).format('YYYY-MM-DD')}
              </Space>
            </Descriptions.Item>
            
            {selectedEvent.extendedProps.processStages && 
             selectedEvent.extendedProps.processStages.length > 0 && (
              <Descriptions.Item label="공정 단계별 일정" span={2}>
                <List
                  size="small"
                  dataSource={selectedEvent.extendedProps.processStages}
                  renderItem={(stage) => (
                    <List.Item>
                      <Text>{PROCESS_STAGES[stage.stage_name]}</Text>
                      {stage.start_date && stage.end_date && (
                        <Text type="secondary" className="ml-2">
                          ({moment(stage.start_date).format('MM/DD')} ~ {moment(stage.end_date).format('MM/DD')})
                        </Text>
                      )}
                    </List.Item>
                  )}
                />
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* 날짜별 프로젝트 사이드 패널 */}
      <Drawer
        title={
          <Space>
            <CalendarOutlined />
            {selectedDate && moment(selectedDate).format('YYYY년 MM월 DD일')} 프로젝트
          </Space>
        }
        placement="right"
        onClose={() => setDateDrawerVisible(false)}
        open={dateDrawerVisible}
        width={400}
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => router.push('/projects/new')}
          >
            새 프로젝트
          </Button>
        }
      >
        {selectedDateProjects.length > 0 ? (
          <List
            dataSource={selectedDateProjects}
            renderItem={(project) => (
              <List.Item
                actions={[
                  <Button 
                    key="view"
                    type="link"
                    onClick={() => {
                      router.push(`/projects/${project.extendedProps.projectId}`)
                    }}
                  >
                    상세보기
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      {project.extendedProps.siteName}
                      {project.extendedProps.isUrgent && (
                        <Tag color="orange" style={{ marginLeft: 4 }}>
                          긴급
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small">
                      <Text type="secondary">
                        {project.extendedProps.currentStage}
                      </Text>
                      <Tag color={statusColors[project.extendedProps.status]}>
                        {statusLabels[project.extendedProps.status]}
                      </Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <div className="text-center py-8">
            <Text type="secondary">이 날짜에 진행 중인 프로젝트가 없습니다</Text>
          </div>
        )}
      </Drawer>

      {/* 일정 변경 확인 모달 */}
      <Modal
        title="일정 변경 확인"
        open={confirmModalVisible}
        onOk={confirmScheduleChange}
        onCancel={() => {
          setConfirmModalVisible(false)
          draggedEvent?.revert()
          setDraggedEvent(null)
        }}
        okText="변경"
        cancelText="취소"
      >
        <p>프로젝트 일정을 변경하시겠습니까?</p>
        {draggedEvent && (
          <div className="mt-4">
            <Text strong>프로젝트: </Text>
            <Text>{draggedEvent.event.title}</Text>
            <br />
            <Text strong>새로운 기간: </Text>
            <Text>
              {moment(draggedEvent.event.startStr).format('YYYY-MM-DD')} ~ {' '}
              {moment(draggedEvent.event.endStr).subtract(1, 'day').format('YYYY-MM-DD')}
            </Text>
          </div>
        )}
      </Modal>

      <style jsx global>{`
        .calendar-page {
          min-height: 100vh;
          background: #f5f5f5;
          padding: 24px;
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

        .fc-daygrid-day.fc-day-today {
          background: rgba(24, 144, 255, 0.05) !important;
        }

        .fc-event {
          border: none !important;
          padding: 2px 4px;
          font-size: 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .fc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }

        .fc-event.urgent-event {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(249, 115, 22, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(249, 115, 22, 0);
          }
        }

        .fc-daygrid-event {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .fc-daygrid-day-frame {
          min-height: 100px;
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

        .fc-button-active {
          background-color: #096dd9 !important;
          border-color: #096dd9 !important;
        }

        .fc-toolbar-title {
          font-size: 20px;
          font-weight: 600;
        }

        /* 주말 스타일 */
        .fc-day-sun .fc-daygrid-day-number,
        .fc-day-sat .fc-daygrid-day-number {
          color: #ff4d4f;
        }
      `}</style>
    </div>
  )
}