import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/domain/api.types'
import { authClient } from '@/auth/auth.client'
import { AppApiError, toApiError } from '@/lib/api-error'
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
})
http.interceptors.request.use(async (config) => {
  config.headers.set(
    'Authorization',
    'Bearer ' + (await authClient.getAccessToken()),
  )
  return config
})
const success = new Set([
  'OK',
  'INVITATION_CREATED',
  'INVITATION_UPDATED',
  'IMAGE_UPLOADED',
  'MEMORY_CREATED',
  'MEMORY_UPDATED',
  'MEMORY_DELETED',
  'HONOR_CREATED',
  'HONOR_UPDATED',
  'HONOR_DELETED',
  'EMAIL_SEND_CONFIRMED',
  'EMAIL_SEND_REUSED',
  'EMAIL_SEND_DISABLED',
  'MAIL_BATCH_CONFIRMED',
  'MAIL_BATCH_REUSED',
  'MAIL_BATCH_DISABLED',
])
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await http.request<ApiResponse<T>>(config)
    const body = response.data
    if (!body || !success.has(body.code))
      throw new AppApiError(
        body?.message || '服务响应异常',
        body?.code || 'RESPONSE_INVALID',
        body?.fieldErrors ?? {},
        body?.traceId ?? '',
        response.status,
      )
    return body.data
  } catch (error) {
    const failure = await toApiError(error)
    if (failure.status === 401)
      window.dispatchEvent(
        new CustomEvent('birthday:auth-error', {
          detail: '登录会话已失效或令牌配置不匹配，请重新登录。',
        }),
      )
    throw failure
  }
}
export async function download(
  url: string,
  filename: string,
  params?: Record<string, unknown>,
) {
  try {
    const response = await http.get<Blob>(url, { params, responseType: 'blob' })
    const type = String(response.headers['content-type'] || '')
    if (type.includes('json'))
      throw new AppApiError('下载返回异常JSON', 'RESPONSE_INVALID')
    const objectUrl = URL.createObjectURL(response.data)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  } catch (error) {
    const failure = await toApiError(error)
    if (failure.status === 401)
      window.dispatchEvent(
        new CustomEvent('birthday:auth-error', {
          detail: '登录会话已失效或令牌配置不匹配，请重新登录。',
        }),
      )
    throw failure
  }
}
