'use client'

import React, { type ReactNode } from 'react'
import { useIsMounted } from '@/hooks/useIsMounted'

interface ClientOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * 하이드레이션 불일치(Hydration Mismatch)를 방지하기 위해
 * 자식 컴포넌트를 오직 클라이언트 사이드에서만 렌더링하도록 보장하는 래퍼 컴포넌트입니다.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const isMounted = useIsMounted()

  if (!isMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
