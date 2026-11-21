import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import {
  CodeXml,
  LayoutGrid,
  Award,
  Mail,
  Terminal,
  LogOut,
} from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { authClient } from '@/auth/auth.client'
import { useAdminStore } from '@/store/admin/use-admin-store'
import { toast } from 'sonner'
import '@/styles/admin.css'
const items = [
  { path: '/admin/invitations', label: '报名管理', Icon: LayoutGrid },
  { path: '/admin/honors', label: '荣誉墙', Icon: Award },
  { path: '/admin/mail', label: '邮件管理', Icon: Mail },
  { path: '/admin/logs', label: '日志管理', Icon: Terminal },
]
export function AdminLayout() {
  const location = useLocation(),
    user = useAdminStore((s) => s.user),
    [logoutOpen, setLogoutOpen] = useState(false)
  const title =
    items.find((item) => location.pathname.startsWith(item.path))?.label ||
    '管理工作台'
  return (
    <div className="admin-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">
            <CodeXml />
          </div>
          <div>
            <strong>SIPC · 16</strong>
            <small>ANNIVERSARY</small>
          </div>
        </div>
        <div className="nav-label">内容管理</div>
        {items.map(({ path, label, Icon }) => (
          <NavLink
            className={({ isActive }) => 'nav ' + (isActive ? 'active' : '')}
            key={path}
            to={path}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
        <div className="side-note">
          <strong>十六周年 · 再次相聚</strong>每一份回执，都是一次期待。
        </div>
        <div className="account">
          <div className="avatar">{user?.name.slice(0, 1) || '管'}</div>
          <div>
            <div className="name">{user?.name || '管理员'}</div>
            <small>SSO 成员账户</small>
          </div>
          <button
            className="exit"
            aria-label="退出登录"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut />
          </button>
        </div>
      </aside>
      <div className="shell">
        <header className="topbar">
          <div className="breadcrumbs">
            管理工作台<span>/</span>
            <b>{title}</b>
          </div>
          <div className="top-right">
            <span>SIPC 十六周年邀请函</span>
          </div>
        </header>
        <main>
          <Outlet />
          <div className="page-foot">
            <span>SIPC · 十六周年邀请函管理平台</span>
            <span>管理工作台</span>
          </div>
        </main>
      </div>
      <ConfirmDialog
        open={logoutOpen}
        title="退出登录？"
        description="未保存的修改请先保存。退出后需要通过社团 SSO 重新登录。"
        confirmLabel="退出"
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false)
          void authClient
            .logout()
            .catch((e) =>
              toast.error(e instanceof Error ? e.message : '退出失败'),
            )
        }}
      />
      <Toaster />
    </div>
  )
}
