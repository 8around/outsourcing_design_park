import { Suspense } from 'react';
import UsersManagement from '@/components/admin/UsersManagement';
import { Spin } from 'antd';

export default function AdminUsersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-6">
            {/* Admin Icon */}
            <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-soft-xl">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">사용자 관리</h1>
              <p className="text-gray-600 text-lg">사용자 승인 및 관리를 수행할 수 있습니다.</p>
            </div>
          </div>
          
          {/* Breadcrumb */}
          <nav className="text-sm">
            <ol className="flex items-center gap-2 text-gray-500">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m7 7 5 5 5-5" />
                </svg>
                관리자
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7" />
                </svg>
                <span className="text-primary-600 font-medium">사용자 관리</span>
              </li>
            </ol>
          </nav>
        </div>
      </div>
      
      {/* Page Content */}
      <div className="container mx-auto px-6 py-8">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-primary-600 rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700 mb-1">사용자 정보 로딩 중...</p>
              <p className="text-sm text-gray-500">잠시만 기다려주세요</p>
            </div>
          </div>
        }>
          <UsersManagement />
        </Suspense>
      </div>
    </div>
  );
}