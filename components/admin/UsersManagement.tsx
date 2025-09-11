'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Tabs, 
  Button, 
  Space, 
  Input, 
  Modal, 
  message, 
  Divider,
  Typography,
  Card,
  Badge
} from 'antd';
import { 
  ReloadOutlined, 
  SearchOutlined, 
  ExportOutlined
} from '@ant-design/icons';
import { approvalService } from '@/lib/services/approval.service';
import { useAuth } from '@/lib/hooks/useAuth';
import UserStatsCards from './UserStatsCards';
import UserTable from './UserTable';

const { Search } = Input;
const { confirm } = Modal;
const { TextArea } = Input;

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  created_at: string;
  is_approved: boolean;
  approved_at?: string | null;
  approved_by?: string | null;
  role: 'user' | 'admin';
}

interface UserStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

type UserStatus = 'pending' | 'approved' | 'rejected';

export default function UsersManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<UserStatus>('pending');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<UserStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // 데이터 로딩
  const loadUsers = useCallback(async (status: UserStatus) => {
    setLoading(true);
    try {
      console.log(`Loading users with status: ${status}`);
      const data = await approvalService.getUsersByStatus(status);
      console.log(`Received ${data.length} users for status ${status}:`, data);
      
      // Filter out the current admin user to avoid showing themselves in the list
      const filteredData = data.filter(u => u.id !== user?.id);
      console.log(`After filtering out current user, ${filteredData.length} users remaining`);
      
      setUsers(filteredData);
    } catch (error) {
      message.error('사용자 데이터를 불러오는데 실패했습니다.');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 통계 데이터 로딩
  const loadStats = useCallback(async () => {
    try {
      const [pendingUsers, approvedUsers, rejectedUsers] = await Promise.all([
        approvalService.getUsersByStatus('pending'),
        approvalService.getUsersByStatus('approved'),
        approvalService.getUsersByStatus('rejected')
      ]);

      // Filter out the current admin user from stats
      const filteredPending = pendingUsers.filter(u => u.id !== user?.id);
      const filteredApproved = approvedUsers.filter(u => u.id !== user?.id);
      const filteredRejected = rejectedUsers.filter(u => u.id !== user?.id);

      setStats({
        total: filteredPending.length + filteredApproved.length + filteredRejected.length,
        pending: filteredPending.length,
        approved: filteredApproved.length,
        rejected: filteredRejected.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [user?.id]);

  // 사용자 승인
  const handleApprove = async (userId: string) => {
    if (!user?.id) return;

    confirm({
      title: '사용자 승인',
      content: '해당 사용자를 승인하시겠습니까?',
      onOk: async () => {
        try {
          const success = await approvalService.approveUser(userId, user.id);
          if (success) {
            message.success('사용자가 성공적으로 승인되었습니다.');
            loadUsers(activeTab);
            loadStats();
          } else {
            message.error('승인 처리 중 오류가 발생했습니다.');
          }
        } catch (error) {
          message.error('승인 처리 중 오류가 발생했습니다.');
        }
      }
    });
  };

  // 사용자 거절
  const handleReject = async (user: User) => {
    setSelectedUser(user);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!selectedUser || !user?.id) return;

    try {
      console.log('Attempting to reject user:', {
        selectedUserId: selectedUser.id,
        adminId: user.id,
        reason: rejectReason.trim() || undefined
      });

      const success = await approvalService.rejectUser(
        selectedUser.id, 
        user.id, 
        rejectReason.trim() || undefined
      );
      
      if (success) {
        message.success('사용자가 성공적으로 거절되었습니다.');
        setRejectModalVisible(false);
        setSelectedUser(null);
        setRejectReason('');
        loadUsers(activeTab);
        loadStats();
      } else {
        message.error('거절 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error in confirmReject:', error);
      const errorMessage = error instanceof Error ? error.message : '거절 처리 중 오류가 발생했습니다.';
      message.error(`거절 처리 실패: ${errorMessage}`);
    }
  };

  // 승인 취소 (재거절)
  const handleRevoke = async (userId: string) => {
    if (!user?.id) return;

    confirm({
      title: '승인 취소',
      content: '해당 사용자의 승인을 취소하시겠습니까?',
      onOk: async () => {
        try {
          const success = await approvalService.rejectUser(userId, user.id, '관리자에 의한 승인 취소');
          if (success) {
            message.success('승인이 취소되었습니다.');
            loadUsers(activeTab);
            loadStats();
          } else {
            message.error('승인 취소 중 오류가 발생했습니다.');
          }
        } catch (error) {
          message.error('승인 취소 중 오류가 발생했습니다.');
        }
      }
    });
  };

  // 필터링된 사용자 목록
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.phone && user.phone.includes(searchTerm))
  );

  // 탭 변경 시
  const handleTabChange = (key: string) => {
    const status = key as UserStatus;
    setActiveTab(status);
    loadUsers(status);
  };

  // 새로고침
  const handleRefresh = () => {
    loadUsers(activeTab);
    loadStats();
  };

  // 데이터 내보내기
  const handleExport = () => {
    // CSV 내보내기 로직
    const csvData = filteredUsers.map(user => ({
      이름: user.name,
      이메일: user.email,
      전화번호: user.phone || '',
      가입일: user.created_at,
      상태: user.is_approved ? '승인됨' : (user.approved_at ? '거절됨' : '승인 대기'),
      역할: user.role === 'admin' ? '관리자' : '사용자'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('사용자 목록이 CSV 파일로 내보내기 되었습니다.');
  };

  // 컴포넌트 마운트 시
  useEffect(() => {
    loadUsers(activeTab);
    loadStats();
  }, [loadUsers, loadStats, activeTab]);

  return (
    <div className="space-y-8">
      {/* 통계 카드 */}
      <UserStatsCards stats={stats} loading={loading && users.length === 0} />

      {/* 컨트롤 패널 */}
      <div className="bg-white rounded-soft-xl border border-gray-200 shadow-soft p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search Section */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search
                placeholder="이름, 이메일, 전화번호로 검색"
                allowClear
                size="large"
                onSearch={setSearchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                prefix={<SearchOutlined className="text-gray-400" />}
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <Space size="middle">
            <Button 
              icon={<ExportOutlined />} 
              onClick={handleExport}
              disabled={filteredUsers.length === 0}
              className="h-10 px-6 border-gray-200 hover:border-primary-300 hover:text-primary-600 rounded-soft font-medium transition-smooth"
            >
              내보내기
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={loading}
              type="primary"
              className="h-10 px-6 bg-primary-600 hover:bg-primary-500 border-primary-600 hover:border-primary-500 rounded-soft font-medium shadow-soft hover:shadow-soft-md transition-smooth"
            >
              새로고침
            </Button>
          </Space>
        </div>
      </div>

      {/* 사용자 테이블 섹션 */}
      <Card className="shadow-soft-lg border-gray-200 rounded-soft-xl overflow-hidden">
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          size="large"
          className="user-management-tabs"
          items={[
            {
              key: 'pending',
              label: (
                <div className="flex items-center gap-3 px-2 py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
                    <span className="font-semibold">승인 대기</span>
                  </div>
                </div>
              ),
              children: (
                <UserTable
                  users={filteredUsers}
                  loading={loading}
                  status="pending"
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onRevoke={handleRevoke}
                />
              ),
            },
            {
              key: 'approved',
              label: (
                <div className="flex items-center gap-3 px-2 py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                    <span className="font-semibold">승인됨</span>
                  </div>
                  {stats.approved > 0 && (
                    <Badge 
                      count={stats.approved}
                      className="!bg-success-100 !text-success-700 !border-success-300"
                      style={{ 
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        border: '1px solid #bbf7d0'
                      }}
                    />
                  )}
                </div>
              ),
              children: (
                <UserTable
                  users={filteredUsers}
                  loading={loading}
                  status="approved"
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onRevoke={handleRevoke}
                />
              ),
            },
            {
              key: 'rejected',
              label: (
                <div className="flex items-center gap-3 px-2 py-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">거절됨</span>
                  </div>
                  {stats.rejected > 0 && (
                    <Badge 
                      count={stats.rejected}
                      className="!bg-error-100 !text-error-700 !border-error-300"
                      style={{ 
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fecaca'
                      }}
                    />
                  )}
                </div>
              ),
              children: (
                <UserTable
                  users={filteredUsers}
                  loading={loading}
                  status="rejected"
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onRevoke={handleRevoke}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 거절 모달 */}
      <Modal
        title={
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 bg-error-100 rounded-soft-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">사용자 거절</h3>
              <p className="text-sm text-gray-500 mt-1">사용자의 가입 요청을 거절합니다</p>
            </div>
          </div>
        }
        open={rejectModalVisible}
        onOk={confirmReject}
        onCancel={() => {
          setRejectModalVisible(false);
          setSelectedUser(null);
          setRejectReason('');
        }}
        okText="거절하기"
        cancelText="취소"
        okType="danger"
        className="reject-user-modal"
        okButtonProps={{
          className: "bg-error-600 hover:bg-error-700 border-error-600 hover:border-error-700 rounded-soft font-medium h-10 px-6"
        }}
        cancelButtonProps={{
          className: "border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-800 rounded-soft font-medium h-10 px-6"
        }}
      >
        <div className="space-y-6 pt-4">
          {/* Warning Section */}
          <div className="flex items-start gap-3 p-4 bg-error-50 rounded-soft-lg border border-error-200">
            <svg className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-error-800 font-medium">
                <strong className="text-error-900">{selectedUser?.name}</strong>님의 가입을 거절하시겠습니까?
              </p>
              <p className="text-error-700 text-sm mt-1">
                이 작업은 되돌릴 수 없으며, 해당 사용자는 다시 가입 신청을 해야 합니다.
              </p>
            </div>
          </div>
          
          {/* Reason Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              거절 사유 (선택사항)
            </label>
            <TextArea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 상세히 입력해주세요..."
              rows={4}
              maxLength={500}
              showCount
              className="resize-none rounded-soft border-gray-200 hover:border-primary-300 focus:border-primary-500 transition-smooth"
            />
            <p className="text-xs text-gray-500 mt-2">
              거절 사유는 사용자에게 전달되며, 향후 재신청 시 참고자료로 활용됩니다.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}