export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone?: string | null;
          created_at: string;
          updated_at: string;
          is_approved: boolean;
          approved_at?: string | null;
          approved_by?: string | null;
          role: 'user' | 'admin';
          avatar_url?: string | null;
          department?: string | null;
          position?: string | null;
          last_login?: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
          is_approved?: boolean;
          approved_at?: string | null;
          approved_by?: string | null;
          role?: 'user' | 'admin';
          avatar_url?: string | null;
          department?: string | null;
          position?: string | null;
          last_login?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
          is_approved?: boolean;
          approved_at?: string | null;
          approved_by?: string | null;
          role?: 'user' | 'admin';
          avatar_url?: string | null;
          department?: string | null;
          position?: string | null;
          last_login?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: 'system' | 'project' | 'approval';
          is_read: boolean;
          created_at: string;
          related_id?: string | null;
          related_type?: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: 'system' | 'project' | 'approval';
          is_read?: boolean;
          created_at?: string;
          related_id?: string | null;
          related_type?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: 'system' | 'project' | 'approval';
          is_read?: boolean;
          created_at?: string;
          related_id?: string | null;
          related_type?: string | null;
        };
      };
    };
  };
}