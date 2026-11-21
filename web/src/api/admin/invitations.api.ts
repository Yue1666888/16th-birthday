import { request, download } from '@/api/admin-client.client'
import type {
  Invitation,
  InvitationStats,
  PageResponse,
  RecipientQuery,
} from '@/domain/api.types'
export const invitationsApi = {
  list: (query: RecipientQuery, page = 1, size = 20, signal?: AbortSignal) =>
    request<PageResponse<Invitation>>({
      url: '/admin/invitations',
      params: { ...query, page, size },
      signal,
    }),
  detail: (id: string) =>
    request<Invitation>({ url: '/admin/invitations/' + id }),
  stats: () => request<InvitationStats>({ url: '/admin/invitations/stats' }),
  update: (id: string, body: Record<string, unknown>) =>
    request<Invitation>({
      url: '/admin/invitations/' + id,
      method: 'PATCH',
      data: body,
    }),
  export: (query: RecipientQuery) =>
    download('/admin/invitations/export', 'birthday-invitations.csv', {
      ...query,
    }),
}
