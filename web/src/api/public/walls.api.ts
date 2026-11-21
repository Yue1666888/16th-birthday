import type { PageResponse } from '@/domain/api.types'
import type {
  MemorySummary,
  MemoryDetail,
  PublicHonor,
} from '@/types/public/walls.types'
import { publicGet } from '@/api/public-client'
export const getMemories = (page: number, signal: AbortSignal) =>
  publicGet<PageResponse<MemorySummary>>('/memories', signal, {
    page,
    size: 20,
  })
export const getMemory = (id: string, signal: AbortSignal) =>
  publicGet<MemoryDetail>('/memories/' + encodeURIComponent(id), signal)
export const getHonors = (page: number, signal: AbortSignal) =>
  publicGet<PageResponse<PublicHonor>>('/honors', signal, { page, size: 20 })
