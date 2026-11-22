import { test, expect } from '@playwright/test'
import { mockVisitorApi } from './visitor-fixtures'

test('name wall uses complete contribution weights before loading more memories', async ({
  page,
}) => {
  const requests = await mockVisitorApi(page)
  await page.route('**/api/v1/memories/names', (route) =>
    route.fulfill({
      json: {
        code: 'OK',
        data: {
          totalSubmissions: 40,
          namedSubmissions: 28,
          names: [
            { name: '高频投稿者', submissionCount: 20, weight: 0.5 },
            { name: '普通投稿者', submissionCount: 6, weight: 0.15 },
            { name: '另一位投稿者', submissionCount: 2, weight: 0.05 },
          ],
        },
        fieldErrors: {},
        traceId: '',
      },
    }),
  )
  await page.goto('/memories')
  const wall = page.getByRole('region', { name: '回忆姓名墙', exact: true })
  await expect(wall).toBeVisible()
  await expect(page.locator('.memory-card')).toHaveCount(20)
  const names = wall.locator('.memory-name')
  await expect(names).toHaveCount(3)
  await expect(names.nth(0)).toHaveText('高频投稿者')
  await expect(
    wall.locator('.memory-cloud-word').first().locator('title'),
  ).toHaveText(/20 篇，占全部投稿 50.0%/)
  const sizes = await names.evaluateAll((nodes) =>
    nodes.map((node) => parseFloat(getComputedStyle(node).fontSize)),
  )
  expect(sizes[0]).toBeGreaterThan(sizes[1])
  expect(sizes[1]).toBeGreaterThan(sizes[2])
  expect(
    requests.some((request) => request.path.includes('page=2')),
  ).toBeFalsy()
  const position = await wall.boundingBox()
  const archive = await page.locator('.wall-heading-rule').boundingBox()
  expect(position!.y + position!.height).toBeLessThanOrEqual(archive!.y + 1)
  await page.getByRole('link', { name: '荣誉墙', exact: true }).click()
  await expect(
    page.getByRole('region', { name: '回忆姓名墙', exact: true }),
  ).toHaveCount(0)
})

test('name wall stays hidden for empty and anonymous-only contributions', async ({
  page,
}) => {
  await mockVisitorApi(page)
  for (const total of [0, 3]) {
    await page.route('**/api/v1/memories/names', (route) =>
      route.fulfill({
        json: {
          code: 'OK',
          data: { totalSubmissions: total, namedSubmissions: 0, names: [] },
          fieldErrors: {},
          traceId: '',
        },
      }),
    )
    await page.goto('/memories')
    await expect(page.locator('.memory-card')).toHaveCount(20)
    await expect(
      page.getByRole('region', { name: '回忆姓名墙', exact: true }),
    ).toHaveCount(0)
  }
})

test('mobile name wall wraps long names without overflowing and preserves single-column cards', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockVisitorApi(page)
  const longName = '很长的投稿署名'.repeat(6)
  await page.route('**/api/v1/memories/names', (route) =>
    route.fulfill({
      json: {
        code: 'OK',
        data: {
          totalSubmissions: 4,
          namedSubmissions: 4,
          names: [
            { name: longName, submissionCount: 3, weight: 0.75 },
            { name: '另一位朋友', submissionCount: 1, weight: 0.25 },
          ],
        },
        fieldErrors: {},
        traceId: '',
      },
    }),
  )
  await page.goto('/memories')
  await expect(
    page.getByRole('region', { name: '回忆姓名墙', exact: true }),
  ).toBeVisible()
  await expect(
    page.locator('.memory-name').filter({ hasText: longName }),
  ).toHaveText(longName)
  await page.locator('.memory-cloud-more summary').click()
  await expect(
    page.locator('.memory-name').filter({ hasText: longName }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
  const first = await page.locator('.memory-card').first().boundingBox()
  expect(first!.width).toBeGreaterThan(340)
})
