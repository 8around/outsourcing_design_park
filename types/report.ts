export interface WeeklyReportConfig {
  id: string;
  is_enabled: boolean;
  send_day_of_week: number; // 0-6 (Sunday-Saturday)
  send_hour: number; // 0-23
  send_minute: number; // 0-59
  recipient_emails: string[];
  report_title_template: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReportHistory {
  id: string;
  report_period_start: string;
  report_period_end: string;
  file_name: string;
  file_url: string;
  recipient_emails: string[];
  send_status: 'pending' | 'sent' | 'failed';
  send_attempts: number;
  last_attempt_at: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export const DAYS_OF_WEEK = [
  { value: 0, label: '일요일' },
  { value: 1, label: '월요일' },
  { value: 2, label: '화요일' },
  { value: 3, label: '수요일' },
  { value: 4, label: '목요일' },
  { value: 5, label: '금요일' },
  { value: 6, label: '토요일' }
];

export const REPORT_STATUS = {
  pending: { label: '대기중', color: 'yellow' },
  sent: { label: '발송완료', color: 'green' },
  failed: { label: '발송실패', color: 'red' }
};