'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Card, 
  Button, 
  Select, 
  Space, 
  Typography, 
  DatePicker, 
  Tooltip, 
  Progress,
  Tag,
  Divider,
  Modal,
  Form,
  Input,
  message
} from 'antd'
import {
  CalendarOutlined,
  FilterOutlined,
  FullscreenOutlined,
  ExpandOutlined,
  CompressOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

interface Task {
  id: string
  name: string
  start: Date
  end: Date
  progress: number
  status: 'completed' | 'in-progress' | 'pending' | 'delayed'
  dependencies?: string[]
  assignee: string
  priority: 'high' | 'medium' | 'low'
  projectId: string
  projectName: string
}

interface GanttViewState {
  viewMode: 'day' | 'week' | 'month'
  dateRange: [Date, Date]
  selectedProject: string | null
  showCriticalPath: boolean
  isFullscreen: boolean
}

export default function GanttPage() {
  const router = useRouter()
  const ganttRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [viewState, setViewState] = useState<GanttViewState>({
    viewMode: 'week',
    dateRange: [
      new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000), // 30일 전
      new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000)  // 90일 후
    ],
    selectedProject: null,
    showCriticalPath: false,
    isFullscreen: false
  })
  
  const [form] = Form.useForm()

  // 임시 간트차트 데이터
  useEffect(() => {
    const mockTasks: Task[] = [
      {
        id: '1',
        name: '계약 및 기본 설계',
        start: new Date('2024-01-15'),
        end: new Date('2024-02-15'),
        progress: 100,
        status: 'completed',
        assignee: '김철수',
        priority: 'high',
        projectId: '1',
        projectName: 'ABC 제조공장 설비 구축'
      },
      {
        id: '2',
        name: '상세 도면 작성',
        start: new Date('2024-02-10'),
        end: new Date('2024-03-10'),
        progress: 100,
        status: 'completed',
        dependencies: ['1'],
        assignee: '이영희',
        priority: 'high',
        projectId: '1',
        projectName: 'ABC 제조공장 설비 구축'
      },
      {
        id: '3',
        name: '자재 발주',
        start: new Date('2024-03-01'),
        end: new Date('2024-03-20'),
        progress: 90,
        status: 'in-progress',
        dependencies: ['2'],
        assignee: '박민수',
        priority: 'medium',
        projectId: '1',
        projectName: 'ABC 제조공장 설비 구축'
      },
      {
        id: '4',
        name: '레이저 가공',
        start: new Date('2024-03-15'),
        end: new Date('2024-04-15'),
        progress: 75,
        status: 'in-progress',
        dependencies: ['3'],
        assignee: '정수진',
        priority: 'high',
        projectId: '1',
        projectName: 'ABC 제조공장 설비 구축'
      },
      {
        id: '5',
        name: '용접 작업',
        start: new Date('2024-04-10'),
        end: new Date('2024-05-10'),
        progress: 30,
        status: 'in-progress',
        dependencies: ['4'],
        assignee: '최동원',
        priority: 'high',
        projectId: '1',
        projectName: 'ABC 제조공장 설비 구축'
      },
      {
        id: '6',
        name: '도장 작업',
        start: new Date('2024-05-05'),
        end: new Date('2024-05-25'),
        progress: 0,
        status: 'pending',
        dependencies: ['5'],
        assignee: '한솔희',
        priority: 'medium',
        projectId: '1',
        projectName: 'ABC 제조공장 설비 구축'
      },
      {
        id: '7',
        name: '현장 설치',
        start: new Date('2024-05-20'),
        end: new Date('2024-06-20'),
        progress: 0,
        status: 'pending',
        dependencies: ['6'],
        assignee: '김철수',
        priority: 'high',
        projectId: '1',
        projectName: 'ABC 제조공장 설비 구축'
      },
      // XYZ 물류센터 프로젝트
      {
        id: '8',
        name: '부지 조사',
        start: new Date('2024-02-01'),
        end: new Date('2024-02-20'),
        progress: 100,
        status: 'completed',
        assignee: '임지은',
        priority: 'high',
        projectId: '2',
        projectName: 'XYZ 물류센터 건설'
      },
      {
        id: '9',
        name: '구조 설계',
        start: new Date('2024-02-15'),
        end: new Date('2024-03-30'),
        progress: 85,
        status: 'in-progress',
        dependencies: ['8'],
        assignee: '오준석',
        priority: 'high',
        projectId: '2',
        projectName: 'XYZ 물류센터 건설'
      },
      {
        id: '10',
        name: '기초 공사',
        start: new Date('2024-03-25'),
        end: new Date('2024-04-25'),
        progress: 20,
        status: 'in-progress',
        dependencies: ['9'],
        assignee: '송미래',
        priority: 'medium',
        projectId: '2',
        projectName: 'XYZ 물류센터 건설'
      }
    ]

    setTimeout(() => {
      setTasks(mockTasks)
      setFilteredTasks(mockTasks)
      setLoading(false)
    }, 1000)
  }, [])

  // 프로젝트 목록 추출
  const projects = Array.from(new Set(tasks.map(task => task.projectName)))

  // 필터링 로직
  useEffect(() => {
    let filtered = tasks

    if (viewState.selectedProject) {
      filtered = filtered.filter(task => task.projectName === viewState.selectedProject)
    }

    setFilteredTasks(filtered)
  }, [tasks, viewState.selectedProject])

  // 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#52c41a'
      case 'in-progress': return '#1890ff'
      case 'pending': return '#faad14'
      case 'delayed': return '#ff4d4f'
      default: return '#d9d9d9'
    }
  }

  // 우선순위별 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff4d4f'
      case 'medium': return '#faad14'
      case 'low': return '#52c41a'
      default: return '#d9d9d9'
    }
  }

  // 날짜 범위 계산
  const calculateDateRange = () => {
    const totalDays = Math.ceil((viewState.dateRange[1].getTime() - viewState.dateRange[0].getTime()) / (1000 * 60 * 60 * 24))
    const dates = []
    
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(viewState.dateRange[0])
      date.setDate(date.getDate() + i)
      dates.push(date)
    }
    
    return dates
  }

  // 작업 위치 계산
  const calculateTaskPosition = (task: Task) => {
    const totalDays = Math.ceil((viewState.dateRange[1].getTime() - viewState.dateRange[0].getTime()) / (1000 * 60 * 60 * 24))
    const startOffset = Math.ceil((task.start.getTime() - viewState.dateRange[0].getTime()) / (1000 * 60 * 60 * 24))
    const duration = Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24))
    
    const left = Math.max(0, (startOffset / totalDays) * 100)
    const width = Math.min(100 - left, (duration / totalDays) * 100)
    
    return { left: `${left}%`, width: `${width}%` }
  }

  // 전체화면 토글
  const toggleFullscreen = () => {
    if (!viewState.isFullscreen) {
      if (ganttRef.current?.requestFullscreen) {
        ganttRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setViewState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }))
  }

  // 작업 편집
  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    form.setFieldsValue({
      name: task.name,
      start: dayjs(task.start),
      end: dayjs(task.end),
      progress: task.progress,
      assignee: task.assignee,
      priority: task.priority
    })
    setEditModalVisible(true)
  }

  // 작업 저장
  const handleSaveTask = async (values: any) => {
    if (!selectedTask) return

    const updatedTask = {
      ...selectedTask,
      name: values.name,
      start: values.start.toDate(),
      end: values.end.toDate(),
      progress: values.progress,
      assignee: values.assignee,
      priority: values.priority
    }

    setTasks(prev => prev.map(task => 
      task.id === selectedTask.id ? updatedTask : task
    ))

    setEditModalVisible(false)
    setSelectedTask(null)
    form.resetFields()
    message.success('작업이 성공적으로 수정되었습니다')
  }

  const dates = calculateDateRange()

  return (
    <div className="gantt-page container mx-auto px-6 py-8" ref={ganttRef}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title level={2} className="mb-2">간트차트</Title>
          <Text type="secondary" className="text-base">
            프로젝트 일정을 시각적으로 관리하세요
          </Text>
        </div>
        <Space>
          <Button 
            icon={<PlusOutlined />} 
            onClick={() => router.push('/projects/new')}
          >
            새 작업
          </Button>
          <Button 
            icon={viewState.isFullscreen ? <CompressOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
          />
        </Space>
      </div>

      {/* 제어 패널 */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <Space wrap>
            <Select
              placeholder="프로젝트 선택"
              value={viewState.selectedProject}
              onChange={(value) => setViewState(prev => ({ ...prev, selectedProject: value }))}
              style={{ width: 200 }}
              allowClear
            >
              {projects.map(project => (
                <Option key={project} value={project}>{project}</Option>
              ))}
            </Select>

            <Select
              value={viewState.viewMode}
              onChange={(value) => setViewState(prev => ({ ...prev, viewMode: value }))}
              style={{ width: 100 }}
            >
              <Option value="day">일</Option>
              <Option value="week">주</Option>
              <Option value="month">월</Option>
            </Select>

            <RangePicker
              value={[dayjs(viewState.dateRange[0]), dayjs(viewState.dateRange[1])]}
              onChange={(dates) => {
                if (dates) {
                  setViewState(prev => ({ 
                    ...prev, 
                    dateRange: [dates[0]!.toDate(), dates[1]!.toDate()] 
                  }))
                }
              }}
            />
          </Space>

          <Space>
            <Button
              type={viewState.showCriticalPath ? 'primary' : 'default'}
              onClick={() => setViewState(prev => ({ ...prev, showCriticalPath: !prev.showCriticalPath }))}
            >
              임계 경로
            </Button>
            <Button icon={<FilterOutlined />}>필터</Button>
            <Button icon={<ExpandOutlined />}>내보내기</Button>
          </Space>
        </div>
      </Card>

      {/* 간트차트 */}
      <Card className="gantt-container">
        <div className="gantt-wrapper">
          {/* 헤더 - 날짜 표시 */}
          <div className="gantt-header">
            <div className="gantt-task-names">
              <div className="task-header-cell">작업명</div>
            </div>
            <div className="gantt-timeline">
              <div className="timeline-dates">
                {dates.map((date, index) => {
                  if (viewState.viewMode === 'month') {
                    // 월 단위 - 매월 1일만 표시
                    if (date.getDate() === 1) {
                      return (
                        <div key={index} className="date-cell month-cell">
                          {date.toLocaleDateString('ko-KR', { month: 'short' })}
                        </div>
                      )
                    }
                    return null
                  } else if (viewState.viewMode === 'week') {
                    // 주 단위 - 월요일만 표시
                    if (date.getDay() === 1) {
                      return (
                        <div key={index} className="date-cell week-cell">
                          {date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </div>
                      )
                    }
                    return null
                  } else {
                    // 일 단위 - 모든 날짜 표시
                    return (
                      <div key={index} className="date-cell day-cell">
                        {date.getDate()}
                      </div>
                    )
                  }
                }).filter(Boolean)}
              </div>
            </div>
          </div>

          {/* 작업 목록 */}
          <div className="gantt-body">
            {filteredTasks.length === 0 ? (
              <div className="empty-gantt">
                <Text type="secondary">표시할 작업이 없습니다</Text>
              </div>
            ) : (
              filteredTasks.map((task, index) => (
                <div key={task.id} className="gantt-row">
                  {/* 작업 정보 */}
                  <div className="gantt-task-names">
                    <div className="task-info-cell">
                      <div className="task-name">{task.name}</div>
                      <div className="task-meta">
                        <Space size="small">
                          <Tag color={getStatusColor(task.status)}>
                            {task.status}
                          </Tag>
                          <Text type="secondary" className="text-xs">
                            {task.assignee}
                          </Text>
                          <div 
                            className="priority-dot"
                            style={{ backgroundColor: getPriorityColor(task.priority) }}
                          />
                        </Space>
                      </div>
                    </div>
                  </div>

                  {/* 간트 바 */}
                  <div className="gantt-timeline">
                    <div className="timeline-container">
                      <Tooltip 
                        title={
                          <div>
                            <div><strong>{task.name}</strong></div>
                            <div>기간: {task.start.toLocaleDateString()} ~ {task.end.toLocaleDateString()}</div>
                            <div>진행률: {task.progress}%</div>
                            <div>담당자: {task.assignee}</div>
                          </div>
                        }
                      >
                        <div
                          className="gantt-bar"
                          style={{
                            ...calculateTaskPosition(task),
                            backgroundColor: getStatusColor(task.status)
                          }}
                          onClick={() => handleEditTask(task)}
                        >
                          <div 
                            className="gantt-progress"
                            style={{ 
                              width: `${task.progress}%`,
                              backgroundColor: task.status === 'completed' ? '#52c41a' : '#40a9ff'
                            }}
                          />
                          <span className="gantt-bar-text">{task.progress}%</span>
                        </div>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* 범례 */}
      <Card className="mt-4">
        <div className="flex flex-wrap gap-6">
          <div className="legend-item">
            <Title level={5} className="mb-2">상태</Title>
            <Space wrap>
              <Tag color="#52c41a">완료</Tag>
              <Tag color="#1890ff">진행중</Tag>
              <Tag color="#faad14">대기</Tag>
              <Tag color="#ff4d4f">지연</Tag>
            </Space>
          </div>
          <Divider type="vertical" style={{ height: 'auto' }} />
          <div className="legend-item">
            <Title level={5} className="mb-2">우선순위</Title>
            <Space wrap>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff4d4f' }} />
                <span>높음</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#faad14' }} />
                <span>보통</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#52c41a' }} />
                <span>낮음</span>
              </div>
            </Space>
          </div>
        </div>
      </Card>

      {/* 작업 편집 모달 */}
      <Modal
        title="작업 편집"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false)
          setSelectedTask(null)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveTask}
        >
          <Form.Item
            name="name"
            label="작업명"
            rules={[{ required: true, message: '작업명을 입력하세요' }]}
          >
            <Input />
          </Form.Item>

          <div className="flex gap-4">
            <Form.Item
              name="start"
              label="시작일"
              className="flex-1"
              rules={[{ required: true, message: '시작일을 선택하세요' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="end"
              label="종료일"
              className="flex-1"
              rules={[{ required: true, message: '종료일을 선택하세요' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div className="flex gap-4">
            <Form.Item
              name="progress"
              label="진행률"
              className="flex-1"
            >
              <Progress percent={form.getFieldValue('progress') || 0} />
            </Form.Item>

            <Form.Item
              name="priority"
              label="우선순위"
              className="flex-1"
            >
              <Select>
                <Option value="high">높음</Option>
                <Option value="medium">보통</Option>
                <Option value="low">낮음</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="assignee"
            label="담당자"
          >
            <Input />
          </Form.Item>

          <Form.Item className="mb-0 flex justify-end">
            <Space>
              <Button onClick={() => setEditModalVisible(false)}>
                취소
              </Button>
              <Button type="primary" htmlType="submit">
                저장
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <style jsx>{`
        .gantt-page {
          min-height: 100vh;
          background: var(--background-primary);
        }

        .gantt-container {
          overflow: hidden;
        }

        .gantt-wrapper {
          overflow-x: auto;
          min-width: 800px;
        }

        .gantt-header {
          display: flex;
          border-bottom: 2px solid var(--border-color);
          background: var(--background-secondary);
        }

        .gantt-task-names {
          width: 300px;
          min-width: 300px;
          border-right: 1px solid var(--border-color);
        }

        .task-header-cell {
          height: 50px;
          display: flex;
          align-items: center;
          padding: 0 16px;
          font-weight: 600;
          color: var(--text-primary);
          background: var(--background-secondary);
        }

        .gantt-timeline {
          flex: 1;
          position: relative;
        }

        .timeline-dates {
          display: flex;
          height: 50px;
        }

        .date-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-right: 1px solid var(--border-light);
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--background-secondary);
          white-space: nowrap;
        }

        .day-cell {
          min-width: 30px;
        }

        .week-cell {
          min-width: 100px;
        }

        .month-cell {
          min-width: 80px;
        }

        .gantt-body {
          max-height: 600px;
          overflow-y: auto;
        }

        .gantt-row {
          display: flex;
          border-bottom: 1px solid var(--border-light);
          transition: background-color 0.2s;
        }

        .gantt-row:hover {
          background: var(--background-secondary);
        }

        .task-info-cell {
          height: 60px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
        }

        .task-name {
          font-weight: 500;
          color: var(--text-primary);
          font-size: 14px;
        }

        .task-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .priority-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .timeline-container {
          height: 60px;
          position: relative;
          background: repeating-linear-gradient(
            90deg,
            transparent,
            transparent 29px,
            var(--border-light) 29px,
            var(--border-light) 30px
          );
        }

        .gantt-bar {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          height: 24px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .gantt-bar:hover {
          transform: translateY(-50%) translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .gantt-progress {
          height: 100%;
          border-radius: 12px;
          transition: width 0.3s;
        }

        .gantt-bar-text {
          position: absolute;
          right: 8px;
          font-size: 11px;
          font-weight: 600;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .empty-gantt {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
        }

        .legend-item {
          min-width: 200px;
        }

        /* 반응형 */
        @media (max-width: 768px) {
          .gantt-task-names {
            width: 200px;
            min-width: 200px;
          }

          .task-info-cell {
            padding: 8px 12px;
          }

          .task-name {
            font-size: 13px;
          }

          .date-cell {
            font-size: 11px;
          }
        }

        /* 전체화면 모드 */
        .gantt-page:fullscreen {
          padding: 20px;
          background: white;
        }
      `}</style>
    </div>
  )
}