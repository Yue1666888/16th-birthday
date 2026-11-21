import { createMailSlice, readMailDrafts } from './mail.slice'
import type { MailSlice } from './mail.slice'
import { createStore } from 'zustand/vanilla'
import { immer } from 'zustand/middleware/immer'
import type { AuthUser } from '@/auth/auth.types'
export interface AdminState extends MailSlice {
  status: 'initializing' | 'authenticated' | 'unauthenticated' | 'error'
  user: AuthUser | null
  error: string | null
  setAuth: (
    status: AdminState['status'],
    user: AuthUser | null,
    error?: string,
  ) => void
  sidebarOpen: boolean
  toggleSidebar: () => void
}
export function createAdminStore() {
  return createStore<AdminState>()(
    immer((set, get, store) => ({
      ...createMailSlice(set, get, store),
      status: 'initializing',
      user: null,
      error: null,
      setAuth: (status, user, error) =>
        set((s) => {
          s.status = status
          s.user = user
          s.error = error ?? null
          if (status === 'authenticated' && user)
            s.mailDrafts = readMailDrafts(user.sub)
        }),
      sidebarOpen: true,
      toggleSidebar: () =>
        set((s) => {
          s.sidebarOpen = !s.sidebarOpen
        }),
    })),
  )
}
export type AdminStore = ReturnType<typeof createAdminStore>
