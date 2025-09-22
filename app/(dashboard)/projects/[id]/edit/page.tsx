'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { projectService } from '@/lib/services/projects.service'
import { logService } from '@/lib/services/logs.service'
import ImageUploader from '@/components/projects/ImageUploader'
import ProcessStageManager from '@/components/projects/ProcessStageManager'
import UserSelector from '@/components/projects/UserSelector'
import LogFormSimple from '@/components/logs/LogFormSimple'
import LogList from '@/components/logs/LogList'
import type { AttachmentFile, LogCategory } from '@/types/log'
import type { User } from '@/types/user'
import { toast } from 'react-hot-toast'
import Image from 'next/image'
import type { ProcessStageName } from '@/types/project'

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

interface ProcessStage {
  id?: string
  stage_name: string
  stage_order: number
  status: 'waiting' | 'in_progress' | 'completed' | 'delayed'
  delay_reason?: string
  start_date?: string
  end_date?: string
}

interface ProjectImage {
  id: string
  image_url: string
  image_name: string
  display_order: number
}

export default function EditProjectPage() {
  const router = useRouter()
  const params = useParams()
  const { user, userData } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [existingImages, setExistingImages] = useState<ProjectImage[]>([])
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([])
  const [showLogForm, setShowLogForm] = useState(false)
  const [refreshLogs, setRefreshLogs] = useState(0)
  
  // 폼 데이터
  const [formData, setFormData] = useState({
    site_name: '',
    sales_manager: '',
    site_manager: '',
    product_name: '',
    product_quantity: 1,
    outsourcing_company: '',
    order_date: '',
    expected_completion_date: '',
    installation_request_date: '',
    current_process_stage: 'contract',
    is_urgent: false
  })
  
  // 새로 추가할 이미지
  const [newImages, setNewImages] = useState<File[]>([])
  
  // 공정 단계 관리
  const [processStages, setProcessStages] = useState<ProcessStage[]>([])

  // 사용자 목록 가져오기
  useEffect(() => {
    fetchUsers()
    if (params.id) {
      fetchProjectData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const fetchUsers = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('is_approved', true)
        .order('name')

      if (error) throw error
      setUsers((data || []) as User[])
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error)
      toast.error('사용자 목록을 불러올 수 없습니다.')
    }
  }

  const fetchProjectData = async () => {
    try {
      setLoading(true)
      const projectId = params.id as string
      const projectData = await projectService.getProject(projectId)
      
      if (!projectData) {
        toast.error('프로젝트를 찾을 수 없습니다.')
        router.push('/projects')
        return
      }

      // 권한 체크 (작성자 또는 관리자)
      const isOwner = projectData.created_by === user?.id
      const isAdmin = userData?.role === 'admin'

      if (!isOwner && !isAdmin) {
        toast.error('프로젝트 수정 권한이 없습니다.')
        router.push(`/projects/${projectId}`)
        return
      }

      // 폼 데이터 설정
      setFormData({
        site_name: projectData.site_name || '',
        sales_manager: projectData.sales_manager || '',
        site_manager: projectData.site_manager || '',
        product_name: projectData.product_name || '',
        product_quantity: projectData.product_quantity || 1,
        outsourcing_company: projectData.outsourcing_company || '',
        order_date: projectData.order_date || '',
        expected_completion_date: projectData.expected_completion_date || '',
        installation_request_date: projectData.installation_request_date || '',
        current_process_stage: projectData.current_process_stage || 'contract',
        is_urgent: projectData.is_urgent || false
      })

      // 공정 단계 설정 (stage_order로 정렬)
      if (projectData.process_stages && projectData.process_stages.length > 0) {
        const sortedStages = projectData.process_stages.map(stage => ({
          id: stage.id,
          stage_name: stage.stage_name,
          stage_order: stage.stage_order,
          status: stage.status,
          delay_reason: stage.delay_reason,
          start_date: stage.start_date,
          end_date: stage.end_date
        })).sort((a, b) => a.stage_order - b.stage_order)
        setProcessStages(sortedStages)
      } else {
        // 기본 공정 단계 설정
        setProcessStages(
          PROCESS_STAGES.map(stage => ({
            stage_name: stage.name,
            stage_order: stage.order,
            status: 'waiting',
            delay_reason: undefined,
            start_date: undefined,
            end_date: undefined
          }))
        )
      }

      // 기존 이미지 설정
      if (projectData.project_images && projectData.project_images.length > 0) {
        setExistingImages(projectData.project_images.map(img => ({
          id: img.id,
          image_url: img.image_url,
          image_name: img.image_name,
          display_order: img.display_order
        })))
      }

    } catch (error) {
      console.error('프로젝트 데이터 조회 실패:', error)
      toast.error('프로젝트 정보를 불러올 수 없습니다.')
      router.push('/projects')
    } finally {
      setLoading(false)
    }
  }

  // 이미지 삭제 토글
  const toggleImageDeletion = (imageId: string) => {
    if (deletedImageIds.includes(imageId)) {
      setDeletedImageIds(deletedImageIds.filter(id => id !== imageId))
    } else {
      setDeletedImageIds([...deletedImageIds, imageId])
    }
  }

  // 로그 생성 핸들러
  const handleLogSubmit = async (data: {
    category: string
    content: string
    attachments?: AttachmentFile[]
    approvalRequestTo?: { id: string; name: string }
  }) => {
    if (!user || !params.id) return

    try {
      if (data.approvalRequestTo) {
        // 승인 요청 로그 생성
        await logService.createApprovalRequestLog({
          project_id: params.id as string,
          memo: data.content,
          requester_id: user.id,
          requester_name: userData?.name || user.email || 'Unknown',
          approver_id: data.approvalRequestTo.id,
          approver_name: data.approvalRequestTo.name,
          attachments: data.attachments
        })
        toast.success('승인 요청이 생성되었습니다.')
      } else {
        // 일반 로그 생성
        await logService.createManualLog({
          project_id: params.id as string,
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
    }
  }

  // 프로젝트 수정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 필수 필드 검증
    if (!formData.site_name || !formData.sales_manager || !formData.site_manager ||
        !formData.product_name || !formData.outsourcing_company || 
        !formData.order_date || !formData.expected_completion_date || 
        !formData.installation_request_date) {
      toast.error('필수 항목을 모두 입력해주세요.')
      return
    }

    // 현재 공정 단계 검증
    const hasCurrentStage = processStages.some(stage => 
      stage.status === 'in_progress' || stage.status === 'completed'
    )
    if (!hasCurrentStage) {
      toast.error('현재 진행 중인 공정 단계를 선택해주세요.')
      return
    }

    // 계약 및 준공일 단계의 날짜 필수 검증
    const contractStage = processStages.find(stage => stage.stage_name === 'contract')
    const completionStage = processStages.find(stage => stage.stage_name === 'completion')

    if (!contractStage?.start_date || !contractStage?.end_date) {
      toast.error('계약 단계의 시작일과 종료일은 필수 입력 항목입니다.')
      return
    }

    if (!completionStage?.start_date || !completionStage?.end_date) {
      toast.error('준공일 단계의 시작일과 종료일은 필수 입력 항목입니다.')
      return
    }

    setSaving(true)

    try {
      const projectId = params.id as string
      const supabase = createClient()

      // 1. 프로젝트 기본 정보 업데이트
      const projectData = {
        site_name: formData.site_name,
        sales_manager: formData.sales_manager,
        site_manager: formData.site_manager,
        product_name: formData.product_name,
        product_quantity: formData.product_quantity,
        outsourcing_company: formData.outsourcing_company,
        order_date: formData.order_date,
        expected_completion_date: formData.expected_completion_date,
        installation_request_date: formData.installation_request_date,
        is_urgent: formData.is_urgent,
        current_process_stage: formData.current_process_stage as ProcessStageName
      }

      await projectService.updateProject(projectId, projectData)

      // 2. 공정 단계 업데이트
      for (const stage of processStages) {
        if (stage.id) {
          // 기존 공정 업데이트
          await supabase
            .from('process_stages')
            .update({
              status: stage.status,
              delay_reason: stage.delay_reason,
              start_date: stage.start_date,
              end_date: stage.end_date,
              updated_at: new Date().toISOString()
            })
            .eq('id', stage.id)
        } else {
          // 새 공정 추가 (필요한 경우)
          await supabase
            .from('process_stages')
            .insert({
              project_id: projectId,
              stage_name: stage.stage_name,
              stage_order: stage.stage_order,
              status: stage.status,
              delay_reason: stage.delay_reason,
              start_date: stage.start_date,
              end_date: stage.end_date
            })
        }
      }

      // 3. 이미지 삭제 처리
      if (deletedImageIds.length > 0) {
        for (const imageId of deletedImageIds) {
          const image = existingImages.find(img => img.id === imageId)
          if (image) {
            // Storage에서 이미지 삭제
            const fileName = image.image_url.split('/').pop()
            if (fileName) {
              await supabase.storage
                .from('projects')
                .remove([fileName])
            }
            // DB에서 이미지 정보 삭제
            await supabase
              .from('project_images')
              .delete()
              .eq('id', imageId)
          }
        }
      }

      // 4. 새 이미지 업로드
      if (newImages.length > 0) {
        await projectService.uploadProjectImages(projectId, newImages)
      }

      toast.success('프로젝트가 성공적으로 수정되었습니다.')
      router.push(`/projects/${projectId}`)
    } catch (error) {
      console.error('프로젝트 수정 실패:', error)
      toast.error('프로젝트 수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">프로젝트 수정</h1>
        <p className="mt-2 text-gray-600">프로젝트 정보를 수정합니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 기본 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">기본 정보</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                현장명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.site_name}
                onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                외주업체명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.outsourcing_company}
                onChange={(e) => setFormData({ ...formData, outsourcing_company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제품명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수량 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.product_quantity}
                onChange={(e) => setFormData({ ...formData, product_quantity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* 긴급 여부 체크박스 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_urgent"
                checked={formData.is_urgent}
                onChange={(e) => setFormData({ ...formData, is_urgent: e.target.checked })}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="is_urgent" className="ml-2 text-sm font-medium text-gray-700">
                긴급 프로젝트
              </label>
              <span className="ml-2 text-xs text-gray-500">
                (긴급한 프로젝트는 목록에서 우선적으로 표시됩니다)
              </span>
            </div>
          </div>
        </div>

        {/* 담당자 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">담당자 정보</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UserSelector
              label="영업담당자"
              value={formData.sales_manager}
              onChange={(value) => setFormData({ ...formData, sales_manager: value })}
              users={users}
              required
            />

            <UserSelector
              label="현장담당자"
              value={formData.site_manager}
              onChange={(value) => setFormData({ ...formData, site_manager: value })}
              users={users}
              required
            />
          </div>
        </div>

        {/* 일정 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">일정 정보</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                발주일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                준공 예정일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.expected_completion_date}
                onChange={(e) => setFormData({ ...formData, expected_completion_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설치 요청일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.installation_request_date}
                onChange={(e) => setFormData({ ...formData, installation_request_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* 공정 단계 관리 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">
            공정 단계 관리 <span className="text-red-500">*</span>
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            각 공정 단계의 상태를 설정하고 일정을 입력하세요. 최소 하나 이상의 공정이 진행 중이어야 합니다.
          </p>
          <ProcessStageManager
            stages={processStages}
            onChange={setProcessStages}
            currentStage={formData.current_process_stage}
            onCurrentStageChange={(stage) => setFormData({ ...formData, current_process_stage: stage })}
          />
        </div>

        {/* 이미지 갤러리 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">이미지 갤러리</h2>
          
          {/* 기존 이미지 표시 */}
          {existingImages.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">기존 이미지</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {existingImages.map((image) => (
                  <div
                    key={image.id}
                    className={`relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 ${
                      deletedImageIds.includes(image.id) ? 'border-red-500 opacity-50' : 'border-gray-200'
                    }`}
                  >
                    <Image
                      src={image.image_url}
                      alt={image.image_name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <button
                      type="button"
                      onClick={() => toggleImageDeletion(image.id)}
                      className={`absolute top-1 right-1 p-1 rounded-full ${
                        deletedImageIds.includes(image.id)
                          ? 'bg-green-500 hover:bg-green-600'
                          : 'bg-red-500 hover:bg-red-600'
                      } text-white`}
                    >
                      {deletedImageIds.includes(image.id) ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                    {deletedImageIds.includes(image.id) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="text-white text-sm font-medium">삭제 예정</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 새 이미지 추가 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">새 이미지 추가</h3>
            <p className="text-sm text-gray-600 mb-3">최대 10장, 각 파일당 최대 20MB</p>
            <ImageUploader
              maxImages={10 - existingImages.length + deletedImageIds.length}
              maxSize={20}
              onImagesChange={setNewImages}
            />
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push(`/projects/${params.id}`)}
            className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium"
            disabled={saving}
          >
            취소
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
            disabled={saving}
          >
            {saving ? '저장 중...' : '변경사항 저장'}
          </button>
        </div>
      </form>

      {/* 히스토리 로그 섹션 - form 외부에 위치 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">히스토리 로그</h2>
          <button
            type="button"
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
        {params.id && (
          <LogList 
            projectId={params.id as string} 
            refreshTrigger={refreshLogs}
            onRefresh={() => setRefreshLogs(prev => prev + 1)}
          />
        )}
      </div>
    </div>
  )
}