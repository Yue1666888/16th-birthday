import type { Page } from '@playwright/test'
import {
  getPreviewMemories,
  getPreviewHonors,
  previewMemories,
} from '../src/dev/wall-preview'
export async function mockVisitorApi(page: Page) {
  const requests: { path: string; authorization?: string }[] = []
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url())
    requests.push({
      path: url.pathname + url.search,
      authorization: request.headers().authorization,
    })
    let data: unknown
    if (url.pathname === '/api/v1/memories')
      data = getPreviewMemories(Number(url.searchParams.get('page') || '1'))
    else if (url.pathname.startsWith('/api/v1/memories/'))
      data = previewMemories.find(
        (row) =>
          row.id === decodeURIComponent(url.pathname.split('/').pop() || ''),
      )
    else if (url.pathname === '/api/v1/honors')
      data = getPreviewHonors(Number(url.searchParams.get('page') || '1'))
    else throw new Error('Unexpected public request: ' + url.pathname)
    await route.fulfill({
      json: {
        code: 'OK',
        message: '成功',
        data,
        fieldErrors: {},
        traceId: 'visitor-test',
      },
    })
  })
  return requests
}
