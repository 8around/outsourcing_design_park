# 📋 주간 리포트 고정 스케줄 설정 구현 계획

## 🎯 목표
주간 리포트를 **매주 월요일 오전 9시 (한국 시간)**에 자동 발송하도록 고정 설정

## 📝 구현 계획

### 1️⃣ **ReportConfiguration.tsx 컴포넌트 수정**

#### 제거할 UI 요소들
- ❌ 활성화 체크박스 (143-155행 제거)
- ❌ 발송 요일/시간 설정 (158-209행 제거)
- ❌ 리포트 제목 템플릿 설정 (211-226행 제거)
- ✅ 수신자 이메일 관리 기능만 유지

#### 대신 추가할 고정 설정 정보 표시
```tsx
// 고정된 설정 표시
<div className="bg-blue-50 p-4 rounded-md mb-6">
  <p className="text-sm text-blue-800">
    📅 주간 리포트는 <strong>매주 월요일 오전 9시</strong>에 자동 발송됩니다.
  </p>
</div>
```

### 2️⃣ **Edge Function 수정**

**파일 경로**: `/supabase/functions/generate-weekly-report/index.ts`

#### 수정 사항
1. 시간 체크 로직 제거 (checkScheduledTime 함수 호출 부분 삭제)
2. 제목 템플릿 고정값 사용:
```typescript
const reportTitle = "프로젝트 현장 관리 주간 리포트 - {date_range}";
```

### 3️⃣ **Supabase에서 고정 Cron Job 설정**

SQL Editor에서 다음 쿼리 실행:

```sql
-- 1. Vault에 보안 정보 저장
SELECT vault.create_secret('https://[your-project-ref].supabase.co', 'project_url');
SELECT vault.create_secret('[your-service-role-key]', 'service_role_key');

-- 2. 기존 cron job 제거 (있는 경우)
SELECT cron.unschedule('weekly-report-generator');
SELECT cron.unschedule('weekly-report-hourly-check');

-- 3-1. 테스트용: 10분마다 실행하는 cron job
SELECT cron.schedule(
  'weekly-report-test-10min',
  '*/10 * * * *', -- 매 10분마다 실행
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/generate-weekly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"trigger": "cron", "test": true}'::jsonb
  );
  $$
);

-- 3-2. 운영용: 매주 월요일 오전 9시 (한국 시간) 고정 cron job
SELECT cron.schedule(
  'weekly-report-monday-9am-kst',
  '0 0 * * 1', -- UTC 00:00 = 한국시간 09:00 (매주 월요일)
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/generate-weekly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);

-- 4. cron job 확인
SELECT * FROM cron.job;
```

### 4️⃣ **데이터베이스 정리**

**weekly_report_config 테이블 사용 현황**:
- `recipient_emails`: ✅ 계속 사용 (수신자 이메일 관리)
- `is_enabled`: ❌ 사용 안 함 (항상 활성화)
- `send_day_of_week`: ❌ 사용 안 함 (월요일 고정)
- `send_hour`: ❌ 사용 안 함 (9시 고정)
- `send_minute`: ❌ 사용 안 함 (0분 고정)
- `report_title_template`: ❌ 사용 안 함 (고정 템플릿)

## ✅ 변경 후 장점

1. **간단한 구조**: 설정 변경 로직 제거로 코드 단순화
2. **안정성 향상**: 고정 스케줄로 예측 가능한 동작
3. **유지보수 용이**: 스케줄 변경 시 SQL만 수정
4. **리소스 효율**: 불필요한 조건 체크 제거

## 📊 예상 결과

- 매주 월요일 오전 9시 정각에 주간 리포트 자동 생성 및 발송
- 관리자는 수신자 이메일만 관리
- 테스트 발송 기능은 그대로 유지

## 🔧 Cron 표현식 참고

### 테스트용 표현식
```
*/10 * * * *
│    │ │ │ └── 요일 (* = 모든 요일)
│    │ │ └──── 월 (* = 매월)
│    │ └────── 일 (* = 매일)
│    └──────── 시간 (* = 모든 시간)
└──────────── 분 (*/10 = 10분마다)
```

### 운영용 표현식
```
0 0 * * 1
│ │ │ │ └── 요일 (1 = 월요일)
│ │ │ └──── 월 (* = 매월)
│ │ └────── 일 (* = 매일)
│ └──────── 시간 (0 = UTC 자정 = 한국시간 오전 9시)
└────────── 분 (0 = 0분)
```

### ⏰ 타임존 변환표
| UTC 시간 | 한국 시간 (UTC+9) |
|----------|------------------|
| 00:00 | 09:00 (오전 9시) ✅ |
| 09:00 | 18:00 (오후 6시) |
| 12:00 | 21:00 (오후 9시) |
| 15:00 | 00:00 (다음날 자정) |

## 📌 주의사항

1. **타임존**:
   - Supabase pg_cron은 **UTC 시간**을 사용합니다
   - `0 0 * * 1` = UTC 월요일 00:00 = **한국 시간 월요일 오전 9시**
   - 한국은 UTC+9 시간대이므로 9시간 차이가 있습니다
2. **Service Role Key**: 반드시 service role key를 사용해야 함 (anon key로는 권한 부족)
3. **Project URL**: 정확한 프로젝트 URL 입력 필요
4. **실행 시작**: 설정 후 다음 월요일부터 자동 실행됩니다

## 🔍 모니터링

### Cron Job 실행 확인
```sql
-- 모든 주간 리포트 관련 cron job 확인
SELECT * FROM cron.job
WHERE jobname LIKE 'weekly-report%';

-- 테스트용 cron job 실행 이력 확인 (10분마다)
SELECT * FROM cron.job_run_details
WHERE jobname = 'weekly-report-test-10min'
ORDER BY start_time DESC
LIMIT 10;

-- 운영용 cron job 실행 이력 확인 (월요일 9시)
SELECT * FROM cron.job_run_details
WHERE jobname = 'weekly-report-monday-9am-kst'
ORDER BY start_time DESC
LIMIT 10;

-- 다음 실행 예정 시간 확인 (한국 시간으로 표시)
SELECT
  jobname,
  schedule,
  command,
  nodename,
  NOW() AT TIME ZONE 'Asia/Seoul' as current_time_kst,
  CASE
    WHEN schedule = '*/10 * * * *' THEN
      'Every 10 minutes (TEST)'
    WHEN schedule = '0 0 * * 1' THEN
      'Next Monday 09:00 KST (PRODUCTION)'
  END as schedule_description
FROM cron.job
WHERE jobname LIKE 'weekly-report%';
```

### 테스트 완료 후 테스트용 cron job 삭제
```sql
-- 테스트가 완료되면 10분마다 실행되는 job 삭제
SELECT cron.unschedule('weekly-report-test-10min');
```

### Edge Function 로그 확인
- Supabase Dashboard → Logs → Edge Function Logs
- 함수명: `generate-weekly-report`

## 🚨 문제 해결

### Cron Job이 실행되지 않는 경우
1. pg_cron extension 활성화 확인
2. Vault에 저장된 URL과 Key 확인
3. Edge Function 배포 상태 확인

### 리포트가 생성되지 않는 경우
1. history_logs 테이블에 데이터 확인
2. recipient_emails 설정 확인
3. Edge Function 로그에서 에러 확인