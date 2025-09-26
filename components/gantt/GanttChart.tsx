'use client'

import React, { useMemo, useEffect, useState } from 'react'
import { Gantt, Task, ViewMode } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import { Card, Spin, Alert, Pagination, Space, Typography, Button } from 'antd'
import { 
  DownOutlined, 
  RightOutlined,
  ExpandOutlined,
  CompressOutlined
} from '@ant-design/icons'
import { projectService } from '@/lib/services/projects.service'
import type { Project, ProcessStage } from '@/types/project'
import { CustomTaskListHeader, CustomTaskListTable } from './CustomTaskList'

const { Text } = Typography

interface GanttChartProps {
  viewMode?: ViewMode
  onTaskClick?: (task: Task) => void
  onTaskDoubleClick?: (task: Task) => void
  onDateChange?: (task: Task) => void
  onProgressChange?: (task: Task) => void
  locale?: string
}

export function GanttChart({
  viewMode = ViewMode.Week,
  onTaskClick,
  onTaskDoubleClick,
  onDateChange,
  onProgressChange,
  locale = 'ko-KR'
}: GanttChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(3) // 한 페이지에 3개씩 표시
  const [total, setTotal] = useState(0)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [isAllExpanded, setIsAllExpanded] = useState(true)

  // 프로젝트 데이터 조회
  useEffect(() => {
    fetchProjects()
  }, [currentPage, pageSize])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await projectService.getProjects(
        {},
        { sortBy: 'created_at', order: 'desc' },
        { page: currentPage, limit: pageSize }
      )
      
      setProjects(response.data)
      setTotal(response.total)
      
      // Initialize all projects as expanded
      const allProjectIds = new Set(response.data.map(p => `project-${p.id}`))
      setExpandedProjects(allProjectIds)
      setIsAllExpanded(true)
    } catch (err) {
      setError('프로젝트 데이터를 불러오는데 실패했습니다.')
      console.error('프로젝트 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  // 프로젝트 전체 진행률 계산
  const calculateProjectProgress = (stages: ProcessStage[]): number => {
    if (!stages.length) return 0
    const completedStages = stages.filter(s => s.status === 'completed').length
    return Math.round((completedStages / stages.length) * 100)
  }

  // 공정 상태에 따른 진행률
  const getStageProgress = (status: string): number => {
    switch (status) {
      case 'completed': return 100
      case 'in_progress': return 50
      case 'delayed': return 30
      case 'waiting': return 0
      default: return 0
    }
  }

  // 공정 상태에 따른 색상
  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { backgroundColor: '#52c41a', progressColor: '#237804', progressSelectedColor: '#092b00' }
      case 'in_progress':
        return { backgroundColor: '#1890ff', progressColor: '#0050b3', progressSelectedColor: '#002766' }
      case 'delayed':
        return { backgroundColor: '#ff4d4f', progressColor: '#a8071a', progressSelectedColor: '#5c0011' }
      case 'waiting':
        return { backgroundColor: '#faad14', progressColor: '#d48806', progressSelectedColor: '#873800' }
      default:
        return { backgroundColor: '#d9d9d9', progressColor: '#8c8c8c', progressSelectedColor: '#595959' }
    }
  }

  // 날짜 계산 헬퍼
  const addDaysToDate = (date: Date, days: number): Date => {
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() + days)
    return newDate
  }

  // 공정 단계 이름 매핑
  const PROCESS_STAGE_NAMES: Record<string, string> = {
    contract: '계약',
    design: '도면설계',
    order: '발주',
    laser: '레이저',
    welding: '용접',
    plating: '도금',
    painting: '도장',
    panel: '판넬',
    assembly: '조립',
    shipping: '출하',
    installation: '설치',
    certification: '인증기간',
    closing: '마감',
    completion: '준공일'
  }

  // 프로젝트 데이터를 간트차트 Task 형식으로 변환
  const tasks: Task[] = useMemo(() => {
    if (!projects.length) return []

    const ganttTasks: Task[] = []
    
    projects.forEach((project, projectIndex) => {
      // 긴급 프로젝트 색상 설정
      const projectColor = project.is_urgent 
        ? { backgroundColor: '#ff4d4f', progressColor: '#a8071a', progressSelectedColor: '#5c0011' }
        : { backgroundColor: '#722ed1', progressColor: '#391085', progressSelectedColor: '#120338' }

      // 공정 단계에서 시작일과 종료일 계산
      let projectStartDate: Date | null = null
      let projectEndDate: Date | null = null
      
      if (project.process_stages && project.process_stages.length > 0) {
        const stageDates = project.process_stages.map(stage => {
          const startDate = stage.start_date ? new Date(stage.start_date) 
                         : stage.actual_start_date ? new Date(stage.actual_start_date) 
                         : null
          const endDate = stage.end_date ? new Date(stage.end_date)
                       : stage.actual_end_date ? new Date(stage.actual_end_date)
                       : null
          return { startDate, endDate }
        }).filter(dates => dates.startDate || dates.endDate)
        
        if (stageDates.length > 0) {
          // 가장 이른 시작일 찾기
          const validStartDates = stageDates
            .filter(d => d.startDate)
            .map(d => d.startDate as Date)
          if (validStartDates.length > 0) {
            projectStartDate = new Date(Math.min(...validStartDates.map(d => d.getTime())))
          }
          
          // 가장 늦은 종료일 찾기
          const validEndDates = stageDates
            .filter(d => d.endDate)
            .map(d => d.endDate as Date)
          if (validEndDates.length > 0) {
            projectEndDate = new Date(Math.max(...validEndDates.map(d => d.getTime())))
          }
        }
      }
      
      // 날짜가 없는 경우 예상 완료일 사용
      if (!projectStartDate || !projectEndDate) {
        const fallbackDate = new Date(project.expected_completion_date)
        projectStartDate = projectStartDate || fallbackDate
        projectEndDate = projectEndDate || fallbackDate
      }

      // 프로젝트 그룹 태스크
      const projectId = `project-${project.id}`
      const hasChildTasks = !!(project.process_stages && project.process_stages.length > 0)
      const projectTask: Task & { hasChildren?: boolean } = {
        id: projectId,
        name: project.site_name + (project.is_urgent ? ' [긴급]' : ''),
        start: projectStartDate,
        end: projectEndDate,
        type: 'project',
        progress: calculateProjectProgress(project.process_stages || []),
        hideChildren: !expandedProjects.has(projectId),
        styles: projectColor,
        hasChildren: hasChildTasks
      }
      ganttTasks.push(projectTask)

      // 각 공정 단계를 태스크로 추가
      if (project.process_stages && project.process_stages.length > 0) {
        const sortedStages = [...project.process_stages].sort((a, b) => a.stage_order - b.stage_order)
        
        // 이전 단계의 종료일을 추적하기 위한 변수 (프로젝트 시작일 사용)
        let previousEndDate = projectStartDate
        
        sortedStages.forEach((stage, stageIndex) => {
          const stageProgress = getStageProgress(stage.status)
          const stageColor = getStageColor(stage.status)
          
          // 시작일 계산 - 날짜 데이터가 없으면 이전 단계의 종료일 사용
          let startDate: Date
          if (stage.start_date) {
            startDate = new Date(stage.start_date)
          } else if (stage.actual_start_date) {
            startDate = new Date(stage.actual_start_date)
          } else {
            // 날짜가 없으면 이전 단계의 종료일을 시작일로 사용
            startDate = new Date(previousEndDate)
          }
          
          // 종료일 계산 - 날짜 데이터가 없으면 시작일과 동일하게 설정
          let endDate: Date
          if (stage.end_date) {
            endDate = new Date(stage.end_date)
          } else if (stage.actual_end_date) {
            endDate = new Date(stage.actual_end_date)
          } else {
            // 날짜가 없으면 시작일과 동일하게 설정 (같은 날짜로 표시)
            endDate = new Date(startDate)
          }
          
          // 다음 단계를 위해 현재 단계의 종료일 저장
          previousEndDate = new Date(endDate)

          // 날짜 설정 여부 확인
          const hasDateData = !!(stage.start_date || stage.actual_start_date || stage.end_date || stage.actual_end_date)
          
          const stageTask: Task & { hasDateData?: boolean } = {
            id: `stage-${project.id}-${stage.id}`,
            name: PROCESS_STAGE_NAMES[stage.stage_name] || stage.stage_name,
            start: startDate,
            end: endDate,
            type: 'task',
            progress: stageProgress,
            project: `project-${project.id}`,
            dependencies: stageIndex > 0 ? [`stage-${project.id}-${sortedStages[stageIndex - 1].id}`] : [],
            styles: stageColor,
            hasDateData: hasDateData
          }
          
          ganttTasks.push(stageTask)
        })
      }
    })

    return ganttTasks
  }, [projects, expandedProjects])

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    onTaskClick?.(task)
  }

  const handleTaskDoubleClick = (task: Task) => {
    onTaskDoubleClick?.(task)
  }

  const handleDateChange = (task: Task) => {
    onDateChange?.(task)
  }

  const handleProgressChange = (task: Task) => {
    onProgressChange?.(task)
  }

  const handleExpanderClick = (task: Task) => {
    // 프로젝트 접기/펼치기 상태 관리
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(task.id)) {
        newSet.delete(task.id)
      } else {
        newSet.add(task.id)
      }
      
      // Check if all are expanded to update toggle all button state
      const allProjectIds = projects.map(p => `project-${p.id}`)
      setIsAllExpanded(allProjectIds.every(id => newSet.has(id)))
      
      return newSet
    })
  }
  
  // 전체 펼치기/접기 함수
  const handleToggleAll = () => {
    if (isAllExpanded) {
      // Collapse all
      setExpandedProjects(new Set())
      setIsAllExpanded(false)
    } else {
      // Expand all
      const allProjectIds = new Set(projects.map(p => `project-${p.id}`))
      setExpandedProjects(allProjectIds)
      setIsAllExpanded(true)
    }
  }

  // 로딩 상태
  if (loading) {
    return (
      <Card className="gantt-chart-container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" tip="프로젝트 데이터를 불러오는 중..." />
        </div>
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

  return (
    <div>
      <Card className="gantt-chart-container">
        {/* 전체 펼치기/접기 버튼 */}
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <Button
            onClick={handleToggleAll}
            icon={isAllExpanded ? <CompressOutlined /> : <ExpandOutlined />}
            type="default"
          >
            {isAllExpanded ? '모두 접기' : '모두 펼치기'}
          </Button>
        </div>
        <div className="gantt-wrapper">
          <Gantt
          tasks={tasks}
          viewMode={viewMode}
          onClick={handleTaskClick}
          onDoubleClick={handleTaskDoubleClick}
          onDateChange={handleDateChange}
          onProgressChange={handleProgressChange}
          onExpanderClick={handleExpanderClick}
          locale={locale}
          barCornerRadius={3}
          barFill={60}
          columnWidth={viewMode === ViewMode.Month ? 300 : viewMode === ViewMode.Week ? 250 : 65}
          listCellWidth="550px"
          rowHeight={40}
          fontSize="14px"
          fontFamily="'Segoe UI', 'Noto Sans KR', sans-serif"
          todayColor="rgba(252, 248, 227, 0.5)"
          arrowColor="#1890ff"
          arrowIndent={20}
          TaskListHeader={CustomTaskListHeader}
          TaskListTable={(props) => (
            <CustomTaskListTable
              {...props}
              selectedTask={selectedTask}
              onExpanderClick={handleExpanderClick}
              onClick={handleTaskClick}
            />
          )}
        />
        </div>
      </Card>
      
      {/* 페이지네이션 */}
      <div style={{ marginTop: '20px', padding: '0 24px' }}>
        <Space size="middle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <Text type="secondary">
            전체 {total}개 프로젝트 중 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, total)}개 표시
          </Text>
          
          <Pagination
            current={currentPage}
            total={total}
            pageSize={pageSize}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
            showTotal={(total, range) => `${range[0]}-${range[1]} / ${total}개`}
          />
        </Space>
      </div>

      <style jsx>{`
        .gantt-chart-container {
          width: 100%;
          overflow: hidden;
        }

        .gantt-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        :global(.gantt-chart-container .ant-card-body) {
          padding: 0;
        }

        /* 커스텀 TaskList 스타일 */
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
          height: 40px;
          align-items: center;
        }
        
        :global(.gantt-task-list-header-cell) {
          padding: 0 16px;
          border-right: 1px solid #e8e8e8;
          display: flex;
          align-items: center;
          height: 100%;
        }

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

        :global(.gantt .gantt-milestone) {
          transform: rotate(45deg);
        }

        :global(.gantt .gantt-project) {
          border-radius: 6px !important;
        }

        :global(.gantt .gantt-arrow) {
          stroke-width: 1.5;
        }

        :global(.gantt .gantt-grid-row-even) {
          background: #fafafa;
        }

        :global(.gantt .gantt-grid-row-odd) {
          background: white;
        }

        /* 기본 TaskList 컬럼 숨기기 */
        :global(.gantt ._3T42e) {
          display: none !important;
        }
        
        :global(.gantt ._3zRFW) {
          display: none !important;
        }
      `}</style>
    </div>
  )
}