'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Card, Row, Col, Button, Input, Select, Space, Typography, Empty, 
  Skeleton, Tag, Progress, message, Modal, Badge, Tooltip 
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
  DeleteOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  UserOutlined,
  CalendarOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { projectService } from '@/lib/services/projects.service'
import { PROCESS_STAGES, type Project, type ProjectFilters, type ProcessStageName } from '@/types/project'
import ImageCarousel from '@/components/projects/ImageCarousel'

const { Title, Text } = Typography
const { Search } = Input
const { Option } = Select
const { confirm } = Modal

export default function ProjectsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStage, setSelectedStage] = useState<ProcessStageName | undefined>()
  const [showUrgentOnly, setShowUrgentOnly] = useState(false)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [totalProjects, setTotalProjects] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  // 프로젝트 목록 조회
  const fetchProjects = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const appliedFilters: ProjectFilters = {
        search: searchTerm || undefined,
        current_process_stage: selectedStage,
        is_urgent: showUrgentOnly || undefined,
        favorites_only: showFavoritesOnly || undefined
      }

      const response = await projectService.getProjects(
        appliedFilters,
        { sortBy: 'created_at', order: 'desc' },
        { page: currentPage, limit: 20 }
      )

      setProjects(response.data)
      setTotalProjects(response.total)
    } catch (error: any) {
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
    } catch (error) {
      message.error('즐겨찾기 처리에 실패했습니다.')
    }
  }

  // 프로젝트 삭제
  const handleDeleteProject = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation()
    
    confirm({
      title: '프로젝트 삭제',
      icon: <ExclamationCircleOutlined />,
      content: `"${project.site_name}" 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        try {
          await projectService.deleteProject(project.id)
          message.success('프로젝트가 삭제되었습니다.')
          fetchProjects(true)
        } catch (error) {
          message.error('프로젝트 삭제에 실패했습니다.')
        }
      }
    })
  }

  // 공정 상태 색상
  const getStageColor = (stage: ProcessStageName) => {
    const stageColors: Record<ProcessStageName, string> = {
      contract: '#1890ff',
      design: '#52c41a',
      order: '#faad14',
      laser: '#f5222d',
      welding: '#722ed1',
      plating: '#13c2c2',
      painting: '#eb2f96',
      panel: '#fa8c16',
      assembly: '#a0d911',
      shipping: '#1890ff',
      installation: '#52c41a',
      certification: '#faad14',
      closing: '#f5222d',
      completion: '#722ed1'
    }
    return stageColors[stage]
  }

  // 진행률 계산
  const calculateProgress = (project: Project): number => {
    if (!project.process_stages || project.process_stages.length === 0) return 0
    
    const completedStages = project.process_stages.filter(s => s.status === 'completed').length
    return Math.round((completedStages / 14) * 100)
  }

  // 상태별 색상
  const getStatusColor = (project: Project) => {
    const hasDelayed = project.process_stages?.some(s => s.status === 'delayed')
    if (hasDelayed) return 'error'
    
    const progress = calculateProgress(project)
    if (progress === 100) return 'success'
    if (progress > 0) return 'processing'
    return 'default'
  }

  useEffect(() => {
    fetchProjects()
  }, [searchTerm, selectedStage, showUrgentOnly, showFavoritesOnly, currentPage])

  return (
    <div className="p-6">
      {/* 헤더 섹션 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Title level={2} className="mb-2">
            프로젝트 관리
          </Title>
          <Text type="secondary" className="text-base">
            전체 {totalProjects}개의 프로젝트
          </Text>
        </div>
        <Space>
          <Button 
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={() => fetchProjects(true)}
            disabled={refreshing}
          >
            새로고침
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            size="large"
            onClick={() => router.push('/projects/new')}
          >
            새 프로젝트
          </Button>
        </Space>
      </div>

      {/* 필터 및 검색 */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <Search
            placeholder="현장명, 제품명으로 검색..."
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', maxWidth: 400 }}
            size="large"
            prefix={<SearchOutlined className="text-gray-400" />}
          />
          
          <Space wrap>
            <Select
              placeholder="공정 단계"
              value={selectedStage}
              onChange={setSelectedStage}
              style={{ width: 160 }}
              size="large"
              allowClear
            >
              {Object.entries(PROCESS_STAGES).map(([key, label]) => (
                <Option key={key} value={key}>
                  {label}
                </Option>
              ))}
            </Select>

            <Button
              type={showUrgentOnly ? 'primary' : 'default'}
              icon={<ThunderboltOutlined />}
              onClick={() => setShowUrgentOnly(!showUrgentOnly)}
              size="large"
              danger={showUrgentOnly}
            >
              긴급만
            </Button>

            <Button
              type={showFavoritesOnly ? 'primary' : 'default'}
              icon={showFavoritesOnly ? <HeartFilled /> : <HeartOutlined />}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              size="large"
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
            <Col xs={24} md={12} lg={8} key={i}>
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
              <Col xs={24} md={12} lg={8} key={project.id}>
                <Card
                  className="project-card cursor-pointer hover:shadow-lg transition-all h-full"
                  onClick={() => router.push(`/projects/${project.id}`)}
                  bodyStyle={{ padding: 0 }}
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
                          <Tooltip title="삭제">
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={(e) => handleDeleteProject(e, project)}
                            />
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </Card>
              </Col>
            )
          })}
        </Row>
      )}
    </div>
  )
}