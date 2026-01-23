'use client'

import { Row, Col, Button, Typography } from 'antd'
import {
  ProjectOutlined,
  CalendarOutlined,
  CloudServerOutlined,
} from '@ant-design/icons'
import GlobalLogFeed from '@/components/logs/GlobalLogFeed'
import PendingApprovals from '@/components/dashboard/PendingApprovals'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

const { Title, Text } = Typography

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()

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
            >
              새 프로젝트
            </Button>
            <Button
              icon={<CalendarOutlined />}
              onClick={() => router.push('/calendar')}
            >
              일정 보기
            </Button>
            <Button
              icon={<CloudServerOutlined />}
              onClick={() => {
                // NAS 서버 고정 IP 주소
                const nasUrl = 'http://192.168.2.63'
                window.open(nasUrl, '_blank')
              }}
              title="NAS 서버 접속"
            >
              NAS 서버
            </Button>
          </div>
        </div>
      </div>


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

        /* 반응형 스타일 */
        @media (max-width: 768px) {
          .dashboard-container {
            padding: 0;
          }
        }
      `}</style>
    </div>
  )
}
