import type { Page, Route } from '@playwright/test'
import type {
  Invitation,
  Honor,
  MailPreview,
  MailHistory,
  MailMessage,
  MailBatch,
  RecipientQuery,
} from '../src/domain/api.types'
const timestamp = '2026-11-21T12:00:00.000+08:00'
const image =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1e8AAAAASUVORK5CYII='
type PreviewRequest = {
  mode: 'SINGLE' | 'BULK'
  subject: string
  textBody: string
  recipientIds?: string[]
  selectionId?: string
}
function pagination<T>(rows: T[], page: number, size: number) {
  return {
    content: rows.slice((page - 1) * size, page * size),
    page,
    size,
    totalElements: rows.length,
    totalPages: Math.ceil(rows.length / size),
  }
}
export async function mockApi(page: Page) {
  const names = ['陈思远', '林嘉怡', '王泽宇', '李雨桐', '周子墨', '张若溪']
  const receipts: Invitation[] = Array.from({ length: 32 }, (_, i) => ({
    id: String(i + 1),
    name: names[i % 6] + (i >= 6 ? String(i + 1) : ''),
    phone: String(13800138001 + i),
    email: 'alumni' + i + '@example.com',
    attendance: i % 4 === 3 ? 'NOT_ATTENDING' : 'ATTENDING',
    giftChoice:
      i % 4 === 3
        ? 'MAIL'
        : i % 3 === 0
          ? 'PICKUP'
          : i % 3 === 1
            ? 'MAIL'
            : 'NONE',
    mailingAddress: i % 4 === 3 || i % 3 === 1 ? '天津市演示地址' : null,
    version: '1',
    createdAt: timestamp,
    updatedAt: timestamp,
    emailNotifyStatus: i === 5 ? 'FAILED' : 'NOT_SENT',
    emailNotifiedAt: null,
  }))
  let honors: Honor[] = [
    {
      id: '1',
      title: '原型荣誉',
      people: '陈思远、林嘉怡',
      images: [{ id: crypto.randomUUID(), url: image, width: 1, height: 1 }],
      version: '1',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ]
  const selections = new Map<string, Invitation[]>(),
    previews = new Map<string, MailPreview>(),
    batches = new Map<string, MailBatch>(),
    history: MailHistory[] = []
  const calls: { method: string; path: string; body: unknown }[] = []
  function filtered(params: URLSearchParams | RecipientQuery) {
    const get = (name: keyof RecipientQuery) =>
      params instanceof URLSearchParams ? params.get(name) : params[name]
    return receipts.filter(
      (r) =>
        (!get('attendance') || r.attendance === get('attendance')) &&
        (!get('giftChoice') || r.giftChoice === get('giftChoice')) &&
        (!get('emailNotifyStatus') ||
          r.emailNotifyStatus === get('emailNotifyStatus')) &&
        (!get('keyword') ||
          [r.name, r.phone, r.email].some((v) =>
            v.includes(get('keyword') || ''),
          )),
    )
  }
  const ok = (route: Route, data: unknown, code = 'OK', status = 200) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({
        code,
        message: '操作成功',
        data,
        fieldErrors: {},
        traceId: crypto.randomUUID(),
      }),
    })
  function replace(template: string, r: Invitation) {
    const values: Record<string, string> = {
      name: r.name,
      id: r.id,
      attendance: r.attendance === 'ATTENDING' ? '到场' : '不到场',
      giftChoice:
        r.giftChoice === 'PICKUP'
          ? '到场领取'
          : r.giftChoice === 'MAIL'
            ? '邮寄'
            : '不领取',
    }
    return template.replace(
      /\{\{\s*(\w+)\s*}}/g,
      (_, key: string) => values[key] ?? '',
    )
  }
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.slice('/api/v1'.length),
      method = request.method()
    let body: unknown = null
    if (
      request.headers()['content-type']?.includes('application/json') &&
      request.postData()
    )
      body = request.postDataJSON() as unknown
    calls.push({ method, path, body })
    if (request.headers().authorization !== 'Bearer e2e-only-token')
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'Missing test auth',
          data: null,
          fieldErrors: {},
          traceId: crypto.randomUUID(),
        }),
      })
    if (path === '/admin/invitations/stats')
      return ok(route, {
        total: receipts.length,
        attendance: { attending: 24, notAttending: 8 },
        gifts: { mail: 16, pickup: 8, none: 8 },
        email: {
          notSent: 31,
          pending: history.length,
          success: 0,
          failed: 1,
          disabled: 0,
        },
      })
    if (path === '/admin/invitations/export')
      return route.fulfill({
        contentType: 'text/csv;charset=utf-8',
        body: '\uFEFF姓名,手机号\n陈思远,13800138001',
      })
    if (
      ['/admin/invitations', '/admin/mail/recipients'].includes(path) &&
      method === 'GET'
    )
      return ok(
        route,
        pagination(
          filtered(url.searchParams),
          Number(url.searchParams.get('page') || 1),
          Number(url.searchParams.get('size') || 20),
        ),
      )
    if (/^\/admin\/invitations\/\d+$/.test(path)) {
      const r = receipts.find((r) => r.id === path.split('/').at(-1))
      if (!r) throw new Error('No receipt')
      if (method === 'PATCH')
        Object.assign(r, body, { version: String(Number(r.version) + 1) })
      return ok(route, r, method === 'PATCH' ? 'INVITATION_UPDATED' : 'OK')
    }
    if (path === '/admin/honors' && method === 'GET')
      return ok(
        route,
        pagination(
          honors,
          Number(url.searchParams.get('page') || 1),
          Number(url.searchParams.get('size') || 20),
        ),
      )
    if (path === '/admin/honors' && method === 'POST') {
      const input = body as {
        title: string
        people: string
        imageIds: string[]
      }
      const r: Honor = {
        id: String(honors.length + 1),
        title: input.title,
        people: input.people,
        images: input.imageIds.map((id) => ({
          id,
          url: image,
          width: 1,
          height: 1,
        })),
        version: '1',
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      honors.unshift(r)
      return ok(route, r, 'HONOR_CREATED', 201)
    }
    if (/^\/admin\/honors\/\d+$/.test(path)) {
      const id = path.split('/').at(-1),
        r = honors.find((r) => r.id === id)
      if (method === 'DELETE') {
        honors = honors.filter((r) => r.id !== id)
        return ok(route, { id }, 'HONOR_DELETED')
      }
      if (method === 'PATCH' && r) {
        const input = body as {
          title: string
          people: string
          imageIds: string[]
        }
        Object.assign(r, {
          title: input.title,
          people: input.people,
          images: input.imageIds.map((id) => ({
            id,
            url: image,
            width: 1,
            height: 1,
          })),
          version: String(Number(r.version) + 1),
        })
      }
      return ok(route, r, method === 'PATCH' ? 'HONOR_UPDATED' : 'OK')
    }
    if (path === '/media/images')
      return ok(
        route,
        {
          id: crypto.randomUUID(),
          url: image,
          width: 1,
          height: 1,
          originalName: 'sample.png',
          sourceMimeType: 'image/png',
          sourceSizeBytes: 67,
        },
        'IMAGE_UPLOADED',
        201,
      )
    if (path === '/admin/mail/recipient-selections') {
      const rows = filtered(body as RecipientQuery),
        id = crypto.randomUUID()
      selections.set(id, structuredClone(rows))
      return ok(route, {
        id,
        recipientCount: rows.length,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        recipientIds: rows.map((r) => r.id),
      })
    }
    if (path === '/admin/mail/previews') {
      const input = body as PreviewRequest,
        rows = input.selectionId
          ? selections.get(input.selectionId) || []
          : receipts.filter((r) => input.recipientIds?.includes(r.id))
      const messages: MailMessage[] = rows.map((r) => ({
        recipient: {
          invitationId: r.id,
          expectedVersion: r.version,
          name: r.name,
          recipientEmail: r.email,
          attendance: r.attendance,
          giftChoice: r.giftChoice,
        },
        subject:
          input.mode === 'BULK' ? replace(input.subject, r) : input.subject,
        textBody:
          input.mode === 'BULK' ? replace(input.textBody, r) : input.textBody,
      }))
      const result: MailPreview = {
        id: crypto.randomUUID(),
        mode: input.mode,
        previewHash: 'a'.repeat(64),
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        emailEnabled: true,
        recipientCount: messages.length,
        messages,
      }
      previews.set(result.id, result)
      return ok(route, result)
    }
    if (path === '/admin/mail/batches' && method === 'POST') {
      const input = body as { previewId: string },
        preview = previews.get(input.previewId)
      if (!preview) throw new Error('No preview')
      const result: MailBatch = {
        id: String(batches.size + 1),
        mode: preview.mode,
        recipientCount: preview.recipientCount,
        counts: {
          PENDING: preview.recipientCount,
          SUCCESS: 0,
          FAILED: 0,
          DISABLED: 0,
          NOT_SENT: 0,
        },
        confirmedAt: timestamp,
      }
      batches.set(result.id, result)
      for (const m of preview.messages) {
        history.push({
          recipientName: m.recipient.name,
          mode: preview.mode,
          batchId: result.id,
          notification: {
            id: String(history.length + 1),
            invitationId: m.recipient.invitationId,
            invitationVersion: m.recipient.expectedVersion,
            sendNo: 1,
            requestId: crypto.randomUUID(),
            recipientEmail: m.recipient.recipientEmail,
            subject: m.subject,
            textBody: m.textBody,
            htmlBody: null,
            emailNotifyStatus: 'PENDING',
            taskStatus: 'READY',
            remoteMailId: null,
            remoteStatus: null,
            confirmedBySub: 'e2e-member',
            confirmedByName: '测试管理员',
            confirmedAt: timestamp,
            acceptedAt: null,
            sentAt: null,
            submitAttempts: 0,
            smtpAttempts: null,
            nextCheckAt: null,
            lastErrorCode: null,
            lastErrorMessage: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        })
        const r = receipts.find((r) => r.id === m.recipient.invitationId)
        if (r) r.emailNotifyStatus = 'PENDING'
      }
      return ok(route, result, 'MAIL_BATCH_CONFIRMED', 202)
    }
    if (path.startsWith('/admin/mail/batches/'))
      return ok(route, batches.get(path.split('/').at(-1) || ''))
    if (path === '/admin/mail/sends') {
      const rows = history.filter(
        (r) =>
          (!url.searchParams.get('batchId') ||
            r.batchId === url.searchParams.get('batchId')) &&
          (!url.searchParams.get('invitationId') ||
            r.notification.invitationId ===
              url.searchParams.get('invitationId')),
      )
      return ok(
        route,
        pagination(
          rows,
          Number(url.searchParams.get('page') || 1),
          Number(url.searchParams.get('size') || 20),
        ),
      )
    }
    if (path.startsWith('/admin/mail/sends/'))
      return ok(
        route,
        history.find((r) => r.notification.id === path.split('/').at(-1)),
      )
    if (path === '/admin/logs/download')
      return route.fulfill({
        contentType: 'text/plain;charset=utf-8',
        body: 'INFO 启动\nERROR 示例异常\n    stack line\n',
      })
    if (path === '/admin/logs')
      return ok(route, {
        entries: url.searchParams.get('cursor')
          ? []
          : Array.from({ length: 70 }, (_, i) => ({
              id: 'line' + i,
              level: i === 50 ? 'ERROR' : 'INFO',
              text:
                '2026-11-21 12:00:00.000 ' +
                (i === 50 ? 'ERROR 示例异常' : 'INFO 服务运行') +
                ' ' +
                i,
            })),
        nextCursor: 'test-cursor',
        rotated: false,
        truncated: false,
        source: 'application.log',
      })
    return route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'TEST_UNHANDLED',
        message: 'Unhandled ' + method + ' ' + path,
        data: null,
        fieldErrors: {},
        traceId: crypto.randomUUID(),
      }),
    })
  })
  return { calls, receipts, getHonors: () => honors, history }
}
