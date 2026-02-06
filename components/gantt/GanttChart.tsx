'use client'

import React, { useMemo, useEffect, useState } from 'react'
import { Gantt, Task, ViewMode } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import { Card, Spin, Alert, Pagination, Space, Typography, Button } from 'antd'
import { ExpandOutlined, CompressOutlined } from '@ant-design/icons'
import { projectService } from '@/lib/services/projects.service'
import type { Project } from '@/types/project'
import { CustomTaskListHeader, CustomTaskListTable } from './CustomTaskList'

const { Text } = Typography

// ===== 상수 정의 =====

/**
 * 공정 단계 영문 키를 한글 이름으로 매핑
 */
const PROCESS_STAGE_NAMES: Record<string, string> = {
  contract: '계약',
  design: '도면설계',
  order: '발주',
  incoming: '입고',
  welding: '용접',
  plating: '도금',
  painting: '도장',
  grc_frp: 'GRC/FRP',
  panel: '판넬',
  fabrication: '제작조립',
  shipping: '출하',
  installation: '설치',
  certification: '인증기간',
  closing: '마감',
  completion: '준공일'
}

/**
 * 공정 상태별 색상 설정
 * - bg: 배경색
 * - progress: 진행률 바 색상
 * - selected: 선택 시 강조 색상
 */
const STAGE_COLORS: Record<string, { bg: string; progress: string; selected: string }> = {
  completed: { bg: '#52c41a', progress: '#237804', selected: '#092b00' },
  in_progress: { bg: '#1890ff', progress: '#0050b3', selected: '#002766' },
  delayed: { bg: '#ff4d4f', progress: '#a8071a', selected: '#5c0011' },
  waiting: { bg: '#faad14', progress: '#d48806', selected: '#873800' }
}

/**
 * 공정 상태별 진행률 매핑
 */
const STAGE_PROGRESS: Record<string, number> = {
  completed: 100,
  in_progress: 50,
  delayed: 30,
  waiting: 0
}

/**
 * 프로젝트 색상 설정 (긴급/일반)
 */
const PROJECT_COLORS = {
  urgent: { bg: '#ff4d4f', progress: '#a8071a', selected: '#5c0011' },
  normal: { bg: '#722ed1', progress: '#391085', selected: '#120338' }
}

// ===== 유틸 함수 =====

/**
 * 공정 상태에 따른 간트차트 바 색상 반환
 * @param status - 공정 상태 (completed, in_progress, delayed, waiting)
 */
const getStageColor = (status: string) => {
  const colors = STAGE_COLORS[status] || { bg: '#d9d9d9', progress: '#8c8c8c', selected: '#595959' }
  return {
    backgroundColor: colors.bg,
    progressColor: colors.progress,
    progressSelectedColor: colors.selected
  }
}

/**
 * 공정 상태에 따른 진행률 반환
 * @param status - 공정 상태
 */
const getStageProgress = (status: string): number => {
  return STAGE_PROGRESS[status] ?? 0
}

// ===== 확장 Task 타입 =====

/**
 * 간트차트 Task 확장 타입
 * - 기본 Task 속성 외에 프로젝트 관련 추가 정보 포함
 */
export interface GanttTask extends Task {
  hasChildren?: boolean      // 하위 공정 단계 존재 여부
  hasDateData?: boolean      // 날짜 데이터 설정 여부
  productName?: string       // 제품명
  projectId?: string         // 실제 프로젝트 ID (UUID)
  siteName?: string          // 현장명
  stageName?: string         // 공정 단계 한글명
}

// ===== 컴포넌트 Props =====

interface GanttChartProps {
  viewMode?: ViewMode
  onTaskClick?: (task: Task) => void
  locale?: string
  selectedProjectIds?: string[]
}

/**
 * 간트차트 컴포넌트
 * - 프로젝트와 공정 단계를 간트차트로 시각화
 * - 페이지네이션 및 프로젝트 필터링 지원
 */
