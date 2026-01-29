'use client'

import { useState, useEffect } from 'react'
import { Modal, Input, List, Button, Typography, Tag, Pagination, Empty, Skeleton, message, Checkbox } from 'antd'
import { SearchOutlined, ProjectOutlined, CalendarOutlined, ThunderboltOutlined, FileExcelOutlined } from '@ant-design/icons'
import { projectService } from '@/lib/services/projects.service'
import { useDebounce } from '@/lib/hooks/useDebounce'
import type { Project } from '@/types/project'
import { Z_INDEX } from '@/lib/config/layout.constants'

const { Text } = Typography

interface ExportProjectModalProps {
  visible: boolean
  onClose: () => void
  onExport: (projectIds: string[]) => Promise<void>
  isExporting: boolean
}

export default function ExportProjectModal({
  visible,
  onClose,
  onExport,
  isExporting
}: ExportProjectModalProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  // 핵심: 검색/페이지와 독립적으로 선택 상태 유지
  const [allSelectedIds, setAllSelectedIds] = useState<Set<string>>(new Set())
  const pageSize = 5

  // 프로젝트 목록 로드
  const loadProjects = async (page: number = 1, search?: string) => {
    setLoading(true)
    try {
      const response = await projectService.getProjects(
        { search: search || undefined },
        { sortBy: 'installation_request_date', order: 'desc' },
        { page, limit: pageSize }
      )

      setProjects(response.data)
      setTotalCount(response.total)
    } catch (error) {
      console.error('프로젝트 목록 로드 실패:', error)
      message.error('프로젝트 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // visible 또는 debouncedSearchTerm 변경 시 상태 초기화 및 API 호출
  useEffect(() => {
    if (visible) {
      setCurrentPage(1)
      loadProjects(1, debouncedSearchTerm)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, debouncedSearchTerm])

  // 페이지 변경
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadProjects(page, debouncedSearchTerm)
  }

  // 체크박스 변경
  const handleCheckboxChange = (projectId: string, checked: boolean) => {
    setAllSelectedIds(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(projectId)
      } else {
        newSet.delete(projectId)
      }
      return newSet
    })
  }

  // 현재 페이지 전체 선택
  const handleSelectAllCurrentPage = () => {
    const currentPageIds = projects.map(p => p.id)
    setAllSelectedIds(prev => {
      const newSet = new Set(prev)
      currentPageIds.forEach(id => newSet.add(id))
      return newSet
    })
  }

  // 현재 페이지 전체 해제
  const handleDeselectAllCurrentPage = () => {
    const currentPageIds = projects.map(p => p.id)
    setAllSelectedIds(prev => {
      const newSet = new Set(prev)
      currentPageIds.forEach(id => newSet.delete(id))
      return newSet
    })
  }

  // 전체 선택 초기화
  const handleClearAll = () => {
    setAllSelectedIds(new Set())
  }

  // 전체 프로젝트 선택
  const handleSelectAllProjects = async () => {
    try {
      const allIds = await projectService.getAllProjectIds()
      setAllSelectedIds(new Set(allIds))
    } catch (error) {
      console.error('전체 프로젝트 선택 실패:', error)
    }
  }

  // 내보내기 버튼 클릭
  const handleExport = async () => {
    if (allSelectedIds.size === 0) {
      message.warning('내보낼 프로젝트를 선택해주세요.')
      return
    }
    await onExport(Array.from(allSelectedIds))
  }

  // 현재 페이지 체크 상태 확인
  const isAllCurrentPageSelected = projects.length > 0 && projects.every(p => allSelectedIds.has(p.id))
  const isSomeCurrentPageSelected = projects.some(p => allSelectedIds.has(p.id))

  return (
    <Modal
      title="프로젝트 내보내기"
      open={visible}
      onCancel={onClose}
      width={700}
      zIndex={Z_INDEX.MODAL}
      maskClosable={!isExporting}
      closable={!isExporting}
      footer={
        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button
              onClick={handleClearAll}
              disabled={allSelectedIds.size === 0 || isExporting}
            >
              초기화
            </Button>
            <Button
              onClick={handleSelectAllProjects}
              disabled={isExporting || allSelectedIds.size === totalCount}
            >
              전체 선택
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} disabled={isExporting}>
              취소
            </Button>
            <Button
              type="primary"
              onClick={handleExport}
              loading={isExporting}
              icon={<FileExcelOutlined />}
            >
              내보내기 ({allSelectedIds.size}개)
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 검색 입력 */}
        <Input
          placeholder="프로젝트명으로 검색"
          prefix={<SearchOutlined />}
          onChange={(e) => setSearchTerm(e.target.value)}
          value={searchTerm}
          allowClear
          disabled={isExporting}
        />

        {/* 현재 페이지 전체 선택 체크박스 */}
        <Checkbox
          indeterminate={isSomeCurrentPageSelected && !isAllCurrentPageSelected}
          checked={isAllCurrentPageSelected}
          disabled={isExporting}
          onChange={(e) => {
            if (e.target.checked) {
              handleSelectAllCurrentPage()
            } else {
              handleDeselectAllCurrentPage()
            }
          }}
        >
          현재 페이지 전체
        </Checkbox>

        {/* 프로젝트 목록 */}
        <div className="project-list-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {loading ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : projects.length > 0 ? (
            <List
              dataSource={projects}
              renderItem={(project) => (
                <List.Item
                  key={project.id}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                    allSelectedIds.has(project.id) ? 'bg-blue-50' : ''
                  } ${isExporting ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => !isExporting && handleCheckboxChange(project.id, !allSelectedIds.has(project.id))}
                >
                  <div className="flex items-center w-full gap-3">
                    <Checkbox
                      checked={allSelectedIds.has(project.id)}
                      disabled={isExporting}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleCheckboxChange(project.id, e.target.checked)}
                    />
                    <ProjectOutlined className="text-gray-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Text strong>{project.site_name}</Text>
                        {project.is_urgent && (
                          <Tag color="red" icon={<ThunderboltOutlined />}>
                            긴급
                          </Tag>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <CalendarOutlined />
                        <Text type="secondary">
                          준공일: {project.expected_completion_date
                            ? new Date(project.expected_completion_date).toLocaleDateString('ko-KR')
                            : '-'
                          }
                        </Text>
                      </div>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Empty description="프로젝트가 없습니다." />
          )}
        </div>

        {/* 페이지네이션 */}
        {totalCount > pageSize && (
          <div className="flex justify-center pt-4 border-t">
            <Pagination
              current={currentPage}
              total={totalCount}
              pageSize={pageSize}
              onChange={handlePageChange}
              showSizeChanger={false}
              showTotal={(total, range) => `${range[0]}-${range[1]} / 총 ${total}개`}
              size="small"
              disabled={isExporting}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
