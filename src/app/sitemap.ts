import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://mdd-analyzer.vercel.app'

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily', // 금융 리스크 데이터이므로 매일 업데이트 권장
      priority: 1,
    },
  ]
}
