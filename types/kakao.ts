/**
 * 카카오톡 알림톡 관련 타입 정의
 */

export interface KakaoApprovalRequest {
  approverPhone: string
  siteName: string
  productName: string
  requesterName: string
  category: string
  memo: string
}

export interface KakaoMessage {
  to: string
  templateId: string
  variables: Record<string, string>
}

export interface KakaoTemplateVariables {
  site_name: string
  product_name: string
  requester_name: string
  category: string
  memo: string
  created_at: string
}

export interface KakaoRejectionVariables {
  site_name: string
  product_name: string
  rejector_name: string
  category: string
  response_memo: string
  rejected_at: string
}

export interface KakaoApprovalVariables {
  site_name: string
  product_name: string
  approver_name: string
  category: string
  approved_at: string
}

export interface SolapiResponse {
  groupId: string
  messageId: string
  statusCode: string
  statusMessage: string
}

export interface KakaoSendRequest {
  type: 'project-approval-request' | 'project-approval-rejection' | 'project-approval-approved'
  data: {
    to: string
    templateId: string
    variables: KakaoTemplateVariables | KakaoRejectionVariables | KakaoApprovalVariables
  }
}

export interface KakaoSendResponse {
  success: boolean
  data?: SolapiResponse
  error?: string
}