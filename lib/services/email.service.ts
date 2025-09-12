// 이 파일은 서버 사이드에서만 실행되어야 함
let resend: any = null;

// 서버 사이드에서만 Resend 초기화
if (typeof window === 'undefined') {
  const { Resend } = require('resend');
  resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key_for_dev');
}

export interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export class EmailService {
  private fromEmail = 'noreply@designparl.co.kr';

  /**
   * 사용자 승인 알림 이메일 발송
   */
  async sendApprovalEmail(
    email: string,
    userName: string,
    status: 'approved' | 'rejected',
    reason?: string
  ): Promise<boolean> {
    try {
      // 클라이언트 사이드에서는 실행하지 않음
      if (typeof window !== 'undefined' || !resend) {
        console.log('Email service is not available on client side');
        return false;
      }

      const subject = status === 'approved' 
        ? '회원가입 승인 완료' 
        : '회원가입 승인 거절';

      const html = status === 'approved'
        ? this.getApprovalTemplate(userName)
        : this.getRejectionTemplate(userName, reason);

      const { error } = await resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject,
        html,
      });

      if (error) {
        console.error('Error sending approval email:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }

  /**
   * 프로젝트 승인 요청 이메일 발송
   */
  async sendProjectApprovalRequest(
    approverEmail: string,
    requesterName: string,
    projectName: string,
    projectId: string,
    memo: string,
    category: string
  ): Promise<boolean> {
    try {
      // 클라이언트 사이드에서는 실행하지 않음
      if (typeof window !== 'undefined' || !resend) {
        console.log('Email service is not available on client side');
        return false;
      }

      const { error } = await resend.emails.send({
        from: this.fromEmail,
        to: approverEmail,
        subject: `[승인 요청] ${projectName} - ${category}`,
        html: this.getProjectApprovalRequestTemplate(
          requesterName,
          projectName,
          projectId,
          memo,
          category
        ),
      });

      if (error) {
        console.error('Error sending project approval request email:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }

  /**
   * 프로젝트 승인/반려 결과 이메일 발송
   */
  async sendProjectApprovalResult(
    requesterEmail: string,
    approverName: string,
    projectName: string,
    projectId: string,
    status: 'approved' | 'rejected',
    memo?: string
  ): Promise<boolean> {
    try {
      // 클라이언트 사이드에서는 실행하지 않음
      if (typeof window !== 'undefined' || !resend) {
        console.log('Email service is not available on client side');
        return false;
      }

      const subject = status === 'approved' 
        ? `[승인 완료] ${projectName}` 
        : `[반려] ${projectName}`;

      const { error } = await resend.emails.send({
        from: this.fromEmail,
        to: requesterEmail,
        subject,
        html: this.getProjectApprovalResultTemplate(
          approverName,
          projectName,
          projectId,
          status,
          memo
        ),
      });

      if (error) {
        console.error('Error sending project approval result email:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }

  /**
   * 관리자에게 신규 가입 알림 이메일 발송
   */
  async sendNewSignupNotification(
    adminEmails: string[],
    newUserName: string,
    newUserEmail: string
  ): Promise<boolean> {
    try {
      // 클라이언트 사이드에서는 실행하지 않음
      if (typeof window !== 'undefined' || !resend) {
        console.log('Email service is not available on client side');
        return false;
      }

      const { error } = await resend.emails.send({
        from: this.fromEmail,
        to: adminEmails,
        subject: '신규 사용자 가입 - 승인 필요',
        html: this.getNewSignupTemplate(newUserName, newUserEmail),
      });

      if (error) {
        console.error('Error sending signup notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }

  /**
   * 승인 완료 이메일 템플릿
   */
  private getApprovalTemplate(userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f4f4f4; padding: 20px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>회원가입 승인 완료</h1>
          </div>
          <div class="content">
            <h2>안녕하세요, ${userName}님!</h2>
            <p>귀하의 회원가입이 <strong>승인</strong>되었습니다.</p>
            <p>이제 시스템에 로그인하여 모든 기능을 이용하실 수 있습니다.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" class="button">로그인하기</a>
            <p style="margin-top: 20px;">문의사항이 있으시면 관리자에게 연락해주세요.</p>
          </div>
          <div class="footer">
            <p>© 2024 프로젝트 현장 관리 시스템</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 승인 거절 이메일 템플릿
   */
  private getRejectionTemplate(userName: string, reason?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f4f4f4; padding: 20px; border-radius: 0 0 5px 5px; }
          .reason-box { background: white; padding: 15px; border-left: 4px solid #f44336; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>회원가입 승인 거절</h1>
          </div>
          <div class="content">
            <h2>안녕하세요, ${userName}님</h2>
            <p>죄송합니다. 귀하의 회원가입이 <strong>거절</strong>되었습니다.</p>
            ${reason ? `
              <div class="reason-box">
                <strong>거절 사유:</strong>
                <p>${reason}</p>
              </div>
            ` : ''}
            <p>자세한 사항은 관리자에게 문의해주시기 바랍니다.</p>
            <p style="margin-top: 20px;">감사합니다.</p>
          </div>
          <div class="footer">
            <p>© 2024 프로젝트 현장 관리 시스템</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 프로젝트 승인 요청 이메일 템플릿
   */
  private getProjectApprovalRequestTemplate(
    requesterName: string,
    projectName: string,
    projectId: string,
    memo: string,
    category: string
  ): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f4f4f4; padding: 20px; border-radius: 0 0 5px 5px; }
          .project-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .memo-box { background: #FFF3E0; padding: 15px; border-left: 4px solid #FF9800; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>프로젝트 승인 요청</h1>
          </div>
          <div class="content">
            <h2>승인이 필요한 항목이 있습니다</h2>
            <div class="project-info">
              <p><strong>요청자:</strong> ${requesterName}</p>
              <p><strong>프로젝트명:</strong> ${projectName}</p>
              <p><strong>카테고리:</strong> ${category}</p>
              <p><strong>요청 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
            </div>
            <div class="memo-box">
              <strong>요청 메모:</strong>
              <p>${memo || '메모 없음'}</p>
            </div>
            <p>아래 버튼을 클릭하여 승인 대기 목록을 확인하고 처리해주세요.</p>
            <a href="${appUrl}/" class="button">승인 대기 목록 확인</a>
            <p style="margin-top: 20px; font-size: 14px; color: #666;">
              이 이메일은 프로젝트 현장 관리 시스템에서 자동으로 발송되었습니다.
            </p>
          </div>
          <div class="footer">
            <p>© 2024 프로젝트 현장 관리 시스템</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 프로젝트 승인/반려 결과 이메일 템플릿
   */
  private getProjectApprovalResultTemplate(
    approverName: string,
    projectName: string,
    projectId: string,
    status: 'approved' | 'rejected',
    memo?: string
  ): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const statusText = status === 'approved' ? '승인' : '반려';
    const statusColor = status === 'approved' ? '#4CAF50' : '#f44336';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f4f4f4; padding: 20px; border-radius: 0 0 5px 5px; }
          .project-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .memo-box { background: ${status === 'approved' ? '#E8F5E9' : '#FFEBEE'}; padding: 15px; border-left: 4px solid ${statusColor}; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 24px; background: ${statusColor}; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>프로젝트 ${statusText} 알림</h1>
          </div>
          <div class="content">
            <h2>요청하신 항목이 ${statusText}되었습니다</h2>
            <div class="project-info">
              <p><strong>${statusText}자:</strong> ${approverName}</p>
              <p><strong>프로젝트명:</strong> ${projectName}</p>
              <p><strong>처리 결과:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
              <p><strong>처리 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
            </div>
            ${memo ? `
              <div class="memo-box">
                <strong>${status === 'approved' ? '승인 메모' : '반려 사유'}:</strong>
                <p>${memo}</p>
              </div>
            ` : ''}
            <p>프로젝트 상세 페이지에서 자세한 내용을 확인하실 수 있습니다.</p>
            <a href="${appUrl}/projects/${projectId}" class="button">프로젝트 보기</a>
            <p style="margin-top: 20px; font-size: 14px; color: #666;">
              이 이메일은 프로젝트 현장 관리 시스템에서 자동으로 발송되었습니다.
            </p>
          </div>
          <div class="footer">
            <p>© 2024 프로젝트 현장 관리 시스템</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 신규 가입 알림 이메일 템플릿
   */
  private getNewSignupTemplate(userName: string, userEmail: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f4f4f4; padding: 20px; border-radius: 0 0 5px 5px; }
          .user-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>신규 사용자 가입 알림</h1>
          </div>
          <div class="content">
            <h2>새로운 사용자가 가입했습니다</h2>
            <div class="user-info">
              <p><strong>이름:</strong> ${userName}</p>
              <p><strong>이메일:</strong> ${userEmail}</p>
              <p><strong>가입 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
            </div>
            <p>사용자 승인 관리 페이지에서 승인 또는 거절할 수 있습니다.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/users" class="button">사용자 관리 페이지로 이동</a>
          </div>
          <div class="footer">
            <p>© 2024 프로젝트 현장 관리 시스템</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();