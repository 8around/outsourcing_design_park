'use client';

import { useState, useEffect } from 'react';
import { reportService } from '@/lib/services/report.service';
import { WeeklyReportHistory, REPORT_STATUS } from '@/types/report';
import { Loading } from '@/components/common/ui/Loading';
import { Alert } from '@/components/common/ui/Alert';

export function ReportHistoryList() {
  const [history, setHistory] = useState<WeeklyReportHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Statistics
  const [statistics, setStatistics] = useState({
    totalSent: 0,
    successfulSent: 0,
    failedSent: 0,
    pendingSent: 0,
    lastSentDate: null as string | null
  });

  useEffect(() => {
    loadHistory();
    loadStatistics();
  }, [currentPage, statusFilter, startDate, endDate]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const result = await reportService.getReportHistory({
        page: currentPage,
        pageSize,
        status: statusFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });

      setHistory(result.data);
      setTotalCount(result.total);
      setTotalPages(Math.ceil(result.total / pageSize));
    } catch (error) {
      console.error('Error loading history:', error);
      setMessage({ type: 'error', text: '발송 내역을 불러오는데 실패했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await reportService.getReportStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleRetry = async (historyId: string) => {
    if (!confirm('이 리포트를 다시 발송하시겠습니까?')) {
      return;
    }

    try {
      await reportService.retryReport(historyId);
      setMessage({ type: 'success', text: '리포트 재발송이 요청되었습니다.' });
      await loadHistory();
      await loadStatistics();
    } catch (error) {
      console.error('Error retrying report:', error);
      setMessage({ type: 'error', text: '리포트 재발송에 실패했습니다.' });
    }
  };

  // const handleDelete = async (historyId: string) => {
  //   if (!confirm('이 발송 내역을 삭제하시겠습니까?')) {
  //     return;
  //   }

  //   try {
  //     await reportService.deleteReportHistory(historyId);
  //     setMessage({ type: 'success', text: '발송 내역이 삭제되었습니다.' });
  //     await loadHistory();
  //     await loadStatistics();
  //   } catch (error) {
  //     console.error('Error deleting history:', error);
  //     setMessage({ type: 'error', text: '발송 내역 삭제에 실패했습니다.' });
  //   }
  // };

  const handleDownload = (fileUrl: string, fileName: string) => {
    // Open the file URL in a new tab for download
    window.open(fileUrl, '_blank');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getStatusBadge = (status: WeeklyReportHistory['send_status']) => {
    const config = REPORT_STATUS[status];
    const colors = {
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[config.color as keyof typeof colors]}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {message && (
        <Alert
          type={message.type}
          message={message.text}
          onClose={() => setMessage(null)}
        />
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500">전체 발송</div>
          <div className="text-2xl font-bold text-gray-900">{statistics.totalSent}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600">성공</div>
          <div className="text-2xl font-bold text-green-900">{statistics.successfulSent}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-red-600">실패</div>
          <div className="text-2xl font-bold text-red-900">{statistics.failedSent}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-sm text-yellow-600">대기중</div>
          <div className="text-2xl font-bold text-yellow-900">{statistics.pendingSent}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">전체</option>
            <option value="sent">발송완료</option>
            <option value="failed">발송실패</option>
            <option value="pending">대기중</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setStatusFilter('');
              setStartDate('');
              setEndDate('');
              setCurrentPage(1);
            }}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            필터 초기화
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                기간
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                파일명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                수신자
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                발송일시
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center">
                  <Loading size="small" />
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  발송 내역이 없습니다.
                </td>
              </tr>
            ) : (
              history.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.report_period_start} ~ {item.report_period_end}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.file_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate" title={item.recipient_emails.join(', ')}>
                      {item.recipient_emails.length}명
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(item.send_status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(item.sent_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      {item.file_url && (
                        <button
                          onClick={() => handleDownload(item.file_url, item.file_name)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          다운로드
                        </button>
                      )}
                      {item.send_status === 'failed' && (
                        <button
                          onClick={() => handleRetry(item.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          재발송
                        </button>
                      )}
                      {/* <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button> */}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            총 {totalCount}개 중 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)}개 표시
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              이전
            </button>
            <span className="px-3 py-1">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}