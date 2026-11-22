import { publicPost } from '@/api/public-client'
import type {
  ReplyFormValues,
  MemoryPayload,
} from '@/features/visitor/invitation/forms/schemas'
import type { ImageItem } from '@/domain/api.types'
import type { MemoryDetail } from '@/types/public/walls.types'
export interface ReplyResult {
  id: string
  result: 'CREATED' | 'UPDATED'
  submittedAt: string
}
export const submitReply = (value: ReplyFormValues, signal: AbortSignal) =>
  publicPost<ReplyResult>(
    '/invitations',
    {
      ...value,
      mailingAddress: value.giftChoice === 'MAIL' ? value.mailingAddress : null,
    },
    signal,
  )
export const publishMemory = (value: MemoryPayload, signal: AbortSignal) =>
  publicPost<MemoryDetail>('/memories', value, signal)
export function uploadVisitorImage(
  file: File,
  signal: AbortSignal,
  progress?: (value: number) => void,
  uploadId?: string,
) {
  const body = new FormData()
  body.append('file', file)
  return publicPost<ImageItem>('/media/images', body, signal, {
    timeout: 150000,
    headers: uploadId ? { 'X-Upload-ID': uploadId } : undefined,
    onUploadProgress: (event) => {
      if (event.total)
        progress?.(
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        )
    },
  })
}
