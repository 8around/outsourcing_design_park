import React from 'react'
import Image from 'next/image'

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
          {/* Brand Logo */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <Image
              src="/images/logo.png"
              alt="디자인파크 로고"
              width={961/390*64}
              height={64}
              priority
              className="rounded-soft-xl shadow-soft-lg"
              unoptimized
            />
          </div>
          
          {/* Brand Text */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
            프로젝트 현장 관리
          </h1>
          <p className="text-gray-600 text-lg font-medium">
            디자인파크 프로젝트 현장관리 시스템입니다
          </p>
          <div className="w-16 h-1 bg-gradient-to-r from-primary-600 to-primary-500 rounded-full mx-auto mt-4"></div>
        </div>
        
        {/* Auth Form Container */}
        <div className="bg-white rounded-soft-xl shadow-soft-xl border border-gray-200/50 p-8 backdrop-blur-sm animate-scale-in">
          <div className="relative">
            {children}
          </div>
        </div>
      </div>
      
      {/* Floating Decorative Elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-primary-100/50 rounded-full blur-xl animate-pulse-soft"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-primary-200/30 rounded-full blur-2xl animate-pulse-soft" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-0 w-16 h-16 bg-primary-50 rounded-full blur-lg animate-pulse-soft" style={{animationDelay: '2s'}}></div>
    </div>
  )
}