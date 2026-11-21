import axios from 'axios'
import type { ApiResponse } from '@/domain/api.types'
import { AppApiError, toApiError } from '@/lib/api-error'
// Public browsing must never import the administrator's SSO adapter.
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 20000,
  withCredentials: true,
})
export async function publicGet<T>(
  url: string,
  signal: AbortSignal,
  params?: Record<string, number>,
) {
  try {
    const response = await http.get<ApiResponse<T>>(url, { signal, params })
    const body = response.data
    if (!body || body.code !== 'OK')
      throw new AppApiError(
        body?.message || '服务响应异常',
        body?.code || 'RESPONSE_INVALID',
        body?.fieldErrors,
        body?.traceId,
        response.status,
      )
    return body.data
  } catch (error) {
    throw await toApiError(error)
  }
}
