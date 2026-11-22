import { expect, test } from '@playwright/test'
import { mockVisitorApi } from './visitor-fixtures'
import { pixel } from './invitation-fixtures'

const image = {
  id: '10000000-0000-4000-8000-000000000001',
  url: '/test-images/original-1.png',
  thumbnailUrl: '/test-images/thumb-1.png',
  width: 600,
  height: 400,
}
const envelope = (data: unknown) => ({
  code: 'OK',
  message: '成功',
  data,
  fieldErrors: {},
  traceId: 'browse-delivery-test',
})

test('both walls fetch ten records and scrolling never requests the next page', async ({
  page,
}) => {
  const calls: { kind: string; page: number; size: number }[] = []
  await mockVisitorApi(page)
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url()),
      kind = url.pathname.split('/').at(-1)!
    if (!['memories', 'honors'].includes(kind)) return route.fallback()
    const current = Number(url.searchParams.get('page')),
      size = Number(url.searchParams.get('size'))
    calls.push({ kind, page: current, size })
    const rows = Array.from({ length: 23 }, (_, index) =>
      kind === 'memories'
        ? {
            id: String(index + 1),
            displayName: '同学',
            title: '回忆' + index,
            excerpt: '回忆正文',
            coverImage: null,
            imageCount: 0,
            publishedAt: '2026-11-23T00:00:00+08:00',
          }
        : {
            id: String(index + 1),
            title: '荣誉' + index,
            people: '成员',
            images: [
              { ...image, url: '/brand/sipc-emblem.png', thumbnailUrl: null },
            ],
          },
    )
    return route.fulfill({
      json: envelope({
        content: rows.slice((current - 1) * size, current * size),
        page: current,
        size,
        totalElements: rows.length,
        totalPages: Math.ceil(rows.length / size),
      }),
    })
  })
  for (const kind of ['memories', 'honors']) {
    await page.goto('/' + kind)
    const cards = page.locator(
      kind === 'memories' ? '.memory-card' : '.honor-card',
    )
    await expect(cards).toHaveCount(10)
    await page.evaluate(() =>
      scrollTo(0, document.documentElement.scrollHeight),
    )
    await page.waitForTimeout(100)
    expect(calls.filter((call) => call.kind === kind)).toHaveLength(1)
    await page.getByRole('button', { name: '继续浏览' }).click()
    await expect(cards).toHaveCount(20)
    await page.getByRole('button', { name: '继续浏览' }).click()
    await expect(cards).toHaveCount(23)
    expect(
      calls.filter((call) => call.kind === kind).map((call) => call.size),
    ).toEqual([10, 10, 10])
    await expect(page.getByRole('button', { name: '继续浏览' })).toHaveCount(0)
  }
})

test('lists and detail previews use thumbnails, a missing thumbnail falls back, and galleries keep originals', async ({
  page,
}) => {
  const originals: string[] = []
  await mockVisitorApi(page)
  await page.route('**/test-images/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('original')) originals.push(path)
    return path.includes('missing')
      ? route.fulfill({ status: 404, body: 'missing' })
      : route.fulfill({ contentType: 'image/png', body: pixel })
  })
  await page.route('**/api/v1/memories**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/names')) return route.fallback()
    if (path.endsWith('/1'))
      return route.fulfill({
        json: envelope({
          id: '1',
          title: '缩略图回忆',
          displayName: '同学',
          content: '正文',
          images: [image],
          publishedAt: '2026-11-23T00:00:00+08:00',
        }),
      })
    const rows = [
      image,
      {
        ...image,
        id: '10000000-0000-4000-8000-000000000002',
        url: '/test-images/original-2.png',
        thumbnailUrl: '/test-images/missing.png',
      },
    ].map((photo, index) => ({
      id: String(index + 1),
      title: '缩略图回忆' + index,
      displayName: '同学',
      excerpt: '正文',
      coverImage: photo,
      imageCount: 1,
      publishedAt: '2026-11-23T00:00:00+08:00',
    }))
    return route.fulfill({
      json: envelope({
        content: rows,
        page: 1,
        size: 10,
        totalElements: 2,
        totalPages: 1,
      }),
    })
  })
  await page.goto('/memories')
  await expect(
    page.locator('.memory-card').first().locator('img'),
  ).toHaveAttribute('src', image.thumbnailUrl)
  await expect(
    page.locator('.memory-card').nth(1).locator('img'),
  ).toHaveAttribute('src', '/test-images/original-2.png')
  expect(originals).not.toContain(image.url)
  await expect(page.locator('.memory-cover').first()).toHaveCSS(
    'content-visibility',
    'auto',
  )
  await page.locator('.memory-trigger').first().click()
  const detail = page.getByRole('dialog', { name: '回忆详情' })
  await expect(detail.locator('.detail-images img')).toHaveAttribute(
    'src',
    image.thumbnailUrl,
  )
  await detail
    .getByRole('button', { name: '查看回忆图片第1张', exact: true })
    .click()
  await expect(page.locator('.visitor-gallery img')).toHaveAttribute(
    'src',
    image.url,
  )
  await expect.poll(() => originals.includes(image.url)).toBeTruthy()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.route('**/api/v1/honors**', (route) =>
    route.fulfill({
      json: envelope({
        content: [
          { id: '1', title: '缩略图荣誉', people: '成员', images: [image] },
        ],
        page: 1,
        size: 10,
        totalElements: 1,
        totalPages: 1,
      }),
    }),
  )
  await page.getByRole('link', { name: '荣誉墙', exact: true }).click()
  await expect(page.locator('.honor-card img')).toHaveAttribute(
    'src',
    image.thumbnailUrl,
  )
})
