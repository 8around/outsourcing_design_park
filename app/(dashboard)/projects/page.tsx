'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { isManager } from '@/lib/utils/permissions'
import {
  Card, Row, Col, Button, Input, Select, Typography, Empty,
  Skeleton, Tag, Progress, message, Tooltip, Pagination, Space
} from 'antd'
import {
  ProjectOutlined,
  PlusOutlined,
  SearchOutlined,
  HeartOutlined,
  HeartFilled,
  EnvironmentOutlined,
  TeamOutlined,
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
  UserOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  FileExcelOutlined
} from '@ant-design/icons'
import { projectService } from '@/lib/services/projects.service'
import { logService } from '@/lib/services/logs.service'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { generateProjectExcel, downloadExcel, generateExportFileName } from '@/lib/utils/excel'
import ExportProjectModal from '@/components/projects/ExportProjectModal'
import type { HistoryLogWithAttachments } from '@/types/log'
import { PROCESS_STAGES, type Project, type ProjectFilters, type ProcessStageName, type ProjectCompletionStatus } from '@/types/project'
import ImageCarousel from '@/components/projects/ImageCarousel'

const { Title, Text } = Typography
const { Search } = Input
const { Option } = Select

export default function ProjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, userData } = useAuth()

  // URL에서 초기값 읽기
  const pageFromUrl = parseInt(searchParams.get('page') ?? '1')
  const searchFromUrl = searchParams.get('search') ?? ''
  const stageFromUrl = searchParams.get('stage') as ProcessStageName | null
  const urgentFromUrl = searchParams.get('urgent') === 'true'
  const favoritesFromUrl = searchParams.get('favorites') === 'true'
  const statusFromUrl = (searchParams.get('status') as ProjectCompletionStatus) ?? 'in_progress'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [searchTerm, setSearchTerm] = useState(searchFromUrl)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [selectedStage, setSelectedStage] = useState<ProcessStageName | undefined>(stageFromUrl || undefined)
  const [showUrgentOnly, setShowUrgentOnly] = useState(urgentFromUrl)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(favoritesFromUrl)
  const [completionStatus, setCompletionStatus] = useState<ProjectCompletionStatus>(statusFromUrl)
  const [totalProjects, setTotalProjects] = useState(0)
  const [currentPage, setCurrentPage] = useState(pageFromUrl)
  const [exportModalVisible, setExportModalVisible] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // URL 업데이트 함수
  const updateURL = useCallback((params: {
    page?: number
    search?: string
    stage?: string
    urgent?: boolean
    favorites?: boolean
    status?: string
  }) => {
    const newParams = new URLSearchParams()

    // 페이지 (1이 아닐 때만 URL에 추가)
    if (params.page && params.page > 1) {
      newParams.set('page', String(params.page))
    }

    // 검색어 (있을 때만)
    if (params.search) {
      newParams.set('search', params.search)
    }

    // 공정 단계 (있을 때만)
    if (params.stage) {
      newParams.set('stage', params.stage)
    }

    // 긴급 필터 (true일 때만)
    if (params.urgent) {
      newParams.set('urgent', 'true')
    }

    // 즐겨찾기 필터 (true일 때만)
    if (params.favorites) {
      newParams.set('favorites', 'true')
    }

    // 완료 상태 (기본값 'in_progress'가 아닐 때만)
    if (params.status && params.status !== 'in_progress') {
      newParams.set('status', params.status)
    }

    const queryString = newParams.toString()
    const url = queryString ? `/projects?${queryString}` : '/projects'

    // shallow routing으로 스크롤 위치 유지
    router.push(url, { scroll: false })
  }, [router])

  // 현재 파라미터 가져오기
  const getCurrentParams = useCallback(() => ({
    page: currentPage,
    search: debouncedSearchTerm,
    stage: selectedStage || '',
    urgent: showUrgentOnly,
    favorites: showFavoritesOnly,
    status: completionStatus
  }), [currentPage, debouncedSearchTerm, selectedStage, showUrgentOnly, showFavoritesOnly, completionStatus])

  // 프로젝트 목록 조회
  const fetchProjects = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const appliedFilters: ProjectFilters = {
        search: debouncedSearchTerm || undefined,
        current_process_stage: selectedStage,
        is_urgent: showUrgentOnly ? true : undefined,
        favorites_only: showFavoritesOnly ? true : undefined,
        completion_status: completionStatus
      }

      const response = await projectService.getProjects(
        appliedFilters,
        { sortBy: 'expected_completion_date', order: 'desc' },
        { page: currentPage, limit: 12 }
      )

      setProjects(response.data)
      setTotalProjects(response.total)
    } catch (error: unknown) {
      message.error('프로젝트 목록을 불러오는데 실패했습니다.')
      console.error(error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 즐겨찾기 토글
  const handleToggleFavorite = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    try {
      const isFavorite = await projectService.toggleFavorite(projectId)
      message.success(isFavorite ? '즐겨찾기에 추가되었습니다.' : '즐겨찾기에서 제거되었습니다.')
      fetchProjects(true)
    } catch {
      message.error('즐겨찾기 처리에 실패했습니다.')
    }
  }

  // 프로젝트 내보내기 핸들러
  const handleExportProjects = async (projectIds: string[]) => {
    setIsExporting(true)
    try {
      // 1. 선택된 프로젝트 데이터 조회
      const projectsToExport = await projectService.getProjectsByIds(projectIds, { sortBy: 'expected_completion_date', order: 'desc' })

      // 2. 각 프로젝트별 전체 히스토리 로그 조회 (병렬 처리)
      const logPromises = projectIds.map(async (projectId) => {
        const logs = await logService.getAllProjectLogs(projectId)
        return { projectId, logs }
      })
      const logResults = await Promise.all(logPromises)

      // 3. 로그 맵 생성
      const logsByProject = new Map<string, HistoryLogWithAttachments[]>()
      logResults.forEach(({ projectId, logs }) => {
        logsByProject.set(projectId, logs)
      })

      // 4. Excel 파일 생성
      const buffer = await generateProjectExcel(projectsToExport, logsByProject)

      // 5. 파일 다운로드
      const fileName = generateExportFileName()
      downloadExcel(buffer, fileName)

      message.success(`${projectIds.length}개 프로젝트를 내보냈습니다.`)
      setExportModalVisible(false)
    } catch (error) {
      console.error('프로젝트 내보내기 실패:', error)
      message.error('내보내기에 실패했습니다.')
    } finally {
      setIsExporting(false)
    }
  }

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    updateURL({ ...getCurrentParams(), page })
  }

  // 완료 상태 변경 핸들러
  const handleCompletionStatusChange = (value: ProjectCompletionStatus) => {
    setCompletionStatus(value)
    setCurrentPage(1)
    updateURL({ ...getCurrentParams(), status: value, page: 1 })
  }

  // 공정 단계 변경 핸들러
  const handleStageChange = (value: ProcessStageName | undefined) => {
    setSelectedStage(value || undefined)
    setCurrentPage(1)
    updateURL({ ...getCurrentParams(), stage: value || '', page: 1 })
  }

  // 긴급 필터 토글 핸들러
  const handleUrgentToggle = () => {
    const newValue = !showUrgentOnly
    setShowUrgentOnly(newValue)
    setCurrentPage(1)
    updateURL({ ...getCurrentParams(), urgent: newValue, page: 1 })
  }

  // 즐겨찾기 필터 토글 핸들러
  const handleFavoritesToggle = () => {
    const newValue = !showFavoritesOnly
    setShowFavoritesOnly(newValue)
    setCurrentPage(1)
    updateURL({ ...getCurrentParams(), favorites: newValue, page: 1 })
  }

  // 공정 상태 색상
  const getStageColor = (stage: ProcessStageName) => {
    const stageColors: Record<ProcessStageName, string> = {
      contract: '#1890ff',
      design: '#52c41a',
      order: '#faad14',
      incoming: '#f5222d',
      welding: '#722ed1',
      plating: '#13c2c2',
      painting: '#eb2f96',
      grc_frp: '#fa8c16',
      panel: '#a0d911',
      fabrication: '#1890ff',
      shipping: '#52c41a',
      installation: '#faad14',
      certification: '#f5222d',
      closing: '#722ed1',
      completion: '#13c2c2'
    }
    return stageColors[stage]
  }

  // 진행률 계산
  const calculateProgress = (project: Project): number => {
    if (!project.process_stages || project.process_stages.length === 0) return 0

    const completedStages = project.process_stages.filter(s => s.status === 'completed').length
    return Math.round((completedStages / 15) * 100)
  }

  // 상태별 색상
  const getStatusColor = (project: Project) => {
    const hasDelayed = project.process_stages?.some(s => s.status === 'delayed')
    if (hasDelayed) return 'exception'

    const progress = calculateProgress(project)
    if (progress === 100) return 'success'
    if (progress > 0) return 'active'
    return 'normal'
  }

  // 검색어 변경 시 URL 업데이트 (debounce 적용)
  useEffect(() => {
    if (debouncedSearchTerm !== searchFromUrl) {
      setCurrentPage(1)
      updateURL({ ...getCurrentParams(), search: debouncedSearchTerm, page: 1 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm])

  // 데이터 페칭
  useEffect(() => {
    fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, selectedStage, showUrgentOnly, showFavoritesOnly, currentPage, completionStatus])

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex flex-row items-center justify-between mb-6 gap-4">
        <div>
          <Title level={2} className="mb-2 flex items-center gap-3">
            <ProjectOutlined />
            프로젝트 관리
          </Title>
          <Text type="secondary" className="text-base">
            전체 {totalProjects}개의 프로젝트
          </Text>
        </div>
        <div className="flex gap-2">
          <Button
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={() => fetchProjects(true)}
            disabled={refreshing}
          >
            새로고침
          </Button>
          <Button
            icon={<FileExcelOutlined />}
            onClick={() => setExportModalVisible(true)}
          >
            내보내기
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/projects/new')}
          >
            새 프로젝트
          </Button>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <Select
            value={completionStatus}
            onChange={handleCompletionStatusChange}
            style={{ width: 100 }}
          >
            <Option value="in_progress">진행중</Option>
            <Option value="completed">완료</Option>
            <Option value="all">전체</Option>
          </Select>

          <Search
            placeholder="현장명, 제품명으로 검색..."
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', maxWidth: 400 }}
            prefix={<SearchOutlined className="text-gray-400" />}
          />

          <Select
            placeholder="공정 단계"
            value={selectedStage}
            onChange={handleStageChange}
            style={{ width: 160 }}
            allowClear
          >
            <Option value="">전체</Option>
            {Object.entries(PROCESS_STAGES).map(([key, label]) => (
              <Option key={key} value={key}>
                {label}
              </Option>
            ))}
          </Select>

          <Space>
            <Button
              type={showUrgentOnly ? 'primary' : 'default'}
              icon={<ThunderboltOutlined />}
              onClick={handleUrgentToggle}
              danger={showUrgentOnly}
            >
              긴급만
            </Button>

            <Button
              type={showFavoritesOnly ? 'primary' : 'default'}
              icon={showFavoritesOnly ? <HeartFilled /> : <HeartOutlined />}
              onClick={handleFavoritesToggle}
            >
              즐겨찾기
            </Button>
          </Space>
        </div>
      </Card>

      {/* 프로젝트 목록 */}
      {loading ? (
        <Row gutter={[24, 24]}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Col span={12} lg={6} key={i}>
              <Card>
                <Skeleton active />
              </Card>
            </Col>
          ))}
        </Row>
      ) : projects.length === 0 ? (
        <Card>
          <Empty
            description="프로젝트가 없습니다"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/projects/new')}>
              첫 프로젝트 만들기
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[24, 24]}>
          {projects.map(project => {
            const progress = calculateProgress(project)
            const isFavorite = project.favorites && project.favorites.length > 0

            return (
              <Col span={12} lg={6} key={project.id}>
                <Card
                  className="project-card cursor-pointer hover:shadow-lg transition-all h-full"
                  onClick={() => router.push(`/projects/${project.id}`)}
                  styles={{ body: { padding: 0 } }}
                >
                    {/* 썸네일 섹션 */}
                    <div
                      className="thumbnail-section"
                      style={{ position: 'relative' }}
                    >
                      {(project.project_images && project.project_images.length > 0) || project.thumbnail_url ? (
                        <ImageCarousel
                          images={(() => {
                            // 실제 프로젝트 이미지 사용
                            if (project.project_images && project.project_images.length > 0) {
                              // project_images가 있으면 display_order로 정렬하여 사용
                              return project.project_images
                                .sort((a, b) => a.display_order - b.display_order)
                                .map(img => img.image_url);
                            } else if (project.thumbnail_url) {
                              // project_images가 없지만 thumbnail_url이 있으면 단일 이미지로 표시
                              return [project.thumbnail_url];
                            }
                            return [];
                          })()}
                          alt={project.site_name}
                          height={200}
                        />
                      ) : (
                        <div
                          className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100"
                          style={{ height: 200 }}
                        >
                          <ProjectOutlined style={{ fontSize: 48, color: '#8c8c8c' }} />
                        </div>
                      )}

                      {/* 즐겨찾기 버튼 */}
                      <Button
                        type="text"
                        icon={isFavorite ?
                          <HeartFilled style={{ fontSize: 20, color: '#ff4d4f' }} /> :
                          <HeartOutlined style={{ fontSize: 20 }} />
                        }
                        onClick={(e) => handleToggleFavorite(e, project.id)}
                        className="hover:scale-110 transition-transform duration-200"
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(4px)',
                          borderRadius: '50%',
                          width: 36,
                          height: 36,
                          zIndex: 20,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      />
                    </div>

                    {/* 프로젝트 정보 */}
                    <div className="p-5">
                      <div className="space-y-3">
                        {/* 현장명 */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Title level={5} className="mb-0 truncate flex-1">
                              <EnvironmentOutlined className="mr-2" />
                              {project.site_name}
                            </Title>
                            {project.is_urgent && (
                              <Tag color="red" className="ml-auto">
                                <ThunderboltOutlined /> 긴급
                              </Tag>
                            )}
                          </div>
                        </div>

                        {/* 제품 정보 */}
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="truncate">
                            제품: {project.product_name} ({project.product_quantity}개)
                          </div>
                          <div className="flex items-center gap-2">
                            <TeamOutlined />
                            <span>{project.site_manager_user?.name || '미지정'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <UserOutlined />
                            <span>{project.sales_manager_user?.name || '미지정'}</span>
                          </div>
                        </div>

                        {/* 상태 및 진행률 */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Tag color={getStageColor(project.current_process_stage)}>
                              {PROCESS_STAGES[project.current_process_stage]}
                            </Tag>
                            <Text className="text-sm font-medium">{progress}%</Text>
                          </div>
                          <Progress
                            percent={progress}
                            size="small"
                            showInfo={false}
                            status={getStatusColor(project)}
                          />
                        </div>

                        {/* 날짜 정보 */}
                        <div className="pt-2 border-t flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <CalendarOutlined />
                            준공: {new Date(project.expected_completion_date).toLocaleDateString()}
                          </span>
                        </div>

                        {/* 액션 버튼 */}
                        <div className="flex justify-end gap-1 pt-2 border-t">
                          <Tooltip title="상세보기">
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/projects/${project.id}`)
                              }}
                            />
                          </Tooltip>
                          {(user?.id === project.created_by || isManager(userData?.role)) && (
                            <Tooltip title="수정">
                              <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/projects/${project.id}/edit`)
                                }}
                              />
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
              </Col>
            )
          })}
        </Row>
      )}

      {/* 페이지네이션 */}
      {!loading && projects.length > 0 && (
        <div className="flex justify-center mt-8">
          <Pagination
            current={currentPage}
            total={totalProjects}
            pageSize={12}
            onChange={handlePageChange}
            showSizeChanger={false}
            showTotal={(total, range) => `${range[0]}-${range[1]} / 전체 ${total}개`}
            className="mt-4"
          />
        </div>
      )}

      {/* 내보내기 모달 */}
      <ExportProjectModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onExport={handleExportProjects}
        isExporting={isExporting}
      />
    </div>
  )
}
