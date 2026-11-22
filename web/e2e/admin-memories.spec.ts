import { test, expect, type BrowserContext } from '@playwright/test'
import type { AdminMemory, ImageItem } from '../src/domain/api.types'
import { pixel } from './invitation-fixtures'

async function mockMemories(context: BrowserContext) {
  const date = '2026-11-22T12:00:00.000+08:00'
  const firstImage = {
    id: '10000000-0000-4000-8000-000000000001',
    url: 'data:image/png;base64,' + pixel.toString('base64'),
    width: 1,
    height: 1,
  }
  const secondImage = {
    ...firstImage,
    id: '10000000-0000-4000-8000-000000000002',
  }
  let rows: AdminMemory[] = [
    {
      id: '1',
      displayName: '原作者',
      title: '第一次相聚',
      content: '原来的回忆正文',
      images: [firstImage, secondImage],
      version: '1',
      publishedAt: date,
      updatedAt: date,
      source: 'VISITOR',
    },
    {
      id: '2',
      displayName: null,
      title: null,
      content: '匿名的回忆',
      images: [],
      version: '1',
      publishedAt: date,
      updatedAt: date,
      source: 'VISITOR',
    },
  ]
  const pictures = new Map<string, ImageItem>([
    [firstImage.id, firstImage],
    [secondImage.id, secondImage],
  ])
  const calls: {
    method: string
    path: string
    body: Record<string, unknown>
  }[] = []
  let conflict = false
  await context.route('**/api/v1/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname,
      method = req.method()
    const contentType = req.headers()['content-type']
    const body: Record<string, unknown> = contentType?.includes(
      'application/json',
    )
      ? req.postDataJSON() || {}
      : {}
    calls.push({ method, path, body })
    const ok = (data: unknown, code = 'OK', status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({
          code,
          message: '成功',
          data,
          fieldErrors: {},
          traceId: 'memory-test-trace',
        }),
      })
    const fail = (code: string, status: number) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({
          code,
          message:
            code === 'VERSION_CONFLICT' ? '记录已被其他成员更新' : '回忆不存在',
          data: null,
          fieldErrors: {},
          traceId: 'memory-test-trace',
        }),
      })
    if (path === '/api/v1/media/images') {
      const image = { ...firstImage, id: crypto.randomUUID() }
      pictures.set(image.id, image)
      return ok(image, 'IMAGE_UPLOADED', 201)
    }
    const normalize = (value: unknown) =>
      typeof value === 'string' && value.trim() ? value.trim() : null
    const images = (value: unknown) =>
      Array.isArray(value)
        ? value.map((id) => pictures.get(String(id))!).filter(Boolean)
        : []
    if (path === '/api/v1/admin/memories' && method === 'POST') {
      const item: AdminMemory = {
        id: String(rows.length + 10),
        displayName: normalize(body.displayName),
        title: normalize(body.title),
        content: normalize(body.content),
        images: images(body.imageIds),
        version: '1',
        publishedAt: date,
        updatedAt: date,
        source: 'ADMIN',
      }
      rows = [item, ...rows]
      return ok(item, 'MEMORY_CREATED', 201)
    }
    if (path.startsWith('/api/v1/admin/memories/')) {
      const id = path.split('/').at(-1),
        item = rows.find((row) => row.id === id)
      if (!item) return fail('MEMORY_NOT_FOUND', 404)
      if (method === 'GET') return ok(item)
      const expected =
        method === 'DELETE'
          ? url.searchParams.get('expectedVersion')
          : body.expectedVersion
      if (conflict || expected !== item.version) {
        conflict = false
        return fail('VERSION_CONFLICT', 409)
      }
      if (method === 'DELETE') {
        rows = rows.filter((row) => row.id !== id)
        return ok(
          {
            id,
            deleted: true,
            version: String(Number(item.version) + 1),
            deletedAt: date,
          },
          'MEMORY_DELETED',
        )
      }
      for (const field of ['displayName', 'title', 'content'] as const)
        if (field in body) item[field] = normalize(body[field])
      if ('imageIds' in body) item.images = images(body.imageIds)
      item.version = String(Number(item.version) + 1)
      return ok(item, 'MEMORY_UPDATED')
    }
    if (path === '/api/v1/admin/memories' || path === '/api/v1/memories') {
      const keyword = url.searchParams.get('keyword') || '',
        page = Number(url.searchParams.get('page') || 1),
        size = Number(url.searchParams.get('size') || 20)
      const filtered = rows.filter((row) =>
        [row.displayName, row.title, row.content].some((value) =>
          value?.includes(keyword),
        ),
      )
      return ok({
        content: filtered.slice((page - 1) * size, page * size).map((row) =>
          path.includes('/admin/')
            ? row
            : {
                id: row.id,
                displayName: row.displayName,
                title: row.title,
                excerpt: row.content,
                coverImage: row.images[0] || null,
                imageCount: row.images.length,
                publishedAt: row.publishedAt,
              },
        ),
        page,
        size,
        totalElements: filtered.length,
        totalPages: Math.ceil(filtered.length / size),
      })
    }
    if (path === '/api/v1/memories/names') {
      const counts = new Map<string, number>()
      rows.forEach((row) => {
        if (row.displayName)
          counts.set(row.displayName, (counts.get(row.displayName) || 0) + 1)
      })
      return ok({
        totalSubmissions: rows.length,
        namedSubmissions: rows.filter((row) => row.displayName).length,
        names: [...counts].map(([name, count]) => ({
          name,
          submissionCount: count,
          weight: count / rows.length,
        })),
      })
    }
    if (path.startsWith('/api/v1/memories/')) {
      const item = rows.find((row) => row.id === path.split('/').at(-1))
      return item ? ok(item) : fail('MEMORY_NOT_FOUND', 404)
    }
    return fail('TEST_UNHANDLED', 500)
  })
  return {
    calls,
    rows: () => rows,
    conflict: () => {
      conflict = true
    },
  }
}

