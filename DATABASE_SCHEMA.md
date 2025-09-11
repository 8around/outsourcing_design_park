# Database Schema - 프로젝트 현장 관리 솔루션

## 🏗️ SUPABASE SCHEMA ARCHITECTURE

이 문서는 프로젝트 현장 관리 솔루션의 PostgreSQL 데이터베이스 스키마를 정의합니다. Supabase를 기반으로 하며 Row Level Security(RLS)와 수동 데이터 갱신을 지원합니다.

## Schema Overview

- **Tables**: 11개 핵심 테이블 (첨부파일 분리: history_log_attachments 추가, user_activity_logs 제거)
- **Relationships**: 외래키 기반 정규화된 관계
- **Security**: RLS 정책으로 데이터 접근 제어
- **Performance**: 인덱스 최적화 및 쿼리 성능 고려
- **Manual Refresh**: 새로고침 버튼을 통한 수동 데이터 갱신
- **Activity Tracking**: history_logs + history_log_attachments를 통한 통합 활동·첨부 추적

---

## Activity Tracking Strategy

### 단순화된 접근 방식

기존의 복잡한 다중 테이블 구조를 제거하고 **history_logs 테이블 하나로 모든 활동을 추적**합니다:

#### 1. Global Activity Feed (전체 활동 피드)
```sql
-- 홈 화면 전체 로그 피드 (모든 활동 표시)
SELECT * FROM history_logs 
WHERE is_deleted = false 
ORDER BY created_at DESC;
```

#### 2. User-Specific Activity View (사용자별 활동 추적)
```sql
-- 관리자가 특정 사용자의 활동만 필터링
SELECT * FROM history_logs 
WHERE author_id = 'target_user_id' 
  AND is_deleted = false 
ORDER BY created_at DESC;
```

#### 3. Two Types of Log Creation

**a) 직접 로그 생성 (Direct Log Creation)**
- 사용자가 수동으로 작성하는 로그
- `author_id` (작성자)만 존재
- `target_user_id`는 NULL

**b) 승인 관련 로그 (Approval-Related Logs)**
- 승인 요청/응답시 자동 생성되는 로그
- `author_id` (작성자)와 `target_user_id` (대상자) 모두 존재
- 승인 워크플로우의 완전한 추적

---

## Core Tables

### 1. Users (사용자 관리)

사용자 기본 정보와 Supabase Auth 확장 테이블. 관리자 승인 시스템과 역할 관리를 위한 핵심 테이블.
**Supabase 표준 패턴**: users.id가 auth.users(id)를 직접 FK로 참조하여 완벽한 동기화 보장.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_approved ON users(is_approved);
```

**컬럼 설명:**
- `id`: UUID 기본키, auth.users(id)를 직접 참조 (FK), 완벽한 Auth 동기화
- `email`: 사용자 이메일, 로그인 식별자 (고유값)
- `name`: 사용자 실명, 시스템 전반에서 표시용
- `phone`: 전화번호, 카카오톡 알림 발송용 필수 정보
- `role`: 사용자 역할 ('admin' 또는 'user'), 권한 제어용
- `is_approved`: 관리자 승인 여부, 로그인 허용 제어
- `approved_by`: 승인한 관리자 ID, 승인 이력 추적용
- `approved_at`: 승인 시각, 승인 이력 관리용
- `created_at`: 계정 생성 시각, 가입 일자 추적용
- `updated_at`: 마지막 수정 시각, 정보 변경 추적용

---

### 2. Projects (프로젝트 관리)

제조업체 현장 프로젝트의 기본 정보를 저장하는 핵심 테이블. 영업담당자부터 준공일까지 프로젝트 전반을 관리.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_name TEXT NOT NULL,
  sales_manager TEXT NOT NULL,
  site_manager TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_quantity INTEGER NOT NULL,
  outsourcing_company TEXT NOT NULL,
  order_date DATE NOT NULL,
  expected_completion_date DATE NOT NULL,
  installation_request_date DATE NOT NULL,
  current_process_stage TEXT NOT NULL DEFAULT 'contract' 
    CHECK (current_process_stage IN (
      'contract', 'design', 'order', 'laser', 'welding', 'plating', 
      'painting', 'panel', 'assembly', 'shipping', 'installation', 
      'certification', 'closing', 'completion'
    )),
  thumbnail_url TEXT,
  is_urgent BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_current_stage ON projects(current_process_stage);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_site_name ON projects(site_name);
CREATE INDEX idx_projects_urgent ON projects(is_urgent);
CREATE INDEX idx_projects_dates ON projects(order_date, expected_completion_date);
```

**컬럼 설명:**
- `id`: UUID 기본키, 프로젝트 고유 식별자
- `site_name`: 현장명, 프로젝트 식별용 필수 정보
- `sales_manager`: 영업담당자명, 고객 관계 관리용
- `site_manager`: 현장담당자명, 현장 관리 책임자
- `product_name`: 제품명, 제작 품목 정보
- `product_quantity`: 제품 수량 (정수), 생산 규모 파악용
- `outsourcing_company`: 외주업체명, 협력업체 관리용
- `order_date`: 발주일, 프로젝트 시작점 기준일
- `expected_completion_date`: 준공 예정일, 납기 관리용
- `installation_request_date`: 설치 요청일, 설치 일정 계획용
- `current_process_stage`: 현재 공정 단계, 프로젝트 진행 상태 추적
- `thumbnail_url`: 썸네일 이미지 URL, 프로젝트 목록 표시용
- `is_urgent`: 급한 현장 여부, 우선순위 표시용
- `created_by`: 프로젝트 생성자 ID, 작성자 추적용
- `created_at`: 프로젝트 생성 시각, 등록일 관리용
- `updated_at`: 마지막 수정 시각, 변경 이력 추적용
- `last_saved_at`: 마지막 저장 시각, 저장 시점 표시용

