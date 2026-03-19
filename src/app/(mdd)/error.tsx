'use client'

import { Button } from '@/components/ui/button'

export default function MddError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="error-page">
      <h1>500 (MDD)</h1>
      <p>{error.message}</p>
      <Button type="button" onClick={reset}>
        Retry
      </Button>
    </main>
  )
}
