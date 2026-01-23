# 프로젝트 현장 관리 솔루션 - 폴더 구조

## 📁 프로젝트 구조 개요

```
projectAdminManagment/
├── app/                          # Next.js 14 App Router
├── components/                   # React 컴포넌트
├── lib/                         # 비즈니스 로직, 유틸리티, 서비스
├── public/                      # 정적 파일
├── supabase/                    # Supabase 설정 및 Edge Functions
├── types/                       # TypeScript 타입 정의
├── styles/                      # 글로벌 스타일
└── config files                 # 설정 파일들
```

## 📂 상세 폴더 구조

```
projectAdminManagment/
├── app/                                 # Next.js 14 App Router
│   ├── (auth)/                         # 인증 관련 라우트 그룹
│   │   ├── login/                      # 로그인 페이지
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── signup/                     # 회원가입 페이지
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── reset-password/             # 비밀번호 재설정
│   │   │   ├── page.tsx                # 재설정 메일 요청 페이지 (구현됨)
│   │   │   ├── confirm/                # 메일 링크 진입 후 비밀번호 변경 (구현됨)
│   │   │   │   └── page.tsx
│   │   │   └── loading.tsx
│   │   ├── loading.tsx                  # 인증 페이지 로딩
│   │   └── layout.tsx                  # 인증 레이아웃
│   │                                    # → 인증 섹션 레이아웃 (Auth routes 전용)
│   │
│   ├── (dashboard)/                    # 메인 대시보드 라우트 그룹
│   │   ├── page.tsx                    # 홈 대시보드 (글로벌 로그 피드)
│   │   ├── loading.tsx                 # 대시보드 로딩
│   │   ├── projects/                   # 프로젝트 관리
│   │   │   ├── page.tsx                # 프로젝트 목록
│   │   │   ├── loading.tsx             # 프로젝트 목록 로딩
│   │   │   ├── [id]/                   # 프로젝트 상세
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx         # 프로젝트 상세 로딩
│   │   │   │   ├── edit/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── logs/               # 히스토리 로그
│   │   │   │   │   └── page.tsx
│   │   │   │   └── approval/           # 승인 관리
│   │   │   │       └── page.tsx
│   │   │   ├── new/                    # 프로젝트 생성
│   │   │   │   └── page.tsx
│   │   │   └── favorites/              # 즐겨찾기 프로젝트
│   │   │       └── page.tsx
│   │   │
│   │   ├── gantt/                      # 간트차트 뷰
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   │
│   │   ├── calendar/                   # 캘린더 뷰
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   │
│   │   ├── admin/                      # 관리자 전용
│   │   │   ├── loading.tsx             # 관리자 페이지 로딩
│   │   │   ├── users/                  # 사용자 관리 (구현됨)
│   │   │   │   └── page.tsx
│   │   │   ├── reports/                # 리포트 관리
│   │   │   │   └── page.tsx
│   │   │   └── profile/                # 사용자 프로필 설정
│   │   │       └── page.tsx
│   │   │
│   │   ├── notifications/              # 알림 센터
│   │   │   └── page.tsx
│   │   │
│   │   ├── @modal/                     # 병렬 라우트 (모달)
│   │   │   ├── (.)projects/[id]/
│   │   │   │   └── page.tsx
│   │   │   └── default.tsx
│   │   │
│   │   └── layout.tsx                  # 대시보드 레이아웃
│   │
│   ├── auth/                           # 인증 관련 라우트
│   │   └── callback/                   # 이메일 인증 콜백
│   │       └── route.ts                # Supabase Auth 이메일 확인 처리
│   │
│   ├── api/                            # API 라우트 (필요시)
│   │   ├── webhooks/
│   │   │   └── route.ts
│   │   └── cron/
│   │       └── route.ts
│   │
│   ├── layout.tsx                      # 루트 레이아웃
│   ├── loading.tsx                     # 글로벌 로딩
│   ├── error.tsx                       # 글로벌 에러 핸들링
│   ├── not-found.tsx                   # 404 페이지
│   └── global-error.tsx                # 글로벌 에러 바운더리
│
├── components/                          # React 컴포넌트
│   ├── auth/                          # 인증 관련 컴포넌트
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   ├── ResetPasswordForm.tsx
│   │   ├── AuthGuard.tsx              # 클라이언트 사이드 라우트 보호
│   │   └── index.ts
│   │
│   ├── projects/                      # 프로젝트 관련 컴포넌트
│   │   ├── ProjectList.tsx            # 프로젝트 목록 메인 컴포넌트 (구현됨)
│   │   ├── ProjectCard.tsx            # 프로젝트 카드 컴포넌트 (구현됨)
│   │   ├── ProjectDetail.tsx
│   │   ├── ProjectForm.tsx
│   │   ├── ProjectFilters.tsx         # 필터링 컴포넌트 (구현됨)
│   │   ├── ProjectSearch.tsx          # 검색 컴포넌트 (구현됨)
│   │   ├── ProcessStages.tsx          # 공정 단계 관리 (구현됨)
│   │   ├── ExportProjectModal.tsx     # 프로젝트 내보내기 모달 (구현됨)
│   │   ├── ProcessStageSelector.tsx
│   │   ├── FavoriteButton.tsx
│   │   ├── ImageCarousel.tsx          # 이미지 캐러셀 컴포넌트 (구현됨)
│   │   └── index.ts                   # 컴포넌트 export 인덱스 (구현됨)
│   │
│   ├── logs/                          # 히스토리 로그 컴포넌트
│   │   ├── LogList.tsx
│   │   ├── LogItem.tsx
│   │   ├── LogForm.tsx
│   │   ├── LogCategories.tsx
│   │   └── GlobalLogFeed.tsx          # 글로벌 로그 피드
│   │
│   ├── approval/                      # 승인 관련 컴포넌트
│   │   ├── ApprovalRequest.tsx
│   │   ├── ApprovalList.tsx
│   │   ├── ApprovalModal.tsx
│   │   └── ApprovalStatus.tsx
│   │
│   ├── gallery/                       # 이미지 갤러리 컴포넌트
│   │   ├── ImageGallery.tsx
│   │   ├── ImageUploader.tsx
│   │   ├── ThumbnailGrid.tsx
│   │   └── ImageViewer.tsx
│   │
│   ├── calendar/                      # 캘린더 관련 컴포넌트
│   │   ├── CalendarView.tsx
│   │   ├── CalendarEvent.tsx
│   │   ├── CalendarFilters.tsx
│   │   └── CalendarSettings.tsx
│   │
│   ├── gantt/                         # 간트차트 관련 컴포넌트
│   │   ├── GanttChart.tsx             # 간트차트 메인 컴포넌트 (프로젝트 필터링 지원)
│   │   ├── ProjectSelectModal.tsx     # 프로젝트 선택 모달 (다중 선택, 검색, 페이지네이션)
│   │   ├── CustomTaskList.tsx         # 커스텀 태스크 리스트
│   │   ├── GanttTask.tsx
│   │   ├── GanttTimeline.tsx
│   │   └── GanttSettings.tsx
│   │
│   ├── dashboard/                     # 대시보드 관련 컴포넌트
│   │   ├── DashboardStats.tsx
│   │   ├── RecentActivity.tsx
│   │   ├── PendingApprovals.tsx
│   │   └── QuickActions.tsx
│   │
│   ├── admin/                         # 관리자 전용 컴포넌트 (구현됨)
│   │   ├── UsersManagement.tsx        # 사용자 관리 메인 컴포넌트
│   │   ├── UserStatsCards.tsx         # 사용자 통계 카드
│   │   ├── UserTable.tsx              # 사용자 목록 테이블
│   │   ├── UserDetailModal.tsx        # 사용자 상세 정보 모달
│   │   ├── UserActions.tsx            # 사용자 액션 버튼
│   │   └── index.ts                   # 컴포넌트 export
│   │
│   ├── notifications/                 # 알림 관련 컴포넌트
│   │   ├── NotificationList.tsx
│   │   ├── NotificationItem.tsx
│   │   ├── NotificationBell.tsx
│   │   └── NotificationSettings.tsx
│   │
│   ├── common/                        # 공통 UI 컴포넌트
│   │   ├── NavigationProgress.tsx     # 페이지 전환 로딩 인디케이터 (구현됨)
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Navigation.tsx
│   │   ├── ui/                        # 기본 UI 컴포넌트
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Alert.tsx
│   │   │   ├── Loading.tsx            # 로딩 컴포넌트 (구현됨)
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── index.ts                # UI 컴포넌트 export
│   │   └── forms/                     # 폼 관련 컴포넌트
│   │       ├── FormField.tsx
│   │       ├── FormError.tsx
│   │       └── DatePicker.tsx
│   │
│   └── providers/                     # Context Providers
│       ├── AuthProvider.tsx          # 인증 상태 관리 Provider (구현됨)
│       ├── ThemeProvider.tsx
│       └── NotificationProvider.tsx
│
├── lib/                               # 비즈니스 로직 및 유틸리티
│   ├── supabase/                     # Supabase 클라이언트 설정
│   │   ├── client.ts                 # 클라이언트 사이드 Supabase
│   │   ├── server.ts                 # 서버 사이드 Supabase (구현됨)
│   │   ├── admin.ts                  # Admin 클라이언트
│   │   └── middleware.ts             # Supabase 미들웨어
│   │
│   ├── database/                     # 데이터베이스 관련
│   │   ├── schema.sql                # 데이터베이스 스키마
│   │   ├── seeds/                    # 시드 데이터
│   │   │   └── initial.sql
│   │   ├── types/                    # 자동 생성된 DB 타입
│   │   │   └── supabase.ts
│   │   └── queries.ts                # 재사용 가능한 쿼리
│   │
│   ├── services/                     # 서비스 레이어
│   │   ├── auth.service.ts          # 인증 서비스 (구현됨 - 승인 체크 포함)
│   │   ├── approval.service.ts      # 승인 워크플로우 서비스 (구현됨)
│   │   ├── email.service.ts         # 이메일 발송 서비스 (구현됨)
│   │   ├── kakao.client.service.ts  # 카카오톡 클라이언트 서비스 (구현됨)
│   │   ├── projects.service.ts      # 프로젝트 관리 서비스
│   │   ├── logs.service.ts          # 로그 관리 서비스 (카카오톡 발송 추가됨)
│   │   ├── notification.service.ts  # 알림 서비스
│   │   ├── storage.service.ts       # 파일 스토리지 서비스
│   │   └── report.service.ts        # 리포트 생성 서비스
│   │
│   ├── hooks/                        # React Hooks
│   │   ├── useAuth.ts               # 인증 관련 커스텀 훅 (구현됨)
│   │   ├── useProjects.ts
│   │   ├── useRefresh.ts             # 수동 새로고침 관리
│   │   ├── useNotifications.ts      # 알림 관련 커스텀 훅 (구현됨 - DB 연동)
│   │   ├── useDebounce.ts
│   │   ├── useInfiniteScroll.ts
│   │   └── useMediaQuery.ts
│   │
│   ├── store/                        # Zustand 상태 관리
│   │   ├── auth.store.ts            # 인증 상태 전역 관리 (구현됨)
│   │   ├── projects.store.ts
│   │   ├── ui.store.ts
│   │   └── notifications.store.ts   # 알림 상태 전역 관리 (구현됨 - 실시간 업데이트)
│   │
│   ├── utils/                        # 유틸리티 함수
│   │   ├── date.ts                  # 날짜 관련 유틸
│   │   ├── format.ts                # 포맷팅 유틸
│   │   ├── validation.ts            # 유효성 검사
│   │   ├── constants.ts             # 상수 정의
│   │   ├── permissions.ts           # 권한 체크 유틸
│   │   └── excel.ts                 # 엑셀 파일 생성 및 내보내기 유틸 (구현됨)
│   │
│   └── config/                       # 설정 파일
│       ├── process-stages.ts        # 공정 단계 설정
│       ├── log-categories.ts        # 로그 카테고리 설정
│       └── permissions.ts           # 권한 설정
│
├── supabase/                         # Supabase 설정
│   ├── functions/                   # Edge Functions
│   │   ├── send-kakao/              # 카카오톡 알림톡 발송 (구현됨)
│   │   │   └── index.ts             # SOLAPI 연동 Edge Function
│   │   ├── send-kakao-notification/
│   │   │   └── index.ts
│   │   ├── send-email/
│   │   │   └── index.ts
│   │   ├── generate-weekly-report/
│   │   │   └── index.ts
│   │   └── _shared/
│   │       └── cors.ts
│   ├── migrations/                  # Supabase 마이그레이션
│   └── config.toml                  # Supabase 설정
│
├── types/                            # TypeScript 타입 정의
│   ├── user.ts
│   ├── project.ts                   # 프로젝트 타입 정의 (구현됨)
│   ├── log.ts
│   ├── approval.ts
│   ├── kakao.ts                     # 카카오톡 알림톡 타입 정의 (구현됨)
│   ├── notification.ts
│   ├── database.ts                  # 데이터베이스 타입 정의 (구현됨)
│   ├── api.ts
│   └── global.d.ts
│
├── styles/                           # 스타일 파일
│   ├── globals.css                  # 글로벌 스타일 (프로젝트 컴포넌트 스타일 추가)
│   ├── variables.css                # CSS 변수
│   └── tailwind/                    # Tailwind 커스텀
│       └── components.css
│
├── public/                           # 정적 파일
│   ├── images/
│   │   ├── logo.svg
│   │   └── placeholder.png
│   ├── fonts/
│   └── icons/
│
├── tests/                            # 테스트 파일
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── scripts/                          # 스크립트 파일
│   ├── generate-types.ts            # DB 타입 생성
│   └── seed-database.ts             # 데이터베이스 시딩
│
├── middleware.ts                     # Next.js 미들웨어 (서버 사이드 라우트 보호)
├── .env.local                        # 환경 변수
├── .env.example                      # 환경 변수 예시
├── .gitignore
├── next.config.js                    # Next.js 설정
├── tailwind.config.js                # Tailwind CSS 설정
├── tsconfig.json                     # TypeScript 설정
├── package.json
├── README.md
├── CLAUDE.md                         # Claude AI 지침
├── PRD.md                           # 기획 문서
├── DATABASE_SCHEMA.md               # 데이터베이스 스키마 문서
├── INDEX_FILE.md                    # 파일 인덱스
└── FOLDER_STRUCTURE.md              # 이 문서

```

