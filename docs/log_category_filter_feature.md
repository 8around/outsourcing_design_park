# 로그 카테고리별 필터 기능 추가 계획

## 📋 작업 개요
대시보드 전체 활동 로그와 프로젝트 상세 히스토리 로그에 **카테고리별 필터 기능**을 추가합니다.

## 🎯 목표
- 대시보드 페이지의 전체 활동 로그에서 7개 카테고리로 필터링
- 프로젝트 상세 페이지의 히스토리 로그에서 7개 카테고리로 필터링
- 사용자 필터와 카테고리 필터를 독립적으로 또는 함께 사용 가능
- **승인요청, 승인처리 카테고리는 제외** (시스템 자동 생성 로그)

## 📝 변경할 파일 (3개)

### 1️⃣ **lib/services/logs.service.ts** - 서비스 레이어
**변경 내용:**
- `getProjectLogs` 메서드에 `category?: string` 파라미터 추가
- `getGlobalLogFeed` 메서드에 `category?: string` 파라미터 추가
- 각 메서드에서 category가 전달되면 `.eq('category', category)` 쿼리 조건 추가

**예시:**
```typescript
// Before
async getProjectLogs(projectId: string, page = 1, pageSize = 20)

// After
async getProjectLogs(projectId: string, page = 1, pageSize = 20, category?: string)
```

**구현 위치:**
- `getProjectLogs` 메서드 (라인 251-297)
  ```typescript
  async getProjectLogs(
    projectId: string,
    page = 1,
    pageSize = 20,
    category?: string  // 추가
  ): Promise<{
    logs: HistoryLogWithAttachments[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const supabase = createClient();
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    // 전체 개수 조회 쿼리
    let countQuery = supabase
      .from("history_logs")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("is_deleted", false);

    // 카테고리 필터 추가
    if (category) {
      countQuery = countQuery.eq("category", category);
    }

    const { count } = await countQuery;

    // 데이터 조회 쿼리 (첨부파일 포함)
    let dataQuery = supabase
      .from("history_logs")
      .select(`
        *,
        attachments:history_log_attachments(*)
      `)
      .eq("project_id", projectId)
      .eq("is_deleted", false);

    // 카테고리 필터 추가
    if (category) {
      dataQuery = dataQuery.eq("category", category);
    }

    const { data: logs, error } = await dataQuery
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) {
      console.error("로그 목록 조회 실패:", error);
      throw new Error("로그 목록 조회에 실패했습니다.");
    }

    return {
      logs: logs || [],
      total: count || 0,
      page,
      page_size: pageSize,
    };
  }
  ```

- `getGlobalLogFeed` 메서드 (라인 299-362)
  ```typescript
  async getGlobalLogFeed(
    page = 1,
    pageSize = 20,
    userId?: string,
    category?: string  // 추가
  ): Promise<{
    logs: HistoryLogWithAttachments[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const supabase = createClient();
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    // 기본 쿼리 생성
    let countQuery = supabase
      .from("history_logs")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false);

    let dataQuery = supabase
      .from("history_logs")
      .select(`
        *,
        attachments:history_log_attachments(*)
      `)
      .eq("is_deleted", false);

    // 사용자 필터링 적용
    if (userId) {
      countQuery = countQuery.or(`author_id.eq.${userId},target_user_id.eq.${userId}`);
      dataQuery = dataQuery.or(`author_id.eq.${userId},target_user_id.eq.${userId}`);
    }

    // 카테고리 필터링 추가
    if (category) {
      countQuery = countQuery.eq("category", category);
      dataQuery = dataQuery.eq("category", category);
    }

    // 전체 개수 조회
    const { count } = await countQuery;

    // 데이터 조회 (첨부파일 포함)
    const { data: logs, error } = await dataQuery
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) {
      console.error("글로벌 로그 피드 조회 실패:", error);
      throw new Error("글로벌 로그 피드 조회에 실패했습니다.");
    }

    return {
      logs: logs || [],
      total: count || 0,
      page,
      page_size: pageSize,
    };
  }
  ```