---

### 3. Process Stages (공정 단계 관리)

각 프로젝트의 공정 단계별 상세 정보와 일정을 관리하는 테이블. 간트차트와 일정 관리의 핵심 데이터.

```sql
CREATE TABLE process_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL CHECK (stage_name IN (
    'contract', 'design', 'order', 'laser', 'welding', 'plating', 
    'painting', 'panel', 'assembly', 'shipping', 'installation', 
    'certification', 'closing', 'completion'
  )),
  stage_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' 
    CHECK (status IN ('in_progress', 'completed', 'waiting', 'delayed')),
  delay_reason TEXT,
  start_date DATE,
  end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(project_id, stage_name)
);

-- Indexes
CREATE INDEX idx_process_stages_project ON process_stages(project_id);
CREATE INDEX idx_process_stages_status ON process_stages(status);
CREATE INDEX idx_process_stages_order ON process_stages(project_id, stage_order);
CREATE INDEX idx_process_stages_dates ON process_stages(start_date, end_date);
```

**컬럼 설명:**
- `id`: UUID 기본키, 공정 단계 고유 식별자
- `project_id`: 연관된 프로젝트 ID, 외래키 참조
- `stage_name`: 공정 단계명, 14단계 중 하나 (contract~completion)
- `stage_order`: 공정 순서, 간트차트 정렬 및 진행 순서 관리
- `status`: 공정 상태, 진행중/완료/대기/지연 중 하나
- `delay_reason`: 지연 사유, 지연 상태시 선택 입력 사항 (NULL 허용)
- `start_date`: 계획 시작일, 일정 계획용
- `end_date`: 계획 종료일, 일정 계획 및 간트차트용
- `actual_start_date`: 실제 시작일, 실적 관리용
- `actual_end_date`: 실제 종료일, 실적 관리 및 성과 분석용
- `created_at`: 생성 시각, 공정 등록일 추적
- `updated_at`: 수정 시각, 공정 상태 변경 추적

---

### 4. History Logs (통합 활동 로그 관리) ⭐ 핵심 테이블

**모든 활동을 통합 관리하는 단일 테이블**. 직접 입력 로그와 승인 관련 로그를 모두 포함하여 글로벌 피드와 사용자별 활동 추적을 동시에 지원.

```sql
CREATE TABLE history_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    '사양변경', '도면설계', '구매발주', '생산제작', 
    '상하차', '현장설치시공', '설치인증', '승인요청', '승인처리'
  )),
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id),
  author_name TEXT NOT NULL,
  target_user_id UUID REFERENCES users(id),
  target_user_name TEXT,
  log_type TEXT NOT NULL DEFAULT 'manual' 
    CHECK (log_type IN ('manual', 'approval_request', 'approval_response')),
  approval_status TEXT CHECK (approval_status IN ('approved', 'rejected')),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by UUID REFERENCES users(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Global Feed and User Activity Tracking
CREATE INDEX idx_history_logs_global_feed ON history_logs(created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_history_logs_user_activity ON history_logs(author_id, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_history_logs_project ON history_logs(project_id, created_at DESC);
CREATE INDEX idx_history_logs_category ON history_logs(category);
CREATE INDEX idx_history_logs_type ON history_logs(log_type);
CREATE INDEX idx_history_logs_approval_flow ON history_logs(target_user_id, log_type) WHERE target_user_id IS NOT NULL;
```

**컬럼 설명:**
- `id`: UUID 기본키, 로그 고유 식별자
- `project_id`: 연관된 프로젝트 ID, 프로젝트별 로그 분류
- `category`: 로그 카테고리, 7개 업무 분류 + 승인 관련 2개
- `content`: 로그 내용, 사용자가 입력한 상세 내용
- `author_id`: 작성자 ID, **글로벌 피드 및 사용자 활동 추적의 핵심 컬럼**
- `author_name`: 작성자명, 표시용 (사용자명 변경 대응)
- `target_user_id`: 대상 사용자 ID, **승인 관련 로그에만 존재** (NULL 허용)
- `target_user_name`: 대상 사용자명, 표시용 (사용자명 변경 대응)
- `log_type`: 로그 유형, 직접입력/승인요청/승인처리 구분
- `approval_status`: 승인 상태, 승인/반려 결과 (승인처리시만)
- `is_deleted`: 삭제 여부, 관리자 삭제 기능용 (논리 삭제)
- `deleted_by`: 삭제자 ID, 삭제 책임자 추적
- `deleted_at`: 삭제 시각, 삭제 시점 기록
- `created_at`: 생성 시각, **불변 타임스탬프 - 수정 불가능**

첨부파일은 별도 테이블 `history_log_attachments`에 저장합니다. (아래 11번 테이블 참고)

**활동 추적 전략:**

#### Global Feed (전체 활동 피드)
```sql
-- 홈 화면에서 모든 사용자의 활동을 시간순으로 표시
SELECT hl.*, p.site_name 
FROM history_logs hl
JOIN projects p ON hl.project_id = p.id
WHERE hl.is_deleted = FALSE
ORDER BY hl.created_at DESC;
```