## 🏗️ 아키텍처 설계 원칙

### 1. **App Router 최적화**
- Route Groups을 활용한 논리적 구조화
- Parallel Routes (`@modal`)로 모달 UX 개선
- Dynamic Routes로 유연한 라우팅
- Loading/Error 파일로 사용자 경험 향상

### 2. **컴포넌트 설계**
- **Feature-based**: 기능별로 컴포넌트 그룹화
- **Atomic Design**: 공통 UI 컴포넌트 재사용
- **Server/Client 분리**: 성능 최적화
- **Compound Components**: 복잡한 UI 패턴 관리

### 3. **데이터 레이어**
- **Services**: 비즈니스 로직 캡슐화
- **Hooks**: React 상태 관리
- **Store**: Zustand로 전역 상태 관리
- **Database**: 타입 안전성과 마이그레이션 관리

### 4. **보안 및 권한**
- Route 레벨 보호 (middleware)
- RLS (Row Level Security) 적용
- 역할 기반 접근 제어 (RBAC)
- 환경 변수 격리

## 📋 주요 기능별 파일 매핑

### 인증 시스템 (✅ 구현 완료)
- **페이지**: `app/(auth)/login`, `signup`, `reset-password`
- **컴포넌트**: `components/auth/*`
- **서비스**: `lib/services/auth.service.ts` (완료)
- **스토어**: `lib/store/auth.store.ts` (완료)
- **훅**: `lib/hooks/useAuth.ts` (완료)
- **Provider**: `components/providers/AuthProvider.tsx` (완료)
- **기능**:
  - JWT 토큰 발급 및 자동 갱신
  - 인증 상태 전역 관리 (Zustand)
  - 미승인 사용자 자동 로그아웃
  - 페이지 새로고침 시 인증 상태 유지
  - 자동 라우팅 보호
  - 비밀번호 재설정 이메일 발송 (`/reset-password`) 및 확인 (`/reset-password/confirm`)
  - 재설정 성공 시 세션 종료 후 `/login`으로 유도 (`/login?reset=success` 메시지 처리)

