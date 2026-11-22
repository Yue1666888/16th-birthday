import { expect, test, type Page } from '@playwright/test'
import { mockInvitationApi } from './invitation-fixtures'

async function begin(page: Page) {
  await page.clock.install()
  await page.goto('/?replay=1')
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '100',
    { timeout: 15000 },
  )
  await page.getByRole('button', { name: /^启程/ }).click()
  await expect(page.locator('.opening-app')).toHaveAttribute(
    'data-scene',
    'S01',
  )
}
async function chapter(page: Page, name: string) {
  await page.getByRole('button', { name: '旅程章节', exact: true }).click()
  await page
    .getByRole('dialog', { name: '旅程章节' })
    .getByRole('button', { name: new RegExp(name) })
    .click()
  await expect(page.locator('.opening-buffer')).toHaveCount(0)
}

test('real loader, typed text, pause and optional music work in the desktop opening', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await begin(page)
  const caption = page.locator('.opening-typewriter > span[aria-hidden=true]')
  await expect(caption).toContainText('有些')
  await page.getByRole('button', { name: '暂停旅程', exact: true }).click()
  const partial = await caption.innerText()
  expect(partial.length).toBeLessThan(
    '有些地方，离开很久，也不会陌生。│'.length,
  )
  await page.clock.runFor(2000)
  await expect.poll(() => caption.innerText()).toBe(partial)
  expect(
    await page
      .locator('audio')
      .evaluate((audio: HTMLAudioElement) => audio.paused),
  ).toBeTruthy()
  await page.getByRole('button', { name: '继续旅程', exact: true }).click()
  await page.clock.runFor(1000)
  expect((await caption.innerText()).length).toBeGreaterThan(partial.length)
  await page.getByRole('button', { name: '关闭音乐', exact: true }).click()
  expect(
    await page
      .locator('audio')
      .evaluate((audio: HTMLAudioElement) => audio.muted),
  ).toBeTruthy()
  await page.getByRole('button', { name: /有些地方.*点击显示整句/ }).click()
  await expect(caption).toContainText('有些地方，离开很久，也不会陌生。')
  expect(errors).toEqual([])
})

test('the balloon approaches automatically and boarding waits for confirmation', async ({
  page,
}) => {
  await begin(page)
  await chapter(page, '走向那只热气球')
  await expect(
    page.getByRole('button', { name: /向前走|直接走近/ }),
  ).toHaveCount(0)
  await page.clock.runFor(7500)
  await expect(page.locator('.opening-app')).toHaveAttribute(
    'data-scene',
    'S03',
  )
  await page.clock.runFor(11000)
  await expect(page.locator('.opening-app')).toHaveAttribute(
    'data-scene',
    'S03',
  )
  await page.getByRole('button', { name: '上热气球', exact: true }).click()
  await page.clock.runFor(700)
  await expect(page.locator('.opening-app')).toHaveAttribute(
    'data-scene',
    'S04',
  )
})

test('cloud photo pages pause for reading and survive phone/desktop changes', async ({
  page,
}) => {
  await begin(page)
  await chapter(page, '云里的四页旧时光')
  await page.getByRole('button', { name: '下一页回忆', exact: true }).click()
  await expect(page.locator('.opening-photo-row img')).toHaveCount(2)
  await expect(page.locator('.opening-memory-cloud')).toHaveCSS('opacity', '1')
  await expect(
    page.getByRole('button', { name: '继续旅程', exact: true }),
  ).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.opening-buffer')).toHaveCount(0)
  await expect(page.locator('.opening-photo-row img')).toHaveCount(1)
  await expect(page.locator('.opening-memory-controls')).toContainText(
    '02 / 04',
  )
  const box = (await page.locator('.opening-memory-cloud').boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.locator('.opening-photo-row img')).toHaveCount(2)
  await expect(page.locator('.opening-memory-controls')).toContainText(
    '02 / 04',
  )
})

test('door, lamp and invitation advance to the existing homepage without changing form drafts', async ({
  page,
}) => {
  await mockInvitationApi(page)
  await begin(page)
  await chapter(page, '门牌上的三个数字')
  await page.getByRole('button', { name: '推开115的门', exact: true }).click()
  await page.clock.runFor(1600)
  await expect(page.locator('.opening-app')).toHaveAttribute(
    'data-scene',
    'S08',
  )
  await page.clock.runFor(7000)
  await expect(page.locator('.opening-app')).toHaveAttribute(
    'data-scene',
    'S08',
  )
  await page.getByRole('button', { name: '点亮115', exact: true }).click()
  await page.clock.runFor(2100)
  await expect(page.locator('.opening-app')).toHaveAttribute(
    'data-scene',
    'S09',
  )
  await page.clock.runFor(6500)
  await expect(page.locator('.opening-app')).toHaveAttribute(
    'data-scene',
    'S10',
  )
  await page.clock.runFor(5000)
  await page.getByRole('button', { name: '打开邀请函', exact: true }).click()
  await page.clock.runFor(7400)
  await expect(page).toHaveURL(/\/invitation$/)
  await expect(page.getByRole('form', { name: '邀请回执' })).toBeVisible()
  await page.locator('#reply-name').fill('开场之外的草稿')
  await page.goto('/?replay=1')
  await page.getByRole('button', { name: /跳过开场/ }).click()
  await expect(page.locator('#reply-name')).toHaveValue('开场之外的草稿')
  await page.goto('/')
  await expect(page).toHaveURL(/\/invitation$/)
  await page.getByRole('link', { name: /重播开场/ }).click()
  await page
    .getByRole('button', { name: '离开并保留草稿', exact: true })
    .click()
  await expect(page.getByRole('button', { name: /^启程/ })).toBeVisible({
    timeout: 15000,
  })
})

test('failed first-scene art stays below 100 percent and retry can recover', async ({
  page,
}) => {
  let fail = true
  await page.route('**/opening/D01.webp', (route) =>
    fail ? route.abort() : route.continue(),
  )
  await page.goto('/?replay=1')
  await expect(
    page.getByText('有一件行囊还没准备好', { exact: false }),
  ).toBeVisible()
  expect(
    Number(await page.getByRole('progressbar').getAttribute('aria-valuenow')),
  ).toBeLessThan(100)
  await expect(page.getByRole('button', { name: /^启程/ })).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: '重新准备', exact: true }).click()
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '100',
    { timeout: 15000 },
  )
  await page.getByRole('button', { name: /^启程/ }).click()
  await expect(page.locator('.opening-app')).toHaveAttribute(
    'data-scene',
    'S01',
  )
})

test.describe('phone opening', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  test('portrait letter and narration frame fit, and reduced motion shows complete text', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await begin(page)
    await chapter(page, '把邀请，交到你手里')
    await page.clock.runFor(5000)
    const box = (await page.locator('.opening-letter').boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
    await page.getByRole('button', { name: '打开邀请函', exact: true }).click()
    await page.clock.runFor(1600)
    const opened = (await page.locator('.opening-letter').boundingBox())!
    expect(opened.x).toBeGreaterThanOrEqual(0)
    expect(opened.x + opened.width).toBeLessThanOrEqual(390)
    await expect(page.locator('.opening-typewriter')).toContainText(
      '这一路，谢谢你。欢迎回到115。',
    )
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy()
  })
})
