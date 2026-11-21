import { expect, test, type Page } from '@playwright/test'
async function readInk(
  page: Page,
  area?: { x: number; y: number; width: number; height: number },
) {
  return page.evaluate(
    (region) =>
      new Promise<{ ink: number; x: number; y: number }>((resolve) =>
        requestAnimationFrame(() => {
          const canvas =
            document.querySelector<HTMLCanvasElement>('.visitor-particles')!
          const gl = canvas.getContext('webgl2')!
          const rect = document
            .querySelector<HTMLElement>('[data-particle-word]')!
            .getBoundingClientRect()
          const x = region
            ? region.x + region.width / 2
            : rect.left + rect.width / 2
          const y = region
            ? region.y + region.height / 2
            : rect.top + rect.height / 2
          const width = region?.width || 48,
            height = region?.height || 48
          const ratio = canvas.width / innerWidth
          const w = Math.round(width * ratio),
            h = Math.round(height * ratio),
            pixels = new Uint8Array(w * h * 4)
          gl.readPixels(
            Math.round((x - width / 2) * ratio),
            Math.round((innerHeight - y - height / 2) * ratio),
            w,
            h,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixels,
          )
          let ink = 0
          for (let i = 3; i < pixels.length; i += 4) ink += pixels[i]
          resolve({ ink, x, y })
        }),
      ),
    area,
  )
}
async function settledInk(page: Page) {
  let previous = 0,
    stable = 0
  await expect
    .poll(
      async () => {
        const value = (await readInk(page)).ink
        stable =
          value > 2000 && Math.abs(value - previous) / value < 0.08
            ? stable + 1
            : 0
        previous = value
        return stable
      },
      { intervals: [150, 200, 200], timeout: 7000 },
    )
    .toBeGreaterThanOrEqual(3)
  return readInk(page)
}

test('fullscreen word particles scatter near the mouse and recover after it leaves', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/memories?preview=1')
  await expect(page.locator('[data-particle-word]')).toHaveAttribute(
    'data-particle-word',
    'MEMORIES',
  )
  await expect(page.locator('.visitor-particles')).toHaveAttribute(
    'data-word-ready',
    'true',
  )
  const bounds = await page.locator('.visitor-particles').boundingBox()
  expect(bounds?.height).toBe(1100)
  const below = await readInk(page, { x: 0, y: 850, width: 200, height: 180 })
  expect(below.ink).toBeGreaterThan(1000)
  const before = await settledInk(page)
  await page.mouse.move(before.x, before.y)
  await expect
    .poll(async () => (await readInk(page)).ink, {
      intervals: [100, 150],
      timeout: 5000,
    })
    .toBeLessThan(before.ink * 0.25)
  await page.mouse.move(0, 0)
  await expect
    .poll(
      async () => Math.abs((await readInk(page)).ink - before.ink) / before.ink,
      { intervals: [150, 200], timeout: 5000 },
    )
    .toBeLessThan(0.15)
  await page.getByRole('link', { name: '荣誉墙', exact: true }).click()
  await expect(page.locator('[data-particle-word]')).toHaveAttribute(
    'data-particle-word',
    'HONORS',
  )
  await expect(page.locator('.visitor-particles')).toHaveCount(1)
  await page.evaluate(() => window.scrollTo(0, 650))
  await expect(page.locator('.visitor-particles')).toHaveAttribute(
    'data-word-ready',
    'false',
  )
  expect(
    (await readInk(page, { x: 0, y: 850, width: 200, height: 180 })).ink,
  ).toBeGreaterThan(1000)
  expect(errors).toEqual([])
})

test('native mobile touch scatters and releases particles while single-column cards and scrolling work', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  await page.goto('/memories?preview=1')
  await expect(page.locator('.visitor-particles')).toHaveAttribute(
    'data-word-ready',
    'true',
  )
  const before = await settledInk(page)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: before.x, y: before.y }],
  })
  await expect
    .poll(async () => (await readInk(page)).ink, {
      intervals: [100, 150],
      timeout: 4000,
    })
    .toBeLessThan(before.ink * 0.25)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: before.x + 15, y: before.y }],
  })
  await expect
    .poll(async () => (await readInk(page)).ink)
    .toBeLessThan(before.ink * 0.4)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await expect
    .poll(
      async () => Math.abs((await readInk(page)).ink - before.ink) / before.ink,
      { intervals: [150, 200], timeout: 5000 },
    )
    .toBeLessThan(0.15)
  const cards = page.locator('.memory-card')
  const first = await cards.nth(0).boundingBox(),
    second = await cards.nth(1).boundingBox()
  expect(first?.width).toBeGreaterThan(340)
  expect(first?.x).toBe(second?.x)
  expect(second!.y).toBeGreaterThan(first!.y + first!.height)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 380, y: 650 }],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 380, y: 500 }],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 380, y: 350 }],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(50)
  await context.close()
})
