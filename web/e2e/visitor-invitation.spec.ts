import { expect, test } from '@playwright/test'
import { mockInvitationApi, pixel } from './invitation-fixtures'

test('home navigation opens the independent public forms and both drafts survive viewport changes', async ({
  page,
}) => {
  const state = await mockInvitationApi(page)
  await page.goto('/memories?preview=1')
  const nav = page.getByRole('navigation', { name: '公开访客导航' })
  await expect(nav.getByRole('link').first()).toHaveText('00首页')
  await nav.getByRole('link', { name: '首页', exact: true }).click()
  await expect(page).toHaveURL(/invitation\?preview=1$/)
  await expect(page.getByRole('heading', { name: 'Dear SIPCer' })).toBeVisible()
  await page.locator('#reply-name').fill('保留的姓名')
  await page.locator('#memory-content').fill('保留的回忆正文')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('#reply-name')).toHaveValue('保留的姓名')
  await expect(page.locator('#memory-content')).toHaveValue('保留的回忆正文')
  await page.setViewportSize({ width: 320, height: 700 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
  for (const link of await nav.getByRole('link').all()) {
    const bounds = await link.boundingBox()
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320)
  }
  expect(
    state.calls.every(
      (call) => !call.authorization && !call.path.includes('admin'),
    ),
  ).toBeTruthy()
})

test('reply validates conditional fields, saves a real-shaped payload and does not request mail', async ({
  page,
}) => {
  const state = await mockInvitationApi(page)
  await page.goto('/invitation')
  const form = page.getByRole('form', { name: '邀请回执' })
  await page.getByRole('button', { name: '确认回执', exact: true }).click()
  await expect(form.getByText('请填写姓名', { exact: true })).toBeVisible()
  await page.locator('#reply-name').fill('回来的同学')
  await page.locator('#reply-phone').fill('13800138000')
  await page.locator('#reply-email').fill('person@example.com')
  await page.getByRole('checkbox', { name: '是否到场', exact: true }).uncheck()
  await expect(
    page.getByRole('radio', { name: '到场自取', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('radio', { name: '需要邮寄', exact: true }).check()
  await page.getByRole('button', { name: '确认回执', exact: true }).click()
  await expect(form.getByText('请填写邮寄地址', { exact: true })).toBeVisible()
  await page.locator('#reply-address').fill('天津市 · 测试地址')
  await page.getByRole('button', { name: '确认回执', exact: true }).click()
  await expect(form.getByText('回执已收到', { exact: true })).toBeVisible()
  expect(state.replies[0]).toMatchObject({
    phone: '13800138000',
    attendance: 'NOT_ATTENDING',
    giftChoice: 'MAIL',
    mailingAddress: '天津市 · 测试地址',
  })
  expect(state.calls.some((call) => call.path.includes('mail'))).toBeFalsy()
})

test('anonymous text contribution retries unknown results with the same frozen payload after refresh', async ({
  page,
}) => {
  const state = await mockInvitationApi(page, { firstUnknown: true })
  page.on('dialog', (dialog) => dialog.accept())
  await page.goto('/invitation')
  const form = page.getByRole('form', { name: '回忆投稿' })
  await page.getByRole('button', { name: '发布回忆', exact: true }).click()
  await expect(
    form.getByText('正文和图片至少填写一项', { exact: true }),
  ).toBeVisible()
  await page.locator('#memory-content').fill('一段没有照片的回忆')
  await page.getByRole('button', { name: '发布回忆', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '重试并核对发布结果' }),
  ).toBeVisible()
  await expect(page.locator('#memory-content')).toBeDisabled()
  await page.reload()
  await expect(page.locator('#memory-content')).toHaveValue(
    '一段没有照片的回忆',
  )
  await page.getByRole('button', { name: '重试并核对发布结果' }).click()
  await expect(form.getByText('回忆已发布', { exact: true })).toBeVisible()
  expect(state.memories).toHaveLength(2)
  expect(state.memories[1]).toEqual(state.memories[0])
  expect(state.memories[0]).toMatchObject({
    displayName: null,
    title: null,
    content: '一段没有照片的回忆',
    imageIds: [],
  })
  await expect(page.locator('#memory-content')).toHaveValue('')
})

test('image upload establishes the anonymous cookie first and image-only memory preserves image order', async ({
  page,
}) => {
  let release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const state = await mockInvitationApi(page, { holdFirstUpload: gate })
  await page.goto('/invitation')
  await expect(page.locator('#memory-images')).toBeEnabled()
  await page.locator('#memory-images').setInputFiles(
    [1, 2, 3].map((number) => ({
      name: number + '.png',
      mimeType: 'image/png',
      buffer: pixel,
    })),
  )
  await expect(page.locator('.invitation-photo')).toHaveCount(3)
  expect(state.uploads).toBe(0)
  await page.getByRole('button', { name: '前移第3张照片' }).click()
  await page.getByRole('button', { name: '发布回忆', exact: true }).click()
  await expect.poll(() => state.uploads).toBe(1)
  await expect(
    page.getByRole('button', { name: '正在发布…', exact: true }),
  ).toBeDisabled()
  expect(state.memories).toHaveLength(0)
  release()
  await expect(page.getByText('回忆已发布', { exact: true })).toBeVisible()
  expect(
    state.calls
      .filter((call) => call.path.includes('media'))
      .slice(1)
      .every((call) =>
        call.cookie?.includes('birthday_upload_session=upload-test'),
      ),
  ).toBeTruthy()
  expect(state.memories[0].imageIds).toEqual([
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000002',
  ])
})

test('leaving keeps drafts and cancelling navigation stays on the form', async ({
  page,
}) => {
  await mockInvitationApi(page)
  await page.goto('/invitation')
  await page.locator('#memory-content').fill('写到一半的故事')
  await page.getByRole('link', { name: '回忆墙', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: '继续填写', exact: true }).click()
  await expect(page).toHaveURL(/invitation$/)
  await page.getByRole('link', { name: '回忆墙', exact: true }).click()
  await page
    .getByRole('button', { name: '离开并保留草稿', exact: true })
    .click()
  await expect(page).toHaveURL(/memories$/)
  await page.getByRole('link', { name: '首页', exact: true }).click()
  await expect(page.locator('#memory-content')).toHaveValue('写到一半的故事')
})

test('hero has one canvas and cycles all six motifs, with static reduced-motion fallback', async ({
  page,
}) => {
  await mockInvitationApi(page)
  await page.clock.install()
  await page.goto('/invitation?preview=1')
  const mark = page.locator('[data-invitation-pattern]')
  await expect(mark).toHaveAttribute('data-invitation-pattern', 'SIPC')
  await expect(page.locator('canvas')).toHaveCount(1)
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-invitation-ready',
    'true',
  )
  for (const value of ['115', '602', 'TUT', '16TH', 'LOGO', 'SIPC']) {
    await page.clock.fastForward(6501)
    await expect(mark).toHaveAttribute('data-invitation-pattern', value)
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(mark).toHaveAttribute('data-invitation-pattern', 'SIPC')
  await page.clock.fastForward(20000)
  await expect(mark).toHaveAttribute('data-invitation-pattern', 'SIPC')
  await expect(page.locator('.invitation-mark > span')).toBeVisible()
})
