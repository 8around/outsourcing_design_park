'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { projectService } from '@/lib/services/projects.service'
import { logService } from '@/lib/services/logs.service'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import LogFormSimple from '@/components/logs/LogFormSimple'
import LogList from '@/components/logs/LogList'
import { Loading } from '@/components/common/ui/Loading'
import type { AttachmentFile, LogCategory } from '@/types/log'
import type { User } from '@/types/user'

// 공정 단계 정의
const PROCESS_STAGES = [
  { name: 'contract', label: '계약', order: 1 },
  { name: 'design', label: '도면설계', order: 2 },
  { name: 'order', label: '발주', order: 3 },
  { name: 'laser', label: '레이저', order: 4 },
  { name: 'welding', label: '용접', order: 5 },
  { name: 'plating', label: '도금', order: 6 },
  { name: 'painting', label: '도장', order: 7 },
  { name: 'panel', label: '판넬', order: 8 },
  { name: 'assembly', label: '조립', order: 9 },
  { name: 'shipping', label: '출하', order: 10 },
  { name: 'installation', label: '설치', order: 11 },
  { name: 'certification', label: '인증기간', order: 12 },
  { name: 'closing', label: '마감', order: 13 },
  { name: 'completion', label: '준공일', order: 14 }
]

interface ProjectData {
  id: string
  site_name: string
  sales_manager: string
  site_manager: string
  product_name: string
  product_quantity: number
  outsourcing_company: string
  order_date: string
  expected_completion_date: string
  installation_request_date: string
  current_process_stage: string
  is_urgent: boolean
  created_at: string
  updated_at: string
  created_by: string
  creator?: {
    id: string
    name: string
    email: string
  }
  process_stages?: {
    id: string
    stage_name: string
    stage_order: number
    status: string
    start_date?: string
    end_date?: string
    delay_reason?: string
  }[]
  project_images?: {
    id: string
    image_url: string
    image_name: string
    display_order: number
  }[]
  favorites?: Record<string, unknown>[]
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, userData } = useAuth()
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<ProjectData | null>(null)
  const [salesManager, setSalesManager] = useState<Record<string, unknown> | null>(null)
  const [siteManager, setSiteManager] = useState<Record<string, unknown> | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showLogForm, setShowLogForm] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [refreshLogs, setRefreshLogs] = useState(0)
  const [isApprovalLoading, setIsApprovalLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('승인 요청을 처리하고 있습니다...')

  // 프로젝트 정보 가져오기
  useEffect(() => {
    if (params.id) {
      fetchProjectDetail()
      fetchUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const fetchProjectDetail = async () => {
    try {
      setLoading(true)
      const projectId = params.id as string
      const projectData = await projectService.getProject(projectId)
      
      if (!projectData) {
        toast.error('프로젝트를 찾을 수 없습니다.')
        router.push('/projects')
        return
      }

      setProject(projectData as ProjectData)

      // 담당자 정보 가져오기
      const supabase = createClient()
      
      // 영업담당자 정보
      if (projectData.sales_manager) {
        const { data: salesData } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', projectData.sales_manager)
          .single()
        setSalesManager(salesData)
      }

      // 현장담당자 정보
      if (projectData.site_manager) {
        const { data: siteData } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', projectData.site_manager)
          .single()
        setSiteManager(siteData)
      }
    } catch (error) {
      console.error('프로젝트 상세 조회 실패:', error)
      toast.error('프로젝트 정보를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('is_approved', true)  // 승인된 사용자만 필터링
        .order('name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error)
    }
  }

  const handleLogSubmit = async (data: {
    category: string
    content: string
    attachments?: AttachmentFile[]
    approvalRequestTo?: { id: string; name: string }
  }) => {
    if (!user || !project) return

    try {
      // 승인 요청인 경우 전체 화면 로딩 시작
      if (data.approvalRequestTo) {
        setIsApprovalLoading(true)
        setLoadingMessage('승인 요청을 생성하고 있습니다...')
      }

      if (data.approvalRequestTo) {
        // 단계별 로딩 메시지 업데이트
        setLoadingMessage('이메일 발송 중...')
        
        // 약간의 딜레이 후 카카오톡 발송 메시지로 변경
        setTimeout(() => {
          setLoadingMessage('카카오톡 알림을 발송하고 있습니다...')
        }, 1000)

        // 승인 요청 로그 생성 (카카오톡 발송까지 대기)
        await logService.createApprovalRequestLog({
          project_id: project.id,
          memo: data.content,
          requester_id: user.id,
          requester_name: userData?.name || user.email || 'Unknown',
          approver_id: data.approvalRequestTo.id,
          approver_name: data.approvalRequestTo.name,
          attachments: data.attachments,
          category: data.category as LogCategory  // 선택한 카테고리 전달
        })
        
        setLoadingMessage('작업을 완료하고 있습니다...')
        toast.success('승인 요청이 생성되었습니다.')
      } else {
        // 일반 로그 생성 (기존과 동일)
        await logService.createManualLog({
          project_id: project.id,
          category: data.category as LogCategory,
          content: data.content,
          author_id: user.id,
          author_name: userData?.name || user.email || 'Unknown',
          attachments: data.attachments
        })
        toast.success('히스토리 로그가 생성되었습니다.')
      }

      setShowLogForm(false)
      setRefreshLogs(prev => prev + 1) // 로그 목록 새로고침
    } catch (error) {
      console.error('로그 생성 실패:', error)
      toast.error('로그 생성에 실패했습니다.')
    } finally {
      // 승인 요청인 경우 로딩 종료
      if (data.approvalRequestTo) {
        setIsApprovalLoading(false)
        setLoadingMessage('승인 요청을 처리하고 있습니다...')
      }
    }
  }


  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR')
  }

  // 공정 상태에 따른 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'delayed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 공정 상태 라벨
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '완료'
      case 'in_progress':
        return '진행중'
      case 'delayed':
        return '지연'
      case 'waiting':
        return '대기'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">프로젝트를 찾을 수 없습니다.</div>
      </div>
    )
  }

  const canEdit = user?.id === project.created_by || userData?.role === 'admin'

  return (
    <>
      {/* 승인 요청 처리 중 전체 화면 로딩 */}
      {isApprovalLoading && (
        <Loading 
          fullScreen={true}
          message={loadingMessage}
          size="large"
        />
      )}
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.site_name}</h1>
            <p className="mt-2 text-gray-600">프로젝트 상세 정보</p>
            {project.is_urgent && (
              <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                긴급 프로젝트
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Link
              href="/projects"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium"
            >
              목록으로
            </Link>
            {canEdit && (
              <>
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  수정
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* 기본 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">기본 정보</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                현장명
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                {project.site_name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                외주업체명
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                {project.outsourcing_company}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제품명
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                {project.product_name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수량
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                {project.product_quantity}
              </div>
            </div>
          </div>

          {/* 프로젝트 메타 정보 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">생성자:</span>{' '}
                <span className="font-medium">{project.creator?.name || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">생성일:</span>{' '}
                <span className="font-medium">{formatDate(project.created_at)}</span>
              </div>
              <div>
                <span className="text-gray-500">수정일:</span>{' '}
                <span className="font-medium">{formatDate(project.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 담당자 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">담당자 정보</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                영업담당자
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                {salesManager ? `${salesManager.name} (${salesManager.email})` : '-'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                현장담당자
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                {siteManager ? `${siteManager.name} (${siteManager.email})` : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* 일정 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">일정 정보</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                발주일
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                {formatDate(project.order_date)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                준공 예정일
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                {formatDate(project.expected_completion_date)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설치 요청일
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                {formatDate(project.installation_request_date)}
              </div>
            </div>
          </div>
        </div>

        {/* 공정 단계 관리 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">공정 단계 현황</h2>
          <p className="text-sm text-gray-600 mb-4">
            현재 진행 단계: <span className="font-semibold">{
              PROCESS_STAGES.find(s => s.name === project.current_process_stage)?.label || project.current_process_stage
            }</span>
          </p>
          
          <div className="space-y-3">
            {project.process_stages?.sort((a, b) => a.stage_order - b.stage_order).map((stage) => {
              const stageInfo = PROCESS_STAGES.find(s => s.name === stage.stage_name)
              return (
                <div key={stage.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {stageInfo?.label || stage.stage_name}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(stage.status)}`}>
                        {getStatusLabel(stage.status)}
                      </span>
                      {stage.stage_name === project.current_process_stage && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500 text-white">
                          현재 단계
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">시작일:</span>{' '}
                      <span className="font-medium">
                        {stage.start_date ? formatDate(stage.start_date) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">종료일:</span>{' '}
                      <span className="font-medium">
                        {stage.end_date ? formatDate(stage.end_date) : '-'}
                      </span>
                    </div>
                    {stage.status === 'delayed' && stage.delay_reason && (
                      <div className="md:col-span-3">
                        <span className="text-gray-500">지연 사유:</span>{' '}
                        <span className="font-medium text-red-600">{stage.delay_reason}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 이미지 갤러리 섹션 */}
        {project.project_images && project.project_images.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">이미지 갤러리</h2>
            
            {/* 메인 이미지 뷰어 */}
            <div className="mb-4">
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={project.project_images[currentImageIndex]?.image_url || ''}
                  alt={project.project_images[currentImageIndex]?.image_name || ''}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                
                {/* 이미지 네비게이션 */}
                {project.project_images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => 
                        prev === 0 ? project.project_images!.length - 1 : prev - 1
                      )}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => 
                        prev === project.project_images!.length - 1 ? 0 : prev + 1
                      )}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
              
              {/* 이미지 정보 */}
              <div className="mt-2 text-center text-sm text-gray-600">
                {currentImageIndex + 1} / {project.project_images.length}
              </div>
            </div>

            {/* 썸네일 그리드 */}
            {project.project_images.length > 1 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {project.project_images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 ${
                      currentImageIndex === index ? 'border-blue-500' : 'border-transparent'
                    } hover:border-blue-400 transition-colors`}
                  >
                    <Image
                      src={image.image_url}
                      alt={image.image_name}
                      fill
                      className="object-cover"
                      sizes="150px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 히스토리 로그 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">히스토리 로그</h2>
            <button
              onClick={() => setShowLogForm(!showLogForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              {showLogForm ? '취소' : '로그 작성'}
            </button>
          </div>

          {/* 로그 작성 폼 */}
          {showLogForm && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <LogFormSimple
                onSubmit={handleLogSubmit}
                onCancel={() => setShowLogForm(false)}
                showAttachments={true}
                users={users.map(u => ({ ...u, name: u.name || u.email, role: u.role || 'user' }))}
              />
            </div>
          )}

          {/* 로그 목록 */}
          <LogList 
            projectId={project.id} 
            refreshTrigger={refreshLogs}
            onRefresh={() => setRefreshLogs(prev => prev + 1)}
          />
        </div>
      </div>
    </div>
    </>
  )
}