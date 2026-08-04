'use client'

import { useEffect, useState } from 'react'

/**
 * 컴포넌트가 클라이언트 사이드에 마운트되었는지 여부를 반환합니다.
 * 하이드레이션 오류를 방지하기 위해 클라이언트 전용 렌더링이 필요한 경우 사용합니다.
 */
export function useIsMounted() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
}
