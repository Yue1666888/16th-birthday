import type { Page } from '@playwright/test'
import { getPreviewMemoryNames } from '../src/dev/wall-preview'
export const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jqV0AAAAASUVORK5CYII=',
  'base64',
)
export async function mockInvitationApi(
  page: Page,
  options: { firstUnknown?: boolean; holdFirstUpload?: Promise<void> } = {},
) {
  const state = {
    calls: [] as {
      path: string
      body: Record<string, unknown> | null
      authorization?: string
      cookie?: string
    }[],
    uploads: 0,
    memories: [] as Record<string, unknown>[],
    replies: [] as Record<string, unknown>[],
  }
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname
    const body = request.headers()['content-type']?.includes('application/json')
      ? (request.postDataJSON() as Record<string, unknown>)
      : null
    state.calls.push({
      path,
      body,
      authorization: request.headers().authorization,
      cookie: request.headers().cookie,
    })
    const ok = (
      data: unknown,
      code = 'OK',
      status = 200,
      headers: Record<string, string> = {},
    ) =>
      route.fulfill({
        status,
        headers,
        json: {
          code,
          message: '成功',
          data,
          fieldErrors: {},
          traceId: 'invitation-test',
        },
      })
    if (path === '/api/v1/memories/names') return ok(getPreviewMemoryNames())
    if (path === '/api/v1/invitations' && body) {
      state.replies.push(body)
      return ok(
        {
          id: '88',
          result: 'CREATED',
          submittedAt: '2026-11-22T10:00:00+08:00',
        },
        'INVITATION_CREATED',
        201,
      )
    }
    if (path === '/api/v1/media/images') {
      const uploadNumber = ++state.uploads
      const data = request.postDataBuffer()?.toString('latin1') || ''
      const match = /filename="([123])\.png"/.exec(data)
      const number = match ? Number(match[1]) : uploadNumber
      if (uploadNumber === 1 && options.holdFirstUpload)
        await options.holdFirstUpload
      return ok(
        {
          id: '10000000-0000-4000-8000-' + String(number).padStart(12, '0'),
          url: '/brand/sipc-emblem.png',
          width: 600,
          height: 600,
        },
        'IMAGE_UPLOADED',
        201,
        uploadNumber === 1
          ? {
              'set-cookie':
                'birthday_upload_session=upload-test; Path=/api/v1; HttpOnly; SameSite=Lax',
            }
          : {},
      )
    }
    if (path === '/api/v1/memories' && request.method() === 'POST' && body) {
      state.memories.push(body)
      if (options.firstUnknown && state.memories.length === 1)
        return route.fulfill({
          status: 503,
          json: {
            code: 'SERVICE_UNAVAILABLE',
            message: '服务暂不可用',
            data: null,
            fieldErrors: {},
            traceId: 'unknown-test',
          },
        })
      return ok(
        {
          id: '99',
          displayName: body.displayName,
          title: body.title,
          content: body.content,
          images: [],
          publishedAt: '2026-11-22T10:00:00+08:00',
        },
        'MEMORY_CREATED',
        201,
      )
    }
    if (path === '/api/v1/memories')
      return ok({
        content: [],
        page: 1,
        size: 20,
        totalElements: 0,
        totalPages: 0,
      })
    throw new Error('Unexpected invitation request ' + path)
  })
  return state
}
