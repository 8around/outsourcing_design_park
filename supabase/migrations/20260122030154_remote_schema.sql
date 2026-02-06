

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_weekly_report_setup"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    config_exists boolean;
    config_data jsonb;
    history_exists boolean;
    storage_exists boolean;
BEGIN
    -- 설정 테이블 확인
    SELECT EXISTS(SELECT 1 FROM weekly_report_config) INTO config_exists;
    
    IF config_exists THEN
        SELECT to_jsonb(w.*) INTO config_data
        FROM weekly_report_config w
        LIMIT 1;
    END IF;
    
    -- 이력 테이블 확인
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'weekly_report_history'
    ) INTO history_exists;
    
    -- Storage 버킷 확인
    SELECT EXISTS(
        SELECT 1 FROM storage.buckets 
        WHERE name = 'reports'
    ) INTO storage_exists;
    
    RETURN jsonb_build_object(
        'config_table_exists', config_exists,
        'config_data', config_data,
        'history_table_exists', history_exists,
        'storage_bucket_exists', storage_exists,
        'edge_function_created', true,
        'next_steps', ARRAY[
            'Deploy Edge Function: supabase functions deploy generate-weekly-report',
            'Add SERVICE_ROLE_KEY to environment variables',
            'Test the function with test mode',
            'Enable cron job for production'
        ]
    );
END;
$$;