### 역할 기반 접근 제어 (✅ 구현 완료)
- **페이지**: `app/(dashboard)/admin/users`
- **컴포넌트**: `components/admin/*`
- **서비스**: `lib/services/approval.service.ts`, `email.service.ts`
- **미들웨어**: `lib/supabase/middleware.ts` (강화됨)
- **기능**:
  - 관리자/일반 사용자 역할 분리
  - 신규 가입자 승인 대기 시스템
  - 관리자 승인/거절 워크플로우
  - 승인 상태별 로그인 메시지
  - 이메일 알림 시스템
  - Role별 라우트 보호

### 사용자 프로필 설정 (✅ 구현 완료)
- **페이지**: `app/(dashboard)/profile`
- **컴포넌트**: 기존 설정 페이지 컴포넌트 활용
- **서비스**: `lib/services/auth.service.ts` (updateUserProfile 메서드)
- **기능**:
  - 사용자 이름 및 전화번호 변경
  - 이메일 표시 (변경 불가)
  - 프로필 정보 실시간 업데이트
  - 사이드바 프로필 아이콘 및 텍스트 통일

### 프로젝트 관리
- **페이지**: `app/(dashboard)/projects/*`
- **컴포넌트**: `components/projects/*`
- **서비스**: `lib/services/projects.service.ts`
- **타입**: `types/project.ts`

