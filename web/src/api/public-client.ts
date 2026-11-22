import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/domain/api.types'
import { AppApiError, toApiError } from '@/lib/api-error'
// Public browsing must never import the administrator's SSO adapter.
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 20000,
  withCredentials: true,
})
async function publicRequest<T>(config: AxiosRequestConfig, codes: string[]) {
  try {
    const response = await http.request<ApiResponse<T>>(config)
    const body = response.data
    if (!body || !codes.includes(body.code))
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
export function publicGet<T>(
  url: string,
  signal: AbortSignal,
  params?: Record<string, number>,
) {
  return publicRequest<T>({ method: 'GET', url, signal, params }, ['OK'])
}
export function publicPost<T>(
  url: string,
  data: unknown,
  signal: AbortSignal,
  options?: Pick<
    AxiosRequestConfig,
    'timeout' | 'headers' | 'onUploadProgress'
  >,
) {
  return publicRequest<T>({ method: 'POST', url, data, signal, ...options }, [
    'INVITATION_CREATED',
    'INVITATION_UPDATED',
    'MEMORY_CREATED',
    'IMAGE_UPLOADED',
  ])
}
