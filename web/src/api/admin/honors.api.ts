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
  upload: (file: File, signal?: AbortSignal) => {
    const data = new FormData()
    data.append('file', file)
    return request<ImageItem>({
      url: '/media/images',
      method: 'POST',
      data,
      signal,
    })
  },
}
