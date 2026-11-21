import { Link, useRouteError, isRouteErrorResponse } from 'react-router'
export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  return (
    <main style={{ maxWidth: 560, margin: '10vh auto', padding: 32 }}>
      <h1>{notFound ? '页面不存在' : '页面暂时无法显示'}</h1>
      <p style={{ color: '#8292aa', fontSize: 13 }}>
        请刷新后重试，或返回首页。
      </p>
      <button onClick={() => window.location.reload()}>刷新</button>
      <span> · </span>
      <Link to="/">返回首页</Link>
    </main>
  )
}