#### User Activity Tracking (사용자별 활동 추적)
```sql
-- 관리자가 특정 사용자의 모든 활동을 추적
SELECT hl.*, p.site_name 
FROM history_logs hl
JOIN projects p ON hl.project_id = p.id
WHERE hl.author_id = 'target_user_id' 
  AND hl.is_deleted = FALSE
ORDER BY hl.created_at DESC;
```

#### Approval Workflow Tracking (승인 워크플로우 추적)
```sql
-- 승인 관련 모든 로그 (요청자와 승인자 모두 포함)
SELECT hl.*, p.site_name 
FROM history_logs hl
JOIN projects p ON hl.project_id = p.id
WHERE hl.log_type IN ('approval_request', 'approval_response')
  AND hl.is_deleted = FALSE
ORDER BY hl.created_at DESC;
```

---

### 5. Approval Requests (승인 요청 상태 관리)

승인 요청의 현재 상태를 관리하는 테이블. **history_logs와 함께 이중 추적**: approval_requests는 현재 상태, history_logs는 불변 이력.

```sql
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES users(id),
  requester_name TEXT NOT NULL,
  approver_id UUID NOT NULL REFERENCES users(id),
  approver_name TEXT NOT NULL,
  memo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected')),
  response_memo TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  history_log_id UUID REFERENCES history_logs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_approval_requests_project ON approval_requests(project_id);
CREATE INDEX idx_approval_requests_requester ON approval_requests(requester_id);
CREATE INDEX idx_approval_requests_approver ON approval_requests(approver_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_pending ON approval_requests(approver_id, status) WHERE status = 'pending';
CREATE INDEX idx_approval_requests_history_log ON approval_requests(history_log_id);
```

**컬럼 설명:**
- `id`: UUID 기본키, 승인 요청 고유 식별자
- `project_id`: 연관된 프로젝트 ID, 어떤 프로젝트에 대한 승인인지
- `requester_id`: 요청자 ID, 승인을 요청한 사용자
- `requester_name`: 요청자명, 표시용 (사용자명 변경 대응)
- `approver_id`: 승인자 ID, 승인 권한을 가진 지정된 사용자
- `approver_name`: 승인자명, 표시용 (사용자명 변경 대응)
- `memo`: 요청 메모, 승인 요청시 첨부하는 설명
- `status`: 처리 상태, **현재 승인 상태 관리용** (대기중/승인됨/반려됨)
- `response_memo`: 응답 메모, 승인/반려시 사유나 코멘트
- `responded_at`: 응답 시각, 승인/반려 처리 시점
- `history_log_id`: 연관된 히스토리 로그 ID, **프로젝트 상세에서 생성된 승인 요청시 연결** (NULL 허용)
- `created_at`: 요청 시각, 승인 요청 생성 시점

---

### 6. Project Favorites (즐겨찾기 관리)

사용자별 프로젝트 즐겨찾기 정보를 관리하는 테이블. 개인화된 프로젝트 접근을 위한 다대다 관계 테이블.

```sql
CREATE TABLE project_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, project_id)
);

-- Indexes
CREATE INDEX idx_project_favorites_user ON project_favorites(user_id);
CREATE INDEX idx_project_favorites_project ON project_favorites(project_id);
```

**컬럼 설명:**
- `id`: UUID 기본키, 즐겨찾기 관계 고유 식별자
- `user_id`: 사용자 ID, 즐겨찾기를 설정한 사용자
- `project_id`: 프로젝트 ID, 즐겨찾기로 지정된 프로젝트
- `created_at`: 즐겨찾기 등록 시각, 등록 시점 기록

---

### 7. Project Images (프로젝트 이미지 관리)

프로젝트별 이미지 갤러리를 관리하는 테이블. 최대 10장 제한과 썸네일 표시 순서를 지원.

```sql
CREATE TABLE project_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1,
  is_thumbnail BOOLEAN DEFAULT FALSE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_project_images_project ON project_images(project_id);
CREATE INDEX idx_project_images_order ON project_images(project_id, display_order);
CREATE INDEX idx_project_images_thumbnail ON project_images(project_id, is_thumbnail);
```

**컬럼 설명:**
- `id`: UUID 기본키, 이미지 고유 식별자
- `project_id`: 연관된 프로젝트 ID, 어떤 프로젝트의 이미지인지
- `image_url`: 이미지 URL, Supabase Storage에 저장된 이미지 경로
- `image_name`: 이미지 파일명, 원본 파일명 보존
- `file_size`: 파일 크기(바이트), 20MB 제한 검증용
- `display_order`: 표시 순서, 이미지 갤러리 정렬 순서
- `is_thumbnail`: 썸네일 여부, 프로젝트 목록에서 대표 이미지로 사용
- `uploaded_by`: 업로드한 사용자 ID, 업로드 책임자 추적
- `created_at`: 업로드 시각, 이미지 등록 시점

---

### 8. Notifications (알림 관리)

카카오톡과 이메일 알림을 관리하는 테이블. 승인 요청과 시스템 알림의 발송 상태를 추적.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('approval_request', 'approval_response', 'system')),
  related_id UUID,
  related_type TEXT CHECK (related_type IN ('project', 'approval_request')),
  is_read BOOLEAN DEFAULT FALSE,
  kakao_sent BOOLEAN DEFAULT FALSE,
  kakao_sent_at TIMESTAMP WITH TIME ZONE,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_date ON notifications(created_at DESC);
