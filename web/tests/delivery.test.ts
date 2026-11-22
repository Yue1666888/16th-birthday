import { uploadRetrySeconds } from '../src/lib/upload-label'
import { afterEach, expect, test, vi } from 'vitest'
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { publicAssetVersion } from '../dev/public-assets'
import { publicAsset } from '../src/lib/public-asset'
import { toApiError } from '../src/lib/api-error'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
test('a replacement image changes its release URL even when the filename stays the same', () => {
  const directory = mkdtempSync(join(tmpdir(), 'birthday-public-assets-'))
  const file = join(directory, 'cover.webp')
  try {
    writeFileSync(file, 'first-image-content')
    const first = publicAssetVersion(directory)
    expect(publicAssetVersion(directory)).toBe(first)
    writeFileSync(file, 'replacement-image-content')
    expect(publicAssetVersion(directory)).not.toBe(first)
  } finally {
    unlinkSync(file)
    rmdirSync(directory)
  }
})
test('versioned public assets are not versioned twice', () => {
  vi.stubEnv('PROD', true)
  vi.stubGlobal('__PUBLIC_ASSET_VERSION__', '0123456789abcdef')
  expect(publicAsset('/opening/a.webp')).toBe(
    '/opening/a.webp?v=0123456789abcdef',
  )
  expect(publicAsset(publicAsset('/opening/a.webp'))).toBe(
    '/opening/a.webp?v=0123456789abcdef',
  )
})
test('upload busy responses retain the retry-after budget for bounded retries', async () => {
  const result = await toApiError({
    isAxiosError: true,
    response: {
      status: 503,
      headers: { 'retry-after': '3' },
      data: {
        code: 'UPLOAD_BUSY',
        message: '上传较多',
        fieldErrors: {},
        traceId: 'test',
      },
    },
  })
  expect(result.code).toBe('UPLOAD_BUSY')
  expect(result.retryAfterSeconds).toBe(3)
})

test('busy retries spread out while respecting the server cooldown', () => {
  expect(uploadRetrySeconds(3, 0)).toBe(3)
  expect(uploadRetrySeconds(3, 4)).toBe(16)
  expect(uploadRetrySeconds(3, 8)).toBe(20)
  expect(uploadRetrySeconds(45, 2)).toBe(45)
  expect(uploadRetrySeconds(3600, 2)).toBe(3600)
})
