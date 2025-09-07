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
          process_stages(*),
          project_images(*),
          favorites:project_favorites(*)
        `, { count: 'exact' });

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
            
            if (favorites && favorites.length > 0) {
              const projectIds = favorites.map(f => f.project_id);
              query = query.in('id', projectIds);
            }
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
          process_stages(*),
          favorites:project_favorites(*)
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('프로젝트 조회 실패:', error);
      throw error;
    }
  }

  // 프로젝트 생성 (이미지 업로드 및 공정 단계 포함)
  async createProject(
    dto: CreateProjectDTO,
    images?: File[],
    processStages?: Array<{
      stage_name: string;
      stage_order: number;
      status: ProcessStatus;
      delay_reason?: string;
      start_date?: string;
      end_date?: string;
    }>,
    currentStage?: string
  ): Promise<Project> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('인증되지 않은 사용자');

      // 1. 프로젝트 생성
      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .insert({
          ...dto,
          created_by: user.id,
          current_process_stage: currentStage || 'contract'
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. 이미지 업로드 (있는 경우)
      if (images && images.length > 0) {
        await this.uploadProjectImages(project.id, images);
      }

      // 3. 공정 단계 생성 (제공된 데이터 사용 또는 기본값)
      const stagesToInsert = processStages || [
        { project_id: project.id, stage_name: 'contract', stage_order: 1, status: 'in_progress' as ProcessStatus },
        { project_id: project.id, stage_name: 'design', stage_order: 2, status: 'waiting' as ProcessStatus },
        { project_id: project.id, stage_name: 'order', stage_order: 3, status: 'waiting' as ProcessStatus },
        { project_id: project.id, stage_name: 'laser', stage_order: 4, status: 'waiting' as ProcessStatus },
        { project_id: project.id, stage_name: 'welding', stage_order: 5, status: 'waiting' as ProcessStatus },
        { project_id: project.id, stage_name: 'plating', stage_order: 6, status: 'waiting' as ProcessStatus },
        { project_id: project.id, stage_name: 'painting', stage_order: 7, status: 'waiting' as ProcessStatus },
        { project_id: project.id, stage_name: 'panel', stage_order: 8, status: 'waiting' as ProcessStatus },
        { project_id: project.id, stage_name: 'assembly', stage_order: 9, status: 'waiting' as ProcessStatus },
        { project_id: project.id, stage_name: 'shipping', stage_order: 10, status: 'waiting' as ProcessStatus },
        { project_id: project.id, stage_name: 'installation', stage_order: 11, status: 'waiting' as ProcessStatus },
        { project_id: project.id, stage_name: 'certification', stage_order: 12, status: 'waiting' as ProcessStatus },
        { project_id: project.id, stage_name: 'closing', stage_order: 13, status: 'waiting' as ProcessStatus },
        { project_id: project.id, stage_name: 'completion', stage_order: 14, status: 'waiting' as ProcessStatus }
      ];

      const finalStages = stagesToInsert.map(stage => ({
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
        const { data: uploadData, error: uploadError } = await this.supabase.storage
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
  async updateProject(projectId: string, dto: UpdateProjectDTO): Promise<Project> {
    try {
      const { data, error } = await this.supabase
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

  // 프로젝트 삭제
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
        console.log('진행 중인 공정이 없습니다.');
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
        console.log('모든 공정이 완료되었습니다.');
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
        .single();

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
        .select('*', { count: 'exact', head: true });

      // 긴급 프로젝트 수
      const { count: urgent } = await this.supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('is_urgent', true);

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
}

// 싱글톤 인스턴스
export const projectService = new ProjectService();