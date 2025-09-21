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

      // 타임아웃 설정 (30초)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('카카오톡 발송 타임아웃 (30초)')), 30000)
      )

      const sendPromise = this.supabase.functions.invoke('send-kakao', {
        body: requestData
      })

      const result = await Promise.race([sendPromise, timeoutPromise])
      const { data, error } = result as { data: KakaoSendResponse | null; error: Error | null }

      if (error) {
        console.error('카카오톡 Edge Function 호출 실패:', error)
        throw new Error(`카카오톡 발송 실패: ${error.message}`)
      }

      // 응답 데이터 검증
      if (!data || !data.success) {
        throw new Error('카카오톡 발송 응답이 올바르지 않습니다.')
      }

      return data as KakaoSendResponse
    } catch (error) {
      console.error('카카오톡 발송 에러:', {
        error: error instanceof Error ? error.message : error,
        phone: approverPhone,
        requester: requesterName,
        site: siteName,
        timestamp: new Date().toISOString()
      })
      throw error
    }
  }

  /**
   * 프로젝트 승인 반려 카카오톡 알림톡 발송
   */
  async sendProjectApprovalRejection(
    requesterPhone: string,
    approverName: string,
    siteName: string,
    productName: string,
    category: string,
    rejectionReason: string
  ): Promise<KakaoSendResponse> {
    try {
      const requestData: KakaoSendRequest = {
        type: 'project-approval-rejection',
        data: {
          to: requesterPhone,
          templateId: 'KA01TP250919062830851iHHImWx687U',
          variables: {
            site_name: siteName,
            product_name: productName,
            rejector_name: approverName,
            category: category,
            response_memo: rejectionReason,
            rejected_at: new Date().toLocaleString('ko-KR', {
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

      // 타임아웃 설정 (30초)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('카카오톡 발송 타임아웃 (30초)')), 30000)
      )

      const sendPromise = this.supabase.functions.invoke('send-kakao', {
        body: requestData
      })

      const result = await Promise.race([sendPromise, timeoutPromise])
      const { data, error } = result as { data: KakaoSendResponse | null; error: Error | null }

      if (error) {
        console.error('카카오톡 Edge Function 호출 실패:', error)
        throw new Error(`카카오톡 발송 실패: ${error.message}`)
      }

      // 응답 데이터 검증
      if (!data || !data.success) {
        throw new Error('카카오톡 발송 응답이 올바르지 않습니다.')
      }

      return data as KakaoSendResponse
    } catch (error) {
      console.error('승인 반려 카카오톡 발송 에러:', {
        error: error instanceof Error ? error.message : error,
        phone: requesterPhone,
        approver: approverName,
        site: siteName,
        product: productName,
        reason: rejectionReason,
        timestamp: new Date().toISOString()
      })
      throw error
    }
  }

  /**
   * 프로젝트 승인 완료 카카오톡 알림톡 발송
   */
  async sendProjectApprovalApproved(
    requesterPhone: string,
    approverName: string,
    siteName: string,
    productName: string,
    category: string
  ): Promise<KakaoSendResponse> {
    try {
      const requestData: KakaoSendRequest = {
        type: 'project-approval-approved',
        data: {
          to: requesterPhone,
          templateId: 'KA01TP250919063658041BaQdwc5qwmQ',
          variables: {
            site_name: siteName,
            product_name: productName,
            approver_name: approverName,
            category: category,
            approved_at: new Date().toLocaleString('ko-KR', {
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

      // 타임아웃 설정 (30초)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('카카오톡 발송 타임아웃 (30초)')), 30000)
      )

      const sendPromise = this.supabase.functions.invoke('send-kakao', {
        body: requestData
      })

      const result = await Promise.race([sendPromise, timeoutPromise])
      const { data, error } = result as { data: KakaoSendResponse | null; error: Error | null }

      if (error) {
        console.error('카카오톡 Edge Function 호출 실패:', error)
        throw new Error(`카카오톡 발송 실패: ${error.message}`)
      }

      // 응답 데이터 검증
      if (!data || !data.success) {
        throw new Error('카카오톡 발송 응답이 올바르지 않습니다.')
      }

      return data as KakaoSendResponse
    } catch (error) {
      console.error('승인 완료 카카오톡 발송 에러:', {
        error: error instanceof Error ? error.message : error,
        phone: requesterPhone,
        approver: approverName,
        site: siteName,
        product: productName,
        category: category,
        timestamp: new Date().toISOString()
      })
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