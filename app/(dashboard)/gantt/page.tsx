'use client'

import { useState } from 'react'
import { Button, Select, Space, Typography, Modal, Descriptions, Progress, Tag } from 'antd'
import {
  FullscreenOutlined,
  CompressOutlined,
  PlusOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ProjectOutlined
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { GanttChart, GanttTask } from '@/components/gantt/GanttChart'
import ProjectSelectModal from '@/components/gantt/ProjectSelectModal'
import { ViewMode, Task } from 'gantt-task-react'
import { Z_INDEX } from '@/lib/config/layout.constants'

const { Title, Text } = Typography

// ===== 상수 정의 =====

/**
 * 뷰 모드 순서 (확대/축소에 사용)
 * - 왼쪽으로 갈수록 상세 (확대)
 * - 오른쪽으로 갈수록 개요 (축소)
 */
const VIEW_MODES = [
  ViewMode.Hour,
  ViewMode.QuarterDay,
  ViewMode.HalfDay,
  ViewMode.Day,
  ViewMode.Week,
  ViewMode.Month,
  ViewMode.Year
]

// ===== 컴포넌트 =====

/**
 * 간트차트 페이지 컴포넌트
 * - 프로젝트/공정 일정을 간트차트로 시각화
 * - 뷰 모드 변경, 프로젝트 필터링, 상세 정보 모달 제공
 */
export default function GanttPage() {
  const router = useRouter()

  // ===== 상태 관리 =====
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day)
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isProjectSelectModalVisible, setIsProjectSelectModalVisible] = useState(false)
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])

  // ===== 이벤트 핸들러 =====

  /**
   * 간트차트 Task 클릭 핸들러
   * - 클릭된 Task의 상세 정보 모달 표시
   */
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task as GanttTask)
    setDetailModalVisible(true)
  }

  /**
   * 전체화면 토글
   */
  const toggleFullscreen = () => {
    const element = document.querySelector('.gantt-page')
    if (!isFullscreen && element?.requestFullscreen) {
      element.requestFullscreen()
    } else if (document.exitFullscreen) {
      document.exitFullscreen()
    }
    setIsFullscreen(!isFullscreen)
  }

  /**
   * 확대/축소 핸들러
   * @param direction - 'in': 확대 (더 상세하게), 'out': 축소 (더 넓게)
   */
  const handleZoom = (direction: 'in' | 'out') => {
    const currentIndex = VIEW_MODES.indexOf(viewMode)
    if (direction === 'in' && currentIndex > 0) {
      setViewMode(VIEW_MODES[currentIndex - 1])
    }
    if (direction === 'out' && currentIndex < VIEW_MODES.length - 1) {
      setViewMode(VIEW_MODES[currentIndex + 1])
    }
  }

  /**
   * 상세 모달 닫기
   */
  const closeDetailModal = () => {
    setDetailModalVisible(false)
    setSelectedTask(null)
  }

  /**
   * 프로젝트 상세 페이지로 이동
   * - 새 탭에서 열기
   */
  const navigateToProjectDetail = () => {
    const projectId = selectedTask?.projectId || selectedTask?.id.replace('project-', '')
    if (projectId) {
      window.open(`/projects/${projectId}`, '_blank')
    }
  }

  /**
   * 진행률에 따른 상태 정보 반환
   */
  const getStatusInfo = (progress: number) => {
    if (progress === 100) return { text: '완료', color: 'success' as const }
    if (progress > 0) return { text: '진행중', color: 'processing' as const }
    return { text: '대기', color: 'warning' as const }
  }

  // ===== 렌더링 =====

  return (
    <div className="gantt-page w-full px-0 py-0">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-1 px-2">
        <div>
          <Title level={2} className="mb-2">간트차트</Title>
          <Text type="secondary" className="text-base">
            프로젝트 일정을 시각적으로 관리하세요
          </Text>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/projects/new')}
          >
            새 프로젝트
          </Button>
          <Button
            icon={isFullscreen ? <CompressOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
          />
        </Space>
      </div>

      {/* 제어 패널: 프로젝트 선택, 뷰 모드, 확대/축소 */}
      <div className="mb-1 px-2">
        <Space wrap>
          {/* 프로젝트 선택 버튼 */}
          <Button
            icon={<ProjectOutlined />}
            onClick={() => setIsProjectSelectModalVisible(true)}
            type={selectedProjectIds.length > 0 ? 'primary' : 'default'}
          >
            프로젝트 선택 {selectedProjectIds.length > 0 && `(${selectedProjectIds.length})`}
          </Button>

          {/* 뷰 모드 선택 */}
          <Select
            value={viewMode}
            onChange={setViewMode}
            style={{ width: 120 }}
          >
            <Select.Option value={ViewMode.Hour}>시간</Select.Option>
            <Select.Option value={ViewMode.QuarterDay}>6시간</Select.Option>
            <Select.Option value={ViewMode.HalfDay}>12시간</Select.Option>
            <Select.Option value={ViewMode.Day}>일</Select.Option>
            <Select.Option value={ViewMode.Week}>주</Select.Option>
            <Select.Option value={ViewMode.Month}>월</Select.Option>
            <Select.Option value={ViewMode.Year}>년</Select.Option>
          </Select>

          {/* 확대/축소 버튼 */}
          <Button
            icon={<ZoomInOutlined />}
            onClick={() => handleZoom('in')}
          >
            확대
          </Button>
          <Button
            icon={<ZoomOutOutlined />}
            onClick={() => handleZoom('out')}
          >
            축소
          </Button>
        </Space>
      </div>

      {/* 간트차트 컴포넌트 */}
      <GanttChart
        viewMode={viewMode}
        onTaskClick={handleTaskClick}
        locale="ko-KR"
        selectedProjectIds={selectedProjectIds.length > 0 ? selectedProjectIds : undefined}
      />

      {/* 프로젝트 선택 모달 */}
      <ProjectSelectModal
        visible={isProjectSelectModalVisible}
        onClose={() => setIsProjectSelectModalVisible(false)}
        onApply={(ids) => {
          setSelectedProjectIds(ids)
          setIsProjectSelectModalVisible(false)
        }}
        selectedProjectIds={selectedProjectIds}
      />

      {/* Task 상세 정보 모달 */}
      <Modal
        title={selectedTask?.type === 'project' ? '프로젝트 상세 정보' : '공정 상세 정보'}
        open={detailModalVisible}
        onCancel={closeDetailModal}
        footer={[
          <Button
            key="detail"
            type="primary"
            onClick={navigateToProjectDetail}
          >
            상세 페이지로 이동
          </Button>,
          <Button key="close" onClick={closeDetailModal}>
            닫기
          </Button>
        ]}
        width={600}
        zIndex={Z_INDEX.MODAL}
      >
        {selectedTask && (() => {
          const isProject = selectedTask.type === 'project'
          const status = getStatusInfo(selectedTask.progress)

          return (
            <Descriptions column={1} bordered>
              {/* 공정 클릭 시에만 공정 단계 표시 */}
              {!isProject && selectedTask.stageName && (
                <Descriptions.Item label="공정 단계">
                  {selectedTask.stageName}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="현장명">
                {selectedTask.siteName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="제품명">
                {selectedTask.productName || '-'}
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
                <Tag color={status.color}>{status.text}</Tag>
              </Descriptions.Item>
            </Descriptions>
          )
        })()}
      </Modal>

      {/* 페이지 스타일 */}
      <style jsx>{`
        .gantt-page {
          min-height: 100vh;
          background: #f0f2f5;
        }

        .gantt-page:fullscreen {
          padding: 20px;
          background: white;
        }
      `}</style>
    </div>
  )
}
