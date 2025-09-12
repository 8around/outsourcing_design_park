'use client'

import { useState } from 'react'
import { 
  Button, 
  Select, 
  Space, 
  Typography, 
  message,
  Modal,
  Descriptions,
  Progress,
  Tag
} from 'antd'
import {
  FullscreenOutlined,
  CompressOutlined,
  PlusOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { GanttChart } from '@/components/gantt/GanttChart'
import { ViewMode, Task } from 'gantt-task-react'

const { Title, Text } = Typography
const { Option } = Select

export default function GanttPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 작업 클릭 핸들러
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setDetailModalVisible(true)
  }

  // 작업 더블클릭 핸들러
  const handleTaskDoubleClick = (task: Task) => {
    message.info(`작업 "${task.name}" 편집 모드`)
    // 실제 구현시 편집 모달 열기
  }

  // 날짜 변경 핸들러
  const handleDateChange = (task: Task) => {
    message.success(`작업 "${task.name}"의 일정이 변경되었습니다`)
    // 실제 구현시 데이터베이스 업데이트
  }

  // 진행률 변경 핸들러
  const handleProgressChange = (task: Task) => {
    message.success(`작업 "${task.name}"의 진행률이 ${task.progress}%로 변경되었습니다`)
    // 실제 구현시 데이터베이스 업데이트
  }

  // 전체화면 토글
  const toggleFullscreen = () => {
    const element = document.querySelector('.gantt-page')
    if (!isFullscreen) {
      if (element?.requestFullscreen) {
        element.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  // 진행 상태 가져오기
  const getTaskStatus = (progress: number) => {
    if (progress === 100) return '완료'
    if (progress > 0) return '진행중'
    return '대기'
  }

  // 진행 상태 색상
  const getStatusColor = (progress: number) => {
    if (progress === 100) return 'success'
    if (progress > 0) return 'processing'
    return 'warning'
  }

  return (
    <div className="gantt-page container mx-auto px-6 py-8">
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
            icon={isFullscreen ? <CompressOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
          />
        </Space>
      </div>

      {/* 제어 패널 */}
      <div className="mb-6">
        <Space wrap>
          <Select
            value={viewMode}
            onChange={(value) => setViewMode(value)}
            style={{ width: 120 }}
          >
            <Option value={ViewMode.Hour}>시간</Option>
            <Option value={ViewMode.QuarterDay}>6시간</Option>
            <Option value={ViewMode.HalfDay}>12시간</Option>
            <Option value={ViewMode.Day}>일</Option>
            <Option value={ViewMode.Week}>주</Option>
            <Option value={ViewMode.Month}>월</Option>
            <Option value={ViewMode.Year}>년</Option>
          </Select>

          <Button
            icon={<CalendarOutlined />}
            onClick={() => setViewMode(ViewMode.Month)}
          >
            월간 보기
          </Button>

          <Button
            icon={<ZoomInOutlined />}
            onClick={() => {
              const modes = [ViewMode.Hour, ViewMode.QuarterDay, ViewMode.HalfDay, ViewMode.Day, ViewMode.Week, ViewMode.Month, ViewMode.Year]
              const currentIndex = modes.indexOf(viewMode)
              if (currentIndex > 0) {
                setViewMode(modes[currentIndex - 1])
              }
            }}
          >
            확대
          </Button>

          <Button
            icon={<ZoomOutOutlined />}
            onClick={() => {
              const modes = [ViewMode.Hour, ViewMode.QuarterDay, ViewMode.HalfDay, ViewMode.Day, ViewMode.Week, ViewMode.Month, ViewMode.Year]
              const currentIndex = modes.indexOf(viewMode)
              if (currentIndex < modes.length - 1) {
                setViewMode(modes[currentIndex + 1])
              }
            }}
          >
            축소
          </Button>
        </Space>
      </div>

      {/* 간트차트 컴포넌트 - DB 연동 및 페이지네이션 포함 */}
      <GanttChart
        viewMode={viewMode}
        onTaskClick={handleTaskClick}
        onTaskDoubleClick={handleTaskDoubleClick}
        onDateChange={handleDateChange}
        onProgressChange={handleProgressChange}
        locale="ko-KR"
      />

      {/* 작업 상세 모달 */}
      <Modal
        title="작업 상세 정보"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedTask(null)
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            닫기
          </Button>
        ]}
        width={600}
      >
        {selectedTask && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="작업명">
              {selectedTask.name}
            </Descriptions.Item>
            <Descriptions.Item label="프로젝트">
              {selectedTask.project || selectedTask.id}
            </Descriptions.Item>
            <Descriptions.Item label="시작일">
              {selectedTask.start.toLocaleDateString('ko-KR')}
            </Descriptions.Item>
            <Descriptions.Item label="종료일">
              {selectedTask.end.toLocaleDateString('ko-KR')}
            </Descriptions.Item>
            <Descriptions.Item label="진행률">
              <Progress percent={selectedTask.progress} />
            </Descriptions.Item>
            <Descriptions.Item label="상태">
              <Tag color={getStatusColor(selectedTask.progress)}>
                {getTaskStatus(selectedTask.progress)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="작업 유형">
              {selectedTask.type === 'project' ? '프로젝트' : 
               selectedTask.type === 'milestone' ? '마일스톤' : '작업'}
            </Descriptions.Item>
            {selectedTask.dependencies && selectedTask.dependencies.length > 0 && (
              <Descriptions.Item label="선행 작업">
                {selectedTask.dependencies.join(', ')}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      <style jsx>{`
        .gantt-page {
          min-height: 100vh;
          background: #f0f2f5;
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