```

**컬럼 설명:**
- `id`: UUID 기본키, 알림 고유 식별자
- `user_id`: 수신자 ID, 알림을 받을 사용자
- `title`: 알림 제목, 간단한 알림 요약
- `message`: 알림 내용, 상세 알림 메시지
- `type`: 알림 유형, 승인요청/승인응답/시스템 알림 구분
- `related_id`: 관련 객체 ID, 프로젝트나 승인요청 등의 ID
- `related_type`: 관련 객체 타입, 어떤 종류의 객체와 연관된 알림인지
- `is_read`: 읽음 여부, 알림 확인 상태 추적
- `kakao_sent`: 카카오톡 발송 여부, 카카오톡 알림 발송 성공 여부
- `kakao_sent_at`: 카카오톡 발송 시각, 발송 시점 기록
- `email_sent`: 이메일 발송 여부, 이메일 알림 발송 성공 여부
- `email_sent_at`: 이메일 발송 시각, 발송 시점 기록
- `created_at`: 알림 생성 시각, 알림 생성 시점

---

### 9. Weekly Report Config (주간 리포트 설정)

주간 로그 리포트의 자동 발송 설정을 관리하는 테이블. 발송 일정과 수신자 정보를 설정.

```sql
CREATE TABLE weekly_report_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_enabled BOOLEAN DEFAULT TRUE,
  send_day_of_week INTEGER DEFAULT 1 CHECK (send_day_of_week BETWEEN 0 AND 6),
  send_hour INTEGER DEFAULT 9 CHECK (send_hour BETWEEN 0 AND 23),
  send_minute INTEGER DEFAULT 0 CHECK (send_minute BETWEEN 0 AND 59),
  recipient_emails TEXT[] NOT NULL,
  report_title_template TEXT DEFAULT '프로젝트 현장 관리 주간 리포트 - {date_range}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial config
INSERT INTO weekly_report_config (recipient_emails) 
VALUES (ARRAY['admin@example.com']);
```

**컬럼 설명:**
- `id`: UUID 기본키, 설정 고유 식별자
- `is_enabled`: 활성화 여부, 자동 발송 기능 활성화/비활성화
- `send_day_of_week`: 발송 요일, 0(일)~6(토) 중 선택 (기본값: 1-월요일)
- `send_hour`: 발송 시간, 0~23시 중 선택 (기본값: 9시)
- `send_minute`: 발송 분, 0~59분 중 선택 (기본값: 0분)
- `recipient_emails`: 수신자 이메일 배열, 리포트를 받을 이메일 목록
- `report_title_template`: 리포트 제목 템플릿, 이메일 제목 형식 지정
- `created_at`: 설정 생성 시각, 설정 등록 시점
- `updated_at`: 설정 수정 시각, 설정 변경 시점

---

### 10. Weekly Report History (주간 리포트 발송 이력)

주간 리포트 발송 기록과 재발송 관리를 위한 테이블. 발송 성공/실패 이력을 추적.

```sql
CREATE TABLE weekly_report_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  recipient_emails TEXT[] NOT NULL,
  send_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (send_status IN ('pending', 'sent', 'failed')),
  send_attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_weekly_report_period ON weekly_report_history(report_period_start, report_period_end);
