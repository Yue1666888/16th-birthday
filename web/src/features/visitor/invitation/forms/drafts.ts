import type { z } from 'zod'
export const replyDraftKey = 'birthday16:visitor:reply:v1'
export const memoryDraftKey = 'birthday16:visitor:memory:v1'
export function readDraft<T>(key: string, schema: z.ZodType<T>): T | null {
  try {
    const value = sessionStorage.getItem(key)
    if (!value) return null
    const parsed = schema.safeParse(JSON.parse(value) as unknown)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
export function writeDraft(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
export function removeDraft(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* Storage may be disabled; the in-memory form remains usable. */
  }
}
// crypto.randomUUID is unavailable on plain HTTP LAN origins; getRandomValues is supported there.
export function newSubmissionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = [...bytes]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return (
    hex.slice(0, 8) +
    '-' +
    hex.slice(8, 12) +
    '-' +
    hex.slice(12, 16) +
    '-' +
    hex.slice(16, 20) +
    '-' +
    hex.slice(20)
  )
}
