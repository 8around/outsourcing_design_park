"use client";

import { useRef, useMemo, useCallback, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  GridReadyEvent,
  IDatasource,
  IGetRowsParams,
  RowClickedEvent,
  RowClassRules,
} from "ag-grid-community";
import { themeAlpine } from "ag-grid-community";
import { Card, Tag, Tooltip, Button, Typography, Badge } from "antd";
import { ReloadOutlined, FireOutlined } from "@ant-design/icons";
import { format } from "date-fns";
import { registerAgGridModules } from "@/lib/agGridSetup";
import { projectService } from "@/lib/services/projects.service";
import { PROCESS_STAGES, ProcessStageName } from "@/types/project";
import type { ProjectGridItem, LatestLogInfo } from "@/types/dashboard";
import { LogCategory } from "@/types/log";

// AG Grid 모듈 등록
registerAgGridModules();

// AG Grid Alpine 테마 커스터마이징 (홀수 행 배경색)
const gridTheme = themeAlpine.withParams({
  oddRowBackgroundColor: "rgba(0, 0, 0, 0.03)",
});

const { Title } = Typography;

// 카테고리 색상 설정 (GlobalLogFeed와 동일)
const categoryConfig: Record<LogCategory, { color: string; label: string }> = {
  사양변경: { color: "purple", label: "사양변경" },
  도면설계: { color: "blue", label: "도면설계" },
  구매발주: { color: "green", label: "구매발주" },
  생산제작: { color: "gold", label: "생산제작" },
  상하차: { color: "orange", label: "상하차" },
  현장설치시공: { color: "red", label: "현장설치시공" },
  설치인증: { color: "purple", label: "설치인증" },
  설비: { color: "volcano", label: "설비" },
  기타: { color: "default", label: "기타" },
  승인요청: { color: "magenta", label: "확인요청" },
  승인처리: { color: "cyan", label: "확인처리" },
};

// 공정단계 색상 설정
const stageColorMap: Record<ProcessStageName, string> = {
  contract: "blue",
  design: "cyan",
  order: "green",
  incoming: "lime",
  welding: "gold",
  plating: "orange",
  painting: "volcano",
  grc_frp: "red",
  panel: "magenta",
  fabrication: "purple",
  shipping: "geekblue",
  installation: "blue",
  certification: "green",
  closing: "cyan",
  completion: "success",
};

// ============================================
// 셀 렌더러 컴포넌트 (컬럼 순서대로 정렬)
// ============================================

// 1. 현장명 셀 렌더러
const SiteNameCell = ({ data }: { data?: ProjectGridItem }) => {
  if (!data) return null;

  const displayText = `${data.site_name} - ${data.product_name}`;

  return (
    <div className="flex items-center gap-2 min-w-0">
      {data.is_urgent && (
        <Tag color="red" className="flex-shrink-0 !m-0" icon={<FireOutlined />}>
          긴급
        </Tag>
      )}
      <Tooltip title={displayText} placement="topLeft">
        <span className="truncate">{displayText}</span>
      </Tooltip>
    </div>
  );
};

// 2. 공정단계 셀 렌더러
const ProcessStageCell = ({ stage }: { stage?: ProcessStageName }) => {
  if (!stage) return null;

  return <Tag color={stageColorMap[stage]}>{PROCESS_STAGES[stage]}</Tag>;
};

// 3. 히스토리 로그 셀 렌더러
const LatestLogCell = ({ log }: { log?: LatestLogInfo }) => {
  if (!log) return <span className="text-gray-400">-</span>;

  const config = categoryConfig[log.category] || categoryConfig["기타"];

  // 확인요청/응답 타입
  if (
    log.log_type === "approval_request" ||
    log.log_type === "approval_response"
  ) {
    const tooltipText = log.content;
    return (
      <Tooltip title={tooltipText} placement="topLeft">
        <div className="flex items-center gap-1 overflow-hidden min-w-0">
          <Tag color={config.color} className="flex-shrink-0 !m-0">
            {config.label}
          </Tag>
          <span className="truncate min-w-0">
            <span className="font-bold">{log.author_name}</span>
            <span> → </span>
            <span className="font-bold">{log.target_user_name || ""}</span>
            <span> {log.content}</span>
          </span>
        </div>
      </Tooltip>
    );
  }

  // manual 타입
  return (
    <Tooltip title={log.content} placement="topLeft">
      <div className="flex items-center gap-1 overflow-hidden min-w-0">
        <Tag color={config.color} className="flex-shrink-0 !m-0">
          {config.label}
        </Tag>
        <span className="truncate min-w-0">
          <span className="font-bold">{log.author_name}</span>
          <span> {log.content}</span>
        </span>
      </div>
    </Tooltip>
  );
};

// 4. 담당자명 셀 렌더러 (영업담당자, 현장담당자 공용)
const TruncatedCell = ({ value }: { value: string | undefined | null }) => {
  if (!value) return <span className="text-gray-400">-</span>;

  return <span className="truncate block">{value}</span>;
};

