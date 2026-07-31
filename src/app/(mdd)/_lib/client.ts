import type { RawApiResponse } from '@/lib/types'
import type { MddQueryInput } from '@/app/(mdd)/_lib/schemas'
import { getMddRawAction } from '@/app/(mdd)/_lib/actions'

export async function fetchMddRaw(
  params: MddQueryInput
): Promise<RawApiResponse> {
  return await getMddRawAction(params)
}

