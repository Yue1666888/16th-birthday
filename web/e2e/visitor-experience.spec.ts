import { expect, test, type Page } from '@playwright/test'
import { mockVisitorApi } from './visitor-fixtures'
import { mockApi } from './fixtures'

async function start(page: Page) {
  await page.clock.install()
  await page.goto('/?replay=1')
  await page.getByRole('button', { name: /^启程/ }).click()
  await expect
    .poll(() =>
      page
        .locator('#visitor-background-audio')
        .evaluate((audio: HTMLAudioElement) => audio.paused),
    )
    .toBe(false)
}
async function finalChapter(page: Page) {
  await page.getByRole('button', { name: '旅程章节', exact: true }).click()
  await page.getByRole('button', { name: /欢迎回来，旅程在首页继续/ }).click()
  await page.clock.runFor(1800)
  await expect(page.locator('.opening-invitation-details')).toContainText(
    '2026年12月19日',
  )
  await expect(page.locator('.opening-invitation-details')).toContainText(
    '天津理工大学7号教学楼115室',
  )
}

test('the same playing audio survives the letter flight, homepage and public navigation', async ({
  page,
}) => {
  await mockVisitorApi(page)
  await start(page)
  const audio = (await page
    .locator('#visitor-background-audio')
    .elementHandle())!
  await finalChapter(page)
  const before = await audio.evaluate(
    (node: HTMLAudioElement) => node.currentTime,
  )
  await page.getByRole('button', { name: '立即进入首页', exact: true }).click()
  await expect(page).toHaveURL(/\/invitation$/)
  expect(await audio.evaluate((node) => node.isConnected)).toBe(true)
  expect(await audio.evaluate((node: HTMLAudioElement) => node.paused)).toBe(
    false,
  )
  expect(
    await audio.evaluate((node: HTMLAudioElement) => node.currentTime),
  ).toBeGreaterThanOrEqual(before)
  await expect(page.locator('[data-invitation-flight]')).toHaveCount(1)
  await expect(page.locator('[data-invitation-flight]')).toHaveCount(0, {
    timeout: 4000,
  })
  await page.getByRole('button', { name: '打开邀请函与音乐播放器' }).click()
  const dialog = page.getByRole('dialog', { name: '你的十六周年邀请函' })
  await expect(dialog.locator('.invitation-full-poster')).toBeVisible()
  await expect(dialog).toContainText('2026年12月19日')
  await expect(dialog).toContainText('天津理工大学7号教学楼115室')
  await dialog
    .getByRole('button', { name: '暂停背景音乐', exact: true })
    .click()
  expect(await audio.evaluate((node: HTMLAudioElement) => node.paused)).toBe(
    true,
  )
  await dialog
    .getByRole('button', { name: '播放背景音乐', exact: true })
    .click()
  await expect
    .poll(() => audio.evaluate((node: HTMLAudioElement) => node.paused))
    .toBe(false)
  await page.getByRole('button', { name: '关闭邀请函', exact: true }).click()
  await page.getByRole('link', { name: '回忆墙', exact: true }).click()
  expect(await audio.evaluate((node) => node.isConnected)).toBe(true)
  expect(await audio.evaluate((node: HTMLAudioElement) => node.paused)).toBe(
    false,
  )
  await expect(page.locator('audio')).toHaveCount(1)
})

test('turning music off in the opening stays off after entering and navigating the public pages', async ({
  page,
}) => {
  await mockVisitorApi(page)
  await start(page)
  await page.getByRole('button', { name: '关闭音乐', exact: true }).click()
  await finalChapter(page)
  await page.getByRole('button', { name: '立即进入首页', exact: true }).click()
  const audio = page.locator('#visitor-background-audio')
  expect(
    await audio.evaluate((node: HTMLAudioElement) => node.paused && node.muted),
  ).toBe(true)
  await page.getByRole('link', { name: '荣誉墙', exact: true }).click()
  expect(
    await audio.evaluate((node: HTMLAudioElement) => node.paused && node.muted),
  ).toBe(true)
  await page.getByRole('button', { name: '打开邀请函与音乐播放器' }).click()
  await expect(page.getByText('当前音乐已关闭', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: '播放背景音乐', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false')
})

test('the supplied mail preset is used for bulk and single drafts and can be loaded explicitly', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/admin/mail?mode=bulk')
  await expect(page.locator('#compose-subject')).toHaveValue(
    '山海几重，今盼汝归',
  )
  await expect(page.locator('#compose-body')).toHaveValue(
    /\{\{name}}，好久不见！/,
  )
  await expect(page.locator('#compose-body')).toHaveValue(
    /天津理工大学7号教学楼115室/,
  )
  await page.locator('#compose-body').fill('我的定制草稿')
  await page.getByRole('button', { name: '保存草稿', exact: true }).click()
  await page.reload()
  await expect(page.locator('#compose-body')).toHaveValue('我的定制草稿')
  await page
    .getByRole('button', { name: '载入邀请函模板', exact: true })
    .click()
  await expect(page.locator('#compose-body')).toHaveValue(
    /程序有始终，热爱无穷期/,
  )
  await page.getByRole('tab', { name: '单发模式', exact: true }).click()
  await expect(page.locator('#compose-body')).toHaveValue(/陈思远，好久不见！/)
  await expect(page.locator('#compose-body')).not.toHaveValue(/\{\{name}}/)
})

test.describe('phone invitation dock', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  test('direct visitors can read the poster and start music with a gesture without watching the opening', async ({
    page,
  }) => {
    await mockVisitorApi(page)
    await page.goto('/invitation')
    expect(
      await page
        .locator('audio')
        .evaluate((node: HTMLAudioElement) => node.paused),
    ).toBe(true)
    const dock = page.getByRole('button', { name: '打开邀请函与音乐播放器' })
    const rect = (await dock.boundingBox())!
    expect(rect.x + rect.width).toBeLessThanOrEqual(390)
    expect(rect.y + rect.height).toBeLessThanOrEqual(844)
    await dock.tap()
    await expect(
      page.getByRole('dialog', { name: '你的十六周年邀请函' }),
    ).toBeVisible()
    await page.getByRole('button', { name: '播放背景音乐', exact: true }).tap()
    await expect
      .poll(() =>
        page.locator('audio').evaluate((node: HTMLAudioElement) => node.paused),
      )
      .toBe(false)
    await page.getByRole('button', { name: '关闭邀请函', exact: true }).tap()
    await expect(dock).toBeFocused()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })
})
