import { expect, test } from '@playwright/test'
import { mockInvitationApi } from './invitation-fixtures'

test('compact desktop keeps desktop view and matching navigation styles', async ({
  page,
}) => {
  await page.setViewportSize({ width: 950, height: 900 })
  await mockInvitationApi(page)
  await page.goto('/invitation')
  await expect(page.locator('.visitor-app')).toHaveAttribute(
    'data-view',
    'desktop',
  )
  await expect(page.locator('.visitor-nav')).toHaveCSS('flex-direction', 'row')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
})

test.describe('touch devices', () => {
  test.use({
    viewport: { width: 390, height: 700 },
    isMobile: true,
    hasTouch: true,
  })
  test('phone submits both public forms, and landscape remains mobile', async ({
    page,
  }) => {
    const state = await mockInvitationApi(page)
    await page.goto('/invitation')
    await expect(page.locator('.visitor-app')).toHaveAttribute(
      'data-view',
      'mobile',
    )
    await page.locator('#reply-name').fill('手机验收')
    await page.locator('#reply-phone').fill('13800138000')
    await page.locator('#reply-email').fill('phone@example.com')
    await page.getByRole('button', { name: '确认回执', exact: true }).click()
    await expect(page.getByText('回执已收到', { exact: true })).toBeVisible()
    await page.locator('#memory-content').fill('从手机提交的回忆')
    await page.getByRole('button', { name: '发布回忆', exact: true }).click()
    await expect(page.getByText('回忆已发布', { exact: true })).toBeVisible()
    expect(state.replies).toHaveLength(1)
    expect(state.memories).toHaveLength(1)
    await page.setViewportSize({ width: 844, height: 390 })
    await expect(page.locator('.visitor-app')).toHaveAttribute(
      'data-view',
      'mobile',
    )
  })

  test('opening history never overlaps dialogue and the invitation uses the new cover and centered details', async ({
    page,
  }, testInfo) => {
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
    await jump('云里的四页旧时光')
    await page.clock.runFor(5500)
    await page.getByRole('button', { name: '暂停旅程', exact: true }).click()
    await page.locator('.opening-typewriter').click()
    await expect(page.locator('.opening-history-stamps')).toContainText('冬')
    await expect(page.locator('.opening-history-stamps')).not.toContainText(
      '12.10',
    )
    await expect(page.getByText(/轻点文字/)).toHaveCount(0)
    await expect(page.locator('.opening-memory-controls')).toHaveCount(0)
    await expect(page.locator('.opening-bottom')).toHaveText('')
    for (const height of [700, 600]) {
      await page.setViewportSize({ width: 390, height })
      const card = (await page.locator('.opening-memory-cloud').boundingBox())!
      const dialogue = (await page.locator('.opening-caption').boundingBox())!
      expect(dialogue.y).toBeGreaterThanOrEqual(card.y + card.height)
    }
    await page.screenshot({ path: testInfo.outputPath('history-phone.png') })
    await jump('把邀请，交到你手里')
    await page.clock.runFor(5000)
    const cover = page.getByAltText('SIPC十六周年邀请函封面')
    await expect(cover).toHaveAttribute(
      'src',
      '/invitation/invitation-cover-v2.webp',
    )
    expect(
      await cover.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    ).toBeTruthy()
    const coverBounds = (await cover.boundingBox())!
    const coverCaption = (await page.locator('.opening-caption').boundingBox())!
    expect(coverBounds.y + coverBounds.height).toBeLessThanOrEqual(
      coverCaption.y,
    )
    await page.screenshot({ path: testInfo.outputPath('cover-phone.png') })
    await page.getByRole('button', { name: '打开邀请函', exact: true }).click()
    await page.clock.runFor(1700)
    const details = page.locator('.opening-invitation-details')
    await expect(details.locator('p')).toHaveCount(2)
    await expect(details).not.toContainText(/时间|地点/)
    for (const row of await details.locator('p').all()) {
      await expect(row).toHaveCSS('text-align', 'center')
      expect(
        await row.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBeTruthy()
    }
    await page.screenshot({ path: testInfo.outputPath('invitation-phone.png') })
  })
})
