'use client'

import React, { useState } from 'react'
import { Task } from 'gantt-task-react'
import { Tag } from 'antd'
import { CaretRightOutlined, CaretDownOutlined, FolderOutlined, FileOutlined } from '@ant-design/icons'
import type { GanttTask } from './GanttChart'

// ===== 타입 정의 =====

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
  tasks: GanttTask[]
  onExpanderClick?: (task: Task) => void
  onClick?: (task: Task) => void
  columnWidths: ColumnWidths
}

// ===== 상수 정의 =====

/**
 * 컬럼 너비 제한 (최소/최대)
 */
const COLUMN_LIMITS = {
  project: { min: 200, max: 600 },
  progress: { min: 80, max: 200 },
  status: { min: 80, max: 200 }
}

/**
 * 컬럼 기본 너비
 */
const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  project: 350,
  progress: 100,
  status: 100
}

// ===== 유틸 함수 =====

/**
 * 진행률과 Task 유형에 따른 상태 정보 반환
 * @param progress - 진행률 (0-100)
 * @param isProject - 프로젝트 여부
 * @returns { text: 상태 텍스트, color: 태그 색상 }
 */
const getStatus = (progress: number, isProject: boolean): { text: string; color: string } => {
  if (isProject) {
    // 프로젝트는 완료/진행중만 표시
    return progress === 100
      ? { text: '완료', color: 'success' }
      : { text: '진행중', color: 'processing' }
  }
  // 공정 단계는 상세 상태 표시
  if (progress === 100) return { text: '완료', color: 'success' }
  if (progress >= 50) return { text: '진행중', color: 'processing' }
  if (progress > 0) return { text: '지연', color: 'warning' }
  return { text: '대기', color: 'default' }
}

// ===== 컴포넌트 =====

/**
 * 간트차트 커스텀 TaskList 헤더 컴포넌트
 * - 컬럼 너비 드래그 조절 기능 포함
 */
export const CustomTaskListHeader: React.FC<CustomTaskListHeaderProps> = ({
  columnWidths,
  onColumnResize
}) => {
  // 현재 리사이징 중인 컬럼
  const [resizingColumn, setResizingColumn] = useState<keyof ColumnWidths | null>(null)

  /**
   * 컬럼 리사이저 마우스 다운 핸들러
   * - 드래그 시작 시 마우스 이동 이벤트 등록
   */
  const handleResizerMouseDown = (columnKey: keyof ColumnWidths) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const startWidth = columnWidths[columnKey]
    const limits = COLUMN_LIMITS[columnKey]
    setResizingColumn(columnKey)

    // 마우스 이동 핸들러
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX
      const newWidth = Math.max(limits.min, Math.min(limits.max, startWidth + diff))
      onColumnResize(columnKey, newWidth)
    }

    // 마우스 업 핸들러 (드래그 종료)
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setResizingColumn(null)
    }

    // 드래그 중 커서 및 텍스트 선택 방지
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  /**
   * 컬럼 리사이저 더블클릭 핸들러
   * - 해당 컬럼 너비를 기본값으로 복원
   */
  const handleResizerDoubleClick = (columnKey: keyof ColumnWidths) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onColumnResize(columnKey, DEFAULT_COLUMN_WIDTHS[columnKey])
  }

  // 컬럼 정의
  const columns: { key: keyof ColumnWidths; label: string; center?: boolean }[] = [
    { key: 'project', label: '프로젝트 / 공정 단계' },
    { key: 'progress', label: '진행률', center: true },
    { key: 'status', label: '상태', center: true }
  ]

  return (
    <div className="gantt-task-list-header">
      <div className="gantt-task-list-header-row">
        {columns.map(({ key, label, center }) => (
          <div
            key={key}
            className="gantt-task-list-header-cell column-header-cell"
            style={{
              width: `${columnWidths[key]}px`,
              position: 'relative',
              textAlign: center ? 'center' : undefined
            }}
          >
            {label}
            {/* 컬럼 리사이저 (드래그 핸들) */}
            <div
              className={`column-resizer ${resizingColumn === key ? 'resizing' : ''}`}
              onMouseDown={handleResizerMouseDown(key)}
              onDoubleClick={handleResizerDoubleClick(key)}
              aria-label={`${label} 컬럼 너비 조절`}
            />
          </div>
        ))}
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

        .column-resizer:hover,
        .column-resizer:active {
          background: #1890ff;
        }

        .column-resizer.resizing {
          background: #096dd9;
        }
      `}</style>
    </div>
  )
}

/**
 * 간트차트 커스텀 TaskList 테이블 컴포넌트
 * - 프로젝트/공정 단계 목록 표시
 * - 프로젝트 접기/펼치기 기능
 */
export const CustomTaskListTable: React.FC<CustomTaskListProps> = ({
  tasks,
  onExpanderClick,
  onClick,
  columnWidths
}) => {
  return (
    <div className="gantt-task-list-table">
      {tasks.map((task, index) => {
        const isProjectTask = task.type === 'project'
        const hasChildren = isProjectTask && (task.hasChildren || tasks.some(t => t.project === task.id))
        const status = getStatus(task.progress, isProjectTask)
        const isUrgent = task.name?.includes('[긴급]')

        return (
          <div
            key={`${task.id}-${index}`}
            className={`gantt-task-list-row ${
              index % 2 === 0 ? 'gantt-task-list-row-even' : 'gantt-task-list-row-odd'
            }`}
            onClick={() => onClick?.(task)}
          >
            {/* 프로젝트/공정 이름 컬럼 */}
            <div
              className="gantt-task-list-cell"
              style={{ width: `${columnWidths.project}px`, display: 'flex', alignItems: 'center' }}
            >
              {/* 프로젝트 접기/펼치기 버튼 */}
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

              {/* 공정 단계 들여쓰기 */}
              {!isProjectTask && <span style={{ marginLeft: '24px' }} />}

              {/* 아이콘 (프로젝트: 폴더, 공정: 파일) */}
              {isProjectTask
                ? <FolderOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                : <FileOutlined style={{ marginRight: '8px', color: '#8c8c8c' }} />
              }

              {/* 이름 */}
              <span style={{
                fontWeight: isProjectTask ? 600 : 400,
                fontSize: isProjectTask ? '14px' : '13px'
              }}>
                {task.name}
              </span>

              {/* 날짜 미설정 표시 */}
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

              {/* 긴급 태그 */}
              {isUrgent && <Tag color="red" style={{ marginLeft: '8px' }}>긴급</Tag>}
            </div>

            {/* 진행률 컬럼 */}
            <div
              className="gantt-task-list-cell"
              style={{ width: `${columnWidths.progress}px`, textAlign: 'center' }}
            >
              <span style={{
                color: task.progress === 100 ? '#52c41a' : '#1890ff',
                fontWeight: 500
              }}>
                {task.progress}%
              </span>
            </div>

            {/* 상태 컬럼 */}
            <div
              className="gantt-task-list-cell"
              style={{ width: `${columnWidths.status}px`, textAlign: 'center' }}
            >
              <Tag color={status.color}>{status.text}</Tag>
            </div>
          </div>
        )
      })}
    </div>
  )
}
