'use client'

import type { PropsWithChildren } from 'react'
import JotaiProvider from './JotaiProvider'
import ReactQueryProvider from './ReactQueryProvider'
import LoadingProvider from './LoadingProvider'
import LayoutProvider from './LayoutProvider'
import ModalProvider from './ModalProvider'
import ToastProvider from './ToastProvider'

export default function AppProviders({ children }: PropsWithChildren) {
  return (
    <JotaiProvider>
      <ReactQueryProvider>
        <LoadingProvider>
          <LayoutProvider>
            <ModalProvider>
              <ToastProvider>{children}</ToastProvider>
            </ModalProvider>
          </LayoutProvider>
        </LoadingProvider>
      </ReactQueryProvider>
    </JotaiProvider>
  )
}
