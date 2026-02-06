import { useState, useEffect } from 'react'

/**
 * 값의 변경을 지연시키는 debounce 훅
 * 검색 입력 등에서 API 호출을 최적화하는 데 사용
 *
 * @param value - debounce할 값
 * @param delay - 지연 시간 (ms), 기본값 300ms
 * @returns debounce된 값
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearchTerm = useDebounce(searchTerm, 300)
 *
 * useEffect(() => {
 *   // debouncedSearchTerm이 변경될 때만 API 호출
 *   fetchData(debouncedSearchTerm)
 * }, [debouncedSearchTerm])
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // 클린업: 컴포넌트 언마운트 또는 value/delay 변경 시 타이머 취소
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
