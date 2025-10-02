// 프로젝트 관련 타입 정의

// 14단계 공정 enum
export const PROCESS_STAGES = {
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
} as const;

export type ProcessStageName = keyof typeof PROCESS_STAGES;

// 공정 상태
export type ProcessStatus = 'in_progress' | 'completed' | 'waiting' | 'delayed';

// 프로젝트 기본 정보
export interface Project {
  id: string;
  site_name: string;
  sales_manager: string | null;  // UUID (foreign key to users table)
  site_manager: string | null;   // UUID (foreign key to users table)
  product_name: string;
  product_quantity: number;
  outsourcing_company: string;
  order_date: string;
  expected_completion_date: string;
  installation_request_date: string;
  current_process_stage: ProcessStageName;
  thumbnail_url?: string;
  notes?: string | null;
  is_urgent: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_saved_at: string;
  
  // 관계 데이터
  process_stages?: ProcessStage[];
  project_images?: ProjectImage[];
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  sales_manager_user?: {  // 영업담당자 정보
    id: string;
    name: string;
    email: string;
  };
  site_manager_user?: {   // 현장담당자 정보
    id: string;
    name: string;
    email: string;
  };
  favorites?: ProjectFavorite[];
}

// 프로젝트 이미지
export interface ProjectImage {
  id: string;
  project_id: string;
  image_url: string;
  image_name: string;
  file_size: number;
  display_order: number;
  is_thumbnail: boolean;
  uploaded_by: string;
  created_at: string;
}

// 공정 단계별 상세 정보
export interface ProcessStage {
  id: string;
  project_id: string;
  stage_name: ProcessStageName;
  stage_order: number;
  status: ProcessStatus;
  delay_reason?: string;
  start_date?: string;
  end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  created_at: string;
  updated_at: string;
}

// 프로젝트 즐겨찾기
export interface ProjectFavorite {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
}

// 프로젝트 생성/수정 DTO
export interface CreateProjectDTO {
  site_name: string;
  sales_manager: string;
  site_manager: string;
  product_name: string;
  product_quantity: number;
  outsourcing_company: string;
  order_date: string;
  expected_completion_date: string;
  installation_request_date: string;
  is_urgent?: boolean;
  thumbnail_url?: string;
}

export interface UpdateProjectDTO extends Partial<CreateProjectDTO> {
  current_process_stage?: ProcessStageName;
}

// 공정 단계 업데이트 DTO
export interface UpdateProcessStageDTO {
  status?: ProcessStatus;
  delay_reason?: string;
  start_date?: string;
  end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
}

// 프로젝트 필터 옵션
export interface ProjectFilters {
  search?: string;
  current_process_stage?: ProcessStageName;
  is_urgent?: boolean;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  favorites_only?: boolean;
}

// 프로젝트 정렬 옵션
export type ProjectSortBy = 'created_at' | 'updated_at' | 'site_name' | 'expected_completion_date' | 'order_date';
export type SortOrder = 'asc' | 'desc';

export interface ProjectSortOptions {
  sortBy: ProjectSortBy;
  order: SortOrder;
}

// 페이지네이션
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}