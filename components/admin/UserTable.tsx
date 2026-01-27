'use client';

import React, { useState } from 'react';
import { Table, Badge, Space, Tooltip, Tag } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import UserDetailModal from './UserDetailModal';
import dayjs from 'dayjs';
import { getRoleColor, getRoleLabel, isManager } from '@/lib/utils/permissions';
import { UserRole } from '@/types/user';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  created_at: string;
  is_approved: boolean;
  approved_at?: string | null;
  approved_by?: string | null;
  role: UserRole;
}

interface UserTableProps {
  users: User[];
  loading: boolean;
  currentUserId?: string;
  pageSize: number;
  onPageSizeChange: (current: number, size: number) => void;
  onApprove: (userId: string, onSuccess?: () => void) => void;
  onReject: (user: User) => void;
  onRevoke: (userId: string, onSuccess?: () => void) => void;
  onSetManager?: (userId: string, onSuccess?: () => void) => void;
  onRevokeManager?: (userId: string, onSuccess?: () => void) => void;
}

export default function UserTable({
  users,
  loading,
  currentUserId,
  pageSize,
  onPageSizeChange,
  onApprove,
  onReject,
  onRevoke,
  onSetManager,
  onRevokeManager
}: UserTableProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setDetailModalVisible(false);
    setSelectedUser(null);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setDetailModalVisible(true);
  };
  
  const getColumns = () => {
    const baseColumns = [
      {
        title: '이름',
        dataIndex: 'name',
        key: 'name',
        width: 120,
        render: (name: string, record: User) => (
          <Space>
            <UserOutlined />
            <span
              className="whitespace-nowrap font-medium cursor-pointer text-blue-600 hover:text-blue-800"
              onClick={() => handleViewUser(record)}
            >
              {name}
            </span>
          </Space>
        ),
      },
      {
        title: '권한',
        dataIndex: 'role',
        key: 'role',
        width: 100,
        render: (role: UserRole) => (
          <Tag color={getRoleColor(role)}>{getRoleLabel(role)}</Tag>
        ),
      },
      {
        title: '이메일',
        dataIndex: 'email',
        key: 'email',
        width: 180,
        ellipsis: true,
        render: (email: string) => (
          <Tooltip title={email}>
            <span className='cursor-default'>{email}</span>
          </Tooltip>
        ),
      },
      {
        title: '전화번호',
        dataIndex: 'phone',
        key: 'phone',
        render: (phone: string) => phone || '-',
      },
      {
        title: '가입일',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 150,
        render: (date: string) => (
          <span className='whitespace-nowrap'>
            {dayjs(date).format('YYYY-MM-DD HH:mm')}
          </span>
        ),
        sorter: (a: User, b: User) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf(),
      },
      {
        title: '상태',
        key: 'status',
        render: (_: unknown, record: User) => {
          if (record.is_approved) {
            return <Badge status="success" text="승인됨" />;
          } else if (record.approved_at) {
            return <Badge status="error" text="거절됨" />;
          } else {
            return <Badge status="processing" text="승인 대기" />;
          }
        },
      },
    ];

    return baseColumns;
  };

  return (
    <>
      <Table
        columns={getColumns()}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} / 총 ${total}개`,
          pageSizeOptions: ['10', '20', '50'],
          onChange: (page, newPageSize) => {
            // pageSize가 변경되면 1페이지로, 아니면 선택한 페이지로
            if (newPageSize !== pageSize) {
              setCurrentPage(1);
              onPageSizeChange(1, newPageSize);
            } else {
              setCurrentPage(page);
            }
          },
        }}
        scroll={{ x: 800 }}
        size="middle"
      />

      <UserDetailModal
        open={detailModalVisible}
        user={selectedUser}
        currentUserId={currentUserId}
        onClose={handleCloseModal}
        onApprove={(userId) => onApprove(userId, handleCloseModal)}
        onReject={onReject}
        onRevoke={(userId) => onRevoke(userId, handleCloseModal)}
        onSetManager={onSetManager ? (userId) => onSetManager(userId, handleCloseModal) : undefined}
        onRevokeManager={onRevokeManager ? (userId) => onRevokeManager(userId, handleCloseModal) : undefined}
      />
    </>
  );
}