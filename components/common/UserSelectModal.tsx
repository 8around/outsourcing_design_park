'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { Modal, Input, List, Avatar, Button, Typography, Tag, Pagination, Empty, Skeleton, message, Radio } from 'antd'
import { SearchOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/user'
import { Z_INDEX } from '@/lib/config/layout.constants'
import { getRoleLabel, getRoleColor } from '@/lib/utils/permissions'

const { Text } = Typography

interface UserSelectModalProps {
  visible: boolean
  onClose: () => void
  onSelect: (user: User) => void
  selectedUserId?: string | null
}

export default function UserSelectModal({ 
  visible, 
  onClose, 
  onSelect,
  selectedUserId 
}: UserSelectModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedUser, setSelectedUser] = useState<string | null>(selectedUserId || null)
  const pageSize = 10
  const supabase = createClient()

  // 사용자 목록 로드
  const loadUsers = async (page: number = 1, search?: string) => {
    setLoading(true)
    try {
      // 검색어가 있을 경우와 없을 경우 구분
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('is_approved', true) // 승인된 사용자만
        .order('name', { ascending: true })

      // 검색 조건 추가
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
      }

      // 페이지네이션
      const start = (page - 1) * pageSize
      const end = start + pageSize - 1
      query = query.range(start, end)

      const { data, error, count } = await query

      if (error) {
        console.error('사용자 목록 로드 실패:', error)
        message.error('사용자 목록을 불러오는데 실패했습니다.')
        return
      }

      setUsers(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error)
      message.error('사용자 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // visible 또는 debouncedSearchTerm 변경 시 상태 초기화 및 API 호출
  useEffect(() => {
    if (visible) {
      setSelectedUser(selectedUserId || null)
      setCurrentPage(1)
      loadUsers(1, debouncedSearchTerm)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, debouncedSearchTerm])

  // 페이지 변경
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadUsers(page, debouncedSearchTerm)
  }

  // 사용자 선택
  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId)
  }

  // 확인 버튼 클릭
  const handleConfirm = () => {
    if (!selectedUser) {
      message.warning('사용자를 선택해주세요.')
      return
    }

    const user = users.find(u => u.id === selectedUser)
    if (user) {
      onSelect(user)
      onClose()
    }
  }


  return (
    <Modal
      title="사용자 선택"
      open={visible}
      onCancel={onClose}
      width={600}
      zIndex={Z_INDEX.MODAL}
      footer={[
        <Button key="cancel" onClick={onClose}>
          취소
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
        >
          확인
        </Button>
      ]}
    >
      <div className="space-y-4">
        {/* 검색 입력 */}
        <Input
          placeholder="이름 또는 이메일로 검색"
          prefix={<SearchOutlined />}
          onChange={(e) => setSearchTerm(e.target.value)}
          value={searchTerm}
          allowClear
        />

        {/* 사용자 목록 */}
        <div className="user-list-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {loading ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : users.length > 0 ? (
            <Radio.Group 
              value={selectedUser} 
              onChange={(e) => handleUserSelect(e.target.value)}
              className="w-full"
            >
              <List
                dataSource={users}
                renderItem={(user) => (
                  <List.Item
                    key={user.id}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedUser === user.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleUserSelect(user.id)}
                  >
                    <Radio value={user.id} className="w-full">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <Avatar icon={<UserOutlined />} />
                          <div>
                            <div className="flex items-center gap-2">
                              <Text strong>{user.name}</Text>
                              <Tag color={getRoleColor(user.role)}>
                                {getRoleLabel(user.role)}
                              </Tag>
                            </div>
                            <Text type="secondary" className="text-sm">
                              {user.email}
                            </Text>
                          </div>
                        </div>
                        {user.is_approved && (
                          <CheckCircleOutlined className="text-green-500" />
                        )}
                      </div>
                    </Radio>
                  </List.Item>
                )}
              />
            </Radio.Group>
          ) : (
            <Empty description="사용자가 없습니다." />
          )}
        </div>

        {/* 페이지네이션 */}
        {totalCount > pageSize && (
          <div className="flex justify-center pt-4 border-t">
            <Pagination
              current={currentPage}
              total={totalCount}
              pageSize={pageSize}
              onChange={handlePageChange}
              showSizeChanger={false}
              showTotal={(total, range) => `${range[0]}-${range[1]} / 총 ${total}명`}
              size="small"
            />
          </div>
        )}
      </div>
    </Modal>
  )
}