### 2️⃣ **components/logs/GlobalLogFeed.tsx** - 대시보드 전체 활동 로그
**추가할 상태:**
```typescript
const [filterCategory, setFilterCategory] = useState<string | null>(null)
```

**UI 추가 (라인 456 - Space 컴포넌트 내부):**
```tsx
<Space>
  {/* 카테고리 필터 Select 추가 */}
  <Select
    placeholder="카테고리 선택"
    allowClear
    style={{ width: 140 }}
    size="small"
    value={filterCategory}
    onChange={(value) => setFilterCategory(value || null)}
  >
    <Select.Option value="사양변경">사양변경</Select.Option>
    <Select.Option value="도면설계">도면설계</Select.Option>
    <Select.Option value="구매발주">구매발주</Select.Option>
    <Select.Option value="생산제작">생산제작</Select.Option>
    <Select.Option value="상하차">상하차</Select.Option>
    <Select.Option value="현장설치시공">현장설치시공</Select.Option>
    <Select.Option value="설치인증">설치인증</Select.Option>
  </Select>

  {/* 관리자인 경우에만 사용자 필터 버튼 표시 */}
  {userData?.role === 'admin' && (
    <Button
      icon={<FilterOutlined />}
      onClick={() => setShowUserSelectModal(true)}
      size="small"
      type={filterUserId ? "primary" : "default"}
    >
      사용자 필터
    </Button>
  )}

  {/* 필터가 적용된 경우 초기화 버튼 표시 */}
  {(filterUserId || filterCategory) && (
    <Button
      icon={<CloseCircleOutlined />}
      onClick={handleResetFilter}
      size="small"
      danger
    >
      초기화
    </Button>
  )}

  {showRefresh && (
    <Button
      type="text"
      icon={<ReloadOutlined spin={refreshing} />}
      onClick={handleRefresh}
      loading={refreshing}
      size="small"
    >
      새로고침
    </Button>
  )}
</Space>
```

**카테고리 Tag 표시 (라인 444 - 제목 부분):**
```tsx
<div className="flex items-center gap-2">
  <Title level={4} className="mb-0">전체 활동 로그</Title>
  {filterUser && (
    <Tag
      color="blue"
      closable
      onClose={handleResetFilter}
      className="ml-2"
    >
      {filterUser.name} 필터링 중
    </Tag>
  )}
  {filterCategory && (
    <Tag
      color="green"
      closable
      onClose={() => setFilterCategory(null)}
      className="ml-2"
    >
      {filterCategory} 필터링 중
    </Tag>
  )}
</div>
```

**로직 변경:**

1. `loadLogs` 함수 수정 (라인 100):
```typescript
const loadLogs = async (page = currentPage, isRefresh = false) => {
  if (isRefresh) {
    setRefreshing(true)
  } else {
    setLoading(true)
  }

  try {
    // 글로벌 로그 피드 조회 (사용자 필터링 + 카테고리 필터링 적용)
    const response = await logService.getGlobalLogFeed(
      page,
      limit,
      filterUserId || undefined,
      filterCategory || undefined  // 카테고리 필터 추가
    )
    // ... 나머지 코드
  }
}
```

2. `useEffect` 의존성 추가 (라인 166):
```typescript
useEffect(() => {
  setCurrentPage(1)
  loadLogs(1)
}, [limit, filterUserId, filterCategory])  // filterCategory 추가
```

3. `handleResetFilter` 함수 수정 (라인 202):
```typescript
const handleResetFilter = () => {
  setFilterUser(null)
  setFilterUserId(null)
  setFilterCategory(null)  // 카테고리도 초기화
  message.info('전체 로그를 표시합니다.')
}
```

4. Import 추가 (상단):
```typescript
import { Select } from 'antd'
```

### 3️⃣ **components/logs/LogList.tsx** - 프로젝트 상세 히스토리 로그
**추가할 상태 (라인 46):**
```typescript
const [filterCategory, setFilterCategory] = useState<string | null>(null)
```

