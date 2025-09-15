'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { toast } from 'react-hot-toast'
import { X, UserPlus } from 'lucide-react'
import type { LogCategory, AttachmentFile } from '@/types/log'

// 로그 카테고리 목록 (승인 관련 제외)
const LOG_CATEGORIES: { value: LogCategory; label: string }[] = [
  { value: '사양변경', label: '사양변경' },
  { value: '도면설계', label: '도면설계' },
  { value: '구매발주', label: '구매발주' },
  { value: '생산제작', label: '생산제작' },
  { value: '상하차', label: '상하차' },
  { value: '현장설치시공', label: '현장설치시공' },
  { value: '설치인증', label: '설치인증' }
]

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface LogFormSimpleProps {
  onSubmit: (data: { 
    category: LogCategory; 
    content: string; 
    attachments?: AttachmentFile[];
    approvalRequestTo?: { id: string; name: string };
  }) => void
  onCancel?: () => void
  showAttachments?: boolean
  users?: User[]
}

export default function LogFormSimple({ 
  onSubmit, 
  onCancel, 
  showAttachments = true,  // 기본값을 true로 변경
  users = []
}: LogFormSimpleProps) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    category: '사양변경' as LogCategory,
    content: '',
    approvalRequestTo: ''
  })
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])
  const [showApprovalRequest, setShowApprovalRequest] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.content.trim()) {
      toast.error('로그 내용을 입력해주세요.')
      return
    }

    // 승인 요청 수신자 정보 가져오기
    let approvalRequestTo = undefined
    if (formData.approvalRequestTo) {
      const targetUser = users.find(u => u.id === formData.approvalRequestTo)
      if (targetUser) {
        approvalRequestTo = {
          id: targetUser.id,
          name: targetUser.name
        }
      }
    }

    onSubmit({
      category: formData.category,
      content: formData.content.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
      approvalRequestTo
    })

    // 폼 초기화
    setFormData({
      category: '사양변경',
      content: '',
      approvalRequestTo: ''
    })
    setAttachments([])
    setShowApprovalRequest(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newAttachments: AttachmentFile[] = []
    const maxSize = 10 * 1024 * 1024 // 10MB

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      if (file.size > maxSize) {
        toast.error(`${file.name}은 10MB를 초과합니다.`)
        continue
      }

      newAttachments.push({
        file,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream'
      })
    }

    setAttachments(prev => [...prev, ...newAttachments])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 카테고리 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          카테고리 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value as LogCategory })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          required
        />
        <p className="mt-1 text-sm text-gray-500">
          프로젝트 진행 상황이나 중요한 변경 사항을 기록해주세요.
        </p>
      </div>

      {/* 첨부파일 (선택적) */}
      {showAttachments && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            첨부파일
          </label>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            />
            <p className="text-sm text-gray-500">
              최대 10MB까지 업로드 가능합니다. (이미지, PDF, Office 파일)
            </p>
            
            {/* 첨부된 파일 목록 */}
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {attachment.file_name} ({(attachment.file_size / 1024).toFixed(1)}KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 승인 요청 섹션 (선택적) */}
      <div className="border-t pt-4">
        {!showApprovalRequest ? (
          <button
            type="button"
            onClick={() => setShowApprovalRequest(true)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <UserPlus className="h-4 w-4" />
            승인 요청 추가 (선택사항)
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                승인 요청 수신자 (선택사항)
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowApprovalRequest(false)
                  setFormData({ ...formData, approvalRequestTo: '' })
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                취소
              </button>
            </div>
            <select
              value={formData.approvalRequestTo}
              onChange={(e) => setFormData({ ...formData, approvalRequestTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">승인 요청자를 선택하세요</option>
              {users
                .filter(u => u.id !== user?.id)  // 본인 제외
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
            </select>
            <p className="text-sm text-gray-500">
              선택한 사용자에게 승인 요청이 전송됩니다.
            </p>
          </div>
        )}
      </div>

      {/* 작성자 정보 표시 */}
      <div className="bg-gray-50 rounded-md p-3">
        <p className="text-sm text-gray-600">
          <span className="font-medium">작성자:</span> {(user as any)?.name || user?.email || '알 수 없음'}
        </p>
        {formData.approvalRequestTo && (
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium">승인 요청 대상:</span>{' '}
            {users.find(u => u.id === formData.approvalRequestTo)?.name || '선택됨'}
          </p>
        )}
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          로그 추가
        </button>
      </div>
    </form>
  )
}