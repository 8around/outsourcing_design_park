import React from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50/50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgb(37, 99, 235) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}></div>
      </div>
      
      {/* Auth Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Header Section */}
        <div className="text-center mb-10 animate-slide-up">
          {/* Brand Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-soft-xl mb-6 shadow-soft-lg">
            <svg 
              className="w-8 h-8 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
              />
            </svg>
          </div>
          
          {/* Brand Text */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
            프로젝트 현장 관리
          </h1>
          <p className="text-gray-600 text-lg font-medium">
            효율적인 제조업 프로젝트 관리 솔루션
          </p>
          <div className="w-16 h-1 bg-gradient-to-r from-primary-600 to-primary-500 rounded-full mx-auto mt-4"></div>
        </div>
        
        {/* Auth Form Container */}
        <div className="bg-white rounded-soft-xl shadow-soft-xl border border-gray-200/50 p-8 backdrop-blur-sm animate-scale-in">
          <div className="relative">
            {children}
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 opacity-75">
          <p className="text-sm text-gray-500">
            © 2024 프로젝트 현장 관리 솔루션. All rights reserved.
          </p>
        </div>
      </div>
      
      {/* Floating Decorative Elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-primary-100/50 rounded-full blur-xl animate-pulse-soft"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-primary-200/30 rounded-full blur-2xl animate-pulse-soft" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-0 w-16 h-16 bg-primary-50 rounded-full blur-lg animate-pulse-soft" style={{animationDelay: '2s'}}></div>
    </div>
  )
}