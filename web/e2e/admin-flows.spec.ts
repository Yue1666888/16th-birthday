import { test, expect } from '@playwright/test'
import { mockApi } from './fixtures'
test('homepage stays public and admin pages use the shared sidebar', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: '十六周年邀请函' }),
  ).toBeVisible()
  await expect(page.locator('.sidebar')).toHaveCount(0)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/invitations$/)
  await expect(
    page.getByRole('heading', { name: '报名管理', exact: true }),
  ).toBeVisible()
  for (const label of ['报名管理', '荣誉墙', '邮件管理', '日志管理'])
    await expect(
      page.getByRole('link', { name: label, exact: true }),
    ).toBeVisible()
})
test('invitation correction validates conditional address and saves only changed fields', async ({
  page,
}) => {
  const db = await mockApi(page)
  await page.goto('/admin/invitations')
  await expect(page.locator('tbody tr')).toHaveCount(20)
  await page.getByRole('button', { name: '修改', exact: true }).first().click()
  await expect(
    page.getByRole('heading', { name: '修改报名回执' }),
  ).toBeVisible()
  await expect(page.locator('#edit-address')).toHaveCount(0)
  await page.locator('#edit-attendance').selectOption('NOT_ATTENDING')
  await expect(page.locator('#edit-gift option[value="PICKUP"]')).toHaveCount(0)
  await page.locator('#edit-gift').selectOption('MAIL')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('请填写邮寄地址', { exact: true })).toBeVisible()
  await page.locator('#edit-address').fill('天津市 · 实际表单测试地址')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('heading', { name: '修改报名回执' })).toHaveCount(
    0,
  )
  const call = db.calls.find((c) => c.method === 'PATCH')
  expect(call).toBeTruthy()
  expect(call?.body).toMatchObject({
    expectedVersion: '1',
    attendance: 'NOT_ATTENDING',
    giftChoice: 'MAIL',
    mailingAddress: '天津市 · 实际表单测试地址',
  })
  expect(call?.body).not.toHaveProperty('phone')
  expect(call?.body).not.toHaveProperty('name')
  await page.getByRole('button', { name: '查看', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: '报名详情' })).toBeVisible()
  await expect(
    page.locator('.info-item').filter({ hasText: '邮寄地址' }),
  ).toContainText('天津市 · 实际表单测试地址')
})
test('version conflicts keep form content and require discard confirmation', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/admin/invitations')
  await page.getByRole('button', { name: '修改', exact: true }).first().click()
  await page.route('**/api/v1/admin/invitations/1', (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'VERSION_CONFLICT',
            message: '回执已被更新，请重新读取',
            data: null,
            fieldErrors: {},
            traceId: 'test-conflict-trace',
          }),
        })
      : route.fallback(),
  )
  await page.locator('#edit-name').fill('保留我的修改')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('回执已被更新')
  await expect(page.locator('#edit-name')).toHaveValue('保留我的修改')
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: '放弃未保存的修改？' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '放弃', exact: true }).click()
  await expect(page.getByRole('heading', { name: '修改报名回执' })).toHaveCount(
    0,
  )
})
test('honors support required fields, nine uploaded photos, ordering, creation and deletion', async ({
  page,
}) => {
  const db = await mockApi(page)
  await page.goto('/admin/honors')
  await page.getByRole('button', { name: '新增荣誉', exact: true }).click()
  await page.getByRole('button', { name: '新增', exact: true }).click()
  await expect(page.getByText('请填写荣誉标题', { exact: true })).toBeVisible()
  await expect(page.getByText('请填写人员', { exact: true })).toBeVisible()
  await page.locator('#honor-title').fill('前端集成测试荣誉')
  await page.locator('#honor-people').fill('成员甲、成员乙')
  const image = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1e8AAAAASUVORK5CYII=',
    'base64',
  )
  await page.locator('#honor-files').setInputFiles(
    Array.from({ length: 9 }, (_, i) => ({
      name: 'photo' + i + '.png',
      mimeType: 'image/png',
      buffer: image,
    })),
  )
  await expect(page.locator('.photo-tile img')).toHaveCount(9)
  await expect(
    page.getByRole('button', { name: '新增', exact: true }),
  ).toBeEnabled()
  await page.getByRole('button', { name: '后移第1张图片' }).click()
  await page.getByRole('button', { name: '新增', exact: true }).click()
  await expect(page.getByRole('heading', { name: '新增荣誉' })).toHaveCount(0)
  await expect(
    page.getByText('前端集成测试荣誉', { exact: true }),
  ).toBeVisible()
  expect(db.getHonors()[0].images).toHaveLength(9)
  await page.getByRole('button', { name: '删除', exact: true }).first().click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '删除', exact: true })
    .click()
  await expect(page.getByText('前端集成测试荣誉', { exact: true })).toHaveCount(
    0,
  )
})
test('mail drafts remain separate and bulk selection covers every filtered page', async ({
  page,
}) => {
  const db = await mockApi(page)
  await page.goto('/admin/mail?mode=single&recipientId=1')
  await page.locator('#compose-subject').fill('陈思远的专属邮件')
  await page.locator('#compose-body').fill('这封邮件只属于陈思远。')
  await page.locator('.recipient').filter({ hasText: '林嘉怡' }).first().click()
  await expect(page.locator('#compose-body')).toContainText('')
  await expect(page.locator('#compose-body')).not.toHaveValue(
    '这封邮件只属于陈思远。',
  )
  await page.locator('.recipient').filter({ hasText: '陈思远' }).first().click()
  await expect(page.locator('#compose-body')).toHaveValue(
    '这封邮件只属于陈思远。',
  )
  await page.getByRole('tab', { name: '群发模式' }).click()
  await expect(page.locator('#compose-body')).toHaveValue(/\{\{name}}/)
  await page
    .getByRole('combobox', { name: '邮件状态筛选' })
    .selectOption('NOT_SENT')
  await page.getByRole('button', { name: '选择全部筛选结果' }).click()
  await expect(
    page.getByText('已选择 31 位报名者', { exact: true }),
  ).toBeVisible()
  await page.locator('#compose-subject').fill('给{{name}}的邀请')
  await page
    .locator('#compose-body')
    .fill('{{name}}，你好！礼物：{{giftChoice}}')
  await page.getByRole('button', { name: '预览并确认' }).click()
  await expect(
    page.getByRole('heading', { name: '群发预览与确认' }),
  ).toBeVisible()
  await expect(page.locator('#preview-recipient option')).toHaveCount(31)
  await expect(
    page.getByRole('button', { name: '确认', exact: true }),
  ).toBeDisabled()
  await page.locator('#preview-recipient').selectOption('1')
  await expect(page.locator('.mail-paper')).toContainText('林嘉怡')
  await expect(page.locator('.mail-paper')).toContainText('邮寄')
  await page
    .getByRole('checkbox', { name: '我已核对全部收件人、主题及邮件正文' })
    .check()
  await page.getByRole('button', { name: '确认', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: '发送任务已登记' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '记录', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: '邮件发送记录' }),
  ).toBeVisible()
  expect(db.history).toHaveLength(31)
  expect(db.calls.filter((c) => c.path === '/admin/mail/batches')).toHaveLength(
    1,
  )
  await page
    .getByRole('button', { name: '查看正文', exact: true })
    .first()
    .click()
  await expect(
    page.getByRole('heading', { name: '邮件记录详情' }),
  ).toBeVisible()
  await expect(page.locator('.mail-paper')).toContainText('陈思远')
})
test('unknown template variables fail before a preview request', async ({
  page,
}) => {
  const db = await mockApi(page)
  await page.goto('/admin/mail?mode=bulk')
  await page.getByRole('checkbox', { name: '选择陈思远', exact: true }).check()
  await page.locator('#compose-body').fill('{{unknown}}')
  await page.getByRole('button', { name: '预览并确认' }).click()
  await expect(
    page.getByText('未知变量：unknown', { exact: true }),
  ).toBeVisible()
  expect(
    db.calls.filter((c) => c.path === '/admin/mail/previews'),
  ).toHaveLength(0)
})
test('service logs render, keep read position and download plain text', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/admin/logs')
  await expect(page.locator('.log-row')).toHaveCount(70)
  await expect(page.getByText(/ERROR 示例异常/)).toBeVisible()
  await page
    .locator('#log-viewport')
    .evaluate((element) => (element.scrollTop = 0))
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载日志', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('birthday16-api.log')
})
