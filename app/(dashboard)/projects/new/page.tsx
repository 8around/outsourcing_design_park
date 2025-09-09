'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { projectService } from '@/lib/services/projects.service'
import { logService } from '@/lib/services/logs.service'
import ImageUploader from '@/components/projects/ImageUploader'
import ProcessStageManager from '@/components/projects/ProcessStageManager'
import UserSelector from '@/components/projects/UserSelector'
import LogFormSimple from '@/components/logs/LogFormSimple'
import { toast } from 'react-hot-toast'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'

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
  stage_name: string
  stage_order: number
  status: 'waiting' | 'in_progress' | 'completed' | 'delayed'
  delay_reason?: string
  start_date?: string
  end_date?: string
}

export default function NewProjectPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [showLogForm, setShowLogForm] = useState(false)
  const [pendingLogs, setPendingLogs] = useState<Array<{ category: string; content: string }>>([])
  const [tempProjectId, setTempProjectId] = useState<string | null>(null)
  
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
  
  // 이미지 관리
  const [images, setImages] = useState<File[]>([])
  
  // 공정 단계 관리
  const [processStages, setProcessStages] = useState<ProcessStage[]>(
    PROCESS_STAGES.map(stage => ({
      stage_name: stage.name,
      stage_order: stage.order,
      status: 'waiting',
      delay_reason: undefined,
      start_date: undefined,
      end_date: undefined
    }))
  )

  // 사용자 목록 가져오기
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('is_approved', true)
        .order('name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error)
      toast.error('사용자 목록을 불러올 수 없습니다.')
    }
  }

  // 프로젝트 생성
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

    setLoading(true)

    try {
      // projectService를 사용하여 프로젝트 생성
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
        is_urgent: formData.is_urgent
      }

      const project = await projectService.createProject(
        projectData,
        images,
        processStages,
        formData.current_process_stage
      )

      // 프로젝트 생성 후 바로 로그 생성 (임시 저장된 로그가 있다면)
      if (pendingLogs.length > 0 && user) {
        for (const log of pendingLogs) {
          try {
            await logService.createManualLog({
              project_id: project.id,
              category: log.category as any,
              content: log.content,
              author_id: user.id,
              author_name: (user as any).name || user.email || '알 수 없음'
            })
          } catch (error) {
            console.error('로그 생성 실패:', error)
          }
        }
      }

      toast.success('프로젝트가 성공적으로 생성되었습니다.')
      router.push(`/projects/${project.id}`)
    } catch (error) {
      console.error('프로젝트 생성 실패:', error)
      toast.error('프로젝트 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">새 프로젝트 생성</h1>
        <p className="mt-2 text-gray-600">프로젝트 정보를 입력하여 새로운 프로젝트를 생성합니다.</p>
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

          {/* 긴급 여부 체크박스 추가 */}
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

        {/* 히스토리 로그 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold">초기 히스토리 로그</h2>
              <p className="text-sm text-gray-600 mt-1">프로젝트 생성과 함께 초기 로그를 작성할 수 있습니다 (선택사항)</p>
            </div>
            {!showLogForm && pendingLogs.length === 0 && (
              <button
                type="button"
                onClick={() => setShowLogForm(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                로그 추가
              </button>
            )}
          </div>

          {/* 대기 중인 로그 목록 */}
          {pendingLogs.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">저장 예정 로그 ({pendingLogs.length}개)</p>
              {pendingLogs.map((log, index) => (
                <div key={index} className="bg-gray-50 rounded-md p-3 flex justify-between items-start">
                  <div className="flex-1">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded mb-1">
                      {log.category}
                    </span>
                    <p className="text-sm text-gray-700">{log.content}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingLogs(pendingLogs.filter((_, i) => i !== index))
                    }}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {!showLogForm && (
                <button
                  type="button"
                  onClick={() => setShowLogForm(true)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  + 추가 로그 작성
                </button>
              )}
            </div>
          )}

          {/* 로그 작성 폼 */}
          {showLogForm && (
            <div className="border-t pt-4">
              <LogFormSimple
                onSubmit={(data) => {
                  setPendingLogs([...pendingLogs, data])
                  setShowLogForm(false)
                  toast.success('로그가 추가되었습니다. 프로젝트 생성 시 함께 저장됩니다.')
                }}
                onCancel={() => setShowLogForm(false)}
              />
            </div>
          )}
        </div>

        {/* 이미지 갤러리 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">이미지 갤러리</h2>
          <p className="text-sm text-gray-600 mb-4">최대 10장, 각 파일당 최대 20MB</p>
          <ImageUploader
            maxImages={10}
            maxSize={20}
            onImagesChange={setImages}
          />
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium"
            disabled={loading}
          >
            취소
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '생성 중...' : '프로젝트 생성'}
          </button>
        </div>
      </form>
    </div>
  )
}