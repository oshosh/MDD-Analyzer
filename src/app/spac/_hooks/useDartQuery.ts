import { useQuery } from '@tanstack/react-query'
import { browserApiClient } from '@/lib/http/axios'

export interface DartDisclosure {
  corp_code: string
  corp_name: string
  stock_code: string
  report_nm: string
  rcept_no: string
  flr_nm: string
  rcept_dt: string
  rm: string
  procedureTag?: string
  procedureDesc?: string
}

function getProcedureInfo(reportName: string) {
  if (reportName.includes('회사합병결정') || reportName.includes('SPAC합병')) {
    return { tag: '합병발표', desc: '합병 대상회사와 합병 조건을 공시한 단계입니다.' }
  }
  if (reportName.includes('상장예비심사결과')) {
    return { tag: '예심승인', desc: '거래소 심사를 통과해 합병 절차가 진전된 단계입니다.' }
  }
  if (reportName.includes('주주총회')) {
    return { tag: '주총/승인', desc: '주주총회 소집 또는 승인 결과와 관련된 공시입니다.' }
  }
  if (reportName.includes('상장폐지') || reportName.includes('거래정지') || reportName.includes('청산')) {
    return { tag: '상장폐지', desc: '합병 실패 또는 청산 절차와 관련된 공시입니다.' }
  }
  if (reportName.includes('관리종목') || reportName.includes('우려')) {
    return { tag: '투자유의', desc: '합병 기한 임박 등으로 투자 유의가 필요한 단계입니다.' }
  }
  if (reportName.includes('예치') || reportName.includes('신탁')) {
    return { tag: '이자/예치', desc: '공모자금 예치 이자율 또는 신탁 계약이 변경된 공시입니다.' }
  }
  if (reportName.includes('증권신고서') || reportName.includes('투자설명서') || reportName.includes('발행실적')) {
    return { tag: '공모/상장', desc: '상장 공모와 기초 정보가 담긴 공시입니다.' }
  }
  if (reportName.includes('사업보고서') || reportName.includes('분기보고서') || reportName.includes('반기보고서')) {
    return { tag: '정기공시', desc: '정기 재무·운영 현황 보고입니다.' }
  }
  return { tag: '일반', desc: '주요 경영 사항 관련 일반 공시입니다.' }
}

export function useDartQuery(symbol: string | null) {
  return useQuery({
    queryKey: ['dart', symbol],
    queryFn: async () => {
      if (!symbol) return []
      const response = await browserApiClient.get(`/api/dart?symbol=${symbol}`)
      const list = (response.data.list || []) as DartDisclosure[]

      return list.map((item) => {
        const info = getProcedureInfo(item.report_nm)
        return {
          ...item,
          procedureTag: info.tag,
          procedureDesc: info.desc,
        }
      })
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  })
}
