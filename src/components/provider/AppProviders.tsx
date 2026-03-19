'use client'

import type { PropsWithChildren } from 'react'
import JotaiProvider from '@/components/provider/jotai-provider/JotaiProvider'
import ReactQueryProvider from '@/components/provider/react-query-provider/ReactQueryProvider'
import LoadingProvider from '@/components/provider/loading-provider/LoadingProvider'
import LayoutProvider from '@/components/provider/layout-provider/LayoutProvider'
import ModalProvider from '@/components/provider/modal-provider/ModalProvider'
import ToastProvider from '@/components/provider/toast-provider/ToastProvider'

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
