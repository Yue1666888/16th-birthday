import axios from 'axios'
import { z } from 'zod'
const envelope = z.object({
  code: z.string(),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.string()),
  traceId: z.string(),
})
export class AppApiError extends Error {
  readonly code: string
  readonly fields: Record<string, string>
  readonly traceId: string
  readonly status: number
  readonly retryAfterSeconds: number
  constructor(
    message: string,
    code = 'NETWORK_ERROR',
    fields: Record<string, string> = {},
    traceId = '',
    status = 0,
    retryAfterSeconds = 0,
  ) {
    super(message)
    this.name = 'AppApiError'
    this.code = code
    this.fields = fields
    this.traceId = traceId
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}
export async function toApiError(error: unknown): Promise<AppApiError> {
  if (error instanceof AppApiError) return error
  if (axios.isAxiosError<unknown>(error)) {
    const retryHeader = error.response?.headers?.['retry-after']
    const retryValue = Number(retryHeader)
    const retryAfter = Number.isFinite(retryValue)
      ? Math.min(86400, Math.max(0, retryValue))
      : 0
    let body: unknown = error.response?.data
    if (body instanceof Blob) {
      try {
        body = JSON.parse(await body.text()) as unknown
      } catch {
        body = null
      }
    }
    const parsed = envelope.safeParse(body)
    if (parsed.success)
      return new AppApiError(
        parsed.data.message,
        parsed.data.code,
        parsed.data.fieldErrors,
        parsed.data.traceId,
        error.response?.status ?? 0,
        retryAfter,
      )
    return new AppApiError(
      error.response
        ? error.response.status === 403
          ? '当前访问地址暂未被服务允许，请联系维护者'
          : error.response.status === 413
            ? '照片或请求过大，请减小照片后重试'
            : error.response.status === 503
              ? '服务暂时繁忙，请保留草稿后重试'
              : '服务响应异常，请稍后重试'
        : error.code === 'ECONNABORTED'
          ? '请求超时，写入结果请先核对'
          : '网络连接失败，请检查服务',
      error.code || 'NETWORK_ERROR',
      {},
      '',
      error.response?.status ?? 0,
    )
  }
  return new AppApiError(error instanceof Error ? error.message : '操作失败')
}
export function errorMessage(error: unknown) {
  return error instanceof AppApiError
    ? error.message +
        (error.traceId ? '（请求编号 ' + error.traceId + '）' : '')
    : error instanceof Error
      ? error.message
      : '操作失败'
}