// 5. 설치일정 셀 렌더러
const InstallationScheduleCell = ({
  schedule,
}: {
  schedule?: { start_date?: string; end_date?: string };
}) => {
  if (!schedule || (!schedule.start_date && !schedule.end_date)) {
    return <span className="text-gray-400">-</span>;
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "yyyy-MM-dd");
    } catch {
      return "-";
    }
  };

  const displayText = `${formatDate(schedule.start_date)} ~ ${formatDate(schedule.end_date)}`;

  return <span className="truncate">{displayText}</span>;
};

export default function InProgressProjectsGrid() {
  const gridRef = useRef<AgGridReact<ProjectGridItem>>(null);
  const [total, setTotal] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // 컬럼 정의
  const columnDefs = useMemo<ColDef<ProjectGridItem>[]>(
    () => [
      {
        headerName: "현장명",
        field: "site_name",
        flex: 2,
        cellRenderer: (params: { data?: ProjectGridItem }) => (
          <SiteNameCell data={params.data} />
        ),
      },
      {
        headerName: "공정단계",
        field: "current_process_stage",
        width: 100,
        cellRenderer: (params: { value?: ProcessStageName }) => (
          <ProcessStageCell stage={params.value} />
        ),
      },
      {
        headerName: "히스토리 로그",
        field: "latest_log",
        flex: 1.5,
        cellRenderer: (params: { value?: LatestLogInfo }) => (
          <LatestLogCell log={params.value} />
        ),
      },
      {
        headerName: "영업담당자",
        field: "sales_manager_name",
        width: 95,
        cellRenderer: (params: { value?: string }) => (
          <TruncatedCell value={params.value} />
        ),
      },
      {
        headerName: "현장담당자",
        field: "site_manager_name",
        width: 95,
        cellRenderer: (params: { value?: string }) => (
          <TruncatedCell value={params.value} />
        ),
      },
      {
        headerName: "설치일정",
        field: "installation_schedule",
        width: 205,
        cellRenderer: (params: {
          value?: { start_date?: string; end_date?: string };
        }) => <InstallationScheduleCell schedule={params.value} />,
      },
    ],
    [],
  );

  // 기본 컬럼 설정
  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: false,
      filter: false,
    }),
    [],
  );

  // Infinite Row Model DataSource
  const onGridReady = useCallback((params: GridReadyEvent) => {
    const dataSource: IDatasource = {
      rowCount: undefined,
      getRows: async (rowParams: IGetRowsParams) => {
        const page = Math.floor(rowParams.startRow / 20) + 1;
        const limit = 20;

        try {
          const response = await projectService.getInProgressProjects(
            page,
            limit,
          );
          setTotal(response.total);
          setIsInitialLoading(false);

          const lastRow = response.hasMore
            ? -1
            : rowParams.startRow + response.items.length;
          rowParams.successCallback(response.items, lastRow);
        } catch (error) {
          console.error("데이터 로드 실패:", error);
          rowParams.failCallback();
          setIsInitialLoading(false);
        }
      },
    };

    params.api.setGridOption("datasource", dataSource);
  }, []);

  // 행 클릭 핸들러
  const onRowClicked = useCallback(
    (event: RowClickedEvent<ProjectGridItem>) => {
      if (event.data) {
        window.open(`/projects/${event.data.id}`, "_blank");
      }
    },
    [],
  );

  // 새로고침
  const refresh = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;

    // 캐시 초기화 (데이터 다시 로드)
    api.purgeInfiniteCache();
    // 스크롤 최상단으로 이동
    api.ensureIndexVisible(0, "top");
  }, []);

  // 행 기본 스타일 (커서 포인터)
  const rowStyle = useMemo(() => ({ cursor: "pointer" }), []);

  // 긴급 프로젝트 행 스타일 규칙
  const rowClassRules = useMemo<RowClassRules<ProjectGridItem>>(
    () => ({
      "urgent-row": (params) => params.data?.is_urgent === true,
    }),
    [],
  );

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Title level={4} className="!m-0">
            진행중인 프로젝트
          </Title>
          <Badge count={total} showZero color="blue" />
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={refresh}
            disabled={isInitialLoading}
          />
        </div>
      }
      styles={{ body: { padding: 0 } }}
    >
      <div className="h-[400px]">
        <AgGridReact<ProjectGridItem>
          ref={gridRef}
          theme={gridTheme}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowModelType="infinite"
          cacheBlockSize={20}
          cacheOverflowSize={2}
          maxConcurrentDatasourceRequests={1}
          infiniteInitialRowCount={20}
          maxBlocksInCache={10}
          onGridReady={onGridReady}
          onRowClicked={onRowClicked}
          rowStyle={rowStyle}
          rowClassRules={rowClassRules}
          rowHeight={48}
          headerHeight={48}
          suppressCellFocus={true}
          domLayout="normal"
          loading={isInitialLoading}
        />
      </div>
    </Card>
  );
}
