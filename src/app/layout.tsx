import type { Metadata, Viewport } from 'next'
import type { PropsWithChildren } from 'react'
import AppProviders from '@/components/provider/AppProviders'
import './globals.css'

export const metadata: Metadata = {
  title: 'MDD Calculator',
  description: 'MDD calculator with USD/KRW drawdown and raw schema output',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: Readonly<PropsWithChildren>) {
  return (
    <html lang="ko">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
