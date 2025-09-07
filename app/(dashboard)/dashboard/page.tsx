'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Button, Typography, Skeleton } from 'antd'
import {
  ProjectOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  CloudServerOutlined,
} from '@ant-design/icons'
import GlobalLogFeed from '@/components/logs/GlobalLogFeed'
import PendingApprovals from '@/components/dashboard/PendingApprovals'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

const { Title, Text } = Typography

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  pendingApprovals: number
  totalProgress: number
  monthlyProgress: number
}


export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingApprovals: 0,
    totalProgress: 0,
    monthlyProgress: 0,
  })

  // 대시보드 데이터 로드
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // 실제 API 호출 대신 임시 데이터
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setStats({
          totalProjects: 24,
          activeProjects: 18,
          completedProjects: 6,
          pendingApprovals: 3,
          totalProgress: 68,
          monthlyProgress: 12,
        })

        setLoading(false)
      } catch (error) {
        console.error('대시보드 데이터 로드 실패:', error)
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])


  return (
    <div className="dashboard-container">
      {/* 웰컴 섹션 */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Title level={2} className="mb-2 text-xl sm:text-2xl">
              안녕하세요, {user?.email?.split('@')[0] || '사용자'}님! 👋
            </Title>
            <Text type="secondary" className="text-base sm:text-lg">
              오늘도 프로젝트 관리를 효율적으로 진행해보세요.
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              type="primary" 
              icon={<ProjectOutlined />}
              onClick={() => router.push('/projects/new')}
              size="middle"
            >
              새 프로젝트
            </Button>
            <Button 
              icon={<CalendarOutlined />}
              onClick={() => router.push('/projects/calendar')}
              size="middle"
            >
              일정 보기
            </Button>
            <Button
              icon={<CloudServerOutlined />}
              onClick={() => window.open('http://nas.server.url', '_blank')}
              size="middle"
              title="NAS 서버 접속"
            >
              NAS 서버
            </Button>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={12} md={6}>
          <Card className="stats-card" size="small">
            <Statistic
              title="전체 프로젝트"
              value={loading ? 0 : stats.totalProjects}
              prefix={<ProjectOutlined />}
              loading={loading}
              valueStyle={{ color: 'var(--primary-color)', fontSize: '1.5rem' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card className="stats-card" size="small">
            <Statistic
              title="진행 중"
              value={loading ? 0 : stats.activeProjects}
              prefix={<ClockCircleOutlined />}
              loading={loading}
              valueStyle={{ color: '#52c41a', fontSize: '1.5rem' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card className="stats-card" size="small">
            <Statistic
              title="완료"
              value={loading ? 0 : stats.completedProjects}
              prefix={<CheckCircleOutlined />}
              loading={loading}
              valueStyle={{ color: '#1890ff', fontSize: '1.5rem' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card className="stats-card" size="small">
            <Statistic
              title="승인 대기"
              value={loading ? 0 : stats.pendingApprovals}
              prefix={<ExclamationCircleOutlined />}
              loading={loading}
              valueStyle={{ color: '#faad14', fontSize: '1.5rem' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 글로벌 활동 로그와 승인 대기 목록 */}
      <Row gutter={[16, 16]} className="mb-6">
        {/* 글로벌 활동 로그 */}
        <Col xs={24} lg={12}>
          <GlobalLogFeed 
            limit={5} 
            showRefresh={true}
            autoRefresh={false}
          />
        </Col>

        {/* 승인 대기 목록 */}
        <Col xs={24} lg={12}>
          <PendingApprovals 
            limit={5}
            showActions={true}
          />
        </Col>
      </Row>


      <style jsx>{`
        .dashboard-container {
          padding: 0;
          max-width: 100%;
          overflow-x: hidden;
        }

        .stats-card :global(.ant-card-body) {
          padding: 16px;
        }

        .stats-card :global(.ant-statistic) {
          text-align: center;
        }

        .stats-card :global(.ant-statistic-title) {
          font-size: 0.875rem;
        }

        /* 반응형 스타일 */
        @media (max-width: 1200px) {
          .stats-card :global(.ant-statistic-content-value) {
            font-size: 1.25rem !important;
          }
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 0;
          }

          .stats-card :global(.ant-card-body) {
            padding: 12px;
          }

          .stats-card :global(.ant-statistic-title) {
            font-size: 0.75rem;
          }

          .stats-card :global(.ant-statistic-content-value) {
            font-size: 1.125rem !important;
          }
        }

        @media (max-width: 576px) {
          .stats-card :global(.ant-card-body) {
            padding: 10px;
          }

          .stats-card :global(.ant-statistic-content-prefix) {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  )
}