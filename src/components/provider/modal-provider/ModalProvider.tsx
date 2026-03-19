'use client'

import type { PropsWithChildren } from 'react'
import { createContext, useContext, useMemo, useState } from 'react'

interface ModalContextValue {
  open: boolean
  setOpen: (value: boolean) => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within ModalProvider')
  }
  return context
}

export default function ModalProvider({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false)
  const value = useMemo(() => ({ open, setOpen }), [open])
  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
}
