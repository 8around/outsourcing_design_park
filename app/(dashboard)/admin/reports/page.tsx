'use client';

import { useState } from 'react';
import { ReportConfiguration } from '@/components/reports/ReportConfiguration';
import { ReportHistoryList } from '@/components/reports/ReportHistoryList';
import { Alert } from '@/components/common/ui/Alert';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'config' | 'history'>('config');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">리포트 관리</h1>
        <p className="mt-2 text-gray-600">
          주간 리포트 발송 설정 및 발송 내역을 관리합니다.
        </p>
      </div>

      {/* Info Alert */}
      <Alert 
        type="info" 
        className="mb-6"
        message="주간 리포트는 설정된 시간에 자동으로 생성되어 이메일로 발송됩니다."
      />

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('config')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'config'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              발송 설정
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              발송 내역
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'config' && <ReportConfiguration />}
          {activeTab === 'history' && <ReportHistoryList />}
        </div>
      </div>
    </div>
  );
}