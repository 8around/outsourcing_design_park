'use client'

import React from 'react'
import { Task } from 'gantt-task-react'
import { Tag } from 'antd'
import { 
  CaretRightOutlined, 
  CaretDownOutlined,
  FolderOutlined,
  FileOutlined 
} from '@ant-design/icons'

interface CustomTaskListProps {
  tasks: (Task & { hasDateData?: boolean; hasChildren?: boolean })[]
  selectedTask?: Task | null
  onExpanderClick?: (task: Task) => void
  onClick?: (task: Task) => void
}

export const CustomTaskListHeader: React.FC = () => {
  return (
    <div className="gantt-task-list-header">
      <div className="gantt-task-list-header-row">
        <div className="gantt-task-list-header-cell" style={{ minWidth: '350px' }}>
          프로젝트 / 공정 단계
        </div>
        <div className="gantt-task-list-header-cell" style={{ width: '100px', textAlign: 'center' }}>
          진행률
        </div>
        <div className="gantt-task-list-header-cell" style={{ width: '100px', textAlign: 'center' }}>
          상태
        </div>
      </div>
    </div>
  )
}

export const CustomTaskListTable: React.FC<CustomTaskListProps> = ({
  tasks,
  selectedTask,
  onExpanderClick,
  onClick
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
            <div className="gantt-task-list-cell" style={{ minWidth: '350px', display: 'flex', alignItems: 'center' }}>
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
            <div className="gantt-task-list-cell" style={{ width: '100px', textAlign: 'center' }}>
              <span style={{ 
                color: task.progress === 100 ? '#52c41a' : '#1890ff',
                fontWeight: 500
              }}>
                {task.progress}%
              </span>
            </div>

            {/* 상태 */}
            <div className="gantt-task-list-cell" style={{ width: '100px', textAlign: 'center' }}>
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