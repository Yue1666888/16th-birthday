import type { AuthClient } from '../src/auth/auth.types'
export const authClient: AuthClient = {
  initialize: async () => ({ sub: 'e2e-member', name: '测试管理员' }),
  login: async () => {},
  logout: async () => {
    window.location.assign('/admin/signed-out')
  },
  getAccessToken: async () => 'e2e-only-token',
}
