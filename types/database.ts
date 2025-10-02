export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          phone: string
          role: 'admin' | 'user'
          is_approved: boolean
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          phone: string
          role?: 'admin' | 'user'
          is_approved?: boolean
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          phone?: string
          role?: 'admin' | 'user'
          is_approved?: boolean
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          site_name: string
          sales_manager: string
          site_manager: string
          product_name: string
          product_quantity: number
          outsourcing_company: string
          order_date: string
          expected_completion_date: string
          installation_request_date: string
          current_process_stage: string
          thumbnail_url: string | null
          notes: string | null
          is_urgent: boolean
          created_by: string
          created_at: string
          updated_at: string
          last_saved_at: string
        }
        Insert: {
          id?: string
          site_name: string
          sales_manager: string
          site_manager: string
          product_name: string
          product_quantity: number
          outsourcing_company: string
          order_date: string
          expected_completion_date: string
          installation_request_date: string
          current_process_stage?: string
          thumbnail_url?: string | null
          notes?: string | null
          is_urgent?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
          last_saved_at?: string
        }
        Update: {
          id?: string
          site_name?: string
          sales_manager?: string
          site_manager?: string
          product_name?: string
          product_quantity?: number
          outsourcing_company?: string
          order_date?: string
          expected_completion_date?: string
          installation_request_date?: string
          current_process_stage?: string
          thumbnail_url?: string | null
          notes?: string | null
          is_urgent?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
          last_saved_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'approval_request' | 'approval_response' | 'system'
          related_id: string | null
          related_type: 'project' | 'approval_request' | null
          is_read: boolean
          kakao_sent: boolean
          kakao_sent_at: string | null
          email_sent: boolean
          email_sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: 'approval_request' | 'approval_response' | 'system'
          related_id?: string | null
          related_type?: 'project' | 'approval_request' | null
          is_read?: boolean
          kakao_sent?: boolean
          kakao_sent_at?: string | null
          email_sent?: boolean
          email_sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: 'approval_request' | 'approval_response' | 'system'
          related_id?: string | null
          related_type?: 'project' | 'approval_request' | null
          is_read?: boolean
          kakao_sent?: boolean
          kakao_sent_at?: string | null
          email_sent?: boolean
          email_sent_at?: string | null
          created_at?: string
        }
      }
      approval_requests: {
        Row: {
          id: string
          project_id: string
          requester_id: string
          requester_name: string
          approver_id: string
          approver_name: string
          memo: string
          status: 'pending' | 'approved' | 'rejected'
          response_memo: string | null
          responded_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          requester_id: string
          requester_name: string
          approver_id: string
          approver_name: string
          memo: string
          status?: 'pending' | 'approved' | 'rejected'
          response_memo?: string | null
          responded_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          requester_id?: string
          requester_name?: string
          approver_id?: string
          approver_name?: string
          memo?: string
          status?: 'pending' | 'approved' | 'rejected'
          response_memo?: string | null
          responded_at?: string | null
          created_at?: string
        }
      }
    }
  }
}