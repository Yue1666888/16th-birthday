import { request } from '@/api/admin-client.client'
import type {
  Invitation,
  PageResponse,
  RecipientQuery,
  MailPreview,
  MailBatch,
  MailHistory,
} from '@/domain/api.types'
export const mailApi = {
  recipients: (
    query: RecipientQuery,
    page = 1,
    size = 20,
    signal?: AbortSignal,
  ) =>
    request<PageResponse<Invitation>>({
      url: '/admin/mail/recipients',
      params: { ...query, page, size },
      signal,
    }),
  select: (query: RecipientQuery) =>
    request<{
      id: string
      recipientCount: number
      expiresAt: string
      recipientIds: string[]
    }>({
      url: '/admin/mail/recipient-selections',
      method: 'POST',
      data: query,
    }),
  preview: (data: {
    mode: 'SINGLE' | 'BULK'
    subject: string
    textBody: string
    recipientIds?: string[]
    selectionId?: string
  }) =>
    request<MailPreview>({ url: '/admin/mail/previews', method: 'POST', data }),
  confirm: (data: {
    requestId: string
    previewId: string
    previewHash: string
  }) =>
    request<MailBatch>({ url: '/admin/mail/batches', method: 'POST', data }),
  batch: (id: string) =>
    request<MailBatch>({ url: '/admin/mail/batches/' + id }),
  history: (
    params: {
      keyword?: string
      emailNotifyStatus?: string
      invitationId?: string
      batchId?: string
      page?: number
      size?: number
    },
    signal?: AbortSignal,
  ) =>
    request<PageResponse<MailHistory>>({
      url: '/admin/mail/sends',
      params,
      signal,
    }),
  send: (id: string) =>
    request<MailHistory>({ url: '/admin/mail/sends/' + id }),
}
