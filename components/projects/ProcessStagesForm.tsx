'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DatePicker, Select, Input, Radio, message } from 'antd';
import { CheckCircle, Clock, AlertCircle, Pause } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';

const { TextArea } = Input;

// 14 공정 단계 정의
export const PROCESS_STAGES = [
  { key: 'contract', label: '계약', order: 1 },
  { key: 'design', label: '도면설계', order: 2 },
  { key: 'order', label: '발주', order: 3 },
  { key: 'laser', label: '레이저', order: 4 },
  { key: 'welding', label: '용접', order: 5 },
  { key: 'plating', label: '도금', order: 6 },
  { key: 'painting', label: '도장', order: 7 },
  { key: 'panel', label: '판넬', order: 8 },
  { key: 'assembly', label: '조립', order: 9 },
  { key: 'shipping', label: '출하', order: 10 },
  { key: 'installation', label: '설치', order: 11 },
  { key: 'certification', label: '인증기간', order: 12 },
  { key: 'closing', label: '마감', order: 13 },
  { key: 'completion', label: '준공일', order: 14 }
] as const;

// 상태 타입
type ProcessStatus = 'waiting' | 'in_progress' | 'completed' | 'delayed';

// 각 공정 단계의 데이터 타입
export interface ProcessStageData {
  stage_name: string;
  stage_order: number;
  status: ProcessStatus;
  delay_reason?: string;
  start_date?: string;
  end_date?: string;
}

interface ProcessStagesFormProps {
  onChange: (stages: ProcessStageData[], currentStage: string) => void;
  initialStages?: ProcessStageData[];
  initialCurrentStage?: string;
}

