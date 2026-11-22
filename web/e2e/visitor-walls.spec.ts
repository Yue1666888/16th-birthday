import { test, expect } from '@playwright/test'
import { mockVisitorApi } from './visitor-fixtures'

test('desktop memory preview pins, opens nine images, restores the detail and never sends SSO', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const requests = await mockVisitorApi(page)
  await page.goto('/memories')
  await expect(page.locator('.memory-card')).toHaveCount(10)
  await expect(page.locator('.visitor-app[data-view]')).toHaveAttribute(
    'data-view',
    'desktop',
  )
  await expect(page.locator('.visitor-particles')).toHaveCount(1)
  const first = page.locator('.memory-trigger').first()
  await first.hover()
  const detail = page.getByRole('dialog', { name: '回忆详情' })
  await expect(detail).toBeVisible()
  await expect(detail.locator('.detail-images button')).toHaveCount(9)
  await first.click()
  await page.mouse.move(4, 500)
  await expect(detail).toHaveAttribute('data-pinned', 'true')
  await detail
    .getByRole('button', { name: '查看回忆图片第1张', exact: true })
    .click()
  const gallery = page.locator('.visitor-gallery')
  await expect(gallery).toBeVisible()
  await gallery.getByRole('button', { name: '下一张' }).click()
  await expect(gallery.locator('header')).toContainText('2 / 9')
  await page.keyboard.press('Escape')
  await expect(gallery).toHaveCount(0)
  await expect(detail).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(detail).toHaveCount(0)
  expect(requests.every((request) => !request.authorization)).toBeTruthy()
  expect(
    requests.filter(
      (request) => request.path === '/api/v1/memories/preview-memory-0',
    ).length,
  ).toBe(1)
  expect(errors).toEqual([])
  await page.mouse.move(0, 0)
  await page.screenshot({
    path: 'test-results/visitor-memories-desktop.png',
    fullPage: false,
    animations: 'disabled',
  })
})

test('desktop keyboard opens anonymous text-only memory and reads full content', async ({
  page,
}) => {
  await mockVisitorApi(page)
  await page.goto('/memories')
  const text = page.locator('.memory-trigger').nth(2)
  await text.focus()
  await page.keyboard.press('Enter')
  const detail = page.getByRole('dialog', { name: '回忆详情' })
  await expect(detail.locator('.memory-fulltext')).toContainText(
    '这是没有照片的一段回忆',
  )
  await expect(detail.locator('.detail-author')).toContainText('匿名')
  await expect(detail.locator('.detail-images')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(text).toBeFocused()
})

test('wall navigation restores loaded records and scroll position', async ({
  page,
}) => {
  await mockVisitorApi(page)
  await page.goto('/memories')
  await page.getByRole('button', { name: '继续浏览' }).click()
  await expect(page.locator('.memory-card')).toHaveCount(20)
  await page.evaluate(() => window.scrollTo(0, 950))
  const scroll = await page.evaluate(() => scrollY)
  await page.getByRole('link', { name: '荣誉墙', exact: true }).click()
  await expect(page.locator('.honor-card')).toHaveCount(8)
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await page.getByRole('link', { name: '回忆墙', exact: true }).click()
  await expect(page.locator('.memory-card')).toHaveCount(20)
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll)
})

test('desktop honors shows full people and its nine-image gallery without a detail request', async ({
  page,
}) => {
  const requests = await mockVisitorApi(page)
  await page.goto('/honors')
  const first = page.locator('.honor-card').first()
  await first.hover()
  await expect(first.getByRole('region', { name: '荣誉人员' })).toContainText(
    '示例成员',
  )
  await first.getByRole('button', { name: '荣誉人员', exact: true }).click()
  await page.mouse.move(0, 0)
  await expect(first.getByRole('region')).toBeVisible()
  await first.locator('.honor-image-trigger').click()
  const gallery = page.locator('.visitor-gallery')
  await expect(gallery.locator('header')).toContainText('1 / 9')
  await page.keyboard.press('ArrowRight')
  await expect(gallery.locator('header')).toContainText('2 / 9')
  await page.getByRole('button', { name: '关闭图片预览' }).click()
  expect(
    requests.every((request) => !request.path.includes('/honors/')),
  ).toBeTruthy()
  await page.keyboard.press('Escape')
  await page.mouse.move(0, 0)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: 'test-results/visitor-honors-desktop.png',
    animations: 'disabled',
  })
})

test('mobile memory sheet contains text and nine images, nested gallery returns to the sheet', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockVisitorApi(page)
  await page.goto('/memories')
  await expect(page.locator('.memory-grid-mobile')).toBeVisible()
  await page.screenshot({
    path: 'test-results/visitor-memories-mobile.png',
    animations: 'disabled',
  })
  await page.locator('.memory-trigger').first().click()
  const sheet = page.locator('.memory-mobile-detail')
  await expect(sheet).toBeVisible()
  await expect(sheet.locator('.detail-images button')).toHaveCount(9)
  await sheet
    .getByRole('button', { name: '查看回忆图片第1张', exact: true })
    .click()
  await expect(page.locator('.visitor-gallery')).toBeVisible()
  await page.getByRole('button', { name: '关闭图片预览' }).click()
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: '关闭回忆详情' }).click()
  await expect(sheet).toHaveCount(0)
  await expect(page.locator('.memory-trigger').first()).toBeFocused()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
})

