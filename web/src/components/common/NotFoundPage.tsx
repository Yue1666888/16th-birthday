import { Link } from 'react-router'
export function NotFoundPage() {
  return (
    <main style={{ padding: 48 }}>
      <h1>页面不存在</h1>
      <p>请检查访问地址。</p>
      <Link to="/">返回首页</Link>
    </main>
  )
}
