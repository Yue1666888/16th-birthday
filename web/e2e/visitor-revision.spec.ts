import { expect, test, type Page } from '@playwright/test'
import { mockInvitationApi } from './invitation-fixtures'

for (const channel of ['chrome', 'msedge'] as const) {
  test(`${channel}: attendance renders an empty box when unchecked and keeps pickup rules`, async ({
    playwright,
  }, testInfo) => {
    const browser = await playwright.chromium.launch({
      channel,
      headless: true,
    })
    const page = await browser.newPage({
      baseURL: testInfo.project.use.baseURL,
    })
    try {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await mockInvitationApi(page)
      await page.goto('/invitation')
      const checkbox = page.getByRole('checkbox', {
        name: '是否到场',
        exact: true,
      })
      const tick = page.locator('.attendance-tick svg')
      await expect(checkbox).toBeChecked()
      await expect(tick).toHaveCount(1)
      await page.getByRole('radio', { name: '到场自取', exact: true }).check()
      await checkbox.uncheck()
      await expect(checkbox).not.toBeChecked()
      await expect(tick).toHaveCount(0)
      await expect(
        page.getByRole('radio', { name: '到场自取', exact: true }),
      ).toHaveCount(0)
      await expect(
        page.getByRole('radio', { name: '不需要', exact: true }),
      ).toBeChecked()
      await expect(page.getByText(/^(可以到场|本次不能到场)$/)).toHaveCount(0)
      await page
        .locator('.invitation-attendance')
        .screenshot({ path: testInfo.outputPath('unchecked.png') })
      await checkbox.focus()
      await page.keyboard.press('Space')
      await expect(checkbox).toBeChecked()
      await expect(tick).toHaveCount(1)
      await expect(
        page.getByRole('radio', { name: '到场自取', exact: true }),
      ).toBeVisible()
      expect(errors).toEqual([])
    } finally {
      await browser.close()
    }
  })
}

test.describe('phone opening stability', () => {
  test.use({
    viewport: { width: 390, height: 700 },
    isMobile: true,
    hasTouch: true,
  })
  test('history card stays fixed through dialogue gaps and door labels track the artwork', async ({
    page,
  }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.clock.install()
    await page.goto('/?replay=1')
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
      { timeout: 15000 },
    )
    await page.getByRole('button', { name: /^启程/ }).click()
    async function jump(name: string) {
      await page.getByRole('button', { name: '旅程章节', exact: true }).click()
      await page
        .getByRole('dialog', { name: '旅程章节' })
        .getByRole('button', { name: new RegExp(name) })
        .click()
      await expect(page.locator('.opening-buffer')).toHaveCount(0)
    }
    for (const size of [
      { width: 390, height: 700 },
      { width: 320, height: 600 },
      { width: 430, height: 900 },
    ]) {
      await page.setViewportSize(size)
      await jump('云里的四页旧时光')
      await page.clock.runFor(2000)
      const reference = (await page
        .locator('.opening-memory-cloud')
        .boundingBox())!
      await expect(page.locator('.opening-caption')).toHaveCount(1)
      for (const [delta, captionCount] of [
        [1600, 0],
        [700, 1],
        [4300, 0],
        [1900, 1],
        [2900, 0],
        [600, 1],
        [5000, 1],
        [3400, 0],
        [700, 1],
        [3500, 0],
        [1000, 1],
        [3800, 0],
        [700, 1],
      ] as const) {
        await page.clock.runFor(delta)
        await expect(page.locator('.opening-caption')).toHaveCount(captionCount)
        const bounds = (await page
          .locator('.opening-memory-cloud')
          .boundingBox())!
        expect(Math.abs(bounds.y - reference.y)).toBeLessThan(1)
        expect(Math.abs(bounds.height - reference.height)).toBeLessThan(1)
        if (captionCount) {
          const caption = (await page
            .locator('.opening-caption')
            .boundingBox())!
          expect(caption.y).toBeGreaterThanOrEqual(bounds.y + bounds.height)
        }
      }
      await expect(
        page.getByRole('button', { name: /[上下]一页回忆/ }),
      ).toHaveCount(0)
    }
    await page.setViewportSize({ width: 390, height: 700 })
    await jump('门牌上的三个数字')
    await page.clock.runFor(3500)
    await page.getByRole('button', { name: '暂停旅程', exact: true }).click()
    // The blank plaque and red scroll bounds are measured in the original 850×1700 artwork.
    await assertArtAnchor(page, '.opening-door-number', 0.501, 0.2785)
    await assertArtAnchor(page, '.opening-door-banner', 0.873, 0.379)
    await page.screenshot({ path: testInfo.outputPath('door-phone.png') })
    for (const size of [
      { width: 320, height: 600 },
      { width: 430, height: 900 },
    ]) {
      await page.setViewportSize(size)
      await assertArtAnchor(page, '.opening-door-number', 0.501, 0.2785)
      await assertArtAnchor(page, '.opening-door-banner', 0.873, 0.379)
    }
    expect(errors).toEqual([])
  })

  test('a tap on the paused picture or caption resumes, while menus and scrolling keep the pause', async ({
    page,
  }) => {
    await page.clock.install()
    await page.goto('/?replay=1')
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
      { timeout: 15000 },
    )
    await page.getByRole('button', { name: /^启程/ }).click()
    const app = page.locator('.opening-app')
    await page.clock.runFor(800)
    await page.getByRole('button', { name: '暂停旅程', exact: true }).click()
    await expect(app).toHaveAttribute('data-paused', 'true')
    await page.getByRole('button', { name: '旅程章节', exact: true }).click()
    await page.getByRole('button', { name: '关闭章节' }).click()
    await expect(app).toHaveAttribute('data-paused', 'true')
    // Click a plain part of the scene, away from its controls and caption.
    await page.mouse.click(20, 220)
    await expect(app).toHaveAttribute('data-paused', 'false')
    await page.getByRole('button', { name: '暂停旅程', exact: true }).click()
    await page.locator('.opening-typewriter').click()
    await expect(app).toHaveAttribute('data-paused', 'false')
    await page.getByRole('button', { name: '旅程章节', exact: true }).click()
    await page
      .getByRole('dialog', { name: '旅程章节' })
      .getByRole('button', { name: /云里的四页旧时光/ })
      .click()
    await page.clock.runFor(1000)
    await page.setViewportSize({ width: 320, height: 500 })
    await page.getByRole('button', { name: '暂停旅程', exact: true }).click()
    const stage = page.locator('.opening-stage')
    await stage.hover()
    await page.mouse.wheel(0, 100)
    await expect
      .poll(() => stage.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(0)
    await expect(app).toHaveAttribute('data-paused', 'true')
    await page.touchscreen.tap(12, 240)
    await expect(app).toHaveAttribute('data-paused', 'false')
  })
})

async function assertArtAnchor(
  page: Page,
  selector: string,
  x: number,
  y: number,
) {
  const frame = (await page.locator('.opening-door-frame').boundingBox())!
  const label = (await page.locator(selector).boundingBox())!
  expect(
    Math.abs((label.x + label.width / 2 - frame.x) / frame.width - x),
  ).toBeLessThan(0.002)
  expect(
    Math.abs((label.y + label.height / 2 - frame.y) / frame.height - y),
  ).toBeLessThan(0.002)
}
