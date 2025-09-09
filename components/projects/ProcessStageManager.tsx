'use client'

import { useState } from 'react'

interface ProcessStage {
  stage_name: string
  stage_order: number
  status: 'waiting' | 'in_progress' | 'completed' | 'delayed'
  delay_reason?: string
  start_date?: string
  end_date?: string
}

interface ProcessStageManagerProps {
  stages: ProcessStage[]
  onChange: (stages: ProcessStage[]) => void
  currentStage: string
  onCurrentStageChange: (stage: string) => void
}

const STAGE_LABELS: Record<string, string> = {
  contract: '계약',
  design: '도면설계',
  order: '발주',
  laser: '레이저',
  welding: '용접',
  plating: '도금',
  painting: '도장',
  panel: '판넬',
  assembly: '조립',
  shipping: '출하',
  installation: '설치',
  certification: '인증기간',
  closing: '마감',
  completion: '준공일'
}

const STATUS_LABELS: Record<string, string> = {
  waiting: '대기(착수 전)',
  in_progress: '진행중',
  completed: '완료',
  delayed: '지연'
}

const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-gray-100 text-gray-700 border-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  delayed: 'bg-red-100 text-red-700 border-red-300'
}

export default function ProcessStageManager({
  stages,
  onChange,
  currentStage,
  onCurrentStageChange
}: ProcessStageManagerProps) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null)

  const updateStage = (stageName: string, updates: Partial<ProcessStage>) => {
    const updatedStages = stages.map(stage =>
      stage.stage_name === stageName
        ? { ...stage, ...updates }
        : stage
    )
    onChange(updatedStages)
  }

  const toggleExpanded = (stageName: string) => {
    setExpandedStage(expandedStage === stageName ? null : stageName)
  }

  const getStageProgress = () => {
    const completedCount = stages.filter(s => s.status === 'completed').length
    return Math.round((completedCount / stages.length) * 100)
  }

  // stages를 stage_order 기준으로 정렬
  const sortedStages = [...stages].sort((a, b) => a.stage_order - b.stage_order)

  return (
    <div className="space-y-4">
      {/* 전체 진행률 표시 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">전체 진행률</span>
          <span className="text-sm font-bold text-gray-900">{getStageProgress()}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getStageProgress()}%` }}
          />
        </div>
      </div>

      {/* 공정 단계 목록 */}
      <div className="space-y-2">
        {sortedStages.map((stage, index) => (
          <div
            key={stage.stage_name}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* 공정 헤더 */}
            <div
              className="px-4 py-3 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpanded(stage.stage_name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* 순서 번호 */}
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-700">
                    {stage.stage_order}
                  </div>
                  
                  {/* 공정명 */}
                  <h3 className="font-medium text-gray-900">
                    {STAGE_LABELS[stage.stage_name]}
                    {(stage.stage_name === 'contract' || stage.stage_name === 'completion') && (
                      <span className="ml-2 text-xs text-red-600 font-normal">(날짜 필수)</span>
                    )}
                  </h3>
                  
                  {/* 현재 공정 표시 */}
                  {currentStage === stage.stage_name && (
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                      현재 공정
                    </span>
                  )}
                </div>
                
                {/* 상태 표시 */}
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[stage.status]}`}>
                    {STATUS_LABELS[stage.status]}
                  </span>
                  
                  {/* 확장 아이콘 */}
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      expandedStage === stage.stage_name ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
              
              {/* 날짜 정보 요약 */}
              {(stage.start_date || stage.end_date) && (
                <div className="mt-2 flex gap-4 text-sm text-gray-600">
                  {stage.start_date && (
                    <span>시작일: {stage.start_date}</span>
                  )}
                  {stage.end_date && (
                    <span>종료일: {stage.end_date}</span>
                  )}
                </div>
              )}
            </div>

            {/* 상세 설정 (확장 시) */}
            {expandedStage === stage.stage_name && (
              <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
                <div className="space-y-4">
                  {/* 상태 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      공정 상태
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            updateStage(stage.stage_name, { 
                              status: value as ProcessStage['status'],
                              delay_reason: value !== 'delayed' ? undefined : stage.delay_reason
                            })
                          }}
                          className={`px-3 py-2 rounded-md border-2 text-sm font-medium transition-all ${
                            stage.status === value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 지연 사유 입력 (지연 상태일 때만) */}
                  {stage.status === 'delayed' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        지연 사유
                      </label>
                      <textarea
                        value={stage.delay_reason || ''}
                        onChange={(e) => updateStage(stage.stage_name, { delay_reason: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        placeholder="지연 사유를 입력하세요"
                      />
                    </div>
                  )}

                  {/* 일정 설정 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        시작일 
                        {(stage.stage_name === 'contract' || stage.stage_name === 'completion') && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={stage.start_date || ''}
                        onChange={(e) => updateStage(stage.stage_name, { start_date: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          (stage.stage_name === 'contract' || stage.stage_name === 'completion') && !stage.start_date
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-300'
                        }`}
                        required={stage.stage_name === 'contract' || stage.stage_name === 'completion'}
                      />
                      {(stage.stage_name === 'contract' || stage.stage_name === 'completion') && !stage.start_date && (
                        <p className="mt-1 text-xs text-red-600">이 공정의 시작일은 필수입니다</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        종료일
                        {(stage.stage_name === 'contract' || stage.stage_name === 'completion') && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={stage.end_date || ''}
                        onChange={(e) => updateStage(stage.stage_name, { end_date: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          (stage.stage_name === 'contract' || stage.stage_name === 'completion') && !stage.end_date
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-300'
                        }`}
                        min={stage.start_date}
                        required={stage.stage_name === 'contract' || stage.stage_name === 'completion'}
                      />
                      {(stage.stage_name === 'contract' || stage.stage_name === 'completion') && !stage.end_date && (
                        <p className="mt-1 text-xs text-red-600">이 공정의 종료일은 필수입니다</p>
                      )}
                    </div>
                  </div>

                  {/* 현재 공정으로 설정 */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`current-${stage.stage_name}`}
                      checked={currentStage === stage.stage_name}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onCurrentStageChange(stage.stage_name)
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`current-${stage.stage_name}`}
                      className="ml-2 block text-sm text-gray-700"
                    >
                      현재 진행 중인 공정으로 설정
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg
            className="h-5 w-5 text-blue-400 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              각 공정을 클릭하여 상태, 일정, 지연 사유 등을 설정할 수 있습니다.
              최소 하나 이상의 공정이 '진행중' 또는 '완료' 상태여야 합니다.
            </p>
            <p className="text-sm text-blue-700 mt-1 font-semibold">
              ⚠️ 계약과 준공일 단계의 시작일/종료일은 반드시 입력해야 합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}