import { request } from '@/api/admin-client.client'
import type { Honor, ImageItem, PageResponse } from '@/domain/api.types'
export const honorsApi = {
  list: (page = 1, size = 20, signal?: AbortSignal) =>
    request<PageResponse<Honor>>({
      url: '/admin/honors',
      params: { page, size },
      signal,
    }),
  detail: (id: string) => request<Honor>({ url: '/admin/honors/' + id }),
  create: (body: Record<string, unknown>) =>
    request<Honor>({ url: '/admin/honors', method: 'POST', data: body }),
  update: (id: string, body: Record<string, unknown>) =>
    request<Honor>({ url: '/admin/honors/' + id, method: 'PATCH', data: body }),
  delete: (id: string, version: string, requestId: string) =>
    request<{ id: string }>({
      url: '/admin/honors/' + id,
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
