'use client';

import { useState, useEffect } from 'react';
import { reportService } from '@/lib/services/report.service';
import { WeeklyReportConfig, DAYS_OF_WEEK } from '@/types/report';
import { Loading } from '@/components/common/ui/Loading';
import { Alert } from '@/components/common/ui/Alert';

export function ReportConfiguration() {
  const [config, setConfig] = useState<WeeklyReportConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    is_enabled: true,
    send_day_of_week: 1, // Monday
    send_hour: 9,
    send_minute: 0,
    recipient_emails: [''],
    report_title_template: '프로젝트 현장 관리 주간 리포트 - {date_range}'
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const data = await reportService.getReportConfig();
      
      if (data) {
        setConfig(data);
        setFormData({
          is_enabled: data.is_enabled,
          send_day_of_week: data.send_day_of_week,
          send_hour: data.send_hour,
          send_minute: data.send_minute,
          recipient_emails: data.recipient_emails.length > 0 ? data.recipient_emails : [''],
          report_title_template: data.report_title_template
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setMessage({ type: 'error', text: '설정을 불러오는데 실패했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate emails
    const validEmails = formData.recipient_emails.filter(email => email.trim() !== '');
    if (validEmails.length === 0) {
      setMessage({ type: 'error', text: '최소 한 개의 수신자 이메일을 입력해주세요.' });
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);
      
      await reportService.upsertReportConfig({
        ...formData,
        recipient_emails: validEmails
      });
      
      setMessage({ type: 'success', text: '설정이 저장되었습니다.' });
      await loadConfig(); // Reload config
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: '설정 저장에 실패했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...formData.recipient_emails];
    newEmails[index] = value;
    setFormData({ ...formData, recipient_emails: newEmails });
  };

  const addEmailField = () => {
    setFormData({
      ...formData,
      recipient_emails: [...formData.recipient_emails, '']
    });
  };

  const removeEmailField = (index: number) => {
    const newEmails = formData.recipient_emails.filter((_, i) => i !== index);
    setFormData({ ...formData, recipient_emails: newEmails });
  };

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setMessage({ type: 'error', text: '유효한 이메일 주소를 입력해주세요.' });
      return;
    }

    try {
      setIsTesting(true);
      setMessage(null);
      const result = await reportService.testEmailSending(testEmail);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setTestEmail('');
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setMessage({ type: 'error', text: '테스트 이메일 발송에 실패했습니다.' });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return <Loading size="large" />;
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert
          type={message.type}
          message={message.text}
          onClose={() => setMessage(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 활성화 여부 */}
        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.is_enabled}
              onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              주간 리포트 자동 발송 활성화
            </span>
          </label>
        </div>

        {/* 발송 시간 설정 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              발송 요일
            </label>
            <select
              value={formData.send_day_of_week}
              onChange={(e) => setFormData({ ...formData, send_day_of_week: Number(e.target.value) })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {DAYS_OF_WEEK.map(day => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              발송 시간 (시)
            </label>
            <select
              value={formData.send_hour}
              onChange={(e) => setFormData({ ...formData, send_hour: Number(e.target.value) })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}시
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              발송 시간 (분)
            </label>
            <select
              value={formData.send_minute}
              onChange={(e) => setFormData({ ...formData, send_minute: Number(e.target.value) })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {[0, 15, 30, 45].map(minute => (
                <option key={minute} value={minute}>
                  {String(minute).padStart(2, '0')}분
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 리포트 제목 템플릿 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            리포트 제목 템플릿
          </label>
          <input
            type="text"
            value={formData.report_title_template}
            onChange={(e) => setFormData({ ...formData, report_title_template: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="프로젝트 현장 관리 주간 리포트 - {date_range}"
          />
          <p className="mt-1 text-sm text-gray-500">
            {'{date_range}'} 변수는 실제 날짜 범위로 자동 치환됩니다.
          </p>
        </div>

        {/* 수신자 이메일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            수신자 이메일
          </label>
          <div className="space-y-2">
            {formData.recipient_emails.map((email, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="email@example.com"
                />
                {formData.recipient_emails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEmailField(index)}
                    className="px-3 py-2 text-sm text-red-600 hover:text-red-800"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addEmailField}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            + 수신자 추가
          </button>
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </form>

      {/* 테스트 이메일 발송 */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">테스트 이메일 발송</h3>
        <div className="flex items-center space-x-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="테스트 이메일 주소"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={isTesting}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? '발송 중...' : '테스트 발송'}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          현재 설정으로 테스트 리포트를 발송합니다.
        </p>
      </div>
    </div>
  );
}