# 주간 리포트 다운로드 파일 버그 수정 계획

## 📋 개요

주간 리포트 다운로드 버튼을 클릭했을 때 예전 파일이 다운로드되는 문제를 해결하기 위한 분석 결과 및 수정 계획입니다.

## 🚨 문제 분석

### 1. 파일명 충돌 이슈

**위치**: `supabase/functions/generate-weekly-report/index.ts:101`

**현재 코드**:
```typescript
const fileName = `weekly-report-${formatDate(new Date())}.xlsx`;
```

**문제점**:
- 현재 날짜로만 파일명을 생성하여 같은 날짜에 여러 번 생성 시 동일한 파일명 사용
- 예시: `weekly-report-2025-01-25.xlsx`
- 시간 정보가 없어서 고유성 보장 불가

### 2. 파일 덮어쓰기 문제

**위치**: `supabase/functions/generate-weekly-report/index.ts:104-107`

**현재 코드**:
```typescript
const { data: upload, error: uploadError } = await supabaseClient.storage
  .from('reports')
  .upload(fileName, buffer, {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    upsert: true  // ← 이 옵션이 기존 파일을 덮어쓰기 함
  });
```

**문제점**:
- `upsert: true` 옵션으로 인해 동일한 파일명의 기존 파일이 덮어써짐
- 새로운 리포트가 생성되어도 파일명이 같으면 이전 내용이 대체됨

### 3. 브라우저 캐싱 문제

**위치**: `supabase/functions/generate-weekly-report/index.ts:115-117`

**현재 코드**:
```typescript
const { data: { publicUrl } } = supabaseClient.storage
  .from('reports')
  .getPublicUrl(fileName);
```

**문제점**:
- 동일한 URL로 인해 브라우저가 이전 파일을 캐싱하여 표시
- 파일이 업데이트되어도 브라우저는 캐시된 이전 버전을 제공
- Cache-Control 헤더 설정 없음

### 4. 데이터베이스 상태

**발견 사항**:
- `weekly_report_history` 테이블에 **0개 레코드** 존재
- 리포트 생성 이력이 없거나 제대로 저장되지 않고 있음

## 🛠️ 해결 방안

### 1. 고유 파일명 생성 개선

**목표**: 타임스탬프를 포함한 고유한 파일명 생성

**수정 코드**:
```typescript
// 기존 코드
const fileName = `weekly-report-${formatDate(new Date())}.xlsx`;

// 개선된 코드
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // 2025-01-25T14-30-45
const fileName = `weekly-report-${formatDate(startDate)}_${formatDate(endDate)}-${timestamp}.xlsx`;

// 결과 예시: weekly-report-2025-01-18_2025-01-25-2025-01-25T14-30-45.xlsx
```

### 2. 파일 업로드 옵션 수정

**목표**: 덮어쓰기 방지 및 캐시 제어

**수정 코드**:
```typescript
const { data: upload, error: uploadError } = await supabaseClient.storage
  .from('reports')
  .upload(fileName, buffer, {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    upsert: false, // 덮어쓰기 방지
    cacheControl: '1' // 1초 캐시 (최신 파일 보장)
  });
```

### 3. 캐시 무효화 구현

**목표**: 브라우저 캐싱 문제 해결

**수정 코드**:
```typescript
// Public URL에 타임스탬프 파라미터 추가
const { data: { publicUrl } } = supabaseClient.storage
  .from('reports')
  .getPublicUrl(fileName);

const publicUrlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

// 이메일 발송 및 응답에서 cache-buster URL 사용
const emailResult = await sendWeeklyReport({
  recipientEmails,
  reportTitle: config.report_title_template || "주간 프로젝트 현장 관리 리포트",
  startDate,
  endDate,
  fileUrl: publicUrlWithCacheBuster, // 수정된 URL 사용
  buffer,
  logsCount: logs.length
});
```

### 4. 파일 중복 방지 로직 추가

**목표**: 파일명 충돌 시 자동으로 고유한 이름 생성

**추가 코드**:
```typescript
// 파일 존재 여부 확인 후 고유명 생성
async function generateUniqueFileName(baseFileName: string, supabaseClient: any): Promise<string> {
  let finalFileName = baseFileName;
  let counter = 1;

  while (true) {
    const { data: existingFiles } = await supabaseClient.storage
      .from('reports')
      .list('', { search: finalFileName.split('.')[0] });

    if (!existingFiles || existingFiles.length === 0 ||
        !existingFiles.some(file => file.name === finalFileName)) {
      break;
    }

    const nameWithoutExt = baseFileName.replace('.xlsx', '');
    finalFileName = `${nameWithoutExt}-${counter}.xlsx`;
    counter++;
  }

  return finalFileName;
}

// 사용 예시
const baseFileName = `weekly-report-${formatDate(startDate)}_${formatDate(endDate)}-${timestamp}.xlsx`;
const fileName = await generateUniqueFileName(baseFileName, supabaseClient);
```

### 5. 응답 헤더 개선

**목표**: 다운로드 시 캐싱 문제 완전 해결

**수정 코드**:
```typescript
return new Response(
  JSON.stringify({
    success: true,
    data: emailResult,
    fileUrl: publicUrlWithCacheBuster, // cache-buster URL 반환
    fileName: fileName, // 실제 파일명 정보 추가
    logsCount: logs.length,
    isTestMode,
    generatedAt: new Date().toISOString() // 생성 시간 정보 추가
  }),
  {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate", // 캐시 방지
      "Pragma": "no-cache",
      "Expires": "0"
    },
    status: 200
  }
);
```

---

**작성일**: 2025-01-25
**작성자**: Claude AI
**상태**: 계획 완료, 구현 대기