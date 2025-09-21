'use client';

import React, { useState } from 'react';
import { Table, Button, Badge, Space, Tooltip, Tag } from 'antd';
import { 
  CheckOutlined, 
  CloseOutlined, 
  UserOutlined,
  UndoOutlined,
  EyeOutlined
} from '@ant-design/icons';
import UserDetailModal from './UserDetailModal';
import dayjs from 'dayjs';

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

type UserStatus = 'pending' | 'approved' | 'rejected';

interface UserTableProps {
  users: User[];
  loading: boolean;
  status: UserStatus;
  onApprove: (userId: string) => void;
  onReject: (user: User) => void;
  onRevoke: (userId: string) => void;
}

export default function UserTable({ 
  users, 
  loading, 
  status, 
  onApprove, 
  onReject, 
  onRevoke 
}: UserTableProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setDetailModalVisible(true);
  };
  
  const getColumns = (status: UserStatus) => {
    const baseColumns = [
      {
        title: '이름',
        dataIndex: 'name',
        key: 'name',
        render: (name: string, record: User) => (
          <Space>
            <UserOutlined />
            <span 
              className="font-medium cursor-pointer text-blue-600 hover:text-blue-800"
              onClick={() => handleViewUser(record)}
            >
              {name}
            </span>
            {record.role === 'admin' && (
              <Tag color="red">관리자</Tag>
            )}
          </Space>
        ),
      },
      {
        title: '이메일',
        dataIndex: 'email',
        key: 'email',
        ellipsis: true,
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
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
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
        filters: [
          { text: '승인 대기', value: 'pending' },
          { text: '승인됨', value: 'approved' },
          { text: '거절됨', value: 'rejected' },
        ],
        onFilter: (value: React.Key | boolean, record: User): boolean => {
          if (value === 'pending') return !record.is_approved && !record.approved_at;
          if (value === 'approved') return !!record.is_approved;
          if (value === 'rejected') return !record.is_approved && !!record.approved_at;
          return true;
        },
      },
    ];

    // 상태별 액션 컬럼 추가
    const actionColumn = {
      title: '작업',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: User) => {
        const actions = [];
        
        // 상세보기 버튼 (모든 상태에서 표시)
        actions.push(
          <Tooltip title="상세보기" key="view">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewUser(record)}
            />
          </Tooltip>
        );

        if (status === 'pending') {
          actions.push(
            <Tooltip title="승인" key="approve">
              <Button 
                type="primary" 
                size="small" 
                icon={<CheckOutlined />}
                onClick={() => onApprove(record.id)}
              >
                승인
              </Button>
            </Tooltip>
          );
          actions.push(
            <Tooltip title="거절" key="reject">
              <Button 
                danger 
                size="small" 
                icon={<CloseOutlined />}
                onClick={() => onReject(record)}
              >
                거절
              </Button>
            </Tooltip>
          );
        } else if (status === 'approved') {
          actions.push(
            <Tooltip title="승인 취소" key="revoke">
              <Button 
                danger 
                size="small" 
                icon={<UndoOutlined />}
                onClick={() => onRevoke(record.id)}
              >
                승인 취소
              </Button>
            </Tooltip>
          );
        } else if (status === 'rejected') {
          actions.push(
            <Tooltip title="재승인" key="reapprove">
              <Button 
                type="primary" 
                size="small" 
                icon={<CheckOutlined />}
                onClick={() => onApprove(record.id)}
              >
                재승인
              </Button>
            </Tooltip>
          );
        }

        return <Space size="small">{actions}</Space>;
      },
    };

    return [...baseColumns, actionColumn];
  };

  return (
    <>
      <Table
        columns={getColumns(status)}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          total: users.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} / 총 ${total}개`,
          pageSizeOptions: ['10', '20', '50'],
        }}
        scroll={{ x: 800 }}
        size="middle"
      />
      
      <UserDetailModal
        open={detailModalVisible}
        user={selectedUser}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedUser(null);
        }}
        onApprove={onApprove}
        onReject={onReject}
        onRevoke={onRevoke}
      />
    </>
  );
}