ALTER FUNCTION "public"."check_weekly_report_setup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_approval_log"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only handle approval/rejection response (UPDATE operations)
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status != 'pending' THEN
    INSERT INTO history_logs (
      project_id, category, content, author_id, author_name,
      target_user_id, target_user_name, log_type, approval_status
    ) VALUES (
      NEW.project_id, '승인처리', 
      COALESCE(NEW.response_memo, CASE 
        WHEN NEW.status = 'approved' THEN '승인 완료' 
        ELSE '반려 처리' END), 
      NEW.approver_id, NEW.approver_name,
      NEW.requester_id, NEW.requester_name, 
      'approval_response', NEW.status
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_approval_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_weekly_report_job_runs"("limit_rows" integer DEFAULT 10) RETURNS TABLE("jobid" bigint, "job_pid" integer, "database" "text", "username" "text", "command" "text", "status" "text", "return_message" "text", "start_time" timestamp with time zone, "end_time" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        jrd.jobid,
        jrd.job_pid,
        jrd.database,
        jrd.username,
        jrd.command,
        jrd.status,
        jrd.return_message,
        jrd.start_time,
        jrd.end_time
    FROM cron.job_run_details jrd
    INNER JOIN cron.job j ON j.jobid = jrd.jobid
    WHERE j.jobname LIKE '%weekly-report%'
    ORDER BY jrd.start_time DESC
    LIMIT limit_rows;
END;
$$;


ALTER FUNCTION "public"."get_weekly_report_job_runs"("limit_rows" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_weekly_report_jobs"() RETURNS TABLE("jobid" bigint, "schedule" "text", "command" "text", "nodename" "text", "nodeport" integer, "database" "text", "username" "text", "active" boolean, "jobname" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY 
    SELECT * FROM cron.job
    WHERE jobname LIKE '%weekly-report%';
END;
$$;


ALTER FUNCTION "public"."get_weekly_report_jobs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_approval_log_deletion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- When an approval request is deleted, delete the related history log if it exists
  IF TG_TABLE_NAME = 'approval_requests' AND OLD.history_log_id IS NOT NULL THEN
    DELETE FROM history_logs WHERE id = OLD.history_log_id;
  END IF;
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."handle_approval_log_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    name, 
    phone, 
    role, 
    is_approved, 
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'user', -- 기본값: user
    false,  -- 기본값: 미승인
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_email_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.users 
  SET email = NEW.email,
      updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_email_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_approval_request_deleted"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.history_logs
  SET is_deleted = true,
      deleted_by = COALESCE(auth.uid(), deleted_by),
      deleted_at = now()
  WHERE approval_request_id = OLD.id;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."on_approval_request_deleted"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_weekly_report_generation"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- 테스트 메시지 반환
    RETURN 'Weekly report Edge Function has been created. To test it:
    1. Deploy the Edge Function using: supabase functions deploy generate-weekly-report
    2. Test it using: supabase functions invoke generate-weekly-report --body ''{"test": true, "emails": ["your-email@example.com"]}''
    3. For production, add SERVICE_ROLE_KEY to Vault and enable the cron job';
END;
$$;


ALTER FUNCTION "public"."test_weekly_report_generation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."approval_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "requester_name" "text" NOT NULL,
    "approver_id" "uuid" NOT NULL,
    "approver_name" "text" NOT NULL,
    "memo" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "response_memo" "text",
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "approval_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."approval_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."history_log_attachments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "history_log_id" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "mime_type" "text",
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."history_log_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."history_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "content" "text" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "author_name" "text" NOT NULL,
    "target_user_id" "uuid",
    "target_user_name" "text",
    "log_type" "text" DEFAULT 'manual'::"text" NOT NULL,
    "approval_status" "text",
    "is_deleted" boolean DEFAULT false,
    "deleted_by" "uuid",
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "approval_request_id" "uuid",
    CONSTRAINT "history_logs_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "history_logs_category_check" CHECK (("category" = ANY (ARRAY['사양변경'::"text", '도면설계'::"text", '구매발주'::"text", '생산제작'::"text", '상하차'::"text", '현장설치시공'::"text", '설치인증'::"text", '설비'::"text", '기타'::"text", '승인요청'::"text", '승인처리'::"text"]))),
    CONSTRAINT "history_logs_log_type_check" CHECK (("log_type" = ANY (ARRAY['manual'::"text", 'approval_request'::"text", 'approval_response'::"text"])))
);


ALTER TABLE "public"."history_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" NOT NULL,
    "related_id" "uuid",
    "related_type" "text",
    "is_read" boolean DEFAULT false,
    "kakao_sent" boolean DEFAULT false,
    "kakao_sent_at" timestamp with time zone,
    "email_sent" boolean DEFAULT false,
    "email_sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_related_type_check" CHECK (("related_type" = ANY (ARRAY['project'::"text", 'approval_request'::"text"]))),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['approval_request'::"text", 'approval_response'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."process_stages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "stage_name" "text" NOT NULL,
    "stage_order" integer NOT NULL,
    "status" "text" DEFAULT 'waiting'::"text" NOT NULL,
    "delay_reason" "text",
    "start_date" "date",
    "end_date" "date",
    "actual_start_date" "date",
    "actual_end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "process_stages_stage_name_check" CHECK (("stage_name" = ANY (ARRAY['contract'::"text", 'design'::"text", 'order'::"text", 'incoming'::"text", 'welding'::"text", 'plating'::"text", 'painting'::"text", 'grc_frp'::"text", 'panel'::"text", 'fabrication'::"text", 'shipping'::"text", 'installation'::"text", 'certification'::"text", 'closing'::"text", 'completion'::"text"]))),
    CONSTRAINT "process_stages_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text", 'waiting'::"text", 'delayed'::"text"])))
);