CREATE INDEX idx_weekly_report_status ON weekly_report_history(send_status);
CREATE INDEX idx_weekly_report_date ON weekly_report_history(created_at DESC);
```

**컬럼 설명:**
- `id`: UUID 기본키, 리포트 발송 이력 고유 식별자
- `report_period_start`: 리포트 시작일, 집계 기간 시작점
- `report_period_end`: 리포트 종료일, 집계 기간 끝점
- `file_name`: 엑셀 파일명, 생성된 리포트 파일 이름
- `file_url`: 파일 URL, Storage에 저장된 엑셀 파일 경로
- `recipient_emails`: 수신자 목록, 실제 발송된 이메일 주소 배열
- `send_status`: 발송 상태, 대기중/발송완료/발송실패 중 하나
- `send_attempts`: 발송 시도 횟수, 재발송 횟수 추적
- `last_attempt_at`: 마지막 시도 시각, 최종 발송 시도 시점
- `sent_at`: 발송 완료 시각, 성공적으로 발송된 시점
- `error_message`: 오류 메시지, 발송 실패시 에러 내용
- `created_at`: 리포트 생성 시각, 리포트 작업 시작 시점

---

### 11. History Log Attachments (히스토리 로그 첨부파일)

히스토리 로그에 업로드되는 첨부파일(이미지/문서 등)을 관리하는 테이블. Supabase Storage 경로를 저장하며, 로그 단위로 다건 첨부를 지원합니다.

```sql
CREATE TABLE history_log_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  history_log_id UUID NOT NULL REFERENCES history_logs(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,           -- Supabase Storage 경로 (예: bucket/path/filename.ext)
  file_name TEXT NOT NULL,           -- 원본 파일명
  file_size INTEGER NOT NULL,        -- 바이트 단위
  mime_type TEXT,                    -- 예: image/png, application/pdf
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hla_log ON history_log_attachments(history_log_id, created_at DESC);
CREATE INDEX idx_hla_uploader ON history_log_attachments(uploaded_by);
```

**컬럼 설명:**
- `id`: UUID 기본키, 첨부파일 고유 식별자
- `history_log_id`: 연관된 히스토리 로그 ID, 삭제 시 CASCADE로 첨부파일도 함께 삭제
- `file_path`: Supabase Storage 상의 파일 경로
- `file_name`: 업로드 당시 파일명
- `file_size`: 파일 크기(바이트), 제한 검증용
- `mime_type`: MIME 타입 정보
- `uploaded_by`: 업로더 사용자 ID, 업로드 책임자 추적
- `created_at`: 업로드 시각

---

## Relationships & Foreign Keys

### 핵심 관계 구조 (단순화됨)
```
Users (1) ←→ (N) Projects
Users (1) ←→ (N) History_Logs (author_id)
Users (0..1) ←→ (N) History_Logs (target_user_id) -- 승인 로그만
Users (1) ←→ (N) Approval_Requests (요청자/승인자)
Projects (1) ←→ (N) Process_Stages
Projects (1) ←→ (N) History_Logs
Projects (1) ←→ (N) Project_Images
Projects (1) ←→ (N) Approval_Requests
Users (N) ←→ (N) Projects (Favorites - 다대다)
History_Logs (1) ←→ (N) History_Log_Attachments
```

### 외래키 제약조건
- **CASCADE 삭제**: projects 삭제시 관련 데이터 모두 삭제
- **참조 무결성**: 모든 외래키는 NOT NULL 또는 적절한 기본값 설정
- **고아 레코드 방지**: 상위 테이블 삭제시 하위 테이블 자동 정리

---

## Activity Tracking Implementation

### 단일 로그 테이블 + 별도 첨부파일 테이블 접근법의 장점

#### ✅ 단순성
- **핵심 로그 단일화**: 활동 기록은 `history_logs` 한 곳에 집중
- **첨부파일 분리**: 파일 메타데이터는 `history_log_attachments`로 분리되어 스토리지/용량 이슈와 무관하게 로그 쿼리 성능 유지
- **유지보수 용이**: 로그/첨부의 책임 분리로 변경 영향 최소화

#### ✅ 성능 최적화
- **인덱스 최적화**: `history_logs(author_id, created_at)`, `history_log_attachments(history_log_id, created_at)` 등 핵심 인덱스
- **캐싱 효율성**: 로그는 자주 조회, 첨부는 필요 시 지연 조회로 캐시 효율 개선
- **새로고침 최적화**: 필요한 시점에만 데이터 조회로 리소스 효율성 향상

#### ✅ 기능 완성도
- **Global Feed**: 모든 사용자 활동 통합 피드
- **User Activity**: `author_id` 필터로 사용자별 활동
- **Approval Flow**: `target_user_id` + `log_type`으로 승인 워크플로우 추적

### 로그 생성 시나리오

#### 1. 직접 로그 생성 (Direct Log Creation)
```sql
INSERT INTO history_logs (
  project_id, category, content, author_id, author_name, log_type
) VALUES (
  'project_uuid', '생산제작', '첫 번째 웰딩 작업 완료', 
  'user_uuid', '김현장', 'manual'
);
-- target_user_id는 NULL (승인과 무관한 직접 입력)
```

#### 2. 승인 요청 로그 (Approval Request Log)
```sql
-- approval_requests 테이블에 INSERT시 트리거가 자동 생성
INSERT INTO history_logs (
  project_id, category, content, author_id, author_name, 
  target_user_id, target_user_name, log_type
) VALUES (
  'project_uuid', '승인요청', '웰딩 작업 검수 요청', 
  'requester_uuid', '김작업자', 
  'approver_uuid', '박관리자', 'approval_request'
);
```

#### 3. 승인 응답 로그 (Approval Response Log)
```sql
-- approval_requests 테이블 UPDATE시 트리거가 자동 생성
INSERT INTO history_logs (
  project_id, category, content, author_id, author_name, 
  target_user_id, target_user_name, log_type, approval_status
) VALUES (
  'project_uuid', '승인처리', '검수 완료 - 다음 단계 진행 가능', 
  'approver_uuid', '박관리자', 
  'requester_uuid', '김작업자', 'approval_response', 'approved'
);
```

---

## Row Level Security (RLS) Policies

### 사용자 인증 기반 접근 제어

```sql
-- Users 테이블 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 정보만 조회 가능, 관리자는 모든 사용자 조회 가능
CREATE POLICY "Users can view own data or admins can view all" 
ON users FOR SELECT 
USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 사용자는 자신의 정보만 수정 가능
CREATE POLICY "Users can update own data" 
ON users FOR UPDATE 
USING (auth.uid() = id);
```

```sql
-- Projects 테이블 RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 승인된 사용자만 프로젝트 조회 가능
CREATE POLICY "Approved users can view projects" 
ON projects FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 승인된 사용자만 프로젝트 생성 가능
CREATE POLICY "Approved users can create projects" 
ON projects FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 승인된 사용자만 프로젝트 수정 가능
CREATE POLICY "Approved users can update projects" 
ON projects FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 프로젝트 삭제 방지 (CASCADE 삭제만 허용)
-- DELETE 정책 없음 - 프로젝트는 직접 삭제 불가
```

```sql
-- History Logs 테이블 RLS (통합 활동 추적)
ALTER TABLE history_logs ENABLE ROW LEVEL SECURITY;

-- 승인된 사용자만 로그 조회 가능, 삭제되지 않은 로그만
CREATE POLICY "Approved users can view active logs" 
ON history_logs FOR SELECT 
USING (
  is_deleted = false AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 로그 작성자만 자신의 로그 생성 가능
CREATE POLICY "Users can create own logs" 
ON history_logs FOR INSERT 
WITH CHECK (
  author_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 관리자만 로그 삭제 가능 (논리 삭제)
CREATE POLICY "Admins can delete logs" 
ON history_logs FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

```sql
-- Process Stages 테이블 RLS
ALTER TABLE process_stages ENABLE ROW LEVEL SECURITY;

-- 승인된 사용자는 조회 가능
CREATE POLICY "Approved users can view process stages" 
ON process_stages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 승인된 사용자는 생성 가능
CREATE POLICY "Approved users can create process stages" 
ON process_stages FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 승인된 사용자는 수정 가능
CREATE POLICY "Approved users can update process stages" 
ON process_stages FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 관리자만 삭제 가능
CREATE POLICY "Admins can delete process stages" 
ON process_stages FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

```sql
-- Approval Requests 테이블 RLS
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- 승인된 사용자는 조회 가능
CREATE POLICY "Approved users can view approval requests" 
ON approval_requests FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 승인된 사용자는 생성 가능
CREATE POLICY "Approved users can create approval requests" 
ON approval_requests FOR INSERT 
WITH CHECK (
  requester_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 승인자 또는 관리자만 수정 가능
CREATE POLICY "Approvers or admins can update requests" 
ON approval_requests FOR UPDATE 
USING (
  approver_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 관리자만 삭제 가능
CREATE POLICY "Admins can delete approval requests" 
ON approval_requests FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

```sql
-- Project Images 테이블 RLS
ALTER TABLE project_images ENABLE ROW LEVEL SECURITY;

-- 승인된 사용자는 조회 가능
CREATE POLICY "Approved users can view project images" 
ON project_images FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 승인된 사용자는 업로드 가능
CREATE POLICY "Approved users can upload images" 
ON project_images FOR INSERT 
WITH CHECK (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 업로더 또는 관리자만 수정 가능
CREATE POLICY "Uploaders or admins can update images" 
ON project_images FOR UPDATE 
USING (
  uploaded_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 업로더 또는 관리자만 삭제 가능
CREATE POLICY "Uploaders or admins can delete images" 
ON project_images FOR DELETE 
USING (
  uploaded_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

```sql
-- History Log Attachments 테이블 RLS
ALTER TABLE history_log_attachments ENABLE ROW LEVEL SECURITY;

-- 승인된 사용자이며, 접근 가능한 로그의 첨부만 조회 (삭제되지 않은 로그)
CREATE POLICY "Approved users can view attachments of accessible logs" 
ON history_log_attachments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM history_logs hl
    JOIN users u ON u.id = auth.uid()
    WHERE hl.id = history_log_id 
      AND hl.is_deleted = false 
      AND u.is_approved = true
  )
);

-- 본인이 업로드하거나 관리자만 수정 가능 (메타데이터 변경 등)
CREATE POLICY "Uploaders or admins can update attachments" 
ON history_log_attachments FOR UPDATE 
USING (
  uploaded_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- 업로더만 생성 가능 (승인된 사용자)
CREATE POLICY "Approved users can create attachments" 
ON history_log_attachments FOR INSERT 
WITH CHECK (
  uploaded_by = auth.uid() AND 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_approved = true)
);

-- 업로더 또는 관리자만 삭제 가능
CREATE POLICY "Uploaders or admins can delete attachments" 
ON history_log_attachments FOR DELETE 
USING (
  uploaded_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
```

```sql
-- Notifications 테이블 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 자신의 알림 조회, 관리자는 모든 알림 조회
CREATE POLICY "Users view own notifications or admins view all" 
ON notifications FOR SELECT 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 관리자만 알림 생성 가능 (Edge Functions는 service role 사용)
CREATE POLICY "Admins can create notifications" 
ON notifications FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 자신의 알림 수정(읽음 처리), 관리자는 모든 알림 수정
CREATE POLICY "Users update own notifications or admins update all" 
ON notifications FOR UPDATE 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 관리자만 알림 삭제 가능
CREATE POLICY "Admins can delete notifications" 
ON notifications FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

```sql
-- Weekly Report Config 테이블 RLS
ALTER TABLE weekly_report_config ENABLE ROW LEVEL SECURITY;

-- 승인된 사용자는 조회 가능
CREATE POLICY "Approved users can view report config" 
ON weekly_report_config FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 관리자만 생성 가능
CREATE POLICY "Admins can create report config" 
ON weekly_report_config FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 관리자만 수정 가능
CREATE POLICY "Admins can update report config" 
ON weekly_report_config FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 관리자만 삭제 가능
CREATE POLICY "Admins can delete report config" 
ON weekly_report_config FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

```sql
-- Weekly Report History 테이블 RLS
ALTER TABLE weekly_report_history ENABLE ROW LEVEL SECURITY;

-- 승인된 사용자는 조회 가능
CREATE POLICY "Approved users can view report history" 
ON weekly_report_history FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 관리자만 생성 가능 (Edge Functions는 service role 사용)
CREATE POLICY "Admins can create report history" 
ON weekly_report_history FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 관리자만 수정 가능
CREATE POLICY "Admins can update report history" 
ON weekly_report_history FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 관리자만 삭제 가능
CREATE POLICY "Admins can delete report history" 
ON weekly_report_history FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

```sql
-- Project Favorites 테이블 RLS
ALTER TABLE project_favorites ENABLE ROW LEVEL SECURITY;

-- 자신의 즐겨찾기 조회, 관리자는 모든 즐겨찾기 조회
CREATE POLICY "Users view own favorites or admins view all" 
ON project_favorites FOR SELECT 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 자신의 즐겨찾기만 생성 가능
CREATE POLICY "Users can create own favorites" 
ON project_favorites FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- 자신의 즐겨찾기만 삭제 가능
CREATE POLICY "Users can delete own favorites" 
ON project_favorites FOR DELETE 
USING (user_id = auth.uid());
```

### RLS 정책 설계 원칙
- **최소 권한 원칙**: 필요한 최소한의 데이터만 접근 허용
- **역할 기반 제어**: admin/user 역할에 따른 차별화된 접근
- **승인 기반 제어**: is_approved 상태 확인 후 데이터 접근
- **논리 삭제 지원**: 물리 삭제 대신 is_deleted 플래그 활용
- **작성자 권한**: 로그는 작성자만 생성 가능
- **Auth 무결성**: auth.users와 public.users 간 FK 제약으로 데이터 일관성 보장

---

## Indexes & Performance Optimization

### 활동 추적을 위한 특화 인덱스

```sql
-- 프로젝트별 로그 조회 최적화
CREATE INDEX idx_history_logs_project_timeline 
ON history_logs (project_id, created_at DESC, is_deleted) 
WHERE is_deleted = FALSE;

-- 카테고리별 집계 최적화 (주간 리포트용)
CREATE INDEX idx_history_logs_category_date 
ON history_logs (category, created_at, is_deleted) 
WHERE is_deleted = FALSE;

-- 로그 첨부파일 조회 최적화 (로그 상세/리스트 병행)
CREATE INDEX idx_hla_log_created 
ON history_log_attachments (history_log_id, created_at DESC);
```

### 기타 성능 최적화

```sql
-- 프로젝트 검색 최적화
CREATE INDEX idx_projects_search ON projects 
USING GIN (to_tsvector('korean', site_name || ' ' || product_name));

-- 날짜 범위 검색 최적화 (간트차트)
CREATE INDEX idx_process_stages_date_range ON process_stages 
(project_id, start_date, end_date) WHERE start_date IS NOT NULL;

-- 즐겨찾기 조회 최적화
CREATE INDEX idx_favorites_user_projects ON project_favorites 
(user_id) INCLUDE (project_id);

-- 대기 중인 승인 요청 최적화
CREATE INDEX idx_approval_requests_pending_priority 
ON approval_requests (approver_id, status, created_at DESC) 
WHERE status = 'pending';
```

### 성능 최적화 전략
- **복합 인덱스**: 자주 함께 조회되는 컬럼 조합
- **부분 인덱스**: WHERE 조건이 있는 쿼리 최적화  
- **포함 인덱스**: SELECT에 필요한 컬럼 포함으로 성능 향상
- **GIN 인덱스**: 전문 검색 지원
- **타임스탬프 DESC**: 최신 데이터 우선 조회 최적화

---

## Manual Refresh Strategy

### 수동 갱신 아키텍처

프로젝트는 Supabase Realtime 대신 새로고침 버튼을 통한 수동 데이터 갱신 방식을 채택합니다. 이는 더 안정적이고 예측 가능한 사용자 경험을 제공합니다.

#### 핵심 특징
- **사용자 제어**: 사용자가 직접 새로고침 시점을 결정
- **안정성**: 실시간 연결 오류나 네트워크 이슈로부터 자유로움
- **예측 가능성**: 데이터 갱신 시점이 명확하여 UX 혼란 방지
- **성능 최적화**: 필요한 시점에만 데이터를 가져와 리소스 효율성 향상

#### 구현 방식

**1. 글로벌 새로고침 버튼**
```typescript
// 홈 화면 전체 로그 피드 새로고침
const refreshGlobalFeed = async () => {
  const { data, error } = await supabase
    .from('history_logs')
    .select('*, projects(site_name)')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(50);
};
```

**2. 프로젝트별 새로고침**
```typescript
// 특정 프로젝트 상세 정보 새로고침
const refreshProjectData = async (projectId: string) => {
  const [projectData, processStages, historyLogs] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('process_stages').select('*').eq('project_id', projectId),
    supabase.from('history_logs').select('*').eq('project_id', projectId)
  ]);
};
```

**3. 승인 요청 상태 새로고침**
```typescript
// 사용자별 대기 중인 승인 요청 새로고침
const refreshApprovalRequests = async (userId: string) => {
  const { data } = await supabase
    .from('approval_requests')
    .select('*, projects(site_name)')
    .eq('approver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
};
```

#### UI/UX 설계 원칙

**새로고침 버튼 배치**
- **홈 화면**: 우상단에 전체 새로고침 버튼
- **프로젝트 상세**: 각 섹션별 개별 새로고침 버튼
- **승인 목록**: 승인 요청 목록 상단에 새로고침 버튼
- **간트차트**: 차트 뷰 새로고침 버튼

**로딩 상태 표시**
- 새로고침 중 스피너 표시
- 마지막 업데이트 시간 표시
- 새로고침 완료 시 간단한 피드백 제공

**자동 새로고침 트리거**
- 승인 요청/응답 완료 후 자동 새로고침
- 프로젝트 생성/수정 완료 후 자동 새로고침
- 로그 입력 완료 후 관련 뷰 자동 새로고침

---

## Triggers & Functions

### 자동화된 로그 생성 시스템

```sql
-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 모든 updated_at 컬럼이 있는 테이블에 트리거 적용
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON projects 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_process_stages_updated_at 
  BEFORE UPDATE ON process_stages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_report_config_updated_at 
  BEFORE UPDATE ON weekly_report_config 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

```sql
-- 승인/반려 자동 로그 생성 (핵심 기능)
-- 주의: 승인 요청은 현재 수동으로 생성되며, 응답만 트리거로 자동 생성됨
CREATE OR REPLACE FUNCTION create_approval_log()
RETURNS TRIGGER AS $$
BEGIN
  -- 승인/반려 처리시 history_logs에 응답 로그 생성
  -- UPDATE 작업만 처리 (INSERT는 서비스 레이어에서 처리)
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
$$ language 'plpgsql';

-- 승인 응답시에만 트리거 실행 (중복 트리거 제거됨)
CREATE TRIGGER approval_response_log_trigger
  AFTER UPDATE ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION create_approval_log();
```

```sql
-- (옵션) 첨부파일 정리 트리거 예시: 로그 삭제 시 관련 파일 정리 로직을 Edge Function으로 위임
-- 실제 파일 삭제는 보안상 서버(Edge Function/service role)에서 처리 권장
-- 여기서는 DB 레코드 CASCADE만 담당
```

```sql
-- Auth와 Users 테이블 동기화 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users에 새 사용자 생성시 public.users에 자동 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auth 이메일 변경시 Users 테이블 동기화
CREATE OR REPLACE FUNCTION handle_user_email_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users 
  SET email = NEW.email,
      updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_email_update();
```

### 트리거 기능
- **자동 타임스탬프**: updated_at 컬럼 자동 관리
- **자동 로그 생성**: 승인 요청/응답시 history_logs 자동 생성
- **이중 추적**: approval_requests(상태) + history_logs(불변 이력)
- **데이터 일관성**: 관련 테이블간 데이터 동기화
- **Auth 동기화**: auth.users와 public.users 간 자동 동기화 (신규 가입, 이메일 변경)

---

## Migration Strategy

### 단계별 마이그레이션 계획

**Phase 1: 핵심 테이블 생성**
1. users 테이블 생성 (auth.users FK 참조 포함)
2. Auth 동기화 트리거 설정
3. projects 테이블 생성
4. 기본 RLS 정책 적용
5. 사용자 인증 시스템 연동

**Phase 2: 통합 활동 추적 시스템**
1. **history_logs 테이블 생성** (핵심 - 단일 활동 추적)
2. 글로벌 피드 및 사용자 활동 추적 기능 구현
3. 새로고침 기반 데이터 갱신 시스템 및 성능 최적화

**Phase 3: 승인 워크플로우**
1. approval_requests 테이블 추가
2. 승인 프로세스 구현 (history_logs와 연동)
3. 자동 로그 생성 트리거 구현

**Phase 4: 프로젝트 관리 확장**  
1. process_stages, project_images 테이블 추가
2. 파일 업로드 시스템 연동
3. 간트차트 데이터 구조 검증

**Phase 5: 고급 기능**
1. notifications, 리포트 관련 테이블 추가
2. 주간 리포트 자동화
3. 종합 성능 최적화

### 롤백 전략
- **스냅샷 기반**: 각 단계별 데이터베이스 백업
- **점진적 배포**: 기능별 단계적 활성화
- **호환성 보장**: 기존 API 인터페이스 유지
- **단순성 우선**: 복잡한 구조 대신 단순하고 효과적인 설계

---

## Key Benefits of Simplified Design

### 🎯 단순성과 효율성
- **단일 테이블**: history_logs 하나로 모든 활동 추적
- **복잡성 제거**: user_activity_logs 제거로 스키마 단순화
- **유지보수 용이**: 적은 테이블로 관리 부담 감소

### ⚡ 성능 최적화
- **인덱스 최적화**: author_id, created_at 기반 효율적 쿼리
- **캐싱 효율성**: 단일 테이블 캐시 전략
- **새로고침 최적화**: 필요한 시점에만 데이터 조회로 리소스 효율성 향상

### 🔄 완전한 기능성
- **Global Feed**: 모든 활동을 시간순으로 표시
- **User Activity Tracking**: author_id 필터로 사용자별 활동 추적
- **Approval Workflow**: target_user_id로 승인 관련 로그 완전 추적

### 📊 확장성과 유연성
- **미래 확장**: 새로운 로그 타입 쉽게 추가 가능
- **데이터 일관성**: 단일 소스로 일관성 보장
- **분석 용이성**: 모든 활동 데이터가 한 곳에 집중

---

이 단순화된 스키마는 과도한 설계(over-engineering)을 피하고, 실제 요구사항에 맞는 효율적이고 유지보수 가능한 데이터베이스 구조를 제공합니다. history_logs 테이블 하나로 글로벌 피드와 사용자별 활동 추적을 동시에 지원하면서도, 승인 워크플로우의 완전한 추적이 가능합니다. 새로고침 기반 데이터 갱신 방식을 통해 안정적이고 예측 가능한 사용자 경험을 제공합니다.