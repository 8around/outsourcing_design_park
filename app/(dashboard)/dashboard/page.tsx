'use client'

import { Row, Col, Button, Typography } from 'antd'
import {
  ProjectOutlined,
  CalendarOutlined,
  CloudServerOutlined,
} from '@ant-design/icons'
import GlobalLogFeed from '@/components/logs/GlobalLogFeed'
import PendingApprovals from '@/components/dashboard/PendingApprovals'
import InProgressProjectsGrid from '@/components/dashboard/InProgressProjectsGrid'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

const { Title, Text } = Typography

export default function DashboardPage() {
  const router = useRouter()
  const { userData } = useAuth()

  return (
    <div className="dashboard-container">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex flex-row items-center justify-between gap-4">
          <div>
            <Title level={2} className="mb-2 flex items-center gap-3">
              안녕하세요, {userData?.name || '사용자'}님! 👋
            </Title>
            <Text type="secondary" className="text-base">
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


      {/* 진행중인 프로젝트 그리드 */}
      <div className="mb-6">
        <InProgressProjectsGrid />
      </div>

      {/* 글로벌 활동 로그와 승인 대기 목록 */}
      <Row gutter={[16, 16]} className="mb-6">
        {/* 글로벌 활동 로그 */}
        <Col span={12}>
          <GlobalLogFeed
            limit={5}
            showRefresh={true}
            autoRefresh={false}
          />
        </Col>

        {/* 승인 대기 목록 */}
        <Col span={12}>
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

      `}</style>
    </div>
  )
}
