'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { logService } from '@/lib/services/logs.service'
import { toast } from 'react-hot-toast'
import type { LogCategory } from '@/types/log'

// 로그 카테고리 목록 (승인 관련 제외)
const LOG_CATEGORIES: { value: LogCategory; label: string }[] = [
  { value: '사양변경', label: '사양변경' },
  { value: '도면설계', label: '도면설계' },
  { value: '구매발주', label: '구매발주' },
  { value: '생산제작', label: '생산제작' },
  { value: '상하차', label: '상하차' },
  { value: '현장설치시공', label: '현장설치시공' },
  { value: '설치인증', label: '설치인증' },
  { value: '설비', label: '설비' },
  { value: '기타', label: '기타' }
]

interface LogFormProps {
  projectId: string
  onSuccess?: () => void
  onCancel?: () => void
  isModal?: boolean
}

export default function LogForm({ projectId, onSuccess, onCancel, isModal = false }: LogFormProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    category: '사양변경' as LogCategory,
    content: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    if (!formData.content.trim()) {
      toast.error('로그 내용을 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      await logService.createManualLog({
        project_id: projectId,
        category: formData.category,
        content: formData.content.trim(),
        author_id: user.id,
        author_name: (user as { name?: string }).name || user.email || '알 수 없음'
      })

      toast.success('로그가 성공적으로 생성되었습니다.')
      
      // 폼 초기화
      setFormData({
        category: '사양변경',
        content: ''
      })

      // 성공 콜백 실행
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('로그 생성 실패:', error)
      toast.error('로그 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const containerClass = isModal 
    ? 'bg-white rounded-lg p-6' 
    : 'bg-white rounded-lg shadow-sm border border-gray-200 p-6'

  return (
    <div className={containerClass}>
      <h3 className="text-lg font-semibold mb-4">히스토리 로그 작성</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4" data-log-form>
        {/* 카테고리 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            카테고리 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as LogCategory })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            {LOG_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        {/* 로그 내용 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            로그 내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="작업 내용, 변경 사항, 진행 상황 등을 입력해주세요..."
            disabled={loading}
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            프로젝트 진행 상황이나 중요한 변경 사항을 기록해주세요.
          </p>
        </div>

        {/* 작성자 정보 표시 */}
        <div className="bg-gray-50 rounded-md p-3">
          <p className="text-sm text-gray-600">
            <span className="font-medium">작성자:</span> {(user as { name?: string })?.name || user?.email || '알 수 없음'}
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium disabled:opacity-50"
              disabled={loading}
            >
              취소
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '저장 중...' : '로그 저장'}
          </button>
        </div>
      </form>
    </div>
  )
}