import { z } from 'zod'
import type { StateCreator } from 'zustand'
import type { AdminState } from './store'
const draft = z.object({
  subject: z.string().max(200),
  textBody: z.string().max(20000),
})
export type MailDraft = z.infer<typeof draft>
export interface MailSlice {
  mailDrafts: Record<string, MailDraft>
  saveMailDraft: (key: string, value: MailDraft) => boolean
}
export function readMailDrafts(sub: string): Record<string, MailDraft> {
  try {
    const value: unknown = JSON.parse(
      sessionStorage.getItem('birthday16-mail-drafts:' + sub) || '{}',
    )
    const result = z.record(z.string(), draft).safeParse(value)
    return result.success ? result.data : {}
  } catch {
    return {}
  }
}
export const createMailSlice: StateCreator<
  AdminState,
  [['zustand/immer', never]],
  [],
  MailSlice
> = (set, get) => ({
  mailDrafts: {},
  saveMailDraft: (key, value) => {
    set((state) => {
      state.mailDrafts[key] = value
    })
    const user = get().user
    if (!user) return false
    try {
      sessionStorage.setItem(
        'birthday16-mail-drafts:' + user.sub,
        JSON.stringify(get().mailDrafts),
      )
      return true
    } catch {
      return false
    }
  },
})