const statusOptions = [
  { value: 'waiting', label: '대기', icon: <Pause className="h-4 w-4" />, color: 'text-gray-500' },
  { value: 'in_progress', label: '진행중', icon: <Clock className="h-4 w-4" />, color: 'text-blue-500' },
  { value: 'completed', label: '완료', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-500' },
  { value: 'delayed', label: '지연', icon: <AlertCircle className="h-4 w-4" />, color: 'text-red-500' }
];

export default function ProcessStagesForm({ 
  onChange, 
  initialStages,
  initialCurrentStage = 'contract'
}: ProcessStagesFormProps) {
  const [stages, setStages] = useState<ProcessStageData[]>([]);
  const [currentStage, setCurrentStage] = useState<string>(initialCurrentStage);
  const isInitialized = useRef(false);
  const prevInitialStagesRef = useRef<string>('');

  useEffect(() => {
    // Create a stable reference for comparison
    const currentInitialStagesStr = JSON.stringify(initialStages || []);
    
    // Only initialize if not already initialized or if initialStages actually changed
    if (!isInitialized.current || prevInitialStagesRef.current !== currentInitialStagesStr) {
      // Initialize stages with default values
      const initializedStages = PROCESS_STAGES.map(stage => {
        const existing = (initialStages || []).find(s => s.stage_name === stage.key);
        return existing || {
          stage_name: stage.key,
          stage_order: stage.order,
          status: 'waiting' as ProcessStatus,
          delay_reason: '',
          start_date: undefined,
          end_date: undefined
        };
      });
      setStages(initializedStages);
      isInitialized.current = true;
      prevInitialStagesRef.current = currentInitialStagesStr;
    }
  }, [initialStages]);

  const handleStageChange = (index: number, field: keyof ProcessStageData, value: any) => {
    const newStages = [...stages];
    if (field === 'start_date' || field === 'end_date') {
      newStages[index] = {
        ...newStages[index],
        [field]: value ? dayjs(value).format('YYYY-MM-DD') : undefined
      };
    } else {
      newStages[index] = {
        ...newStages[index],
        [field]: value
      };
    }

    // Clear delay reason if status is not delayed
    if (field === 'status' && value !== 'delayed') {
      newStages[index].delay_reason = '';
    }

    setStages(newStages);
    onChange(newStages, currentStage);
  };

  const handleCurrentStageChange = (value: string) => {
    setCurrentStage(value);
    onChange(stages, value);
  };

  const getStatusIcon = (status: ProcessStatus) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? (
      <span className={`flex items-center gap-1 ${option.color}`}>
        {option.icon}
        <span>{option.label}</span>
      </span>
    ) : null;
  };

  return (
    <div className="space-y-6">
      {/* Current Stage Selection */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-3">현재 진행 단계 선택 (필수)</h4>
        <Radio.Group 
          value={currentStage} 
          onChange={(e) => handleCurrentStageChange(e.target.value)}
          className="w-full"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {PROCESS_STAGES.map(stage => (
              <Radio 
                key={stage.key} 
                value={stage.key}
                className="border rounded-lg p-2 hover:bg-blue-100"
              >
                <span className="text-sm">{stage.label}</span>
              </Radio>
            ))}
          </div>
        </Radio.Group>
      </div>

      {/* Process Stages List */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold">공정 단계별 상태 설정</h4>
        
        <div className="space-y-3">
          {PROCESS_STAGES.map((stage, index) => {
            const stageData = stages[index] || {};
            const isCurrent = stage.key === currentStage;
            
            return (
              <div 
                key={stage.key}
                className={`border rounded-lg p-4 transition-all ${
                  isCurrent ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Stage Number and Name */}
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      isCurrent ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {stage.order}
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h5 className={`font-medium text-base ${
                        isCurrent ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {stage.label}
                      </h5>
                      {isCurrent && (
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                          현재 단계
                        </span>
                      )}
                    </div>
                    
                    {/* Status and Dates Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* Status Selection */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">상태</label>
                        <Select
                          value={stageData.status || 'waiting'}
                          onChange={(value) => handleStageChange(index, 'status', value)}
                          className="w-full"
                          size="small"
                        >
                          {statusOptions.map(option => (
                            <Select.Option key={option.value} value={option.value}>
                              <span className={`flex items-center gap-1 ${option.color}`}>
                                {option.icon}
                                <span>{option.label}</span>
                              </span>
                            </Select.Option>
                          ))}
                        </Select>
                      </div>
                      
                      {/* Start Date */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">시작일</label>
                        <DatePicker
                          value={stageData.start_date ? dayjs(stageData.start_date) : null}
                          onChange={(date) => handleStageChange(index, 'start_date', date)}
                          className="w-full"
                          size="small"
                          placeholder="시작일 선택"
                          format="YYYY-MM-DD"
                        />
                      </div>
                      
                      {/* End Date */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">종료일</label>
                        <DatePicker
                          value={stageData.end_date ? dayjs(stageData.end_date) : null}
                          onChange={(date) => handleStageChange(index, 'end_date', date)}
                          className="w-full"
                          size="small"
                          placeholder="종료일 선택"
                          format="YYYY-MM-DD"
                        />
                      </div>
                      
                      {/* Status Display */}
                      <div className="flex items-end">
                        <div className="w-full text-center py-1 px-2 rounded bg-gray-50">
                          {getStatusIcon(stageData.status || 'waiting')}
                        </div>
                      </div>
                    </div>
                    
                    {/* Delay Reason (only show when status is delayed) */}
                    {stageData.status === 'delayed' && (
                      <div className="mt-2">
                        <label className="block text-xs text-red-600 mb-1">
                          지연 사유 (선택)
                        </label>
                        <TextArea
                          value={stageData.delay_reason || ''}
                          onChange={(e) => handleStageChange(index, 'delay_reason', e.target.value)}
                          placeholder="지연 사유를 입력하세요"
                          rows={2}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">진행 현황 요약</h4>
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Pause className="h-4 w-4 text-gray-500" />
            <span>대기: {stages.filter(s => s.status === 'waiting').length}개</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>진행중: {stages.filter(s => s.status === 'in_progress').length}개</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>완료: {stages.filter(s => s.status === 'completed').length}개</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span>지연: {stages.filter(s => s.status === 'delayed').length}개</span>
          </div>
        </div>
      </div>
    </div>
  );
}