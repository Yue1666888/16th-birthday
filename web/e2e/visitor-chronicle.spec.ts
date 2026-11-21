import { test, expect } from '@playwright/test'

test('fixed spiral keeps all 13 year-only nodes and reveals desktop facts only on hover', async ({
  page,
}) => {
  const calls: string[] = [],
    errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/api/v1/**', (route) => {
    calls.push(route.request().url())
    return route.abort()
  })
  page.on('request', (request) => {
    if (request.url().includes('sso.sipc115.com')) calls.push(request.url())
  })
  await page.goto('/chronicle')
  await expect(
    page.getByRole('heading', { name: '115编年史', exact: true }),
  ).toBeVisible()
  const nodes = page.locator('.chronicle-spiral-node')
  await expect(nodes).toHaveCount(13)
  await expect(
    page.locator('.chronicle-spiral-node[data-year="2010"]'),
  ).toHaveCount(3)
  expect(await nodes.locator('text').allTextContents()).toEqual([
    '2009',
    '2010',
    '2010',
    '2010',
    '2011',
    '2016',
    '2018',
    '2019',
    '2020',
    '2021',
    '2023',
    '2025',
    '2026',
  ])
  await expect(page.locator('.chronicle-node-detail')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '放大时间螺旋' })).toHaveCount(
    0,
  )
  await nodes.nth(0).hover()
  await expect(
    page.getByRole('dialog', { name: '2009年9月历史详情' }),
  ).toContainText('管理部、技术部、项目部、运维部')
  await nodes.nth(1).hover()
  await expect(page.getByRole('dialog')).toContainText(
    'Java组、C#组、PHP组、运维组、ACM集训队成立',
  )
  await nodes.nth(3).hover()
  await expect(page.getByRole('dialog')).toContainText(
    'Student Innovation and Practice Center',
  )
  await nodes.nth(9).hover()
  await expect(page.getByRole('dialog')).toContainText(
    '迎新小游戏上线，TUTCTF上线',
  )
  await expect(page.getByRole('dialog')).toContainText('密码学方向')
  await nodes.nth(12).hover()
  await expect(page.getByRole('dialog')).toContainText(
    '前端、后端、客户端合并为开发组',
  )
  await page.mouse.move(0, 100)
  await expect(page.locator('.chronicle-node-detail')).toHaveCount(0)
  await expect(page.locator('.chronicle-orbit-future')).toHaveCount(1)
  await expect(page.locator('.chronicle-future-label')).toHaveText('未完待续')
  expect(calls).toEqual([])
  expect(errors).toEqual([])
})

test('mouse dragging leaves the enlarged spiral fixed in place', async ({
  page,
}) => {
  await page.goto('/chronicle')
  const svg = page.locator('.chronicle-spiral-svg')
  await expect(svg).toBeVisible()
  expect(
    Number((await svg.getAttribute('viewBox'))!.split(' ')[2]),
  ).toBeLessThan(1000)
  const geometry = page.locator('.chronicle-spiral-geometry')
  const before = await geometry.evaluate((element) =>
    (element as SVGGraphicsElement).getCTM()!.toString(),
  )
  const bounds = await svg.boundingBox()
  await page.mouse.move(bounds!.x + 12, Math.max(130, bounds!.y + 20))
  await page.mouse.down()
  await page.mouse.move(bounds!.x + 100, Math.max(130, bounds!.y + 20) + 60, {
    steps: 8,
  })
  await page.mouse.up()
  const after = await geometry.evaluate((element) =>
    (element as SVGGraphicsElement).getCTM()!.toString(),
  )
  expect(after).toBe(before)
  expect(
    await svg.evaluate((element) => getComputedStyle(element).cursor),
  ).toBe('default')
})

test('mobile tap and long press reveal history while swiping scrolls the page rather than the spiral', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  await page.goto('/chronicle')
  const nodes = page.locator('.chronicle-spiral-node')
  await expect(nodes).toHaveCount(13)
  await nodes.nth(0).tap()
  await expect(
    page.getByRole('dialog', { name: '2009年9月历史详情' }),
  ).toContainText('602工作室成立')
  await page.getByRole('button', { name: '关闭历史详情' }).tap()
  await nodes.nth(9).scrollIntoViewIfNeeded()
  const node = await nodes.nth(9).boundingBox()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: node!.x + node!.width / 2, y: node!.y + node!.height / 2 },
    ],
  })
  await expect(
    page.getByRole('dialog', { name: '2021年历史详情' }),
  ).toContainText('密码学方向')
  await page.waitForTimeout(650)
  await expect(page.getByRole('dialog')).toBeVisible()
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await page.getByRole('button', { name: '关闭历史详情' }).tap()
  await page.evaluate(() => scrollTo(0, 0))
  const svg = page.locator('.chronicle-spiral-svg'),
    bounds = await svg.boundingBox()
  const x = bounds!.x + 5,
    y = Math.min(740, bounds!.y + bounds!.height - 40)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x, y: y - 100 }],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x, y: y - 220 }],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(20)
  await expect(page.locator('.chronicle-spiral-geometry')).not.toHaveAttribute(
    'transform',
  )
  await page.setViewportSize({ width: 320, height: 700 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
  const link = await page
    .getByRole('link', { name: '115编年史', exact: true })
    .boundingBox()
  expect(link!.x + link!.width).toBeLessThanOrEqual(320)
  await context.close()
})

test('keyboard details and static reduced-motion history work when arriving from preview', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/honors?preview=1')
  await page.getByRole('link', { name: '115编年史', exact: true }).click()
  await expect(page).toHaveURL(/chronicle\?preview=1$/)
  await expect(page.locator('.visitor-preview-banner')).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: '115编年史', exact: true }),
  ).toBeVisible()
  const node = page.locator('.chronicle-spiral-node').first()
  await node.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toContainText('602工作室成立')
  await page.keyboard.press('Escape')
  await expect(page.locator('.chronicle-node-detail')).toHaveCount(0)
  await expect(page.locator('.visitor-particles')).toBeHidden()
  await page.getByRole('link', { name: '回忆墙', exact: true }).click()
  await expect(page).toHaveURL(/memories\?preview=1$/)
  await expect(page.locator('.visitor-preview-banner')).toBeVisible()
})
