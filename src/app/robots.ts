import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/', // API 경로는 수집 제외
    },
    sitemap: 'https://mdd-analyzer.vercel.app/sitemap.xml',
  }
}
