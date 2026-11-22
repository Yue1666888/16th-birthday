import { request } from '@/api/admin-client.client'
import type { AdminMemory, ImageItem, PageResponse } from '@/domain/api.types'
export const memoriesApi = {
  list: (page = 1, size = 20, keyword?: string, signal?: AbortSignal) =>
    request<PageResponse<AdminMemory>>({
      url: '/admin/memories',
      params: { page, size, keyword: keyword?.trim() || undefined },
      signal,
    }),
  detail: (id: string) =>
    request<AdminMemory>({ url: '/admin/memories/' + id }),
  create: (body: Record<string, unknown>) =>
    request<AdminMemory>({
      url: '/admin/memories',
      method: 'POST',
      data: body,
    }),
  update: (id: string, body: Record<string, unknown>) =>
    request<AdminMemory>({
      url: '/admin/memories/' + id,
      method: 'PATCH',
      data: body,
    }),
  delete: (id: string, version: string, requestId: string) =>
    request<{ id: string }>({
      url: '/admin/memories/' + id,
      method: 'DELETE',
      params: { expectedVersion: version, requestId },
    }),
  upload: (
    file: File,
    signal: AbortSignal,
    progress?: (value: number) => void,
    uploadId?: string,
  ) => {
    const data = new FormData()
    data.append('file', file)
    return request<ImageItem>({
      url: '/media/images',
      timeout: 150000,
      headers: uploadId ? { 'X-Upload-ID': uploadId } : undefined,
      onUploadProgress: (event) => {
        if (event.total)
          progress?.(
            Math.min(100, Math.round((event.loaded / event.total) * 100)),
          )
      },
      method: 'POST',
      data,
      signal,
    })
  },
}
