import { test, expect } from '@playwright/test'
import { mockVisitorApi } from './visitor-fixtures'
import { mockInvitationApi } from './invitation-fixtures'

test('phone navigation exposes replay, homepage removes motif numbers and chronicle removes the source footnote', async ({
  page,
}) => {
  await mockInvitationApi(page)
  await page.goto('/invitation')
  await expect(page.locator('.invitation-mark-index')).toHaveCount(0)
  const heading = (await page.locator('.invitation-greeting h1').boundingBox())!
  const welcome = (await page
    .locator('.invitation-welcome-back')
    .boundingBox())!
  expect(Math.abs(heading.y - welcome.y)).toBeLessThan(75)
  expect(welcome.x).toBeGreaterThan(heading.x + heading.width)
  await expect(page.locator('.invitation-mark-motto')).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('link', { name: /重播开场/ })).toBeVisible()
  const phoneHeading = (await page
    .locator('.invitation-greeting h1')
    .boundingBox())!
  const phoneWelcome = (await page
    .locator('.invitation-welcome-back')
    .boundingBox())!
  expect(phoneWelcome.y).toBeGreaterThan(phoneHeading.y + phoneHeading.height)
  await expect(page.locator('.invitation-mark-motto')).toBeHidden()
  await page.getByRole('link', { name: '115编年史', exact: true }).click()
  await expect(page.getByText('历史节点依据', { exact: false })).toHaveCount(0)
  await page.setViewportSize({ width: 1440, height: 1000 })
  expect(
    Number(
      await page.locator('.chronicle-node-halo').first().getAttribute('r'),
    ),
  ).toBeLessThan(20)
  await expect(page.locator('.chronicle-node-halo').first()).toHaveCSS(
    'fill',
    'none',
  )
})

test('preparation is visibly staged and still waits for real resources', async ({
  page,
}) => {
  await page.clock.install()
  await page.clock.pauseAt(new Date())
  await page.goto('/?replay=1')
  const bar = page.getByRole('progressbar')
  await expect(bar).toHaveAttribute('data-resource-progress', '100')
  await page.clock.runFor(800)
  const early = Number(await bar.getAttribute('aria-valuenow'))
  expect(early).toBeGreaterThan(0)
  expect(early).toBeLessThan(100)
  await expect(page.getByRole('button', { name: /^启程/ })).toHaveCount(0)
  await page.clock.runFor(8000)
  await expect(bar).toHaveAttribute('aria-valuenow', '100')
  await expect(page.getByRole('button', { name: /^启程/ })).toBeVisible()
})

test('404 is a full responsive page and its home action works', async ({
  page,
}) => {
  await mockInvitationApi(page)
  await page.goto('/a-page-that-does-not-exist')
  await expect(
    page.getByRole('heading', { name: '这一页，还没有写下。' }),
  ).toBeVisible()
  await expect(page.locator('.status-orbit-art')).toBeVisible()
  await page.setViewportSize({ width: 320, height: 740 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
  await page.getByRole('link', { name: '回到首页', exact: true }).click()
  await expect(page).toHaveURL(/\/invitation$/)
})

test('route failure shows recovery actions and reloading really retries the page', async ({
  page,
}) => {
  await mockVisitorApi(page)
  const pattern = '**/src/pages/visitor/honors/HonorWallPage.tsx*'
  await page.route(pattern, (route) => route.abort())
  await page.goto('/honors')
  await expect(
    page.getByRole('heading', { name: '旅程，暂时停了一下。' }),
  ).toBeVisible()
  await page.unroute(pattern)
  await page.getByRole('button', { name: '重新加载', exact: true }).click()
  await expect(page.getByRole('heading', { name: /每一份热爱/ })).toBeVisible()
})
