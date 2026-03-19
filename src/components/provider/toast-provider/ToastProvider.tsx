'use client'

import type { PropsWithChildren } from 'react'
import { createContext, useContext, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

interface Toast {
  id: number
  message: string
}

interface ToastContextValue {
  toasts: Toast[]
  pushToast: (message: string) => void
  dismissToast: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export default function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      pushToast: (message: string) => {
        const id = Date.now() + Math.floor(Math.random() * 1000)
        setToasts((prev) => [...prev, { id, message }])
      },
      dismissToast: (id: number) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
      },
    }),
    [toasts]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-layer">
        {toasts.map((toast) => (
          <Button
            key={toast.id}
            className="toast"
            variant="outline"
            onClick={() => value.dismissToast(toast.id)}
          >
            {toast.message}
          </Button>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
