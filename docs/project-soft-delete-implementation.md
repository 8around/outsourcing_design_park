# Soft Delete 애플리케이션 레벨 필터링 구현 계획

**작성일**: 2025-01-17
**작성자**: Claude Code
**상태**: 구현 진행 중

## 📋 개요

RLS에서 `deleted_at` 조건이 제거되었으므로, 모든 프로젝트 조회 쿼리에서 애플리케이션 레벨 필터링을 구현합니다.
단순히 모든 쿼리에 `.is('deleted_at', null)`을 체이닝으로 추가하는 방식으로 진행합니다.

## 🎯 목적

- 삭제된 프로젝트를 모든 페이지에서 숨기기
- 관리자도 기본적으로 삭제된 프로젝트를 보지 않도록 설정
- 향후 휴지통 기능 구현 시 선택적으로 표시 가능하도록 유연한 구조 유지

## 📂 수정 대상 파일

총 5개 파일, 17곳 수정 필요

### 1. lib/services/projects.service.ts (11곳)

#### 1.1 getProjects() - 라인 29-39
```typescript
// 현재 코드 (라인 29-39)
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
  `, { count: 'exact' });

// 수정 후
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
```

#### 1.2 getProject() - 라인 110-121
```typescript
// 현재 코드
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
  .single();

// 수정 후
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
  .single();
```

#### 1.3 getProjectStats() - 라인 542-544
```typescript
// 현재 코드
const { count: total } = await this.supabase
  .from('projects')
  .select('*', { count: 'exact', head: true });

// 수정 후
const { count: total } = await this.supabase
  .from('projects')
  .select('*', { count: 'exact', head: true })
  .is('deleted_at', null);
```

#### 1.4 getProjectStats() - 라인 547-550
```typescript
// 현재 코드
const { count: urgent } = await this.supabase
  .from('projects')
  .select('*', { count: 'exact', head: true })
  .eq('is_urgent', true);

// 수정 후
const { count: urgent } = await this.supabase
  .from('projects')
  .select('*', { count: 'exact', head: true })
  .eq('is_urgent', true)
  .is('deleted_at', null);
```

#### 1.5 getProjectStats() - 라인 571
```typescript
// 현재 코드
const { data: stageStats } = await this.supabase
  .from('projects')
  .select('current_process_stage')

// 수정 후
const { data: stageStats } = await this.supabase
  .from('projects')
  .select('current_process_stage')
  .is('deleted_at', null)
```

#### 1.6 getDashboardStats() - 라인 604-606
```typescript
// 현재 코드
const { count: totalProjects } = await this.supabase
  .from('projects')
  .select('*', { count: 'exact', head: true });

// 수정 후
const { count: totalProjects } = await this.supabase
  .from('projects')
  .select('*', { count: 'exact', head: true })
  .is('deleted_at', null);
```

#### 1.7 getDashboardStats() - 라인 609-612
```typescript
// 현재 코드
const { count: activeProjects } = await this.supabase
  .from('projects')
  .select('*', { count: 'exact', head: true })
  .not('current_process_stage', 'eq', 'completion');

// 수정 후
const { count: activeProjects } = await this.supabase
  .from('projects')
  .select('*', { count: 'exact', head: true })
  .not('current_process_stage', 'eq', 'completion')
  .is('deleted_at', null);
```

#### 1.8 getDashboardStats() - 라인 615-618
```typescript
// 현재 코드
const { count: completedProjects } = await this.supabase
  .from('projects')
  .select('*', { count: 'exact', head: true })
  .eq('current_process_stage', 'completion');

// 수정 후
const { count: completedProjects } = await this.supabase
  .from('projects')
  .select('*', { count: 'exact', head: true })
  .eq('current_process_stage', 'completion')
  .is('deleted_at', null);
```

#### 1.9 getDashboardStats() - 라인 621-624
```typescript
// 현재 코드
const { data: projects } = await this.supabase
  .from('projects')
  .select('current_process_stage')
  .not('current_process_stage', 'eq', 'completion');

