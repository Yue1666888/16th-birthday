import { ChevronLeft, ChevronRight } from 'lucide-react'
export function Pagination({
  page,
  size,
  total,
  totalPages,
  onPage,
  onSize,
}: {
  page: number
  size: number
  total: number
  totalPages: number
  onPage: (page: number) => void
  onSize: (size: number) => void
}) {
  const pages = Math.max(1, totalPages),
    start = Math.max(1, Math.min(page - 2, pages - 4)),
    buttons = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i)
  return (
    <div className="pagination">
      <span>
        共 {total} 条
        {total > 0
          ? '，当前显示 ' +
            ((page - 1) * size + 1) +
            '–' +
            Math.min(page * size, total) +
            ' 条'
          : ''}
      </span>
      <div className="pagination-right">
        <select
          aria-label="每页条数"
          value={size}
          onChange={(e) => onSize(Number(e.target.value))}
        >
          {[20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} 条 / 页
            </option>
          ))}
        </select>
        <button
          className="page-btn"
          aria-label="上一页"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft />
        </button>
        {buttons.map((n) => (
          <button
            key={n}
            className={'page-btn ' + (n === page ? 'active' : '')}
            onClick={() => onPage(n)}
          >
            {n}
          </button>
        ))}
        <button
          className="page-btn"
          aria-label="下一页"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  )
}