export function GanttChart({
  viewMode = ViewMode.Week,
  onTaskClick,
  locale = 'ko-KR',
  selectedProjectIds
}: GanttChartProps) {
  // ===== 상태 관리 =====
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(3) // 한 페이지에 표시할 프로젝트 수
  const [total, setTotal] = useState(0)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [isAllExpanded, setIsAllExpanded] = useState(true)
  const [columnWidths, setColumnWidths] = useState({
    project: 250,
    progress: 100,
    status: 100
  })

  // ===== 데이터 조회 =====

  /**
   * 프로젝트 데이터 조회
   * - selectedProjectIds가 있으면 해당 프로젝트만 조회
   * - 없으면 페이지네이션으로 전체 조회
   */
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true)
      setError(null)

      try {
        let projectData: Project[]
        let totalCount: number

        if (selectedProjectIds?.length) {
          // 선택된 프로젝트 목록 조회
          projectData = await projectService.getProjectsByIds(
            selectedProjectIds,
            { sortBy: 'installation_request_date', order: 'desc' }
          )
          totalCount = projectData.length
        } else {
          // 전체 프로젝트 페이지네이션 조회
          const response = await projectService.getProjects(
            {},
            { sortBy: 'installation_request_date', order: 'desc' },
            { page: currentPage, limit: pageSize }
          )
          projectData = response.data
          totalCount = response.total
        }

        setProjects(projectData)
        setTotal(totalCount)

        // 모든 프로젝트를 펼친 상태로 초기화
        setExpandedProjects(new Set(projectData.map(p => `project-${p.id}`)))
        setIsAllExpanded(true)
      } catch (err) {
        setError('프로젝트 데이터를 불러오는데 실패했습니다.')
        console.error('프로젝트 조회 실패:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [currentPage, pageSize, selectedProjectIds])

  // ===== Task 데이터 변환 =====

  /**
   * 프로젝트 데이터를 간트차트 Task 형식으로 변환
   */
  const tasks: GanttTask[] = useMemo(() => {
    if (!projects.length) return []

    const ganttTasks: GanttTask[] = []

    projects.forEach((project) => {
      const processStages = project.process_stages || []
      const projectColor = PROJECT_COLORS[project.is_urgent ? 'urgent' : 'normal']

      // 1. 프로젝트 날짜 범위 계산 (공정 단계들의 최소 시작일 ~ 최대 종료일)
      let projectStartDate: Date | null = null
      let projectEndDate: Date | null = null

      processStages.forEach(stage => {
        const stageStartDate = stage.start_date || stage.actual_start_date
        const stageEndDate = stage.end_date || stage.actual_end_date

        if (stageStartDate) {
          const date = new Date(stageStartDate)
          if (!projectStartDate || date < projectStartDate) projectStartDate = date
        }
        if (stageEndDate) {
          const date = new Date(stageEndDate)
          if (!projectEndDate || date > projectEndDate) projectEndDate = date
        }
      })

      // 날짜가 없으면 예상 완료일을 기본값으로 사용
      const fallbackDate = new Date(project.expected_completion_date)
      projectStartDate = projectStartDate || fallbackDate
      projectEndDate = projectEndDate || fallbackDate

      // 2. 프로젝트 진행률 계산 (완료된 공정 수 / 전체 공정 수)
      const completedStageCount = processStages.filter(s => s.status === 'completed').length
      const projectProgress = processStages.length
        ? Math.round((completedStageCount / processStages.length) * 100)
        : 0

      // 3. 프로젝트 태스크 생성
      const projectTaskId = `project-${project.id}`
      ganttTasks.push({
        id: projectTaskId,
        name: project.site_name + (project.is_urgent ? ' [긴급]' : ''),
        start: projectStartDate,
        end: projectEndDate,
        type: 'project',
        progress: projectProgress,
        hideChildren: !expandedProjects.has(projectTaskId),
        styles: {
          backgroundColor: projectColor.bg,
          progressColor: projectColor.progress,
          progressSelectedColor: projectColor.selected
        },
        hasChildren: processStages.length > 0,
        productName: project.product_name || '',
        projectId: project.id,
        siteName: project.site_name
      })

      // 4. 공정 단계 태스크 생성
      if (processStages.length) {
        // 공정 순서대로 정렬
        const sortedStages = [...processStages].sort((a, b) => a.stage_order - b.stage_order)
        let previousEndDate = projectStartDate

        sortedStages.forEach((stage, stageIndex) => {
          // 시작일 결정: 설정된 날짜 > 실제 날짜 > 이전 공정 종료일
          const startDate = stage.start_date
            ? new Date(stage.start_date)
            : stage.actual_start_date
              ? new Date(stage.actual_start_date)
              : new Date(previousEndDate)

          // 종료일 결정: 설정된 날짜 > 실제 날짜 > 시작일과 동일
          const endDate = stage.end_date
            ? new Date(stage.end_date)
            : stage.actual_end_date
              ? new Date(stage.actual_end_date)
              : new Date(startDate)

          // 다음 공정의 기본 시작일로 사용
          previousEndDate = new Date(endDate)

          const stageColor = getStageColor(stage.status)
          const stageName = PROCESS_STAGE_NAMES[stage.stage_name] || stage.stage_name

          // 날짜 데이터 설정 여부 확인
          const hasDateData = !!(
            stage.start_date ||
            stage.actual_start_date ||
            stage.end_date ||
            stage.actual_end_date
          )

          ganttTasks.push({
            id: `stage-${project.id}-${stage.id}`,
            name: stageName,
            start: startDate,
            end: endDate,
            type: 'task',
            progress: getStageProgress(stage.status),
            project: projectTaskId,
            // 이전 공정 단계와의 의존성 (화살표 연결)
            dependencies: stageIndex > 0
              ? [`stage-${project.id}-${sortedStages[stageIndex - 1].id}`]
              : [],
            styles: stageColor,
            hasDateData,
            siteName: project.site_name,
            productName: project.product_name || '',
            projectId: project.id,
            stageName
          })
        })
      }
    })

    return ganttTasks
  }, [projects, expandedProjects])

  // ===== 이벤트 핸들러 =====

  /**
   * 프로젝트 접기/펼치기 토글
   */
  const handleExpanderClick = (task: Task) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(task.id)) {
        newSet.delete(task.id)
      } else {
        newSet.add(task.id)
      }
      // 전체 펼침 상태 업데이트
      setIsAllExpanded(projects.every(p => newSet.has(`project-${p.id}`)))
      return newSet
    })
  }

  /**
   * 전체 프로젝트 펼치기/접기 토글
   */
  const handleToggleAll = () => {
    if (isAllExpanded) {
      setExpandedProjects(new Set())
      setIsAllExpanded(false)
    } else {
      setExpandedProjects(new Set(projects.map(p => `project-${p.id}`)))
      setIsAllExpanded(true)
    }
  }

  /**
   * 컬럼 너비 변경 핸들러
   */
  const handleColumnResize = (key: keyof typeof columnWidths, width: number) => {
    setColumnWidths(prev => ({ ...prev, [key]: width }))
  }

  /**
   * 컬럼 너비 초기화
   */
  const handleResetColumnWidths = () => {
    setColumnWidths({ project: 350, progress: 100, status: 100 })
  }

  // ===== 렌더링 =====

  // 로딩 상태
  if (loading) {
    return (
      <Card className="gantt-chart-container">
        <Spin size="large" tip="프로젝트 데이터를 불러오는 중..." spinning>
          <div style={{ textAlign: 'center', padding: '50px', minHeight: '100px' }} />
        </Spin>
      </Card>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <Card className="gantt-chart-container">
        <Alert message="오류" description={error} type="error" showIcon />
      </Card>
    )
  }

  // 데이터 없음
  if (!projects.length) {
    return (
      <Card className="gantt-chart-container">
        <Alert
          message="프로젝트 없음"
          description="표시할 프로젝트가 없습니다. 새 프로젝트를 생성해주세요."
          type="info"
          showIcon
        />
      </Card>
    )
  }

  // 커스텀 TaskList 전체 너비 계산
  const totalListWidth = columnWidths.project + columnWidths.progress + columnWidths.status

  return (
    <div>
      <Card className="gantt-chart-container" styles={{ body: { padding: '0' } }}>
        {/* 툴바: 전체 펼치기/접기, 컬럼 너비 초기화 */}
        <div style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: '8px' }}>
          <Button
            onClick={handleToggleAll}
            icon={isAllExpanded ? <CompressOutlined /> : <ExpandOutlined />}
          >
            {isAllExpanded ? '모두 접기' : '모두 펼치기'}
          </Button>
          <Button onClick={handleResetColumnWidths}>
            컬럼 너비 초기화
          </Button>
        </div>

        {/* 간트차트 */}
        <div className="gantt-wrapper">
          <Gantt
            tasks={tasks}
            viewMode={viewMode}
            onClick={onTaskClick}
            onExpanderClick={handleExpanderClick}
            locale={locale}
            barCornerRadius={3}
            barFill={60}
            columnWidth={viewMode === ViewMode.Month ? 75 : viewMode === ViewMode.Week ? 65 : 45}
            listCellWidth={`${totalListWidth}px`}
            rowHeight={40}
            headerHeight={50}
            fontSize="14px"
            fontFamily="'Segoe UI', 'Noto Sans KR', sans-serif"
            todayColor="rgba(252, 248, 227, 0.5)"
            arrowColor="#1890ff"
            arrowIndent={20}
            TaskListHeader={() => (
              <CustomTaskListHeader
                columnWidths={columnWidths}
                onColumnResize={handleColumnResize}
              />
            )}
            TaskListTable={(props) => (
              <CustomTaskListTable
                {...props}
                onExpanderClick={handleExpanderClick}
                onClick={onTaskClick}
                columnWidths={columnWidths}
              />
            )}
          />
        </div>
      </Card>

      {/* 페이지네이션 - 선택된 프로젝트가 없을 때만 표시 */}
      {(!selectedProjectIds || selectedProjectIds.length === 0) && (
        <div style={{ marginTop: '6px', padding: '0 4px' }}>
          <Space size="middle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text type="secondary">
              전체 {total}개 프로젝트 중 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, total)}개 표시
            </Text>
            <Pagination
              current={currentPage}
              total={total}
              pageSize={pageSize}
              onChange={setCurrentPage}
              showSizeChanger={false}
              showTotal={(t, range) => `${range[0]}-${range[1]} / ${t}개`}
            />
          </Space>
        </div>
      )}

      {/* 선택된 프로젝트 개수 표시 */}
      {selectedProjectIds && selectedProjectIds.length > 0 && (
        <div style={{ marginTop: '6px', padding: '0 4px' }}>
          <Text type="secondary">선택된 프로젝트 {total}개 표시 중</Text>
        </div>
      )}

      {/* 스타일 */}
      <style jsx>{`
        .gantt-chart-container {
          width: 100%;
          overflow: hidden;
        }

        .gantt-wrapper {
          width: 100%;
          overflow-x: auto;
          min-height: calc(100vh - 360px);
        }

        :global(.gantt-chart-container .ant-card-body) {
          padding: 0 !important;
        }

        /* 커스텀 TaskList 헤더 */
        :global(.gantt-task-list-header) {
          background: #fafafa;
          font-weight: 600;
          border-bottom: 2px solid #e8e8e8;
          display: flex;
          align-items: center;
        }

        :global(.gantt-task-list-header-row) {
          display: flex;
          width: 100%;
          height: 50px;
          align-items: center;
        }

        :global(.gantt-task-list-header-cell) {
          padding: 0 16px;
          border-right: 1px solid #e8e8e8;
          display: flex;
          align-items: center;
          height: 100%;
        }

        /* 커스텀 TaskList 테이블 */
        :global(.gantt-task-list-table) {
          background: white;
        }

        :global(.gantt-task-list-row) {
          display: flex;
          width: 100%;
          height: 40px;
          align-items: center;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
          transition: background 0.2s;
        }

        :global(.gantt-task-list-row:hover) {
          background: #e6f7ff !important;
        }

        :global(.gantt-task-list-row-selected) {
          background: #bae7ff !important;
        }

        :global(.gantt-task-list-row-even) {
          background: #fafafa;
        }

        :global(.gantt-task-list-row-odd) {
          background: white;
        }

        :global(.gantt-task-list-cell) {
          padding: 0 16px;
          border-right: 1px solid #f0f0f0;
          height: 100%;
          display: flex;
          align-items: center;
        }

        :global(.gantt-task-list-expander) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        /* 간트차트 바 스타일 */
        :global(.gantt .gantt-task) {
          cursor: pointer;
          transition: all 0.2s;
        }

        :global(.gantt .gantt-task:hover) {
          filter: brightness(1.1);
        }

        :global(.gantt .gantt-project) {
          border-radius: 6px !important;
        }

        /* 기본 TaskList 컬럼 숨기기 */
        :global(.gantt ._3T42e),
        :global(.gantt ._3zRFW) {
          display: none !important;
        }
      `}</style>
    </div>
  )
}
