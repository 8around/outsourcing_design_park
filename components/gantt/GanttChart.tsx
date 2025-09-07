'use client'

import React, { useMemo } from 'react'
import { Gantt, Task, ViewMode } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import { Card } from 'antd'

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
  // 테스트 데이터 생성
  const tasks: Task[] = useMemo(() => {
    const currentDate = new Date()
    const getDate = (days: number) => {
      const date = new Date(currentDate)
      date.setDate(date.getDate() + days)
      return date
    }

    return [
      // ABC 제조공장 프로젝트
      {
        start: getDate(-60),
        end: getDate(-30),
        name: '계약 및 기본 설계',
        id: 'Task-1',
        type: 'task',
        progress: 100,
        project: 'project-1',
        styles: { 
          backgroundColor: '#52c41a',
          progressColor: '#237804',
          progressSelectedColor: '#092b00'
        }
      },
      {
        start: getDate(-35),
        end: getDate(-10),
        name: '상세 도면 작성',
        id: 'Task-2',
        type: 'task',
        progress: 100,
        dependencies: ['Task-1'],
        project: 'project-1',
        styles: { 
          backgroundColor: '#52c41a',
          progressColor: '#237804',
          progressSelectedColor: '#092b00'
        }
      },
      {
        start: getDate(-15),
        end: getDate(0),
        name: '자재 발주',
        id: 'Task-3',
        type: 'task',
        progress: 90,
        dependencies: ['Task-2'],
        project: 'project-1',
        styles: { 
          backgroundColor: '#1890ff',
          progressColor: '#0050b3',
          progressSelectedColor: '#002766'
        }
      },
      {
        start: getDate(-5),
        end: getDate(20),
        name: '레이저 가공',
        id: 'Task-4',
        type: 'task',
        progress: 75,
        dependencies: ['Task-3'],
        project: 'project-1',
        styles: { 
          backgroundColor: '#1890ff',
          progressColor: '#0050b3',
          progressSelectedColor: '#002766'
        }
      },
      {
        start: getDate(15),
        end: getDate(40),
        name: '용접 작업',
        id: 'Task-5',
        type: 'task',
        progress: 30,
        dependencies: ['Task-4'],
        project: 'project-1',
        styles: { 
          backgroundColor: '#1890ff',
          progressColor: '#0050b3',
          progressSelectedColor: '#002766'
        }
      },
      {
        start: getDate(35),
        end: getDate(50),
        name: '도장 작업',
        id: 'Task-6',
        type: 'task',
        progress: 0,
        dependencies: ['Task-5'],
        project: 'project-1',
        styles: { 
          backgroundColor: '#faad14',
          progressColor: '#d48806',
          progressSelectedColor: '#873800'
        }
      },
      {
        start: getDate(45),
        end: getDate(70),
        name: '현장 설치',
        id: 'Task-7',
        type: 'task',
        progress: 0,
        dependencies: ['Task-6'],
        project: 'project-1',
        styles: { 
          backgroundColor: '#faad14',
          progressColor: '#d48806',
          progressSelectedColor: '#873800'
        }
      },
      {
        start: getDate(70),
        end: getDate(75),
        name: '프로젝트 완료',
        id: 'Task-8',
        type: 'milestone',
        progress: 0,
        dependencies: ['Task-7'],
        project: 'project-1'
      },
      // 프로젝트 그룹
      {
        start: getDate(-60),
        end: getDate(75),
        name: 'ABC 제조공장 설비 구축',
        id: 'project-1',
        type: 'project',
        progress: 55,
        hideChildren: false,
        styles: { 
          backgroundColor: '#722ed1',
          progressColor: '#391085',
          progressSelectedColor: '#120338'
        }
      },

      // XYZ 물류센터 프로젝트
      {
        start: getDate(-45),
        end: getDate(-25),
        name: '부지 조사',
        id: 'Task-9',
        type: 'task',
        progress: 100,
        project: 'project-2',
        styles: { 
          backgroundColor: '#52c41a',
          progressColor: '#237804',
          progressSelectedColor: '#092b00'
        }
      },
      {
        start: getDate(-30),
        end: getDate(5),
        name: '구조 설계',
        id: 'Task-10',
        type: 'task',
        progress: 85,
        dependencies: ['Task-9'],
        project: 'project-2',
        styles: { 
          backgroundColor: '#1890ff',
          progressColor: '#0050b3',
          progressSelectedColor: '#002766'
        }
      },
      {
        start: getDate(0),
        end: getDate(30),
        name: '기초 공사',
        id: 'Task-11',
        type: 'task',
        progress: 20,
        dependencies: ['Task-10'],
        project: 'project-2',
        styles: { 
          backgroundColor: '#1890ff',
          progressColor: '#0050b3',
          progressSelectedColor: '#002766'
        }
      },
      {
        start: getDate(25),
        end: getDate(60),
        name: '골조 공사',
        id: 'Task-12',
        type: 'task',
        progress: 0,
        dependencies: ['Task-11'],
        project: 'project-2',
        styles: { 
          backgroundColor: '#faad14',
          progressColor: '#d48806',
          progressSelectedColor: '#873800'
        }
      },
      {
        start: getDate(60),
        end: getDate(65),
        name: '프로젝트 완료',
        id: 'Task-13',
        type: 'milestone',
        progress: 0,
        dependencies: ['Task-12'],
        project: 'project-2'
      },
      // 프로젝트 그룹
      {
        start: getDate(-45),
        end: getDate(65),
        name: 'XYZ 물류센터 건설',
        id: 'project-2',
        type: 'project',
        progress: 45,
        hideChildren: false,
        styles: { 
          backgroundColor: '#fa541c',
          progressColor: '#ad2102',
          progressSelectedColor: '#5c0011'
        }
      }
    ]
  }, [])

  const handleTaskClick = (task: Task) => {
    console.log('Task clicked:', task)
    onTaskClick?.(task)
  }

  const handleTaskDoubleClick = (task: Task) => {
    console.log('Task double clicked:', task)
    onTaskDoubleClick?.(task)
  }

  const handleDateChange = (task: Task) => {
    console.log('Date changed:', task)
    onDateChange?.(task)
  }

  const handleProgressChange = (task: Task) => {
    console.log('Progress changed:', task)
    onProgressChange?.(task)
  }

  const handleExpanderClick = (task: Task) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        return { ...t, hideChildren: !t.hideChildren }
      }
      return t
    })
    console.log('Expander clicked:', task)
  }

  return (
    <Card className="gantt-chart-container">
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
          listCellWidth="200px"
          rowHeight={40}
          fontSize="14px"
          fontFamily="'Segoe UI', 'Noto Sans KR', sans-serif"
          todayColor="rgba(252, 248, 227, 0.5)"
          arrowColor="#1890ff"
          arrowIndent={20}
        />
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

        :global(.gantt .gantt-task-list-header) {
          background: #fafafa;
          font-weight: 600;
        }

        :global(.gantt .gantt-task-list-cell) {
          border-right: 1px solid #f0f0f0;
        }

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
      `}</style>
    </Card>
  )
}