'use client'

import { useState } from 'react'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button } from 'antd'

interface ImageCarouselProps {
  images: string[]
  alt: string
  height?: number
  className?: string
}

export default function ImageCarousel({ 
  images, 
  alt, 
  height = 200,
  className = '' 
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  // 이미지가 없는 경우
  if (!images || images.length === 0) {
    return null
  }

  // 단일 이미지인 경우
  if (images.length === 1) {
    return (
      <div 
        className={`relative overflow-hidden ${className}`} 
        style={{ height }}
      >
        <img 
          src={images[0]}
          alt={alt}
          className="w-full h-full object-contain"
          style={{ backgroundColor: '#f0f0f0' }}
        />
      </div>
    )
  }

  // 다중 이미지 캐러셀
  return (
    <div 
      className={`relative overflow-hidden group ${className}`} 
      style={{ height }}
    >
      {/* 이미지 컨테이너 */}
      <div className="relative w-full h-full">
        <img 
          key={currentIndex} // key 추가로 이미지 변경 시 리렌더링 보장
          src={images[currentIndex]}
          alt={`${alt} - ${currentIndex + 1}`}
          className="w-full h-full object-contain transition-opacity duration-300"
          style={{ backgroundColor: '#f0f0f0' }}
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/400x300/CCCCCC/666666?text=Image+Not+Found'
          }}
        />
      </div>

      {/* 좌측 네비게이션 버튼 */}
      <Button
        type="text"
        icon={<LeftOutlined />}
        onClick={handlePrevious}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      />

      {/* 우측 네비게이션 버튼 */}
      <Button
        type="text"
        icon={<RightOutlined />}
        onClick={handleNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      />

      {/* 인디케이터 */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation()
              setCurrentIndex(index)
            }}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index === currentIndex 
                ? 'bg-white w-4' 
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>

      {/* 이미지 카운터 - 좌측 상단으로 이동 */}
      <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  )
}