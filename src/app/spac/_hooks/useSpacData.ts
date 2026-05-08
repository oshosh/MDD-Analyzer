'use client'

import { useQuery } from '@tanstack/react-query'
import { browserApiClient } from '@/lib/http/axios'
import { SpacTableRow } from '../_lib/types'

export function useSpacData(estimationBasis: 'conservative' | 'aggressive') {
  return useQuery({
    queryKey: ['spac-data-all', estimationBasis],
    queryFn: async () => {
      // 서버사이드 통합 API 하나만 호출하여 데이터 로딩 속도 및 안정성 극대화
      const response = await browserApiClient.get(`/api/spac/all?basis=${estimationBasis}`)
      return response.data.items as SpacTableRow[]
    },
    staleTime: 300000, // 5분 캐시
  })
}
