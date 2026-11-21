import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { authClient } from '@/auth/auth.client'
import { createAdminStore } from '@/store/admin/store'
import { AdminStoreContext } from '@/store/admin/context'
import { useAdminStore } from '@/store/admin/use-admin-store'
function RequireAuth() {
  const status = useAdminStore((s) => s.status),
    error = useAdminStore((s) => s.error)
  const loginStarted = useRef(false)
  useEffect(() => {
    if (status === 'unauthenticated' && !loginStarted.current) {
      loginStarted.current = true
      void authClient.login(window.location.href).catch((e) => {
        loginStarted.current = false
        window.dispatchEvent(
          new CustomEvent('birthday:auth-error', {
            detail: e instanceof Error ? e.message : '无法跳转SSO',
          }),
        )
      })
    }
  }, [status])
  if (status === 'authenticated') return <Outlet />
  return (
    <main className="auth-screen">
      <div className="auth-card">
        <div className="brand-mark">SIPC</div>
        <h1>{status === 'error' ? '暂时无法完成登录' : '正在连接社团 SSO'}</h1>
        <p>{error || '请稍候，登录后会返回当前管理页面。'}</p>
        {status === 'error' && (
          <button onClick={() => window.location.reload()}>重试</button>
        )}
      </div>
    </main>
  )
}
export function AdminAuthBoundary() {
  const [store] = useState(createAdminStore)
  useEffect(() => {
    let active = true
    const failed = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === 'string')
        store.getState().setAuth('error', null, event.detail)
    }
    window.addEventListener('birthday:auth-error', failed)
    void authClient
      .initialize()
      .then((user) => {
        if (active)
          store
            .getState()
            .setAuth(user ? 'authenticated' : 'unauthenticated', user)
      })
      .catch((e) => {
        if (active)
          store
            .getState()
            .setAuth(
              'error',
              null,
              e instanceof Error ? e.message : '认证初始化失败',
            )
      })
    return () => {
      active = false
      window.removeEventListener('birthday:auth-error', failed)
    }
  }, [store])
  return (
    <AdminStoreContext.Provider value={store}>
      <RequireAuth />
    </AdminStoreContext.Provider>
  )
}