// 수정 후
const { data: projects } = await this.supabase
  .from('projects')
  .select('current_process_stage')
  .not('current_process_stage', 'eq', 'completion')
  .is('deleted_at', null);
```

#### 1.10 getDashboardStats() - 라인 657-660
```typescript
// 현재 코드
const { data: monthlyProjects } = await this.supabase
  .from('projects')
  .select('current_process_stage')
  .gte('created_at', startOfMonth.toISOString());

// 수정 후
const { data: monthlyProjects } = await this.supabase
  .from('projects')
  .select('current_process_stage')
  .gte('created_at', startOfMonth.toISOString())
  .is('deleted_at', null);
```

#### 1.11 softDeleteProject() - 라인 369
```typescript
// 현재 코드
const { error: deleteError } = await this.supabase
  .from('projects')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', projectId)

// 수정 후
const { error: deleteError } = await this.supabase
  .from('projects')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', projectId)
  .is('deleted_at', null); // 이미 삭제된 프로젝트는 제외
```

### 2. lib/services/logs.service.ts (1곳)

#### 2.1 createApprovalRequestLog() - 라인 131-136
```typescript
// 현재 코드
const { data: projectData } = await supabase
  .from("projects")
  .select("site_name, product_name")
  .eq("id", data.project_id)
  .single();

// 수정 후
const { data: projectData } = await supabase
  .from("projects")
  .select("site_name, product_name")
  .eq("id", data.project_id)
  .is('deleted_at', null)
  .single();
```

### 3. lib/services/approval.service.ts (3곳)

#### 3.1 respondToApprovalRequest() - 라인 329-334
```typescript
// 현재 코드
const { data: projectData } = await this.supabase
  .from("projects")
  .select("site_name, product_name")
  .eq("id", requestData.project_id)
  .single();

// 수정 후
const { data: projectData } = await this.supabase
  .from("projects")
  .select("site_name, product_name")
  .eq("id", requestData.project_id)
  .is('deleted_at', null)
  .single();
```

#### 3.2 getPendingApprovalsForUser() - 라인 714-722 (조인 처리)
```typescript
// 현재 코드
const { data: receivedApprovals } = await this.supabase
  .from("approval_requests")
  .select(`
    *,
    project:projects(site_name, product_name)
  `)
  .eq("approver_id", userId)
  .eq("status", "pending")
  .order("created_at", { ascending: false })
  .limit(10);

// 수정 후 - inner join 후 project.deleted_at 조건 체이닝
const { data: receivedApprovals } = await this.supabase
  .from("approval_requests")
  .select(`
    *,
    project:projects!inner(site_name, product_name)
  `)
  .eq("approver_id", userId)
  .eq("status", "pending")
  .is("project.deleted_at", null)
  .order("created_at", { ascending: false })
  .limit(10);
```

#### 3.3 getPendingApprovalsForUser() - 라인 790-802 (조인 처리)
```typescript
// 현재 코드
const { data: sentApprovals } = await this.supabase
  .from("approval_requests")
  .select(`
    *,
    project:projects(site_name, product_name)
  `)
  .eq("requester_id", userId)
  .eq("status", "pending")
  .order("created_at", { ascending: false })
  .limit(10);

// 수정 후 - inner join 후 project.deleted_at 조건 체이닝
const { data: sentApprovals } = await this.supabase
  .from("approval_requests")
  .select(`
    *,
    project:projects!inner(site_name, product_name)
  `)
  .eq("requester_id", userId)
  .eq("status", "pending")
  .is("project.deleted_at", null)
  .order("created_at", { ascending: false })
  .limit(10);
```

### 4. components/calendar/ProjectCalendar.tsx (1곳)

#### 4.1 fetchProjects() - 라인 114-120
```typescript
// 현재 코드
const { data: projectsData, error: projectsError } = await supabase
  .from('projects')
  .select(`
    *,
    process_stages (*)
  `)
  .order('created_at', { ascending: false })

// 수정 후
const { data: projectsData, error: projectsError } = await supabase
  .from('projects')
  .select(`
    *,
    process_stages (*)
  `)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
