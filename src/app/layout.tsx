import type { Metadata, Viewport } from 'next'
import type { PropsWithChildren } from 'react'
import AppProviders from '@/components/provider/AppProviders'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'MDD Analyzer - 투자 리스크 분석 및 최대 낙폭 계산기',
    template: '%s | MDD Analyzer',
  },
  description:
    '투자자의 핵심 리스크 지표인 MDD(최대 낙폭)를 정밀하게 분석하여 데이터 기반의 객관적인 투자 인사이트를 제공하는 모던 웹 대시보드입니다.',
  keywords: [
    'MDD',
    '최대 낙폭',
    'Maximum Drawdown',
    '투자 리스크',
    '핀테크',
    '주식 분석',
    '환율 변동성',
    '전고점',
    'ATH',
    '투자 전략',
  ],
  authors: [{ name: 'MDD Analyzer Team' }],
  creator: 'MDD Analyzer Team',
  publisher: 'MDD Analyzer Team',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://mdd-analyzer.vercel.app',
    title: 'MDD Analyzer - 투자 리스크 분석 및 최대 낙폭 계산기',
    description:
      '투자자의 핵심 리스크 지표인 MDD(최대 낙폭)를 정밀하게 분석하여 데이터 기반의 객관적인 투자 인사이트를 제공합니다.',
    siteName: 'MDD Analyzer',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MDD Analyzer 대시보드 미리보기',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MDD Analyzer - 투자 리스크 분석 및 최대 낙폭 계산기',
    description:
      '투자자의 핵심 리스크 지표인 MDD(최대 낙폭)를 정밀하게 분석하여 데이터 기반의 객관적인 투자 인사이트를 제공합니다.',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1c1e' },
  ],
}

export default function RootLayout({ children }: Readonly<PropsWithChildren>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'MDD Analyzer',
    alternateName: '최대 낙폭 계산기',
    description: '투자 자산의 MDD 및 리스크를 분석하는 전문 핀테크 도구',
    url: 'https://mdd-analyzer.vercel.app',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList: [
      '실시간 MDD 대시보드',
      '환율 영향도 분석',
      '과거 회복 탄력성 분석',
      'RAW 데이터 검증 패널',
    ],
  }

  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
