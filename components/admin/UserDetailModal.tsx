'use client';

import React from 'react';
import { Modal, Descriptions, Tag, Badge, Space, Button } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Z_INDEX } from '@/lib/config/layout.constants';
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
  department?: string | null;
  position?: string | null;
  last_login?: string | null;
}

interface UserDetailModalProps {
  open: boolean;
  user: User | null;
  currentUserId?: string;
  onClose: () => void;
  onApprove?: (userId: string) => void;
  onReject?: (user: User) => void;
  onRevoke?: (userId: string) => void;
  onSetManager?: (userId: string) => void;
  onRevokeManager?: (userId: string) => void;
}

export default function UserDetailModal({
  open,
  user,
  currentUserId,
  onClose,
  onApprove,
  onReject,
  onRevoke,
  onSetManager,
  onRevokeManager
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
    // 자기 자신인 경우 액션 버튼 없음
    if (user.id === currentUserId) return [];

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
      zIndex={Z_INDEX.MODAL}
      footer={
        <div className='flex justify-between items-center'>
          {/* 좌측: 관리자 지정/해제 버튼 (자기 자신이 아니고 승인된 사용자만) */}
          <div>
            {user.id !== currentUserId && user.is_approved && (
              isManager(user.role) ? (
                <Button
                  onClick={() => onRevokeManager?.(user.id)}
                  danger
                  variant='outlined'
                >
                  관리자 해제
                </Button>
              ) : (
                <Button
                  onClick={() => onSetManager?.(user.id)}
                  variant='outlined'
                  color='blue'
                >
                  관리자 지정
                </Button>
              )
            )}
          </div>
          {/* 우측: 기존 액션 버튼들 + 닫기 */}
          <Space>
            {user.id !== currentUserId && getActionButtons()}
            <Button onClick={onClose}>닫기</Button>
          </Space>
        </div>
      }
    >
      <Descriptions
        column={1}
        bordered
        size="small"
        styles={{ label: { width: '120px', fontWeight: 'bold' } }}
      >
        <Descriptions.Item 
          label={<Space><UserOutlined />이름</Space>}
        >
          <Space>
            {user.name}
            {
              isManager(user.role) && (
                <Tag color={getRoleColor(user.role)}>{getRoleLabel(user.role)}</Tag>
              )
            }
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
        
        <Descriptions.Item
          label={<Space><CheckCircleOutlined />상태</Space>}
        >
          {getUserStatus()}
        </Descriptions.Item>
        
        <Descriptions.Item 
          label={<Space><CalendarOutlined />가입일</Space>}
        >
          {dayjs(user.created_at).format('YYYY년 MM월 DD일 HH:mm')}
        </Descriptions.Item>
        
        {user.approved_at && (
          <Descriptions.Item
            label={
              <Space>
                <ClockCircleOutlined />
                {user.is_approved ? '승인일' : '거절일'}
              </Space>
            }
          >
            {dayjs(user.approved_at).format('YYYY년 MM월 DD일 HH:mm')}
          </Descriptions.Item>
        )}
      </Descriptions>
    </Modal>
  );
}