ALTER TABLE "public"."process_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_favorites" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."project_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "image_name" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "display_order" integer DEFAULT 1 NOT NULL,
    "is_thumbnail" boolean DEFAULT false,
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."project_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "site_name" "text" NOT NULL,
    "product_name" "text" NOT NULL,
    "product_quantity" integer NOT NULL,
    "outsourcing_company" "text" NOT NULL,
    "order_date" "date" NOT NULL,
    "expected_completion_date" "date" NOT NULL,
    "installation_request_date" "date" NOT NULL,
    "current_process_stage" "text" DEFAULT 'contract'::"text" NOT NULL,
    "thumbnail_url" "text",
    "is_urgent" boolean DEFAULT false,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_saved_at" timestamp with time zone DEFAULT "now"(),
    "sales_manager" "uuid",
    "site_manager" "uuid",
    "notes" "text",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "projects_current_process_stage_check" CHECK (("current_process_stage" = ANY (ARRAY['contract'::"text", 'design'::"text", 'order'::"text", 'incoming'::"text", 'welding'::"text", 'plating'::"text", 'painting'::"text", 'grc_frp'::"text", 'panel'::"text", 'fabrication'::"text", 'shipping'::"text", 'installation'::"text", 'certification'::"text", 'closing'::"text", 'completion'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON COLUMN "public"."projects"."deleted_at" IS 'Soft delete timestamp. NULL means active project.';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "is_approved" boolean DEFAULT false NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_report_config" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "send_day_of_week" integer DEFAULT 1,
    "send_hour" integer DEFAULT 9,
    "send_minute" integer DEFAULT 0,
    "recipient_emails" "text"[] NOT NULL,
    "report_title_template" "text" DEFAULT '프로젝트 현장 관리 주간 리포트 - {date_range}'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "weekly_report_config_send_day_of_week_check" CHECK ((("send_day_of_week" >= 0) AND ("send_day_of_week" <= 6))),
    CONSTRAINT "weekly_report_config_send_hour_check" CHECK ((("send_hour" >= 0) AND ("send_hour" <= 23))),
    CONSTRAINT "weekly_report_config_send_minute_check" CHECK ((("send_minute" >= 0) AND ("send_minute" <= 59)))
);


ALTER TABLE "public"."weekly_report_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_report_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "report_period_start" "date" NOT NULL,
    "report_period_end" "date" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "recipient_emails" "text"[] NOT NULL,
    "send_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "send_attempts" integer DEFAULT 0,
    "last_attempt_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "weekly_report_history_send_status_check" CHECK (("send_status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."weekly_report_history" OWNER TO "postgres";


ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."history_log_attachments"
    ADD CONSTRAINT "history_log_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."history_logs"
    ADD CONSTRAINT "history_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_stages"
    ADD CONSTRAINT "process_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_stages"
    ADD CONSTRAINT "process_stages_project_id_stage_name_key" UNIQUE ("project_id", "stage_name");



ALTER TABLE ONLY "public"."project_favorites"
    ADD CONSTRAINT "project_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_favorites"
    ADD CONSTRAINT "project_favorites_user_id_project_id_key" UNIQUE ("user_id", "project_id");



ALTER TABLE ONLY "public"."project_images"
    ADD CONSTRAINT "project_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weekly_report_config"
    ADD CONSTRAINT "weekly_report_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weekly_report_history"
    ADD CONSTRAINT "weekly_report_history_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_approval_requests_approver" ON "public"."approval_requests" USING "btree" ("approver_id");



CREATE INDEX "idx_approval_requests_pending" ON "public"."approval_requests" USING "btree" ("approver_id", "status") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_approval_requests_project" ON "public"."approval_requests" USING "btree" ("project_id");



CREATE INDEX "idx_approval_requests_requester" ON "public"."approval_requests" USING "btree" ("requester_id");



CREATE INDEX "idx_approval_requests_status" ON "public"."approval_requests" USING "btree" ("status");



CREATE INDEX "idx_history_logs_approval_flow" ON "public"."history_logs" USING "btree" ("target_user_id", "log_type") WHERE ("target_user_id" IS NOT NULL);



CREATE INDEX "idx_history_logs_approval_request" ON "public"."history_logs" USING "btree" ("approval_request_id");



CREATE INDEX "idx_history_logs_category" ON "public"."history_logs" USING "btree" ("category");



CREATE INDEX "idx_history_logs_global_feed" ON "public"."history_logs" USING "btree" ("created_at" DESC) WHERE ("is_deleted" = false);



CREATE INDEX "idx_history_logs_project" ON "public"."history_logs" USING "btree" ("project_id", "created_at" DESC);



CREATE INDEX "idx_history_logs_type" ON "public"."history_logs" USING "btree" ("log_type");



CREATE INDEX "idx_history_logs_user_activity" ON "public"."history_logs" USING "btree" ("author_id", "created_at" DESC) WHERE ("is_deleted" = false);



CREATE INDEX "idx_hla_log" ON "public"."history_log_attachments" USING "btree" ("history_log_id", "created_at" DESC);



CREATE INDEX "idx_hla_uploader" ON "public"."history_log_attachments" USING "btree" ("uploaded_by");



CREATE INDEX "idx_notifications_date" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_process_stages_dates" ON "public"."process_stages" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_process_stages_order" ON "public"."process_stages" USING "btree" ("project_id", "stage_order");



CREATE INDEX "idx_process_stages_project" ON "public"."process_stages" USING "btree" ("project_id");



CREATE INDEX "idx_process_stages_status" ON "public"."process_stages" USING "btree" ("status");



CREATE INDEX "idx_project_favorites_project" ON "public"."project_favorites" USING "btree" ("project_id");



CREATE INDEX "idx_project_favorites_user" ON "public"."project_favorites" USING "btree" ("user_id");



CREATE INDEX "idx_project_images_order" ON "public"."project_images" USING "btree" ("project_id", "display_order");



CREATE INDEX "idx_project_images_project" ON "public"."project_images" USING "btree" ("project_id");



CREATE INDEX "idx_project_images_thumbnail" ON "public"."project_images" USING "btree" ("project_id", "is_thumbnail");



CREATE INDEX "idx_projects_created_by" ON "public"."projects" USING "btree" ("created_by");



CREATE INDEX "idx_projects_current_stage" ON "public"."projects" USING "btree" ("current_process_stage");



CREATE INDEX "idx_projects_dates" ON "public"."projects" USING "btree" ("order_date", "expected_completion_date");



CREATE INDEX "idx_projects_sales_manager_id" ON "public"."projects" USING "btree" ("sales_manager");



CREATE INDEX "idx_projects_site_manager_id" ON "public"."projects" USING "btree" ("site_manager");



CREATE INDEX "idx_projects_site_name" ON "public"."projects" USING "btree" ("site_name");



CREATE INDEX "idx_projects_urgent" ON "public"."projects" USING "btree" ("is_urgent");



CREATE INDEX "idx_users_approved" ON "public"."users" USING "btree" ("is_approved");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_weekly_report_date" ON "public"."weekly_report_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_weekly_report_period" ON "public"."weekly_report_history" USING "btree" ("report_period_start", "report_period_end");



CREATE INDEX "idx_weekly_report_status" ON "public"."weekly_report_history" USING "btree" ("send_status");



CREATE OR REPLACE TRIGGER "approval_request_delete_cascade_logs" AFTER DELETE ON "public"."approval_requests" FOR EACH ROW EXECUTE FUNCTION "public"."on_approval_request_deleted"();



CREATE OR REPLACE TRIGGER "approval_response_log_trigger" AFTER UPDATE ON "public"."approval_requests" FOR EACH ROW EXECUTE FUNCTION "public"."create_approval_log"();



CREATE OR REPLACE TRIGGER "on_approval_request_delete" BEFORE DELETE ON "public"."approval_requests" FOR EACH ROW EXECUTE FUNCTION "public"."handle_approval_log_deletion"();



CREATE OR REPLACE TRIGGER "update_process_stages_updated_at" BEFORE UPDATE ON "public"."process_stages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_weekly_report_config_updated_at" BEFORE UPDATE ON "public"."weekly_report_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."history_logs"
    ADD CONSTRAINT "fk_history_logs_approval_request" FOREIGN KEY ("approval_request_id") REFERENCES "public"."approval_requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."history_log_attachments"
    ADD CONSTRAINT "history_log_attachments_history_log_id_fkey" FOREIGN KEY ("history_log_id") REFERENCES "public"."history_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."history_log_attachments"
    ADD CONSTRAINT "history_log_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."history_logs"
    ADD CONSTRAINT "history_logs_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."history_logs"
    ADD CONSTRAINT "history_logs_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."history_logs"
    ADD CONSTRAINT "history_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."history_logs"
    ADD CONSTRAINT "history_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."process_stages"
    ADD CONSTRAINT "process_stages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_favorites"
    ADD CONSTRAINT "project_favorites_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_favorites"
    ADD CONSTRAINT "project_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_images"
    ADD CONSTRAINT "project_images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_images"
    ADD CONSTRAINT "project_images_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_sales_manager_id_fkey" FOREIGN KEY ("sales_manager") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_site_manager_id_fkey" FOREIGN KEY ("site_manager") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin only for weekly_report_config" ON "public"."weekly_report_config" USING (((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text") OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Admin only for weekly_report_history" ON "public"."weekly_report_history" USING (((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text") OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Admins can manage report config" ON "public"."weekly_report_config" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update all users" ON "public"."users" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "users_1"
  WHERE (("users_1"."id" = "auth"."uid"()) AND ("users_1"."role" = 'admin'::"text") AND ("users_1"."is_approved" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "users_1"
  WHERE (("users_1"."id" = "auth"."uid"()) AND ("users_1"."role" = 'admin'::"text") AND ("users_1"."is_approved" = true)))));



CREATE POLICY "Admins can update logs" ON "public"."history_logs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all logs" ON "public"."history_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all users" ON "public"."users" FOR SELECT USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admins can view report history" ON "public"."weekly_report_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Anyone can check email existence" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Approved users can create approval requests" ON "public"."approval_requests" FOR INSERT WITH CHECK ((("requester_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_approved" = true))))));



CREATE POLICY "Approved users can create attachments" ON "public"."history_log_attachments" FOR INSERT WITH CHECK ((("uploaded_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_approved" = true))))));



CREATE POLICY "Approved users can create process stages" ON "public"."process_stages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_approved" = true)))));