**UI 추가 (라인 176-182 헤더 부분):**
```tsx
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-semibold">히스토리 로그</h2>
    <div className="flex items-center gap-2">
      {/* 카테고리 필터 Select */}
      <select
        value={filterCategory || ''}
        onChange={(e) => setFilterCategory(e.target.value || null)}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">전체 카테고리</option>
        <option value="사양변경">사양변경</option>
        <option value="도면설계">도면설계</option>
        <option value="구매발주">구매발주</option>
        <option value="생산제작">생산제작</option>
        <option value="상하차">상하차</option>
        <option value="현장설치시공">현장설치시공</option>
        <option value="설치인증">설치인증</option>
      </select>

      {/* 필터 초기화 버튼 */}
      {filterCategory && (
        <button
          onClick={() => setFilterCategory(null)}
          className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
        >
          초기화
        </button>
      )}

      <span className="text-sm text-gray-500">
        총 {totalCount}개의 로그 ({startIndex}-{endIndex} 표시)
      </span>
    </div>
  </div>

  {/* 선택된 카테고리 배지 표시 */}
  {filterCategory && (
    <div className="mb-4">
      <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
        {filterCategory} 필터링 중
      </span>
    </div>
  )}
```

**로직 변경:**

1. `fetchLogs` 함수 수정 (라인 62):
```typescript
const fetchLogs = async () => {
  try {
    setLoading(true)
    const result = await logService.getProjectLogs(
      projectId,
      currentPage,
      pageSize,
      filterCategory || undefined  // 카테고리 필터 추가
    )
    setLogs(result.logs)
    setTotalCount(result.total)
  } catch (error) {
    console.error('로그 조회 실패:', error)
    toast.error('로그를 불러올 수 없습니다.')
  } finally {
    setLoading(false)
  }
}
```

2. `useEffect` 수정 (라인 51):
```typescript
useEffect(() => {
  fetchLogs()
}, [projectId, refreshTrigger, currentPage, filterCategory])  // filterCategory 추가
```

3. `useEffect` 추가 (필터 변경 시 페이지 리셋):
```typescript
// filterCategory가 변경되면 페이지를 1로 리셋
useEffect(() => {
  if (filterCategory !== null) {
    setCurrentPage(1)
  }
}, [filterCategory])
```

## 🏷️ 필터링 가능한 카테고리 (7개)
1. 사양변경
2. 도면설계
3. 구매발주
4. 생산제작
5. 상하차
6. 현장설치시공
7. 설치인증

## ✅ 구현 후 테스트 항목
1. ✅ 대시보드에서 카테고리 필터링 동작 확인
2. ✅ 프로젝트 상세에서 카테고리 필터링 동작 확인
3. ✅ 사용자 필터 + 카테고리 필터 병렬 사용 확인 (대시보드)
4. ✅ 필터 초기화 버튼 동작 확인
5. ✅ 페이지네이션과 필터링 연동 확인
6. ✅ 카테고리 변경 시 페이지가 1로 리셋되는지 확인
7. ✅ npm run build 성공 확인

## 🎨 UI/UX 특징
- **대시보드 (GlobalLogFeed)**: Ant Design Select 컴포넌트로 통일된 UI
- **프로젝트 로그 (LogList)**: Tailwind 스타일의 네이티브 select로 가벼운 UI
- **필터 상태 표시**: 선택된 필터를 Tag/배지로 명확하게 표시
- **초기화 기능**: 각 필터마다 독립적으로 또는 전체 초기화 가능
- **반응형**: 모바일에서도 사용 가능한 UI

## 📌 주의사항
- 카테고리 필터와 사용자 필터는 AND 조건으로 동작 (두 필터 모두 만족하는 로그만 표시)
- 필터 변경 시 페이지가 1로 리셋되어 사용자 경험 개선
- Supabase 쿼리에서 `.eq('category', category)` 조건만 추가하면 되므로 성능 영향 최소화
