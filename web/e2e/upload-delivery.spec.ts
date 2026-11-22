import { expect, test } from '@playwright/test'
import { mockInvitationApi, pixel } from './invitation-fixtures'

test('selection stays local, photos survive refresh, and submission uploads exactly once', async ({
  page,
}) => {
  const state = await mockInvitationApi(page)
  page.on('dialog', (dialog) => dialog.accept())
  await page.goto('/invitation')
  await page.locator('#memory-content').fill('带照片的本地草稿')
  await page
    .locator('#memory-images')
    .setInputFiles({ name: 'draft.png', mimeType: 'image/png', buffer: pixel })
  await expect(
    page.getByText('照片草稿已保存在此浏览器。', { exact: true }),
  ).toBeVisible()
  expect(state.uploads).toBe(0)
  await page.reload()
  await expect(page.locator('#memory-content')).toHaveValue('带照片的本地草稿')
  await expect(page.locator('.invitation-photo')).toHaveCount(1)
  expect(state.uploads).toBe(0)
  await page.getByRole('button', { name: '发布回忆', exact: true }).click()
  await expect(page.getByText('回忆已发布', { exact: true })).toBeVisible()
  expect(state.uploads).toBe(1)
  expect(state.memories).toHaveLength(1)
  await page.reload()
  await expect(page.locator('.invitation-photo')).toHaveCount(0)
})

test('cancelling an in-flight photo keeps the file and reuses its upload operation on retry', async ({
  page,
}) => {
  const state = await mockInvitationApi(page)
  const ids: string[] = []
  let cancelled = false,
    release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/v1/media/images', async (route) => {
    ids.push(route.request().headers()['x-upload-id'])
    if (ids.length === 1) {
      await gate
      if (cancelled) return
    }
    return route.fulfill({
      status: 201,
      json: {
        code: 'IMAGE_UPLOADED',
        message: '成功',
        data: {
          id: '10000000-0000-4000-8000-000000000001',
          url: '/brand/sipc-emblem.png',
          width: 1,
          height: 1,
        },
        fieldErrors: {},
        traceId: 'cancel-test',
      },
    })
  })
  await page.goto('/invitation')
  await page.locator('#memory-content').fill('取消后保留的内容')
  await page
    .locator('#memory-images')
    .setInputFiles({ name: 'cancel.png', mimeType: 'image/png', buffer: pixel })
  await page.getByRole('button', { name: '发布回忆', exact: true }).click()
  await expect.poll(() => ids.length).toBe(1)
  cancelled = true
  await page
    .getByRole('button', { name: '取消上传，保留草稿', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: '发布回忆', exact: true }),
  ).toBeEnabled()
  await expect(page.locator('#memory-content')).toHaveValue('取消后保留的内容')
  await expect(page.locator('.invitation-photo')).toHaveCount(1)
  expect(state.memories).toHaveLength(0)
  release()
  await page.getByRole('button', { name: '发布回忆', exact: true }).click()
  await expect(page.getByText('回忆已发布', { exact: true })).toBeVisible()
  expect(ids).toHaveLength(2)
  expect(ids[1]).toBe(ids[0])
})

