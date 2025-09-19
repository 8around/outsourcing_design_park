/**
 * 카카오톡 알림톡 클라이언트 서비스
 * 클라이언트 사이드에서 Supabase Edge Function을 통해 카카오톡 발송
 */

import { createClient } from '@/lib/supabase/client'
import type { KakaoSendRequest, KakaoSendResponse } from '@/types/kakao'

class KakaoClientService {
  private supabase = createClient()

  /**
   * 프로젝트 승인 요청 카카오톡 알림톡 발송
   */
  async sendProjectApprovalRequest(
    approverPhone: string,
    requesterName: string,
    siteName: string,
    productName: string,
    category: string,
    memo: string
  ): Promise<KakaoSendResponse> {
    try {
      const requestData: KakaoSendRequest = {
        type: 'project-approval-request',
        data: {
          to: approverPhone,
          templateId: 'KA01TP250919055855314funPPq4lwbZ',
          variables: {
            site_name: siteName,
            product_name: productName,
            requester_name: requesterName,
            category: category,
            memo: memo,
            created_at: new Date().toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })
          }
        }
      }

      const { data, error } = await this.supabase.functions.invoke('send-kakao', {
        body: requestData
      })

      if (error) {
        console.error('카카오톡 Edge Function 호출 실패:', error)
        throw new Error(`카카오톡 발송 실패: ${error.message}`)
      }

      return data as KakaoSendResponse
    } catch (error) {
      console.error('카카오톡 발송 에러:', error)
      throw error
    }
  }

  /**
   * 전화번호 형식 검증
   */
  private isValidPhoneNumber(phone: string): boolean {
    // 한국 전화번호 형식 검증 (010-xxxx-xxxx, 01x-xxx-xxxx 등)
    const phoneRegex = /^(010|011|016|017|018|019)-?\d{3,4}-?\d{4}$/
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    return phoneRegex.test(cleanPhone) || cleanPhone.length >= 10
  }

  /**
   * 카카오톡 발송 가능 여부 확인
   */
  canSendKakao(phone?: string): boolean {
    return !!(phone && this.isValidPhoneNumber(phone))
  }
}

export const kakaoClientService = new KakaoClientService()