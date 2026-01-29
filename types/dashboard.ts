// 대시보드 관련 타입 정의
import type { ProcessStageName } from "./project";
import type { LogCategory, LogType, ApprovalStatus } from "./log";

// 최신 로그 정보
export interface LatestLogInfo {
  id: string;
  category: LogCategory;
  content: string;
  author_name: string;
  target_user_name?: string;
  log_type: LogType;
  approval_status?: ApprovalStatus;
  created_at: string;
}

// 설치 일정 정보
export interface InstallationSchedule {
  start_date?: string;
  end_date?: string;
}

// 그리드에 표시할 프로젝트 데이터
export interface ProjectGridItem {
  id: string;
  site_name: string;
  product_name: string;
  current_process_stage: ProcessStageName;
  is_urgent: boolean;
  installation_request_date: string;
  sales_manager_name?: string;
  site_manager_name?: string;
  latest_log?: LatestLogInfo;
  installation_schedule?: InstallationSchedule;
}

// 페이지네이션 응답
export interface InProgressProjectsResponse {
  items: ProjectGridItem[];
  total: number;
  page: number;
  hasMore: boolean;
}
