'use client';

import React from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';

interface LoadingProps {
  size?: 'small' | 'default' | 'large';
  fullScreen?: boolean;
  message?: string;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({ 
  size = 'large', 
  fullScreen = false,
  message,
  className = ''
}) => {
  const spinIcon = <LoadingOutlined style={{ fontSize: size === 'large' ? 48 : size === 'default' ? 24 : 16 }} spin />;

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <Spin indicator={spinIcon} />
          {message && (
            <p className="text-gray-600 text-sm animate-pulse">{message}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <Spin indicator={spinIcon} />
      {message && (
        <p className="text-gray-600 text-sm mt-4 animate-pulse">{message}</p>
      )}
    </div>
  );
};

// 페이지 로딩용 컴포넌트
export const PageLoading: React.FC<{ message?: string }> = ({ message = '페이지를 불러오는 중...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">잠시만 기다려주세요</h3>
            <p className="text-sm text-gray-600 animate-pulse">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 컨텐츠 로딩용 스켈레톤
export const ContentLoading: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-gray-200 rounded w-full mb-3"></div>
      ))}
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
};

export default Loading;