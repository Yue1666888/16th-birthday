import '@/styles/status-page.css'

export function RouteLoading() {
  return (
    <div className="route-loading" role="status">
      <img src="/brand/sipc-emblem.png" alt="" />
      <span>SIPC · 115</span>
      <h1>正在打开下一页故事</h1>
      <div aria-hidden="true">
        <i />
      </div>
      <p>请稍候，我们马上就到。</p>
    </div>
  )
}
