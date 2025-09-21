'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { message, Carousel } from 'antd';
import Image from 'next/image';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
}

interface ImageUploaderProps {
  maxImages?: number;
  maxSize?: number; // in MB
  onImagesChange: (images: File[]) => void;
  initialImages?: string[];
}

export default function ImageUploader({
  maxImages = 10,
  maxSize = 20,
  onImagesChange,
  initialImages = []
}: ImageUploaderProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const carouselRef = useRef<any>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newImages: UploadedImage[] = [];
    let newTotalSize = totalSize;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        message.error(`${file.name}은(는) 이미지 파일이 아닙니다.`);
        continue;
      }

      // Check total images count
      if (images.length + newImages.length >= maxImages) {
        message.warning(`최대 ${maxImages}장까지만 업로드 가능합니다.`);
        break;
      }

      // Check individual file size (convert to MB)
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxSize) {
        message.error(`${file.name}의 크기가 ${maxSize}MB를 초과합니다.`);
        continue;
      }

      // Check total size
      if (newTotalSize + file.size > maxSize * 1024 * 1024) {
        message.error(`전체 파일 크기가 ${maxSize}MB를 초과합니다.`);
        continue;
      }

      newTotalSize += file.size;
      
      const uploadedImage: UploadedImage = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size
      };

      newImages.push(uploadedImage);
    }

    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      setTotalSize(newTotalSize);
      onImagesChange(updatedImages.map(img => img.file));
      message.success(`${newImages.length}개의 이미지가 추가되었습니다.`);
    }
  };

  const removeImage = (imageId: string) => {
    const imageToRemove = images.find(img => img.id === imageId);
    if (!imageToRemove) return;

    const newImages = images.filter(img => img.id !== imageId);
    const newTotalSize = totalSize - imageToRemove.size;
    
    setImages(newImages);
    setTotalSize(newTotalSize);
    onImagesChange(newImages.map(img => img.file));
    
    // Revoke the object URL to free up memory
    URL.revokeObjectURL(imageToRemove.preview);
    
    message.success('이미지가 삭제되었습니다.');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Get first 1-5 images as thumbnails for carousel display
  const thumbnails = images.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          <span>이미지 {images.length}/{maxImages}장</span>
          <span className="ml-4">
            총 크기: {formatFileSize(totalSize)} / {maxSize}MB
          </span>
        </div>
      </div>

      {/* Thumbnail Carousel - Show if we have images */}
      {thumbnails.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">
              📷 썸네일 미리보기
            </h3>
            <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded-full">
              {thumbnails.length}장 / 최대 5장
            </span>
          </div>
          
          <div className="relative bg-white rounded-lg shadow-inner p-3">
            {/* Navigation arrows for multiple images */}
            {thumbnails.length > 1 && (
              <>
                <button
                  onClick={() => carouselRef.current?.prev()}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white/90 rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-200 border border-gray-200"
                  aria-label="이전 이미지"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-700" />
                </button>
                <button
                  onClick={() => carouselRef.current?.next()}
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white/90 rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-200 border border-gray-200"
                  aria-label="다음 이미지"
                >
                  <ChevronRight className="h-4 w-4 text-gray-700" />
                </button>
              </>
            )}
            
            {/* Carousel */}
            <Carousel
              ref={carouselRef}
              autoplay
              autoplaySpeed={4000}
              dots={thumbnails.length > 1}
              dotPosition="bottom"
              className="thumbnail-carousel"
              effect="fade"
            >
              {thumbnails.map((image, index) => (
                <div key={image.id} className="px-1">
                  <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100">
                    <Image
                      src={image.preview}
                      alt={image.name}
                      fill
                      className="object-contain p-2"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority={index === 0}
                    />
                    
                    {/* Image number badge */}
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      {index + 1} / {thumbnails.length}
                    </div>
                  </div>
                  
                  {/* Image name */}
                  <div className="mt-2 px-2">
                    <p className="text-xs text-gray-700 font-medium truncate text-center">
                      {image.name}
                    </p>
                    <p className="text-xs text-gray-500 text-center">
                      {formatFileSize(image.size)}
                    </p>
                  </div>
                </div>
              ))}
            </Carousel>
          </div>
          
          {/* Information text */}
          <p className="text-xs text-gray-600 mt-3 text-center">
            ※ 업로드한 이미지 중 첫 1-5장이 프로젝트 썸네일로 사용됩니다
          </p>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        } ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => images.length < maxImages && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={images.length >= maxImages}
        />
        
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            {images.length >= maxImages
              ? '최대 이미지 개수에 도달했습니다'
              : '클릭하거나 이미지를 드래그하여 업로드'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            JPG, PNG, GIF (최대 {maxSize}MB, 최대 {maxImages}장)
          </p>
        </div>
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group rounded-lg overflow-hidden border border-gray-200"
            >
              <div className="aspect-square relative">
                <Image
                  src={image.preview}
                  alt={image.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity" />
                
                {/* Image Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs truncate">{image.name}</p>
                  <p className="text-xs">{formatFileSize(image.size)}</p>
                </div>
                
                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(image.id);
                  }}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Initial Images Display (if any) */}
      {initialImages.length > 0 && images.length === 0 && (
        <div className="text-sm text-gray-500">
          <ImageIcon className="inline h-4 w-4 mr-1" />
          기존 이미지 {initialImages.length}장이 있습니다.
        </div>
      )}
    </div>
  );
}