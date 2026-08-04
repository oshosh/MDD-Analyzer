import type { RawApiResponse } from '@entities/mdd'
import type { MddQueryInput } from '../schemas/schemas'
import { getMddRawAction } from '../actions/actions'

export async function fetchMddRaw(
  params: MddQueryInput
): Promise<RawApiResponse> {
  return await getMddRawAction(params)
}

