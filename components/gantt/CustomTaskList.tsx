'use client'

import React, { useState } from 'react'
import { Task } from 'gantt-task-react'
import { Tag } from 'antd'
import {
  CaretRightOutlined,
  CaretDownOutlined,
  FolderOutlined,
  FileOutlined
} from '@ant-design/icons'

interface ColumnWidths {
  project: number
  progress: number
  status: number
}

interface CustomTaskListHeaderProps {
  columnWidths: ColumnWidths
  onColumnResize: (columnKey: keyof ColumnWidths, newWidth: number) => void
}

interface CustomTaskListProps {
  tasks: (Task & { hasDateData?: boolean; hasChildren?: boolean })[]
  selectedTask?: Task | null
  onExpanderClick?: (task: Task) => void
  onClick?: (task: Task) => void
  columnWidths: ColumnWidths
}

export const CustomTaskListHeader: React.FC<CustomTaskListHeaderProps> = ({
  columnWidths,
  onColumnResize
}) => {
  const [resizingColumn, setResizingColumn] = useState<keyof ColumnWidths | null>(null)

  // 컬럼 너비 제한 설정
  const COLUMN_LIMITS = {
    project: { min: 200, max: 600 },
    progress: { min: 80, max: 200 },
    status: { min: 80, max: 200 }
  }

  // 리사이저 마우스다운 핸들러
  const handleResizerMouseDown = (columnKey: keyof ColumnWidths) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const startWidth = columnWidths[columnKey]
    const limits = COLUMN_LIMITS[columnKey]

    setResizingColumn(columnKey)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX
      const newWidth = Math.max(limits.min, Math.min(limits.max, startWidth + diff))
      onColumnResize(columnKey, newWidth)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setResizingColumn(null)
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // 리사이저 더블클릭 핸들러 - 개별 컬럼 기본 너비 복원
  const handleResizerDoubleClick = (columnKey: keyof ColumnWidths) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const defaultWidths: ColumnWidths = {
      project: 350,
      progress: 100,
      status: 100
    }
    onColumnResize(columnKey, defaultWidths[columnKey])
  }

  return (
    <div className="gantt-task-list-header">
      <div className="gantt-task-list-header-row">
        {/* 프로젝트/공정 단계 컬럼 */}
        <div
          className="gantt-task-list-header-cell column-header-cell"
          style={{ width: `${columnWidths.project}px`, position: 'relative' }}
        >
          프로젝트 / 공정 단계
          <div
            className={`column-resizer ${resizingColumn === 'project' ? 'resizing' : ''}`}
            onMouseDown={handleResizerMouseDown('project')}
            onDoubleClick={handleResizerDoubleClick('project')}
            aria-label="프로젝트 컬럼 너비 조절"
          />
        </div>

        {/* 진행률 컬럼 */}
        <div
          className="gantt-task-list-header-cell column-header-cell"
          style={{ width: `${columnWidths.progress}px`, textAlign: 'center', position: 'relative' }}
        >
          진행률
          <div
            className={`column-resizer ${resizingColumn === 'progress' ? 'resizing' : ''}`}
            onMouseDown={handleResizerMouseDown('progress')}
            onDoubleClick={handleResizerDoubleClick('progress')}
            aria-label="진행률 컬럼 너비 조절"
          />
        </div>

        {/* 상태 컬럼 */}
        <div
          className="gantt-task-list-header-cell column-header-cell"
          style={{ width: `${columnWidths.status}px`, textAlign: 'center', position: 'relative' }}
        >
          상태
          <div
            className={`column-resizer ${resizingColumn === 'status' ? 'resizing' : ''}`}
            onMouseDown={handleResizerMouseDown('status')}
            onDoubleClick={handleResizerDoubleClick('status')}
            aria-label="상태 컬럼 너비 조절"
          />
        </div>
      </div>

      <style jsx>{`
        .column-header-cell {
          position: relative;
        }

        .column-resizer {
          position: absolute;
          right: 0;
          top: 0;
          width: 4px;
          height: 100%;
          cursor: col-resize;
          background: transparent;
          transition: background 0.2s;
          z-index: 10;
        }

        .column-resizer:hover {
          background: #1890ff;
        }

        .column-resizer.resizing {
          background: #096dd9;
        }

        .column-resizer:active {
          background: #096dd9;
        }
      `}</style>
    </div>
  )
}

