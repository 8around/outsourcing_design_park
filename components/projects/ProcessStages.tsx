'use client'

import { useState } from 'react'
import { 
  Card, Table, Tag, Button, Modal, Form, Select, DatePicker, 
  Input, message, Progress, Timeline, Typography, Space, Tooltip 
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  RightOutlined
} from '@ant-design/icons'
import { PROCESS_STAGES, type ProcessStage, type ProcessStatus, type ProcessStageName } from '@/types/project'
import { projectService } from '@/lib/services/projects.service'
import dayjs, { type Dayjs } from 'dayjs'

const { Title, Text } = Typography

interface StageFormValues {
  status: ProcessStatus
  delay_reason?: string
  start_date?: Dayjs
  end_date?: Dayjs
  actual_start_date?: Dayjs
  actual_end_date?: Dayjs
}
const { TextArea } = Input

interface ProcessStagesProps {
  projectId: string
  stages: ProcessStage[]
  currentStage: ProcessStageName
  onUpdate?: () => void
}

export default function ProcessStages({ 
  projectId, 
  stages, 
  currentStage,
  onUpdate 
}: ProcessStagesProps) {
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [selectedStage, setSelectedStage] = useState<ProcessStage | null>(null)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  // 상태별 아이콘과 색상
  const getStatusIcon = (status: ProcessStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'in_progress':
        return <SyncOutlined spin style={{ color: '#1890ff' }} />
      case 'delayed':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
      default:
        return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
    }
  }

  const getStatusColor = (status: ProcessStatus) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'in_progress':
        return 'processing'
      case 'delayed':
        return 'error'
      default:
        return 'default'
    }
  }

  // 공정 단계 편집 모달 열기
  const handleEditStage = (stage: ProcessStage) => {
    setSelectedStage(stage)
    form.setFieldsValue({
      status: stage.status,
      delay_reason: stage.delay_reason,
      start_date: stage.start_date ? dayjs(stage.start_date) : null,
      end_date: stage.end_date ? dayjs(stage.end_date) : null,
      actual_start_date: stage.actual_start_date ? dayjs(stage.actual_start_date) : null,
      actual_end_date: stage.actual_end_date ? dayjs(stage.actual_end_date) : null
    })
    setEditModalVisible(true)
  }

  // 공정 단계 업데이트
  const handleUpdateStage = async (values: StageFormValues) => {
    if (!selectedStage) return

    try {
      setLoading(true)
      
      const updateData = {
        status: values.status,
        delay_reason: values.status === 'delayed' ? values.delay_reason : undefined,
        start_date: values.start_date?.format('YYYY-MM-DD'),
        end_date: values.end_date?.format('YYYY-MM-DD'),
        actual_start_date: values.actual_start_date?.format('YYYY-MM-DD'),
        actual_end_date: values.actual_end_date?.format('YYYY-MM-DD')
      }

      await projectService.updateProcessStage(
        projectId,
        selectedStage.stage_name,
        updateData
      )

      message.success('공정 단계가 업데이트되었습니다.')
      setEditModalVisible(false)
      onUpdate?.()
    } catch (error) {
      message.error('공정 단계 업데이트에 실패했습니다.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 다음 단계로 진행
  const handleMoveToNextStage = async () => {
    Modal.confirm({
      title: '다음 단계로 진행',
      content: '현재 공정을 완료하고 다음 단계로 진행하시겠습니까?',
      onOk: async () => {
        try {
          await projectService.moveToNextStage(projectId)
          message.success('다음 단계로 진행되었습니다.')
          onUpdate?.()
        } catch (error) {
          message.error('다음 단계 진행에 실패했습니다.')
        }
      }
    })
  }

  // 전체 진행률 계산
  const calculateOverallProgress = () => {
    const completedCount = stages.filter(s => s.status === 'completed').length
    return Math.round((completedCount / 14) * 100)
  }

  const overallProgress = calculateOverallProgress()

  // 테이블 컬럼 정의
  const columns = [
    {
      title: '공정 단계',
      dataIndex: 'stage_name',
      key: 'stage_name',
      render: (name: ProcessStageName, record: ProcessStage) => (
        <Space>
          {getStatusIcon(record.status)}
          <Text strong={record.stage_name === currentStage}>
            {PROCESS_STAGES[name]}
          </Text>
          {record.stage_name === currentStage && (
            <Tag color="blue">현재</Tag>
          )}
        </Space>
      )
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: ProcessStatus) => (
        <Tag color={getStatusColor(status)}>
          {status === 'in_progress' ? '진행중' :
           status === 'completed' ? '완료' :
           status === 'delayed' ? '지연' : '대기'}
        </Tag>
      )
    },
    {
      title: '계획일정',
      key: 'planned_dates',
      render: (record: ProcessStage) => (
        <Space direction="vertical" size={0}>
          {record.start_date && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              시작: {new Date(record.start_date).toLocaleDateString()}
            </Text>
          )}
          {record.end_date && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              종료: {new Date(record.end_date).toLocaleDateString()}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: '실제일정',
      key: 'actual_dates',
      render: (record: ProcessStage) => (
        <Space direction="vertical" size={0}>
          {record.actual_start_date && (
            <Text style={{ fontSize: 12 }}>
              시작: {new Date(record.actual_start_date).toLocaleDateString()}
            </Text>
          )}
          {record.actual_end_date && (
            <Text style={{ fontSize: 12 }}>
              종료: {new Date(record.actual_end_date).toLocaleDateString()}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: '지연사유',
      dataIndex: 'delay_reason',
      key: 'delay_reason',
      render: (reason: string) => reason ? (
        <Tooltip title={reason}>
          <Text type="danger" style={{ fontSize: 12 }}>
            {reason.length > 20 ? `${reason.substring(0, 20)}...` : reason}
          </Text>
        </Tooltip>
      ) : '-'
    },
    {
      title: '작업',
      key: 'action',
      render: (record: ProcessStage) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEditStage(record)}
        >
          편집
        </Button>
      )
    }
  ]

  return (
    <>
      <Card title="공정 단계 관리" className="mb-6">
        {/* 전체 진행률 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <Title level={5}>전체 진행률</Title>
            <Text strong>{overallProgress}%</Text>
          </div>
          <Progress 
            percent={overallProgress} 
            status={overallProgress === 100 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </div>

        {/* 타임라인 뷰 */}
        <div className="mb-6">
          <Title level={5} className="mb-4">진행 상황</Title>
          <Timeline mode="left">
            {stages.map((stage) => (
              <Timeline.Item
                key={stage.id}
                color={
                  stage.status === 'completed' ? 'green' :
                  stage.status === 'in_progress' ? 'blue' :
                  stage.status === 'delayed' ? 'red' : 'gray'
                }
                dot={getStatusIcon(stage.status)}
              >
                <div className="flex justify-between">
                  <Text strong={stage.stage_name === currentStage}>
                    {PROCESS_STAGES[stage.stage_name]}
                  </Text>
                  {stage.actual_end_date && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(stage.actual_end_date).toLocaleDateString()}
                    </Text>
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </div>

        {/* 공정 테이블 */}
        <Table
          dataSource={stages}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
        />

        {/* 다음 단계 진행 버튼 */}
        <div className="mt-4 flex justify-end">
          <Button
            type="primary"
            icon={<RightOutlined />}
            onClick={handleMoveToNextStage}
            disabled={stages.every(s => s.status === 'completed')}
          >
            다음 단계로 진행
          </Button>
        </div>
      </Card>

      {/* 편집 모달 */}
      <Modal
        title={`공정 편집: ${selectedStage ? PROCESS_STAGES[selectedStage.stage_name] : ''}`}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateStage}
        >
          <Form.Item
            name="status"
            label="상태"
            rules={[{ required: true, message: '상태를 선택하세요' }]}
          >
            <Select>
              <Select.Option value="waiting">대기</Select.Option>
              <Select.Option value="in_progress">진행중</Select.Option>
              <Select.Option value="completed">완료</Select.Option>
              <Select.Option value="delayed">지연</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.status !== curr.status}
          >
            {({ getFieldValue }) => 
              getFieldValue('status') === 'delayed' && (
                <Form.Item
                  name="delay_reason"
                  label="지연 사유"
                  rules={[{ required: true, message: '지연 사유를 입력하세요' }]}
                >
                  <TextArea rows={3} placeholder="지연 사유를 입력하세요" />
                </Form.Item>
              )
            }
          </Form.Item>

          <Space size="large" style={{ width: '100%' }}>
            <Form.Item
              name="start_date"
              label="계획 시작일"
              style={{ width: 260 }}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item
              name="end_date"
              label="계획 종료일"
              style={{ width: 260 }}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Space>

          <Space size="large" style={{ width: '100%' }}>
            <Form.Item
              name="actual_start_date"
              label="실제 시작일"
              style={{ width: 260 }}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item
              name="actual_end_date"
              label="실제 종료일"
              style={{ width: 260 }}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Space>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setEditModalVisible(false)}>
              취소
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              저장
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  )
}