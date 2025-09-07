/**
 * 파일명 관련 유틸리티 함수
 */

/**
 * 파일명을 Supabase Storage에 안전하게 사용할 수 있도록 sanitize
 * - 한글 및 특수문자를 제거하거나 안전한 문자로 변환
 * - 공백을 언더스코어로 변환
 * - 파일 확장자는 유지
 * 
 * @param fileName 원본 파일명
 * @returns 안전한 파일명
 */
export function sanitizeFileName(fileName: string): string {
  // 파일명과 확장자 분리
  const lastDotIndex = fileName.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0 && lastDotIndex < fileName.length - 1;
  
  let name = hasExtension ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = hasExtension ? fileName.substring(lastDotIndex) : '';
  
  // 한글, 특수문자를 제거하고 영문, 숫자, 하이픈, 언더스코어만 남김
  // 공백은 언더스코어로 변환
  name = name
    .replace(/\s+/g, '_') // 공백을 언더스코어로 변환
    .replace(/[^a-zA-Z0-9_-]/g, '') // 영문, 숫자, 언더스코어, 하이픈만 남김
    .replace(/_+/g, '_') // 연속된 언더스코어를 하나로
    .replace(/^_|_$/g, ''); // 시작과 끝의 언더스코어 제거
  
  // 파일명이 비어있거나 너무 짧은 경우 기본값 사용
  if (!name || name.length < 1) {
    name = 'file';
  }
  
  // 파일명이 너무 긴 경우 잘라냄 (최대 100자)
  if (name.length > 100) {
    name = name.substring(0, 100);
  }
  
  return name + extension;
}

/**
 * 프로젝트 이미지용 고유 파일명 생성
 * - 타임스탬프와 랜덤 문자열을 조합하여 고유성 보장
 * - 파일 확장자는 유지
 * 
 * @param originalFileName 원본 파일명
 * @param projectId 프로젝트 ID
 * @returns 고유한 파일명
 */
export function generateUniqueFileName(originalFileName: string, projectId: string): string {
  // 파일 확장자 추출
  const lastDotIndex = originalFileName.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0 && lastDotIndex < originalFileName.length - 1;
  const extension = hasExtension ? originalFileName.substring(lastDotIndex) : '';
  
  // 타임스탬프와 랜덤 문자열 생성
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  
  // 원본 파일명에서 안전한 부분만 추출 (선택적)
  const sanitizedName = sanitizeFileName(originalFileName);
  const nameWithoutExt = sanitizedName.substring(0, sanitizedName.lastIndexOf('.'));
  
  // 고유 파일명 생성: projectId/timestamp-random-sanitizedName.extension
  // 또는 더 간단하게: projectId/timestamp-random.extension
  return `${projectId}/${timestamp}-${randomString}${extension}`;
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 변환
 * 
 * @param bytes 바이트 단위 파일 크기
 * @returns 포맷된 파일 크기 문자열
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 파일 확장자가 이미지인지 확인
 * 
 * @param fileName 파일명
 * @returns 이미지 파일 여부
 */
export function isImageFile(fileName: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return imageExtensions.includes(extension);
}

/**
 * MIME 타입이 이미지인지 확인
 * 
 * @param mimeType MIME 타입
 * @returns 이미지 MIME 타입 여부
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}