export const CustomTaskListTable: React.FC<CustomTaskListProps> = ({
  tasks,
  selectedTask,
  onExpanderClick,
  onClick,
  columnWidths
}) => {
  // 공정 상태 한글 변환
  const getStatusText = (progress: number, task: Task) => {
    if (task.type === 'project') {
      return progress === 100 ? '완료' : '진행중'
    }
    if (progress === 100) return '완료'
    if (progress >= 50) return '진행중'
    if (progress > 0) return '지연'
    return '대기'
  }

  // 상태별 색상
  const getStatusColor = (progress: number, task: Task) => {
    if (task.type === 'project') {
      return progress === 100 ? 'success' : 'processing'
    }
    if (progress === 100) return 'success'
    if (progress >= 50) return 'processing'
    if (progress > 0) return 'warning'
    return 'default'
  }

  // 프로젝트인지 확인
  const isProject = (task: Task) => task.type === 'project'
  
  // 프로젝트 태스크에서 긴급 여부 확인
  const isUrgent = (task: Task) => task.name?.includes('[긴급]')

  return (
    <div className="gantt-task-list-table">
      {tasks.map((task, index) => {
        const isSelected = selectedTask?.id === task.id
        const isProjectTask = isProject(task)
        const hasChildren = isProjectTask && (task.hasChildren || tasks.some(t => t.project === task.id))
        
        return (
          <div
            key={`${task.id}-${index}`}
            className={`gantt-task-list-row ${isSelected ? 'gantt-task-list-row-selected' : ''} ${
              index % 2 === 0 ? 'gantt-task-list-row-even' : 'gantt-task-list-row-odd'
            }`}
            onClick={() => onClick?.(task)}
          >
            {/* 프로젝트/공정 단계 이름 */}
            <div className="gantt-task-list-cell" style={{ width: `${columnWidths.project}px`, display: 'flex', alignItems: 'center' }}>
              {isProjectTask && hasChildren && (
                <span
                  className="gantt-task-list-expander"
                  onClick={(e) => {
                    e.stopPropagation()
                    onExpanderClick?.(task)
                  }}
                  style={{ cursor: 'pointer', marginRight: '8px' }}
                >
                  {task.hideChildren ? <CaretRightOutlined /> : <CaretDownOutlined />}
                </span>
              )}
              {!isProjectTask && (
                <span style={{ marginLeft: '24px' }} />
              )}
              {isProjectTask ? <FolderOutlined style={{ marginRight: '8px', color: '#1890ff' }} /> : <FileOutlined style={{ marginRight: '8px', color: '#8c8c8c' }} />}
              <span style={{ 
                fontWeight: isProjectTask ? 600 : 400,
                fontSize: isProjectTask ? '14px' : '13px'
              }}>
                {task.name}
              </span>
              {/* 날짜 설정 안됨 표시 */}
              {!isProjectTask && task.hasDateData === false && (
                <span style={{ 
                  marginLeft: '8px', 
                  color: '#8c8c8c',
                  fontSize: '12px',
                  fontStyle: 'italic'
                }}>
                  *(날짜 설정 안됨)*
                </span>
              )}
              {isUrgent(task) && (
                <Tag color="red" style={{ marginLeft: '8px' }}>긴급</Tag>
              )}
            </div>

            {/* 진행률 */}
            <div className="gantt-task-list-cell" style={{ width: `${columnWidths.progress}px`, textAlign: 'center' }}>
              <span style={{ 
                color: task.progress === 100 ? '#52c41a' : '#1890ff',
                fontWeight: 500
              }}>
                {task.progress}%
              </span>
            </div>

            {/* 상태 */}
            <div className="gantt-task-list-cell" style={{ width: `${columnWidths.status}px`, textAlign: 'center' }}>
              <Tag color={getStatusColor(task.progress, task)}>
                {getStatusText(task.progress, task)}
              </Tag>
            </div>
          </div>
        )
      })}
    </div>
  )
}