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

export interface SolapiResponse {
  groupId: string
  messageId: string
  statusCode: string
  statusMessage: string
}

export interface KakaoSendRequest {
  type: 'project-approval-request'
  data: {
    to: string
    templateId: string
    variables: KakaoTemplateVariables
  }
}

export interface KakaoSendResponse {
  success: boolean
  data?: SolapiResponse
  error?: string
}