CREATE POLICY "Approved users can create projects" ON "public"."projects" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_approved" = true)))));



CREATE POLICY "Approved users can update process stages" ON "public"."process_stages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_approved" = true)))));



CREATE POLICY "Approved users can upload images" ON "public"."project_images" FOR INSERT WITH CHECK ((("uploaded_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_approved" = true))))));



CREATE POLICY "Approved users can view active logs" ON "public"."history_logs" FOR SELECT USING ((("is_deleted" = false) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_approved" = true))))));



CREATE POLICY "Approved users can view approval requests" ON "public"."approval_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_approved" = true)))));



CREATE POLICY "Approved users can view attachments of accessible logs" ON "public"."history_log_attachments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."history_logs" "hl"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("hl"."id" = "history_log_attachments"."history_log_id") AND ("hl"."is_deleted" = false) AND ("u"."is_approved" = true)))));



CREATE POLICY "Approved users can view images" ON "public"."project_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_approved" = true)))));



CREATE POLICY "Approved users can view process stages" ON "public"."process_stages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_approved" = true)))));



CREATE POLICY "Approved users can view projects" ON "public"."projects" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_approved" = true)))));



CREATE POLICY "Approvers or admins can update requests" ON "public"."approval_requests" FOR UPDATE USING ((("approver_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))));



CREATE POLICY "Authenticated users can view approved users" ON "public"."users" FOR SELECT TO "authenticated" USING (("is_approved" = true));



CREATE POLICY "Creators and admins can update projects" ON "public"."projects" FOR UPDATE USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text") AND ("users"."is_approved" = true))))));



CREATE POLICY "System can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can create report history" ON "public"."weekly_report_history" FOR INSERT WITH CHECK (true);



CREATE POLICY "Uploaders can delete own images" ON "public"."project_images" FOR DELETE USING ((("uploaded_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))));



CREATE POLICY "Uploaders or admins can delete attachments" ON "public"."history_log_attachments" FOR DELETE USING ((("uploaded_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))));



CREATE POLICY "Uploaders or admins can update attachments" ON "public"."history_log_attachments" FOR UPDATE USING ((("uploaded_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can create own favorites" ON "public"."project_favorites" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create own logs" ON "public"."history_logs" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_approved" = true))))));



CREATE POLICY "Users can delete own favorites" ON "public"."project_favorites" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own data" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own data" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own data" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own favorites" ON "public"."project_favorites" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."approval_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."history_log_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."history_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."process_stages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weekly_report_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weekly_report_history" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."check_weekly_report_setup"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_weekly_report_setup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_weekly_report_setup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_approval_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_approval_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_approval_log"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_weekly_report_job_runs"("limit_rows" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_weekly_report_job_runs"("limit_rows" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_weekly_report_job_runs"("limit_rows" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_weekly_report_jobs"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_weekly_report_jobs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_weekly_report_jobs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_approval_log_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_approval_log_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_approval_log_deletion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_email_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_email_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_email_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_approval_request_deleted"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_approval_request_deleted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_approval_request_deleted"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."test_weekly_report_generation"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_weekly_report_generation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_weekly_report_generation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";















SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;









GRANT ALL ON TABLE "public"."approval_requests" TO "anon";
GRANT ALL ON TABLE "public"."approval_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_requests" TO "service_role";



GRANT ALL ON TABLE "public"."history_log_attachments" TO "anon";
GRANT ALL ON TABLE "public"."history_log_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."history_log_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."history_logs" TO "anon";
GRANT ALL ON TABLE "public"."history_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."history_logs" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."process_stages" TO "anon";
GRANT ALL ON TABLE "public"."process_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."process_stages" TO "service_role";



GRANT ALL ON TABLE "public"."project_favorites" TO "anon";
GRANT ALL ON TABLE "public"."project_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."project_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."project_images" TO "anon";
GRANT ALL ON TABLE "public"."project_images" TO "authenticated";
GRANT ALL ON TABLE "public"."project_images" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_report_config" TO "anon";
GRANT ALL ON TABLE "public"."weekly_report_config" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_report_config" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_report_history" TO "anon";
GRANT ALL ON TABLE "public"."weekly_report_history" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_report_history" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























drop extension if exists "pg_net";

create extension if not exists "pg_net" with schema "public";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_email_updated AFTER UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_update();


  create policy "Admin delete for reports"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'reports'::text) AND (((auth.jwt() ->> 'role'::text) = 'admin'::text) OR ((auth.jwt() ->> 'role'::text) = 'service_role'::text))));



  create policy "Admin update for reports"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'reports'::text) AND (((auth.jwt() ->> 'role'::text) = 'admin'::text) OR ((auth.jwt() ->> 'role'::text) = 'service_role'::text))));



  create policy "Admin upload for reports"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'reports'::text) AND (((auth.jwt() ->> 'role'::text) = 'admin'::text) OR ((auth.jwt() ->> 'role'::text) = 'service_role'::text))));



  create policy "Authenticated users can delete their uploads"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'projects'::text));



  create policy "Authenticated users can update their uploads"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'projects'::text))
with check ((bucket_id = 'projects'::text));



  create policy "Authenticated users can upload log attachments"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'log-attachments'::text) AND (auth.uid() IS NOT NULL)));



  create policy "Authenticated users can upload"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'projects'::text));



  create policy "Public read access"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'projects'::text));



  create policy "Public read for reports"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'reports'::text));



  create policy "Users can delete their own log attachments"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'log-attachments'::text) AND (auth.uid() = owner)));



  create policy "Users can update their own log attachments"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'log-attachments'::text) AND (auth.uid() = owner)));



  create policy "Users can view log attachments"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'log-attachments'::text));



