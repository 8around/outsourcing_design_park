import { createClient } from '@/lib/supabase/client';
import { generateUniqueFileName } from '@/lib/utils/file';
import type {
  Project,
  ProcessStage,
  CreateProjectDTO,
  UpdateProjectDTO,
  UpdateProcessStageDTO,
  ProjectFilters,
  ProjectSortOptions,
  PaginationOptions,
  PaginatedResponse,
  ProcessStageName,
  ProcessStatus
} from '@/types/project';
import type {
  ProjectGridItem,
  InProgressProjectsResponse,
  LatestLogInfo,
} from '@/types/dashboard';
import { isManager } from '@/lib/utils/permissions';

export class ProjectService {
  private supabase = createClient();

  // 프로젝트 목록 조회 (필터, 정렬, 페이지네이션 지원)
  async getProjects(
    filters?: ProjectFilters,
    sort?: ProjectSortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<Project>> {
    try {
      let query = this.supabase
        .from('projects')
        .select(`
          *,
          creator:created_by(id, name, email),
          sales_manager_user:sales_manager(id, name, email),
          site_manager_user:site_manager(id, name, email),
          process_stages(*),
          project_images(*),
          favorites:project_favorites(*)
        `, { count: 'exact' })
        .is('deleted_at', null);

      // 필터 적용
      if (filters) {
        if (filters.search) {
          query = query.or(`site_name.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%`);
        }
        if (filters.current_process_stage) {
          query = query.eq('current_process_stage', filters.current_process_stage);
        }
        if (filters.is_urgent !== undefined) {
          query = query.eq('is_urgent', filters.is_urgent);
        }
        if (filters.created_by) {
          query = query.eq('created_by', filters.created_by);
        }
        if (filters.date_from) {
          query = query.gte('order_date', filters.date_from);
        }
        if (filters.date_to) {
          query = query.lte('order_date', filters.date_to);
        }
        if (filters.favorites_only) {
          const { data: { user } } = await this.supabase.auth.getUser();
          if (user) {
            const { data: favorites } = await this.supabase
              .from('project_favorites')
              .select('project_id')
              .eq('user_id', user.id);

            // 즐겨찾기가 있든 없든 필터 적용
            const projectIds = favorites?.map(f => f.project_id) || [];
            query = query.in('id', projectIds);
          } else {
            // 사용자가 없으면 빈 결과 반환
            query = query.in('id', []);
          }
        }

        // completion_status 필터 적용
        if (filters.completion_status && filters.completion_status !== 'all') {
          if (filters.completion_status === 'completed') {
            query = query.eq('is_completed', true);
          } else if (filters.completion_status === 'in_progress') {
            query = query.eq('is_completed', false);
          }
        }
      }

      // 정렬 적용
      const sortBy = sort?.sortBy || 'created_at';
      const order = sort?.order || 'desc';
      query = query.order(sortBy, { ascending: order === 'asc' });

      // 페이지네이션 적용
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('프로젝트 목록 조회 실패:', error);
      throw error;
    }
  }

  // 프로젝트 단일 조회
  async getProject(projectId: string): Promise<Project | null> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select(`
          *,
          creator:created_by(id, name, email),
          sales_manager_user:sales_manager(id, name, email),
          site_manager_user:site_manager(id, name, email),
          process_stages(*),
          project_images(*),
          favorites:project_favorites(*)
        `)
        .eq('id', projectId)
        .is('deleted_at', null)
        .maybeSingle(); // 해당하는 행 없을 떄 error 대신 null 반환

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('프로젝트 조회 실패:', error);
      throw error;
    }
  }

  // 여러 프로젝트 ID로 조회 (내보내기용)
  async getProjectsByIds(projectIds: string[], sort?: ProjectSortOptions): Promise<Project[]> {
    if (!projectIds || projectIds.length === 0) return [];

    try {
      let query = this.supabase
        .from('projects')
        .select(`
          *,
          creator:created_by(id, name, email),
          sales_manager_user:sales_manager(id, name, email),
          site_manager_user:site_manager(id, name, email),
          process_stages(*),
          project_images(*)
        `)
        .in('id', projectIds)
        .is('deleted_at', null)

      const sortBy = sort?.sortBy || 'created_at';
      const order = sort?.order || 'desc';

      query = query.order(sortBy, { ascending: order === 'asc' });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('프로젝트 다중 조회 실패:', error);
      throw error;
    }
  }

  // 모든 프로젝트 ID 조회 (전체 선택용)
  async getAllProjectIds(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select('id')
        .is('deleted_at', null);

      if (error) throw error;
      return data?.map(p => p.id) || [];
    } catch (error) {
      console.error('전체 프로젝트 ID 조회 실패:', error);
      throw error;
    }
  }

  // 프로젝트 생성 (이미지 업로드 및 공정 단계 포함)
  async createProject(
    dto: CreateProjectDTO,
    processStages: Array<{
      stage_name: string;
      stage_order: number;
      status: ProcessStatus;
      delay_reason?: string;
      start_date?: string;
      end_date?: string;
    }>,
    images?: File[],
    currentStage?: string,
  ): Promise<Project> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('인증되지 않은 사용자');

      // 1. 프로젝트 생성 (is_completed 미리 계산)
      const isCompleted = processStages
        ? processStages.length > 0 && processStages.every(stage => stage.status === 'completed')
        : false;

      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .insert({
          ...dto,
          created_by: user.id,
          current_process_stage: currentStage || 'contract',
          is_completed: isCompleted
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. 이미지 업로드 (있는 경우)
      if (images && images.length > 0) {
        await this.uploadProjectImages(project.id, images);
      }

      // 3. 공정 단계 생성
      const finalStages = processStages.map(stage => ({
        ...stage,
        project_id: project.id
      }));

      const { error: stagesError } = await this.supabase
        .from('process_stages')
        .insert(finalStages);

      if (stagesError) throw stagesError;

      // 4. 생성된 프로젝트 전체 정보 조회
      const createdProject = await this.getProject(project.id);
      if (!createdProject) throw new Error('프로젝트 생성 후 조회 실패');

      return createdProject;
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      throw error;
    }
  }

  // 프로젝트 이미지 업로드
  async uploadProjectImages(projectId: string, images: File[]): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('인증되지 않은 사용자');

      const uploadPromises = images.map(async (image, index) => {
        // Storage에 이미지 업로드 - 파일명 sanitize 처리
        const fileName = generateUniqueFileName(image.name, projectId);
        const { error: uploadError } = await this.supabase.storage
          .from('projects')
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        // 이미지 정보를 DB에 저장
        const { data: { publicUrl } } = this.supabase.storage
          .from('projects')
          .getPublicUrl(fileName);

        const { error: dbError } = await this.supabase
          .from('project_images')
          .insert({
            project_id: projectId,
            image_url: publicUrl,
            image_name: image.name,
            file_size: image.size,
            display_order: index + 1,
            is_thumbnail: index === 0, // 첫 번째 이미지를 썸네일로
            uploaded_by: user.id
          });

        if (dbError) throw dbError;

        // 첫 번째 이미지를 프로젝트 썸네일로 설정
        if (index === 0) {
          await this.supabase
            .from('projects')
            .update({ thumbnail_url: publicUrl })
            .eq('id', projectId);
        }
      });

      await Promise.all(uploadPromises);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      throw error;
    }
  }

  // 프로젝트 수정
  async updateProject(
    projectId: string, 
    dto: UpdateProjectDTO,
  ): Promise<Project> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('인증되지 않은 사용자');

      const { error } = await this.supabase
        .from('projects')
        .update({
          ...dto,
          updated_at: new Date().toISOString(),
          last_saved_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;

      const updatedProject = await this.getProject(projectId);
      if (!updatedProject) throw new Error('프로젝트 수정 후 조회 실패');

      return updatedProject;
    } catch (error) {
      console.error('프로젝트 수정 실패:', error);
      throw error;
    }
  }

  // 프로젝트 삭제 (하드 삭제 - 사용 안 함)
  async deleteProject(projectId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error);
      throw error;
    }
  }

  // 프로젝트 삭제 (소프트 삭제)
  async softDeleteProject(projectId: string): Promise<boolean> {
    try {
      // 현재 사용자 확인
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('인증되지 않은 사용자');

      // Admin 권한 확인
      const { data: userData, error: roleError } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (roleError || !isManager(userData?.role)) {
        throw new Error('관리자만 프로젝트를 삭제할 수 있습니다.');
      }
      
      // Soft Delete 수행
      const { error: deleteError } = await this.supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', projectId)
        .is('deleted_at', null); // 이미 삭제된 프로젝트는 제외

      if (deleteError) throw deleteError;

      return true;
    } catch (error) {
      console.error('프로젝트 소프트 삭제 실패:', error);
      throw error;
    }
  }

  // 공정 단계 업데이트
  async updateProcessStage(
    projectId: string,
    stageName: ProcessStageName,
    dto: UpdateProcessStageDTO
  ): Promise<ProcessStage> {
    try {
      // 1. 공정 단계 업데이트
      const { data: stage, error: stageError } = await this.supabase
        .from('process_stages')
        .update({
          ...dto,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('stage_name', stageName)
        .select()
        .single();

      if (stageError) throw stageError;

      // 2. 현재 진행 중인 공정 찾기 (가장 작은 stage_order의 in_progress 또는 delayed)
      const { data: currentStage } = await this.supabase
        .from('process_stages')
        .select('stage_name')
        .eq('project_id', projectId)
        .in('status', ['in_progress', 'delayed'])
        .order('stage_order', { ascending: true })
        .limit(1)
        .single();

      // 3. 프로젝트의 current_process_stage 업데이트
      if (currentStage) {
        await this.supabase
          .from('projects')
          .update({
            current_process_stage: currentStage.stage_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);
      }

      return stage;
    } catch (error) {
      console.error('공정 단계 업데이트 실패:', error);
      throw error;
    }
  }

  // 공정 단계 일괄 업데이트
  async updateProcessStages(
    projectId: string,
    updates: Array<{ stageName: ProcessStageName; dto: UpdateProcessStageDTO }>
  ): Promise<ProcessStage[]> {
    try {
      const updatedStages: ProcessStage[] = [];

      for (const { stageName, dto } of updates) {
        const stage = await this.updateProcessStage(projectId, stageName, dto);
        updatedStages.push(stage);
      }

      return updatedStages;
    } catch (error) {
      console.error('공정 단계 일괄 업데이트 실패:', error);
      throw error;
    }
  }

  // 다음 공정으로 진행
  async moveToNextStage(projectId: string): Promise<ProcessStage | null> {
    try {
      // 1. 현재 진행 중인 공정 찾기
      const { data: currentStage } = await this.supabase
        .from('process_stages')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'in_progress')
        .order('stage_order', { ascending: true })
        .limit(1)
        .single();

      if (!currentStage) {
        return null;
      }

      // 2. 현재 공정을 완료로 변경
      await this.updateProcessStage(projectId, currentStage.stage_name, {
        status: 'completed',
        actual_end_date: new Date().toISOString().split('T')[0]
      });

      // 3. 다음 공정 찾기
      const { data: nextStage } = await this.supabase
        .from('process_stages')
        .select('*')
        .eq('project_id', projectId)
        .eq('stage_order', currentStage.stage_order + 1)
        .single();

      if (!nextStage) {
        return null;
      }

      // 4. 다음 공정을 진행 중으로 변경
      const updatedNextStage = await this.updateProcessStage(projectId, nextStage.stage_name, {
        status: 'in_progress',
        actual_start_date: new Date().toISOString().split('T')[0]
      });

      return updatedNextStage;
    } catch (error) {
      console.error('다음 공정으로 진행 실패:', error);
      throw error;
    }
  }

  // 프로젝트 즐겨찾기 토글
  async toggleFavorite(projectId: string): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('인증되지 않은 사용자');

      // 기존 즐겨찾기 확인
      const { data: existing } = await this.supabase
        .from('project_favorites')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // 즐겨찾기 제거
        await this.supabase
          .from('project_favorites')
          .delete()
          .eq('id', existing.id);
        return false;
      } else {
        // 즐겨찾기 추가
        await this.supabase
          .from('project_favorites')
          .insert({
            project_id: projectId,
            user_id: user.id
          });
        return true;
      }
    } catch (error) {
      console.error('즐겨찾기 토글 실패:', error);
      throw error;
    }
  }

  // 프로젝트 통계 조회
  async getProjectStats(): Promise<{
    total: number;
    byStatus: Record<ProcessStatus, number>;
    byStage: Record<ProcessStageName, number>;
    urgent: number;
  }> {
    try {
      // 전체 프로젝트 수
      const { count: total } = await this.supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // 긴급 프로젝트 수
      const { count: urgent } = await this.supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('is_urgent', true)
        .is('deleted_at', null);

      // 공정 상태별 통계
      const { data: statusStats } = await this.supabase
        .from('process_stages')
        .select('status')
        .then(({ data }) => {
          const stats: Record<ProcessStatus, number> = {
            in_progress: 0,
            completed: 0,
            waiting: 0,
            delayed: 0
          };
          data?.forEach(item => {
            stats[item.status as ProcessStatus]++;
          });
          return { data: stats };
        });

      // 공정 단계별 프로젝트 수
      const { data: stageStats } = await this.supabase
        .from('projects')
        .select('current_process_stage')
        .is('deleted_at', null)
        .then(({ data }) => {
          const stats: Partial<Record<ProcessStageName, number>> = {};
          data?.forEach(item => {
            const stage = item.current_process_stage as ProcessStageName;
            stats[stage] = (stats[stage] || 0) + 1;
          });
          return { data: stats };
        });

      return {
        total: total || 0,
        byStatus: statusStats || { in_progress: 0, completed: 0, waiting: 0, delayed: 0 },
        byStage: stageStats as Record<ProcessStageName, number>,
        urgent: urgent || 0
      };
    } catch (error) {
      console.error('프로젝트 통계 조회 실패:', error);
      throw error;
    }
  }

  // 대시보드 통계 조회
  async getDashboardStats(): Promise<{
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalProgress: number;
    monthlyProgress: number;
  }> {
    try {
      // 전체 프로젝트 수
      const { count: totalProjects } = await this.supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // 활성 프로젝트 (진행 중인 프로젝트)
      const { count: activeProjects } = await this.supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .not('current_process_stage', 'eq', 'completion')
        .is('deleted_at', null);

      // 완료된 프로젝트
      const { count: completedProjects } = await this.supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('current_process_stage', 'completion')
        .is('deleted_at', null);

      // 전체 진행률 계산 (진행 중인 프로젝트들의 평균 진행률)
      const { data: projects } = await this.supabase
        .from('projects')
        .select('current_process_stage')
        .not('current_process_stage', 'eq', 'completion')
        .is('deleted_at', null);

      let totalProgress = 0;
      if (projects && projects.length > 0) {
        const stageProgress: Record<string, number> = {
          contract: 7,
          design: 14,
          order: 21,
          laser: 29,
          welding: 36,
          plating: 43,
          painting: 50,
          panel: 57,
          assembly: 64,
          shipping: 71,
          installation: 79,
          certification: 86,
          closing: 93,
          completion: 100
        };
        
        const progressSum = projects.reduce((sum, project) => {
          return sum + (stageProgress[project.current_process_stage] || 0);
        }, 0);
        
        totalProgress = Math.round(progressSum / projects.length);
      }

      // 이번 달 진행률 (이번 달 생성된 프로젝트들의 진행률)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyProjects } = await this.supabase
        .from('projects')
        .select('current_process_stage')
        .gte('created_at', startOfMonth.toISOString())
        .is('deleted_at', null);

      let monthlyProgress = 0;
      if (monthlyProjects && monthlyProjects.length > 0) {
        const stageProgress: Record<string, number> = {
          contract: 7,
          design: 14,
          order: 21,
          laser: 29,
          welding: 36,
          plating: 43,
          painting: 50,
          panel: 57,
          assembly: 64,
          shipping: 71,
          installation: 79,
          certification: 86,
          closing: 93,
          completion: 100
        };
        
        const progressSum = monthlyProjects.reduce((sum, project) => {
          return sum + (stageProgress[project.current_process_stage] || 0);
        }, 0);
        
        monthlyProgress = Math.round(progressSum / monthlyProjects.length);
      }

      return {
        totalProjects: totalProjects || 0,
        activeProjects: activeProjects || 0,
        completedProjects: completedProjects || 0,
        totalProgress: totalProgress || 0,
        monthlyProgress: monthlyProgress || 0
      };
    } catch (error) {
      console.error('대시보드 통계 조회 실패:', error);
      throw error;
    }
  }

  // 진행중인 프로젝트 목록 조회 (무한스크롤용)
  // 최적화: history_logs 임베드 쿼리로 N+1 문제 해결 (21회 → 1회)
  async getInProgressProjects(
    page = 1,
    limit = 20
  ): Promise<InProgressProjectsResponse> {
    try {
      // 1. 진행중인 프로젝트 조회 - history_logs 임베드 포함
      let query = this.supabase
        .from('projects')
        .select(`
          *,
          sales_manager_user:sales_manager(id, name, email),
          site_manager_user:site_manager(id, name, email),
          process_stages(*),
          history_logs(
            id,
            category,
            content,
            author_name,
            target_user_name,
            log_type,
            approval_status,
            created_at
          )
        `, { count: 'exact' })
        .is('deleted_at', null)
        .eq('is_completed', false)
        .eq('history_logs.is_deleted', false);

      // 2. 정렬: is_urgent DESC, installation_request_date ASC
      // history_logs는 created_at DESC로 정렬
      query = query
        .order('is_urgent', { ascending: false })
        .order('installation_request_date', { ascending: true })
        .order('created_at', { referencedTable: 'history_logs', ascending: false });

      // 3. 임베드 테이블 결과 제한 (각 프로젝트당 최신 로그 1개)
      query = query.limit(1, { referencedTable: 'history_logs' });

      // 4. 페이지네이션
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data: projects, count, error } = await query;
      if (error) throw error;

      // 5. 프로젝트 데이터 매핑 (별도 쿼리 없이 바로 사용)
      const projectsWithLogs: ProjectGridItem[] = (projects || []).map((project) => {
        // design 단계 일정 추출
        const designStage = project.process_stages?.find(
          (s: { stage_name: string }) => s.stage_name === 'design'
        );
        // installation 단계 일정 추출
        const installationStage = project.process_stages?.find(
          (s: { stage_name: string }) => s.stage_name === 'installation'
        );

        // history_logs 배열에서 첫 번째 항목 추출 (이미 1개로 제한됨)
        const latestLog = project.history_logs?.[0];

        return {
          id: project.id,
          site_name: project.site_name,
          product_name: project.product_name,
          current_process_stage: project.current_process_stage,
          is_urgent: project.is_urgent,
          installation_request_date: project.installation_request_date,
          sales_manager_name: project.sales_manager_user?.name,
          site_manager_name: project.site_manager_user?.name,
          latest_log: latestLog as LatestLogInfo | undefined,
          design_schedule: designStage ? {
            start_date: designStage.start_date,
            end_date: designStage.end_date,
          } : undefined,
          installation_schedule: installationStage ? {
            start_date: installationStage.start_date,
            end_date: installationStage.end_date,
          } : undefined,
        };
      });

      const total = count || 0;
      return {
        items: projectsWithLogs,
        total,
        page,
        hasMore: page * limit < total,
      };
    } catch (error) {
      console.error('진행중인 프로젝트 조회 실패:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스
export const projectService = new ProjectService();