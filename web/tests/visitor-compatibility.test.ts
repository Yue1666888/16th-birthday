import { expect, test } from 'vitest'
import { selectVisitorView } from '../src/lib/visitor-view'
import { isSameOriginProxyRequest } from '../dev/proxy-origin'
import { toApiError } from '../src/lib/api-error'

test('compact mouse desktops remain desktop, while touch-only compact devices stay mobile', () => {
  expect(selectVisitorView(true, true, false)).toBe('desktop')
  expect(selectVisitorView(false, true, true)).toBe('desktop')
  expect(selectVisitorView(false, true, false)).toBe('mobile')
  expect(selectVisitorView(false, false, true)).toBe('mobile')
  expect(selectVisitorView(false, false, false)).toBe('mobile')
})
test('the development proxy normalizes only its own browser origin', () => {
  expect(
    isSameOriginProxyRequest('http://10.111.74.18:5173', '10.111.74.18:5173'),
  ).toBe(true)
  expect(
    isSameOriginProxyRequest('http://127.0.0.1:5173', '127.0.0.1:5173'),
  ).toBe(true)
  for (const origin of [
    undefined,
    'null',
    'https://other.example',
    'http://10.111.74.18:5174',
    'http://10.111.74.18:5173/path',
    'http://user@10.111.74.18:5173',
    'ftp://10.111.74.18:5173',
  ]) {
    expect(isSameOriginProxyRequest(origin, '10.111.74.18:5173')).toBe(false)
  }
  expect(isSameOriginProxyRequest('http://10.111.74.18:5173', undefined)).toBe(
    false,
  )
})
test('a non-JSON forbidden response explains the access rejection', async () => {
  const error = await toApiError({
    isAxiosError: true,
    response: { status: 403, data: 'Invalid CORS request' },
  })
  expect(error.status).toBe(403)
  expect(error.message).toContain('当前访问地址')
})