test('memory sidebar, search and anonymous text creation use the actual-shaped management API', async ({
  page,
  context,
}, testInfo) => {
  const state = await mockMemories(context)
  await page.goto('/admin/memories')
  await expect(
    page.getByRole('link', { name: '回忆管理', exact: true }),
  ).toHaveClass(/active/)
  await expect(
    page.getByRole('heading', { name: '回忆管理', exact: true }),
  ).toBeVisible()
  await expect(page.locator('.memory-admin-table')).toContainText('第一次相聚')
  await page.screenshot({ path: testInfo.outputPath('memory-management.png') })
  await page.getByRole('textbox', { name: '搜索回忆' }).fill('不存在')
  await expect(
    page.getByText('没有找到匹配的回忆，试试其他关键词。'),
  ).toBeVisible()
  await page.getByRole('textbox', { name: '搜索回忆' }).fill('')
  await page.getByRole('button', { name: '新增回忆', exact: true }).click()
  await page.screenshot({ path: testInfo.outputPath('memory-editor.png') })
  await page.getByRole('button', { name: '新增', exact: true }).click()
  await expect(
    page.getByText('正文和图片至少填写一项', { exact: true }),
  ).toBeVisible()
  await page.locator('#memory-content').fill('管理员补充的一段回忆')
  await page.getByRole('button', { name: '新增', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: '新增回忆', exact: true }),
  ).toHaveCount(0)
  await expect(page.locator('.memory-admin-table')).toContainText(
    '管理员补充的一段回忆',
  )
  expect(state.rows()[0].displayName).toBeNull()
  expect(state.rows()[0].images).toEqual([])
})

test('editing preserves anonymous uploads, reorders pictures and keeps the draft on conflict', async ({
  page,
  context,
}) => {
  const state = await mockMemories(context)
  await page.goto('/admin/memories')
  await page
    .locator('tr')
    .filter({ hasText: '第一次相聚' })
    .getByRole('button', { name: '编辑', exact: true })
    .click()
  await page.locator('#memory-content').fill('编辑后的正文')
  await page.getByRole('button', { name: '后移第1张图片', exact: true }).click()
  state.conflict()
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(
    page.getByText('当前编辑内容已保留', { exact: false }),
  ).toBeVisible()
  await expect(page.locator('#memory-content')).toHaveValue('编辑后的正文')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: '编辑回忆', exact: true }),
  ).toHaveCount(0)
  expect(state.rows()[0].images[0].id).toBe(
    '10000000-0000-4000-8000-000000000002',
  )
  expect(
    state.calls.filter((call) => call.method === 'PATCH')[0].body
      .expectedVersion,
  ).toBe('1')
})

test('saving and deleting update an already open public wall and its name statistics in another tab', async ({
  page,
  context,
}) => {
  await mockMemories(context)
  await page.goto('/memories')
  await expect(page.getByRole('heading', { name: '回忆姓名墙' })).toBeVisible()
  await expect(page.locator('.memory-name')).toHaveText('原作者')
  const admin = await context.newPage()
  await admin.goto('/admin/memories')
  await admin
    .locator('tr')
    .filter({ hasText: '第一次相聚' })
    .getByRole('button', { name: '编辑', exact: true })
    .click()
  await admin.locator('#memory-display-name').fill('更新后的作者')
  await admin.locator('#memory-title').fill('更新后的标题')
  await admin.getByRole('button', { name: '保存', exact: true }).click()
  await page.bringToFront()
  await expect(page.locator('.memory-name')).toHaveText('更新后的作者')
  await expect(page.locator('[data-memory-id="1"]')).toContainText(
    '更新后的标题',
  )
  await admin.bringToFront()
  await admin
    .locator('tr')
    .filter({ hasText: '更新后的标题' })
    .getByRole('button', { name: '删除', exact: true })
    .click()
  await admin
    .getByRole('alertdialog')
    .getByRole('button', { name: '删除', exact: true })
    .click()
  await expect(admin.locator('.memory-admin-table')).not.toContainText(
    '更新后的标题',
  )
  await page.bringToFront()
  await expect(page.locator('[data-memory-id="1"]')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '回忆姓名墙' })).toHaveCount(0)
  await admin.close()
})

test('image-only memories accept nine uploaded pictures and reject a tenth', async ({
  page,
  context,
}) => {
  const state = await mockMemories(context)
  await page.goto('/admin/memories')
  await page.getByRole('button', { name: '新增回忆', exact: true }).click()
  const buffer = pixel
  await page.locator('#memory-files').setInputFiles(
    Array.from({ length: 9 }, (_, index) => ({
      name: 'memory-' + index + '.png',
      mimeType: 'image/png',
      buffer,
    })),
  )
  await expect(page.locator('.photo-tile img')).toHaveCount(9)
  expect(
    state.calls.filter((call) => call.path === '/api/v1/media/images'),
  ).toHaveLength(0)
  await page
    .locator('#memory-files')
    .setInputFiles({ name: 'extra.png', mimeType: 'image/png', buffer })
  await expect(page.getByText('最多上传9张图片', { exact: true })).toBeVisible()
  await expect(page.locator('.photo-tile img')).toHaveCount(9)
  await page.getByRole('button', { name: '新增', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: '新增回忆', exact: true }),
  ).toHaveCount(0)
  expect(state.rows()[0].images.length).toBe(9)
  expect(state.rows()[0].content).toBeNull()
})
