/**
 * Excel 내보내기 유틸리티
 * 프로젝트 정보와 히스토리 로그를 Excel 파일로 내보내는 기능
 */

import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import type { Project } from '@/types/project';
import type { HistoryLogWithAttachments } from '@/types/log';

type ExcelRichTextValue = ExcelJS.CellRichTextValue;
type ExcelRichTextRun = ExcelJS.RichText;

// 프로젝트 정보 컬럼 정의 (개선된 순서)
const PROJECT_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: '현장명', key: 'site_name', width: 25 },
  { header: '외주업체명', key: 'outsourcing_company', width: 20 },
  { header: '제품명', key: 'product_name', width: 20 },
  { header: '수량', key: 'product_quantity', width: 10 },
  { header: '영업담당자', key: 'sales_manager_info', width: 30 },
  { header: '현장담당자', key: 'site_manager_info', width: 30 },
  { header: '발주일', key: 'order_date', width: 15 },
  { header: '준공 예정일', key: 'expected_completion_date', width: 15 },
  { header: '설치 요청일', key: 'installation_request_date', width: 15 },
  { header: '비고', key: 'notes', width: 40 },
  { header: '긴급 여부', key: 'is_urgent', width: 10 },
  { header: '히스토리 로그', key: 'history_logs', width: 80 },
  { header: '생성자', key: 'creator_name', width: 15 },
  { header: '생성일', key: 'created_at', width: 15 },
  { header: '수정일', key: 'updated_at', width: 15 },
  { header: '링크', key: 'project_link', width: 10 }
];

/**
 * 날짜 포맷팅 (yyyy-MM-dd) - dayjs 사용
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = dayjs(dateString);
  return date.isValid() ? date.format('YYYY-MM-DD') : '-';
}

/**
 * 날짜 및 시간 포맷팅 (yyyy-MM-dd HH:mm) - dayjs 사용
 */
function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-';
  const date = dayjs(dateString);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm') : '-';
}

/**
 * 첨부파일 URL 생성
 */
function getAttachmentUrl(filePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/log-attachments/${filePath}`;
}

/**
 * 히스토리 로그를 셀 내용으로 변환 (줄바꿈으로 합치기, 첨부파일 링크 포함)
 */
export function formatLogsForCell(
  logs: HistoryLogWithAttachments[]
): ExcelRichTextValue | string {
  if (!logs || logs.length === 0) return '-';

  const richText: ExcelRichTextRun[] = [];

  logs.forEach((log, logIdx) => {
    const date = formatDateTime(log.created_at);
    const category = log.category;
    const author = log.author_name;
    const content = log.content;

    // 날짜 bold 처리
    richText.push({ text: `[${date}]`, font: { bold: true } });
    richText.push({ text: ` ${category} - ${author}\n${content}` });

    // 첨부파일이 있으면 링크 추가
    if (log.attachments && log.attachments.length > 0) {
      const attachmentLinks = log.attachments
        .map(att => `[${att.file_name}](${getAttachmentUrl(att.file_path)})`)
        .join('\n');
      richText.push({ text: `\n📎 ${attachmentLinks}` });
    }

    if (logIdx < logs.length - 1) {
      richText.push({ text: '\n\n' });
    }
  });

  return { richText };
}

/**
 * 프로젝트 데이터를 Excel 행 데이터로 변환
 */
export function transformProjectToExcelRow(project: Project): Record<string, unknown> {
  // 담당자 정보 포맷팅
  const salesManagerInfo = project.sales_manager_user
    ? `${project.sales_manager_user.name} (${project.sales_manager_user.email})`
    : '-';
  const siteManagerInfo = project.site_manager_user
    ? `${project.site_manager_user.name} (${project.site_manager_user.email})`
    : '-';

  return {
    site_name: project.site_name,
    outsourcing_company: project.outsourcing_company,
    product_name: project.product_name,
    product_quantity: project.product_quantity,
    creator_name: project.creator?.name || '-',
    created_at: formatDate(project.created_at),
    updated_at: formatDate(project.updated_at),
    sales_manager_info: salesManagerInfo,
    site_manager_info: siteManagerInfo,
    order_date: formatDate(project.order_date),
    expected_completion_date: formatDate(project.expected_completion_date),
    installation_request_date: formatDate(project.installation_request_date),
    notes: project.notes || '-',
    is_urgent: project.is_urgent ? 'Y' : 'N'
  };
}

/**
 * 헤더 스타일 적용
 */
function applyHeaderStyle(sheet: ExcelJS.Worksheet): void {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // 헤더 테두리
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
}

/**
 * 데이터 행 스타일 적용 (고정 높이 포함)
 */
function applyDataRowStyle(sheet: ExcelJS.Worksheet): void {
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = {
        vertical: 'top',
        horizontal: 'left',
        wrapText: true
      };
      row.height = 60;
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
  });
}

/**
 * 프로젝트 상세 페이지 URL 생성
 */
function getProjectDetailUrl(projectId: string): string {
  const baseUrl = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://pm.dpaworld.net';

  return `${baseUrl}/projects/${projectId}`;
}

/**
 * 프로젝트 Excel 워크북 생성
 */
export async function generateProjectExcel(
  projects: Project[],
  logsByProject: Map<string, HistoryLogWithAttachments[]>
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Project Admin System';
  workbook.created = new Date();

  // 단일 시트: 프로젝트 정보 + 히스토리 로그
  const sheet = workbook.addWorksheet('프로젝트 정보');
  sheet.columns = PROJECT_COLUMNS;

  // 프로젝트 데이터 행 추가
  projects.forEach((project) => {
    const logs = logsByProject.get(project.id) || [];
    const logsText = formatLogsForCell(logs);

    const rowData = {
      ...transformProjectToExcelRow(project),
      history_logs: logsText,
      project_link: '링크'
    };

    const row = sheet.addRow(rowData);

    // 프로젝트 상세 페이지 바로가기 링크 추가
    const projectUrl = getProjectDetailUrl(project.id);
    const linkCell = row.getCell('project_link');
    linkCell.value = { text: '바로가기', hyperlink: projectUrl }
    linkCell.font = { color: { argb: 'FF0066CC' }, underline: true };
  });

  // 스타일 적용
  applyHeaderStyle(sheet);
  applyDataRowStyle(sheet);

  // Buffer로 변환
  const buffer = await workbook.xlsx.writeBuffer();

  return buffer as ArrayBuffer;
}

/**
 * 파일명 생성 (통일된 형식)
 */
export function generateExportFileName(): string {
  const timestamp = dayjs().format('YYYYMMDDHHmmss');
  return `projects_export_${timestamp}.xlsx`;
}

/**
 * Excel 파일 다운로드 (브라우저)
 */
export function downloadExcel(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();

  // 정리
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