```

### 5. supabase/functions/generate-weekly-report/index.ts (1곳)

#### 5.1 주간 데이터 수집 쿼리 - 라인 71-83
```typescript
// 현재 코드
const { data: logs, error: logsError } = await supabaseClient
  .from("history_logs")
  .select(
    `
    *,
    projects:project_id(site_name, product_name, site_manager, sales_manager),
    users:author_id(name, email)
  `
  )
  .gte("created_at", startDate.toISOString())
  .lte("created_at", endDate.toISOString())
  .order("created_at", { ascending: false });

// 수정 후 - inner join과 deleted_at 필터링 추가
const { data: logs, error: logsError } = await supabaseClient
  .from("history_logs")
  .select(
    `
    *,
    projects:project_id!inner(site_name, product_name, site_manager, sales_manager),
    users:author_id(name, email)
  `
  )
  .is("projects.deleted_at", null)
  .gte("created_at", startDate.toISOString())
  .lte("created_at", endDate.toISOString())
  .order("created_at", { ascending: false });
```

**변경 사항 설명**:
- `projects:project_id!inner`로 inner join 사용하여 프로젝트가 없는 로그는 제외
- `.is("projects.deleted_at", null)` 조건으로 삭제된 프로젝트의 로그를 주간 리포트에서 제외
- 이를 통해 주간 리포트에 삭제된 프로젝트의 활동 내역이 포함되지 않도록 함

## 🔍 테스트 시나리오

### 1. 프로젝트 목록 페이지
- [ ] 일반 사용자: 삭제된 프로젝트가 표시되지 않음
- [ ] 관리자: 삭제된 프로젝트가 표시되지 않음
- [ ] 필터링 기능 정상 작동

### 2. 프로젝트 상세 페이지
- [ ] 삭제된 프로젝트 직접 URL 접근 시 404 또는 에러

### 3. 캘린더 페이지
- [ ] 삭제된 프로젝트 이벤트가 표시되지 않음

### 4. 대시보드
- [ ] 통계에서 삭제된 프로젝트 제외
- [ ] 활성/완료 프로젝트 수 정확

### 5. 승인 요청
- [ ] 삭제된 프로젝트의 승인 요청 표시 안 됨
- [ ] 승인 요청 생성 시 삭제된 프로젝트 선택 불가

### 6. 소프트 삭제 기능
- [ ] 관리자가 프로젝트 삭제 시 deleted_at 설정
- [ ] 이미 삭제된 프로젝트 재삭제 방지

### 7. 주간 리포트 (Edge Function)
- [ ] 삭제된 프로젝트의 로그가 리포트에 포함되지 않음
- [ ] Excel 파일에 삭제된 프로젝트 활동 내역 미포함
- [ ] 이메일로 발송되는 통계에서 삭제된 프로젝트 제외

## 📌 주의사항

1. **조인 쿼리 처리**: approval.service.ts의 getPendingApprovalsForUser()에서는 `!inner` 조인과 `.is("project.deleted_at", null)` 조건을 사용하여 삭제된 프로젝트를 제외합니다.

2. **성능 고려**: 대량의 프로젝트가 있을 경우, deleted_at에 인덱스 추가를 고려할 수 있습니다:
```sql
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at);
```

3. **향후 확장**: 휴지통 기능 구현 시 `includeDeleted` 파라미터를 추가하여 선택적으로 삭제된 프로젝트를 표시할 수 있습니다.

## 📝 구현 진행 상황

- [x] 문서 작성
- [x] projects.service.ts 수정 (11곳)
- [x] logs.service.ts 수정 (1곳)
- [x] approval.service.ts 수정 (3곳 - inner join 방식 적용)
- [x] ProjectCalendar.tsx 수정 (2곳 - 메인 쿼리와 fallback 쿼리)
- [x] generate-weekly-report Edge Function 수정 (1곳 - inner join 및 deleted_at 필터링)
- [x] 테스트 및 검증 (npm run build 성공)

## 🚀 다음 단계

1. 각 파일 순차적으로 수정
2. npm run build로 타입 체크
3. 실제 테스트 환경에서 검증
4. 필요시 추가 수정

---

**문서 종료**