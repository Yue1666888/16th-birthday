import { Link } from 'react-router'
import '@/styles/admin.css'
export function SignedOutPage() {
  return (
    <main className="auth-screen">
      <div className="auth-card">
        <h1>已退出管理工作台</h1>
        <p>你的本机会话信息已清理。</p>
        <Link to="/admin/invitations">重新登录</Link>
        <span> · </span>
        <Link to="/">返回邀请函首页</Link>
      </div>
    </main>
  )
}
