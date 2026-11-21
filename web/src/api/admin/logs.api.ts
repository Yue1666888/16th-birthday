import { request, download } from '@/api/admin-client.client'
import type { LogChunk } from '@/domain/api.types'
export const logsApi = {
  read: (cursor?: string, signal?: AbortSignal) =>
    request<LogChunk>({
      url: '/admin/logs',
      params: { cursor, limit: 200 },
      signal,
    }),
  download: () => download('/admin/logs/download', 'birthday16-api.log'),
}
