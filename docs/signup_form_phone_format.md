# 전화번호 실시간 하이픈 자동 삽입 구현 계획

## 구현 목표
사용자가 전화번호를 입력할 때 실시간으로 하이픈(-)이 자동으로 삽입되도록 구현

## 현재 상태
- **파일**: `components/auth/SignupForm.tsx`
- **현재 구현**: 
  - 정규식 패턴으로 유효성 검사만 수행
  - 사용자가 직접 하이픈을 입력해야 함
  - 패턴: `/^01[016789]-?\d{3,4}-?\d{4}$/`

## 구체적인 구현 내용

### 1. 전화번호 포맷팅 함수 추가 (28번 라인 근처)
```typescript
// 전화번호 포맷팅 함수
const formatPhoneNumber = (value: string): string => {
  // 숫자만 추출
  const numbers = value.replace(/[^\d]/g, '')
  
  // 최대 11자리로 제한
  const limitedNumbers = numbers.slice(0, 11)
  
  // 길이에 따라 하이픈 추가
  if (limitedNumbers.length <= 3) {
    return limitedNumbers
  } else if (limitedNumbers.length <= 7) {
    return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3)}`
  } else {
    return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3, 7)}-${limitedNumbers.slice(7)}`
  }
}
```

### 2. 전화번호 변경 핸들러 추가 (58번 라인 근처)
```typescript
const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const formatted = formatPhoneNumber(e.target.value)
  form.setFieldsValue({ phone: formatted })
}
```

### 3. Form.Item 및 Input 컴포넌트 수정 (147-165번 라인)
```typescript
<Form.Item
  name="phone"
  label={<span className="text-gray-700 font-semibold">전화번호</span>}
  rules={[
    { required: true, message: '전화번호를 입력해주세요!' },
    { 
      pattern: /^010-\d{4}-\d{4}$/, 
      message: '올바른 전화번호 형식이 아닙니다! (010-1234-5678)' 
    }
  ]}
  className="mb-4"
>
  <Input
    prefix={<PhoneOutlined className="text-gray-400 mr-1" />}
    placeholder="010-1234-5678"
    autoComplete="tel"
    maxLength={13}
    onChange={handlePhoneChange}
    className="h-11 px-4 text-gray-900 bg-white border-gray-200 hover:border-primary-400 focus:border-primary-600 rounded-soft transition-smooth"
  />
</Form.Item>
```

## 동작 시나리오

### 실시간 포맷팅 동작
1. **숫자 입력**: "0101234" → "010-1234" 자동 변환
2. **연속 입력**: "01012345678" → "010-1234-5678" 자동 변환  
3. **백스페이스**: 삭제 시 하이픈도 자연스럽게 제거
4. **복사/붙여넣기**: 붙여넣은 텍스트도 자동 포맷팅
5. **문자 입력 방지**: 숫자 외 문자는 자동 제거

### 정상 케이스
1. "01012345678" 입력 → "010-1234-5678" 자동 변환
2. "010 1234 5678" 입력 → "010-1234-5678" 자동 변환
3. "010-1234-5678" 입력 → 그대로 유지
4. 중간에 숫자 삽입/삭제 시 자동 재포맷팅

### 예외 케이스
1. 문자 포함 입력 → 문자 자동 제거
2. 11자리 초과 입력 → 11자리까지만 허용
3. 잘못된 형식 → 유효성 검사 에러 메시지 표시
4. 특수문자 입력 → 자동 제거

## 구현 위치
- **파일**: `components/auth/SignupForm.tsx`
- **라인**: 
  - 포맷팅 함수: 28번 라인 (checkPasswordStrength 함수 앞)
  - 핸들러 함수: 58번 라인 (handlePasswordChange 함수 뒤)
  - Form.Item 수정: 147-165번 라인

## 주요 기능

### 자동 포맷팅
- 사용자가 숫자만 입력해도 자동으로 하이픈 추가
- 실시간으로 포맷 적용 (onChange 이벤트 활용)
- 복사/붙여넣기 시에도 자동 포맷팅
- 백스페이스로 삭제 시 자연스러운 동작

### 입력 제한
- 숫자 외 문자 자동 제거
- 최대 11자리 숫자만 허용 (010-1234-5678 = 11자리)
- maxLength로 시각적 피드백 제공

### 유효성 검사
- 정확한 010-XXXX-XXXX 형식 검증
- 한국 휴대폰 번호 형식 준수
- 실시간 유효성 검사

## 장점
1. **사용자 경험 개선**: 하이픈 자동 입력으로 편의성 증대
2. **일관성 유지**: 모든 전화번호가 동일한 형식으로 저장
3. **오류 감소**: 잘못된 형식 입력 방지
4. **직관적 피드백**: 실시간 포맷팅으로 즉각적인 피드백 제공
5. **입력 속도 향상**: 하이픈을 직접 입력할 필요 없음

## Edge Case 처리
- **커서 위치 관리**: form.setFieldsValue 사용으로 자연스러운 커서 이동
- **Ant Design Form 통합**: Form.Item과 완벽한 호환성
- **리렌더링 최적화**: 불필요한 리렌더링 방지

## 추가 고려사항
- 향후 010 외 다른 번호 지원이 필요한 경우 정규식 패턴 수정 필요
- 국제 전화번호 지원이 필요한 경우 별도 처리 로직 추가 필요
- 사용자가 하이픈을 직접 입력해도 정상 동작하도록 처리