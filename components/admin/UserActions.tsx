'use client';

import React from 'react';
import { Button, Space, Dropdown, MenuProps } from 'antd';
import { 
  ExportOutlined, 
  ReloadOutlined, 
  MoreOutlined,
  FileExcelOutlined,
  FilePdfOutlined
} from '@ant-design/icons';

interface UserActionsProps {
  loading?: boolean;
  selectedCount?: number;
  onRefresh: () => void;
  onExport: (format?: 'csv' | 'excel' | 'pdf') => void;
  onBulkApprove?: () => void;
  onBulkReject?: () => void;
}

export default function UserActions({
  loading = false,
  selectedCount = 0,
  onRefresh,
  onExport,
  onBulkApprove,
  onBulkReject
}: UserActionsProps) {
  
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'csv',
      icon: <FileExcelOutlined />,
      label: 'CSV 내보내기',
      onClick: () => onExport('csv')
    },
    {
      key: 'excel',
      icon: <FileExcelOutlined />,
      label: 'Excel 내보내기',
      onClick: () => onExport('excel')
    },
    {
      key: 'pdf',
      icon: <FilePdfOutlined />,
      label: 'PDF 내보내기',
      onClick: () => onExport('pdf')
    }
  ];

  const bulkMenuItems: MenuProps['items'] = [];
  
  if (onBulkApprove && selectedCount > 0) {
    bulkMenuItems.push({
      key: 'bulk-approve',
      label: `선택된 ${selectedCount}명 일괄 승인`,
      onClick: onBulkApprove
    });
  }
  
  if (onBulkReject && selectedCount > 0) {
    bulkMenuItems.push({
      key: 'bulk-reject',
      label: `선택된 ${selectedCount}명 일괄 거절`,
      onClick: onBulkReject,
      danger: true
    });
  }

  return (
    <Space>
      {selectedCount > 0 && bulkMenuItems.length > 0 && (
        <Dropdown menu={{ items: bulkMenuItems }} placement="bottomRight">
          <Button>
            선택된 항목 ({selectedCount}) <MoreOutlined />
          </Button>
        </Dropdown>
      )}
      
      <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
        <Button icon={<ExportOutlined />}>
          내보내기
        </Button>
      </Dropdown>
      
      <Button 
        icon={<ReloadOutlined />} 
        onClick={onRefresh}
        loading={loading}
      >
        새로고침
      </Button>
    </Space>
  );
}