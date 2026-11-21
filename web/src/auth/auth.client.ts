import Keycloak from 'keycloak-js'
import type { AuthClient, AuthUser } from './auth.types'
const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'https://sso.sipc115.com',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'member',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'birthday-web',
})
let initializing: Promise<AuthUser | null> | null = null,
  refreshing: Promise<string> | null = null
function user(): AuthUser | null {
  const p = keycloak.tokenParsed
  if (!keycloak.authenticated || !p?.sub) return null
  return {
    sub: p.sub,
    name:
      typeof p.preferred_username === 'string' ? p.preferred_username : '成员',
    email: typeof p.email === 'string' ? p.email : undefined,
  }
}
export const authClient: AuthClient = {
  initialize() {
    initializing ??= keycloak
      .init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        checkLoginIframe: false,
      })
      .then(() => user())
    return initializing
  },
  async login(returnTo) {
    const target = new URL(returnTo, window.location.origin)
    if (
      target.origin !== window.location.origin ||
      !target.pathname.startsWith('/admin')
    )
      throw new Error('登录回跳地址不合法')
    await keycloak.login({ redirectUri: target.toString() })
  },
  async logout() {
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith('birthday16-mail-drafts:'))
        sessionStorage.removeItem(key)
    await keycloak.logout({
      redirectUri: window.location.origin + '/admin/signed-out',
    })
  },
  getAccessToken() {
    if (!keycloak.authenticated)
      return Promise.reject(new Error('请先完成SSO登录'))
    refreshing ??= keycloak
      .updateToken(30)
      .then(() => {
        if (!keycloak.token) throw new Error('未取得访问令牌')
        return keycloak.token
      })
      .catch((error: unknown) => {
        window.dispatchEvent(
          new CustomEvent('birthday:auth-error', {
            detail: 'SSO 会话无法刷新，请重试登录。',
          }),
        )
        throw error
      })
      .finally(() => {
        refreshing = null
      })
    return refreshing
  },
}