test('large photos are compressed locally, busy uploads retry with the same operation ID, and success waits for storage', async ({
  page,
}) => {
  test.setTimeout(45000)
  const state = await mockInvitationApi(page)
  // Playwright route interception does not send bytes to a socket. Explicitly
  // emit upload completion to verify that 100% still waits for storage, while
  // the multipart payload below verifies the actual compressed file separately.
  await page.addInitScript(() => {
    const NativeWorker = window.Worker
    window.Worker = class extends NativeWorker {
      constructor(...args: ConstructorParameters<typeof NativeWorker>) {
        super(...args)
        document.documentElement.dataset.compressionWorkerCompleted = '0'
        document.documentElement.dataset.compressionWorkerErrors = '0'
        this.addEventListener('message', (event) => {
          if (event.data.file)
            document.documentElement.dataset.compressionWorkerCompleted = '1'
          if (event.data.error)
            document.documentElement.dataset.compressionWorkerErrors = '1'
        })
      }
    }
    const send = XMLHttpRequest.prototype.send
    XMLHttpRequest.prototype.send = function (body) {
      send.call(this, body)
      if (body instanceof FormData)
        queueMicrotask(() =>
          this.upload.dispatchEvent(
            new ProgressEvent('progress', {
              lengthComputable: true,
              loaded: 1,
              total: 1,
            }),
          ),
        )
    }
  })
  await page.goto('/invitation')
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2400
    canvas.height = 1600
    const context = canvas.getContext('2d')!,
      image = context.createImageData(canvas.width, canvas.height)
    let seed = 115
    for (let index = 0; index < image.data.length; index += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      image.data[index] = seed & 255
      image.data[index + 1] = (seed >>> 8) & 255
      image.data[index + 2] = (seed >>> 16) & 255
      image.data[index + 3] = 255
    }
    context.putImageData(image, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.95).split(',')[1]
  })
  const original = Buffer.from(base64, 'base64')
  expect(original.length).toBeGreaterThan(256 * 1024)
  const bodies: { id: string; bytes: Buffer }[] = []
  let release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/v1/media/images', async (route) => {
    const request = route.request()
    const multipart = await new Response(
      new Uint8Array(request.postDataBuffer()!),
      { headers: { 'content-type': request.headers()['content-type'] } },
    ).formData()
    const file = multipart.get('file')
    if (!(file instanceof File)) throw new Error('Expected an uploaded file')
    bodies.push({
      id: request.headers()['x-upload-id'],
      bytes: Buffer.from(await file.arrayBuffer()),
    })
    if (bodies.length === 1)
      return route.fulfill({
        status: 503,
        headers: { 'Retry-After': '1' },
        json: {
          code: 'UPLOAD_BUSY',
          message: '上传较多',
          data: null,
          fieldErrors: {},
          traceId: 'busy-test',
        },
      })
    await gate
    return route.fulfill({
      status: 201,
      json: {
        code: 'IMAGE_UPLOADED',
        message: '成功',
        data: {
          id: '10000000-0000-4000-8000-000000000001',
          url: '/brand/sipc-emblem.png',
          thumbnailUrl: '/brand/sipc-emblem.png',
          width: 1920,
          height: 1280,
        },
        fieldErrors: {},
        traceId: 'image-test',
      },
    })
  })
  await expect(page.locator('#memory-images')).toBeEnabled()
  await page.locator('#memory-images').setInputFiles({
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
    buffer: original,
  })
  await expect(page.locator('.invitation-photo')).toHaveCount(1)
  expect(bodies).toHaveLength(0)
  await page.getByRole('button', { name: '发布回忆', exact: true }).click()
  await expect.poll(() => bodies.length, { timeout: 20000 }).toBe(2)
  expect(bodies[1].id).toBe(bodies[0].id)
  expect(bodies[1].bytes.equals(bodies[0].bytes)).toBeTruthy()
  expect(bodies[1].bytes.length).toBeLessThan(original.length)
  expect(bodies[1].bytes.length).toBeLessThan(1024 * 1024)
  await expect(page.locator('html')).toHaveAttribute(
    'data-compression-worker-completed',
    '1',
  )
  await expect(page.locator('html')).toHaveAttribute(
    'data-compression-worker-errors',
    '0',
  )
  expect(state.memories).toHaveLength(0)
  await expect(page.getByText('图传处理中…', { exact: true })).toBeVisible()
  release()
  await expect(page.getByText('回忆已发布', { exact: true })).toBeVisible()
  expect(state.memories).toHaveLength(1)
})

test('a failed photo preserves successful uploads and retries only that photo in the original order', async ({
  page,
}) => {
  const state = await mockInvitationApi(page)
  const counts = new Map<string, number>()
  let active = 0,
    peak = 0
  await page.route('**/api/v1/media/images', async (route) => {
    active++
    peak = Math.max(peak, active)
    try {
      const request = route.request()
      const multipart = await new Response(
        new Uint8Array(request.postDataBuffer()!),
        { headers: { 'content-type': request.headers()['content-type'] } },
      ).formData()
      const file = multipart.get('file')
      if (!(file instanceof File)) throw new Error('Missing photo')
      const number = Number(file.name[0])
      counts.set(file.name, (counts.get(file.name) || 0) + 1)
      await new Promise((resolve) => setTimeout(resolve, 40))
      if (number === 2 && counts.get(file.name) === 1)
        return route.fulfill({
          status: 502,
          json: {
            code: 'IMAGE_SERVICE_ERROR',
            message: '图传暂时失败',
            data: null,
            fieldErrors: {},
            traceId: 'partial-test',
          },
        })
      return route.fulfill({
        status: 201,
        headers: {
          'Set-Cookie':
            'birthday_upload_session=upload-test; Path=/api/v1; HttpOnly; SameSite=Lax',
        },
        json: {
          code: 'IMAGE_UPLOADED',
          message: '成功',
          data: {
            id: '10000000-0000-4000-8000-' + String(number).padStart(12, '0'),
            url: '/brand/sipc-emblem.png',
            width: 1,
            height: 1,
          },
          fieldErrors: {},
          traceId: 'photo-test',
        },
      })
    } finally {
      active--
    }
  })
  await page.goto('/invitation')
  await expect(page.locator('#memory-images')).toBeEnabled()
  await page.locator('#memory-images').setInputFiles(
    [1, 2, 3].map((number) => ({
      name: number + '.png',
      mimeType: 'image/png',
      buffer: pixel,
    })),
  )
  await page.getByRole('button', { name: '发布回忆', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '发布回忆', exact: true }),
  ).toBeEnabled()
  await expect(page.getByText(/图传暂时失败/).first()).toBeVisible()
  expect(state.memories).toHaveLength(0)
  await page.getByRole('button', { name: '发布回忆', exact: true }).click()
  await expect(page.getByText('回忆已发布', { exact: true })).toBeVisible()
  expect([...counts.values()]).toEqual([1, 2, 1])
  expect(peak).toBeLessThanOrEqual(2)
  expect(state.memories[0].imageIds).toEqual(
    [1, 2, 3].map(
      (number) => '10000000-0000-4000-8000-' + String(number).padStart(12, '0'),
    ),
  )
})