### 히스토리 로그
- **페이지**: `app/(dashboard)/projects/[id]/logs`
- **컴포넌트**: `components/logs/*`
- **서비스**: `lib/services/logs.service.ts`

### 승인 워크플로우
- **컴포넌트**: `components/approval/*`
- **서비스**: `lib/services/approval.service.ts`
- **타입**: `types/approval.ts`

### 간트차트 & 캘린더
- **페이지**: `app/(dashboard)/gantt`, `calendar`
- **컴포넌트**: `components/gantt/*`, `components/calendar/*`

### 알림 시스템
- **서비스**: `lib/services/notification.service.ts`, `kakao.service.ts`, `email.service.ts`
- **Edge Functions**: `supabase/functions/send-*`

### 주간 리포트
- **Edge Function**: `supabase/functions/generate-weekly-report`
- **서비스**: `lib/services/report.service.ts`
- **유틸**: `lib/utils/excel.ts`

## 🚀 개발 가이드

### 새로운 기능 추가 시
1. **페이지**: `app/(dashboard)/[feature]` 디렉토리 생성
2. **컴포넌트**: `components/[feature]/` 디렉토리에 관련 컴포넌트 추가
3. **서비스**: `lib/services/[feature].service.ts` 생성
4. **타입**: `types/[feature].ts` 정의
5. **훅**: 필요시 `lib/hooks/use[Feature].ts` 생성

### 파일 명명 규칙
- **컴포넌트**: PascalCase (예: `ProjectCard.tsx`)
- **서비스/유틸**: camelCase (예: `auth.service.ts`)
- **타입**: camelCase (예: `project.ts`)
- **페이지**: kebab-case 디렉토리 (예: `reset-password`)

### 임포트 경로
```typescript
// 절대 경로 사용 (tsconfig.json 설정)
import { ProjectCard } from '@/components/projects/ProjectCard'
import { useAuth } from '@/lib/hooks/useAuth'
import { ProjectService } from '@/lib/services/projects.service'
```

## 📝 참고사항

- 이 구조는 Next.js 14의 최신 패턴을 반영합니다
- Supabase와의 통합을 고려하여 설계되었습니다
- 확장 가능하고 유지보수가 용이한 구조입니다
- 타입 안전성과 성능 최적화를 중점으로 설계되었습니다