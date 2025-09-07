'use client';

import React from 'react';
import { Card, Statistic, Row, Col } from 'antd';
import { 
  UserOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined 
} from '@ant-design/icons';

interface UserStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface UserStatsCardsProps {
  stats: UserStats;
  loading?: boolean;
}

export default function UserStatsCards({ stats, loading = false }: UserStatsCardsProps) {
  return (
    <Row gutter={16}>
      <Col xs={24} sm={6}>
        <Card loading={loading}>
          <Statistic 
            title="전체 사용자"
            value={stats.total}
            prefix={<UserOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card loading={loading}>
          <Statistic 
            title="승인 대기"
            value={stats.pending}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card loading={loading}>
          <Statistic 
            title="승인됨"
            value={stats.approved}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card loading={loading}>
          <Statistic 
            title="거절됨"
            value={stats.rejected}
            prefix={<CloseCircleOutlined />}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Card>
      </Col>
    </Row>
  );
}