'use client';

import React from 'react';
import { Modal, Descriptions, Tag, Badge, Space, Button } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, CalendarOutlined } from '@ant-design/icons';
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
  department?: string | null;
  position?: string | null;
  last_login?: string | null;
}

interface UserDetailModalProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onApprove?: (userId: string) => void;
  onReject?: (user: User) => void;
  onRevoke?: (userId: string) => void;
}

export default function UserDetailModal({
  open,
  user,
  onClose,
  onApprove,
  onReject,
  onRevoke
}: UserDetailModalProps) {
  if (!user) return null;

  const getUserStatus = () => {
    if (user.is_approved) {
      return <Badge status="success" text="승인됨" />;
    } else if (user.approved_at) {
      return <Badge status="error" text="거절됨" />;
    } else {
      return <Badge status="processing" text="승인 대기" />;
    }
  };

  const getActionButtons = () => {
    const buttons = [];
    
    if (!user.is_approved && !user.approved_at && onApprove) {
      // 승인 대기 상태
      buttons.push(
        <Button 
          key="approve" 
          type="primary" 
          onClick={() => onApprove(user.id)}
        >
          승인
        </Button>
      );
      if (onReject) {
        buttons.push(
          <Button 
            key="reject" 
            danger 
            onClick={() => onReject(user)}
          >
            거절
          </Button>
        );
      }
    } else if (user.is_approved && onRevoke) {
      // 승인됨 상태
      buttons.push(
        <Button 
          key="revoke" 
          danger 
          onClick={() => onRevoke(user.id)}
        >
          승인 취소
        </Button>
      );
    } else if (!user.is_approved && user.approved_at && onApprove) {
      // 거절됨 상태
      buttons.push(
        <Button 
          key="reapprove" 
          type="primary" 
          onClick={() => onApprove(user.id)}
        >
          재승인
        </Button>
      );
    }

    return buttons;
  };

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          사용자 상세 정보
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="close" onClick={onClose}>
          닫기
        </Button>,
        ...getActionButtons()
      ]}
    >
      <Descriptions
        column={1}
        bordered
        size="small"
        labelStyle={{ width: '120px', fontWeight: 'bold' }}
      >
        <Descriptions.Item 
          label={<Space><UserOutlined />이름</Space>}
        >
          <Space>
            {user.name}
            {user.role === 'admin' && (
              <Tag color="red">관리자</Tag>
            )}
          </Space>
        </Descriptions.Item>
        
        <Descriptions.Item 
          label={<Space><MailOutlined />이메일</Space>}
        >
          {user.email}
        </Descriptions.Item>
        
        <Descriptions.Item 
          label={<Space><PhoneOutlined />전화번호</Space>}
        >
          {user.phone || '-'}
        </Descriptions.Item>
        
        <Descriptions.Item label="상태">
          {getUserStatus()}
        </Descriptions.Item>
        
        <Descriptions.Item 
          label={<Space><CalendarOutlined />가입일</Space>}
        >
          {dayjs(user.created_at).format('YYYY년 MM월 DD일 HH:mm')}
        </Descriptions.Item>
        
        {user.approved_at && (
          <Descriptions.Item label="승인/거절일">
            {dayjs(user.approved_at).format('YYYY년 MM월 DD일 HH:mm')}
          </Descriptions.Item>
        )}
        
        {user.last_login && (
          <Descriptions.Item label="최근 로그인">
            {dayjs(user.last_login).format('YYYY년 MM월 DD일 HH:mm')}
          </Descriptions.Item>
        )}
      </Descriptions>
    </Modal>
  );
}