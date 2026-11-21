import { ArrowDown, RotateCcw } from 'lucide-react'
import { errorMessage } from '@/lib/api-error'
export function WallFeedStatus({
  loading,
  error,
  empty,
  hasMore,
  retry,
  more,
}: {
  loading: boolean
  error: unknown
  empty: boolean
  hasMore: boolean
  retry: () => void
  more: () => void
}) {
  if (loading && empty)
    return (
      <div className="wall-skeleton" aria-label="正在加载" role="status">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} />
        ))}
      </div>
    )
  if (error)
    return (
      <div className="wall-status" role="alert">
        <p>{errorMessage(error)}</p>
        <button className="visitor-button" onClick={retry}>
          <RotateCcw size={14} />
          重新加载
        </button>
      </div>
    )
  if (empty)
    return (
      <div className="wall-status wall-empty">
        <span className="empty-mark" aria-hidden="true">
          [ + ]
        </span>
        <h2>故事，等待被点亮</h2>
        <p>这里还没有内容。下次再来，或许就有新的相遇。</p>
        {import.meta.env.DEV && (
          <a className="visitor-button" href="?preview=1">
            使用示例内容预览
          </a>
        )}
      </div>
    )
  return (
    <div className="wall-load-more">
      {hasMore ? (
        <button className="visitor-button" onClick={more} disabled={loading}>
          {loading ? '正在加载…' : '继续浏览'}
          <ArrowDown size={15} />
        </button>
      ) : (
        <span>你已看完全部记录 · 故事仍在继续</span>
      )}
    </div>
  )
}
