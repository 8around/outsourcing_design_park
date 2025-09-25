# 프로덕션 배포를 위한 console.log 제거 계획

## 📊 현황 분석
- **총 발견된 console.log**: 52개
- **영향받는 파일**: 10개
- **console.error**: 유지 (에러 추적용)

## 📝 제거 대상 파일 목록

### 1. lib/services/logs.service.ts (19개)
```
Line 24: console.log("createManualLog 호출:", {...})
Line 55: console.log("로그 생성 성공:", log.id)
Line 60: console.log("첨부파일 업로드 시작...")
Line 67: console.log("첨부파일 업로드 완료:", attachments.length)
Line 168: console.log("승인 요청 이메일 발송 성공")
Line 182: console.log("카카오톡 발송 시작...", {...})
Line 198: console.log("승인 요청 카카오톡 발송 성공:", {...})
Line 214: console.log("승인자 전화번호가 없어 카카오톡 발송을 건너뜁니다.", {...})
Line 218: console.log("유효하지 않은 전화번호로 카카오톡 발송을 건너뜁니다:", {...})
Line 242: console.log("승인 요청 알림 생성 성공")
Line 495: console.log("Deleting log:", logId, "by user:", userId)
Line 515: console.log("Related approval requests:", approvalRequests)
Line 520: console.log("Deleting approval request:", request.id)
Line 545: console.log("Deleting attachments:", attachments)
Line 585: console.log("Log deleted successfully")
Line 621: console.log("uploadAttachments 시작:", {...})
Line 642: console.log("파일 업로드 시작:", {...})
Line 684: console.log("파일 업로드 성공:", uploadData)
Line 721: console.log("첨부파일 업로드 완료:", {...})
```

### 2. lib/services/approval.service.ts (10개)
```
Line 37: console.log(`Fetching users with status: ${status}`)
Line 61: console.log(`Found ${data?.length || 0} ${status} users:`, data)
Line 70: console.log("Approving user:", { userId, adminId })
Line 84: console.log("Re-approval detected, using two-step update process")
Line 133: console.log("User approval update successful:", updateData)
Line 174: console.log("Rejecting user:", { userId, adminId, reason })
Line 210: console.log("User rejection update successful:", updateData)
Line 407: console.log("승인 완료 카카오톡 발송 성공")
Line 431: console.log("승인 반려 카카오톡 발송 성공")
Line 500: console.log("deleteApprovalRequest called:", { requestId, adminId })
Line 509: console.log("Approval request data:", requestData)
Line 510: console.log("Fetch error:", fetchError)
```

### 3. lib/services/email.service.ts (4개)
```
Line 34: console.log('Email service is not available on client side')
Line 79: console.log('Email service is not available on client side')
Line 122: console.log('Email service is not available on client side')
Line 166: console.log('Email service is not available on client side')
```

### 4. components/admin/UsersManagement.tsx (4개)
```
Line 64: console.log(`Loading users with status: ${status}`)
Line 66: console.log(`Received ${data.length} users for status ${status}:`, data)
Line 70: console.log(`After filtering out current user, ${filteredData.length} users remaining`)
Line 141: console.log('Attempting to reject user:', {...})
```

### 5. components/gantt/GanttChart.tsx (4개)
```
Line 266: console.log('Task clicked:', task)
Line 272: console.log('Task double clicked:', task)
Line 277: console.log('Date changed:', task)
Line 282: console.log('Progress changed:', task)
```

### 6. supabase/functions/generate-weekly-report/index.ts (3개)
```
Line 39: console.log("Body parsing error, using default:", error)
Line 66: console.log(isTestMode ? "Running in test mode" : "Running via cron job schedule")
Line 92: console.log("No logs found for the period")
```

### 7. lib/services/projects.service.ts (2개)
```
Line 428: console.log('진행 중인 공정이 없습니다.')
Line 447: console.log('모든 공정이 완료되었습니다.')
```

### 8. supabase/functions/send-kakao/index.ts (2개)
```
Line 105: console.log("Sending Kakao message via SOLAPI SDK:", {...})
Line 123: console.log("Kakao message sent successfully via SDK:", result)
```

### 9. app/auth/callback/route.ts (2개)
```
Line 36: console.log("Email verification successful (PKCE flow)")
Line 75: console.log("Email verification successful (Magic Link flow)")
```

### 10. components/auth/LoginForm.tsx (1개)
```
Line 34: console.log('로그인 시도:', values)
```

## ⚙️ 제거 전략

### 단순 삭제
모든 console.log 라인을 완전히 삭제합니다.

### 주의사항
- console.error는 유지 (프로덕션 에러 추적용)
- console.warn도 필요시 유지 가능
- Edge Functions의 console.log는 서버 로그이므로 상황에 따라 선택적 유지 가능

## ✅ 작업 후 검증 절차

1. **빌드 검증**
   ```bash
   npm run build
   ```

2. **TypeScript 타입 체크**
   ```bash
   npx tsc --noEmit
   ```

3. **기능 테스트**
   - 로그인/로그아웃
   - 프로젝트 CRUD
   - 로그 생성 및 승인 요청
   - 카카오톡 알림 발송
   - 이메일 발송

4. **최종 확인**
   ```bash
   grep -r "console\.log" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" .
   ```
   위 명령어로 console.log가 모두 제거되었는지 확인

## 🚀 실행 명령

console.log를 자동으로 제거하려면:
```bash
# 백업 먼저 생성
git add . && git commit -m "backup: before removing console.log"

# console.log 제거 (각 파일별로 수동 제거 권장)
# 또는 sed 명령어 사용 (macOS/Linux)
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' '/console\.log/d' {} +
```

## 📌 참고사항

- 프로덕션 환경에서는 적절한 로깅 라이브러리 사용 권장 (예: winston, pino)
- 환경 변수를 통한 조건부 로깅 구현 고려
- Supabase Edge Functions는 자체 로깅 시스템 활용 가능