test('mobile honors expands people inline, closes and views original images', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockVisitorApi(page)
  await page.goto('/honors')
  const first = page.locator('.honor-card').first()
  await first.getByRole('button', { name: '查看人员' }).click()
  await expect(first.locator('.honor-people-inline')).toContainText('林同学')
  await page.screenshot({
    path: 'test-results/visitor-honors-mobile.png',
    animations: 'disabled',
  })
  await first.locator('.honor-image-trigger').click()
  await page.getByRole('button', { name: '下一张' }).click()
  await expect(page.locator('.visitor-gallery header')).toContainText('2 / 9')
  await page.getByRole('button', { name: '关闭图片预览' }).click()
  await expect(first.locator('.honor-people-inline')).toBeVisible()
  await first.getByRole('button', { name: '查看人员' }).click()
  await expect(first.locator('.honor-people-inline')).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
})

test('changing device size keeps the selected memory and a single canvas', async ({
  page,
}) => {
  await mockVisitorApi(page)
  await page.goto('/memories')
  await page.locator('.memory-trigger').first().click()
  await expect(page.locator('.detail-images button')).toHaveCount(9)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.memory-mobile-detail')).toBeVisible()
  await expect(page.locator('.detail-images button')).toHaveCount(9)
  await expect(page.locator('.visitor-particles')).toHaveCount(1)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect(page.locator('.memory-desktop-detail')).toBeVisible()
  await expect(page.locator('.detail-images button')).toHaveCount(9)
  await expect(page.locator('.memory-mobile-detail')).toHaveCount(0)
})

test('public errors show trace ID, retry real requests and never silently show sample content', async ({
  page,
}) => {
  let failed = true
  await page.route('**/api/v1/memories/names', (route) =>
    route.fulfill({
      json: {
        code: 'OK',
        data: { totalSubmissions: 0, namedSubmissions: 0, names: [] },
        fieldErrors: {},
        traceId: '',
      },
    }),
  )
  await page.route('**/api/v1/memories*', (route) =>
    route.fulfill({
      status: failed ? 503 : 200,
      json: failed
        ? {
            code: 'SERVICE_UNAVAILABLE',
            message: '服务暂不可用',
            data: null,
            fieldErrors: {},
            traceId: 'trace-wall',
          }
        : {
            code: 'OK',
            data: {
              content: [],
              page: 1,
              size: 20,
              totalElements: 0,
              totalPages: 0,
            },
            fieldErrors: {},
            traceId: '',
          },
    }),
  )
  await page.goto('/memories')
  await expect(page.getByRole('alert')).toContainText('trace-wall')
  await expect(page.locator('.memory-card')).toHaveCount(0)
  failed = false
  await page.getByRole('button', { name: '重新加载' }).click()
  await expect(page.getByText('故事，等待被点亮')).toBeVisible()
  await expect(page.locator('.visitor-preview-banner')).toHaveCount(0)
})

test('explicit development preview is marked and carries its mode between walls', async ({
  page,
}) => {
  const calls: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/v1/'))
      calls.push(request.url())
  })
  await page.goto('/memories?preview=1')
  await expect(page.locator('.visitor-preview-banner')).toBeVisible()
  await expect(page.locator('.memory-card')).toHaveCount(10)
  await page.getByRole('link', { name: '荣誉墙', exact: true }).click()
  await expect(page).toHaveURL(/honors\?preview=1$/)
  await expect(page.locator('.honor-card')).toHaveCount(8)
  expect(calls).toEqual([])
})

test('reduced motion and narrow mobile keep content readable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 700 })
  await mockVisitorApi(page)
  await page.goto('/memories')
  await expect(page.locator('.memory-card')).toHaveCount(10)
  await expect(page.locator('.visitor-particles')).toBeHidden()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
})

test('wide touch devices can open memory and people without hover', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1180, height: 850 },
    hasTouch: true,
  })
  const page = await context.newPage()
  await mockVisitorApi(page)
  await page.goto('/memories')
  await page.locator('.memory-trigger').first().tap()
  await expect(page.getByRole('dialog', { name: '回忆详情' })).toBeVisible()
  await page.getByRole('button', { name: '关闭回忆详情' }).tap()
  await page.getByRole('link', { name: '荣誉墙', exact: true }).tap()
  await page.locator('.honor-people-trigger').first().tap()
  await expect(page.locator('.honor-people').first()).toBeVisible()
  await context.close()
})
