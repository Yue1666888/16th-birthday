import { ArrowUpRight, Images, Quote } from 'lucide-react'
import { VisitorImage } from '@/components/visitor/VisitorImage'
import type { MemorySummary } from '@/types/public/walls.types'
interface Props {
  item: MemorySummary
  index: number
  selected: boolean
  canHover: boolean
  open: (id: string, anchor: HTMLElement, pinned: boolean) => void
  leave: () => void
}
export function MemoryCard({
  item,
  index,
  selected,
  canHover,
  open,
  leave,
}: Props) {
  return (
    <article
      className={
        'memory-card visitor-enter ' +
        (!item.coverImage ? 'memory-text-card' : '')
      }
      style={{ animationDelay: Math.min(index, 5) * 35 + 'ms' }}
    >
      <button
        className="memory-trigger"
        data-memory-id={item.id}
        aria-label={
          '查看回忆：' + (item.title || item.displayName || '匿名回忆')
        }
        aria-expanded={selected}
        onPointerEnter={(event) => {
          if (canHover && event.pointerType === 'mouse')
            open(item.id, event.currentTarget, false)
        }}
        onPointerLeave={() => {
          if (canHover) leave()
        }}
        onFocus={(event) => {
          if (canHover) open(item.id, event.currentTarget, false)
        }}
        onBlur={() => {
          if (canHover) leave()
        }}
        onClick={(event) => open(item.id, event.currentTarget, true)}
      >
        <div className="memory-cover">
          {item.coverImage ? (
            <VisitorImage
              src={item.coverImage.url}
              thumbnailSrc={item.coverImage.thumbnailUrl}
              alt={item.title || '社团回忆照片'}
              eager={index < 2}
            />
          ) : (
            <div className="memory-text-excerpt">
              <Quote size={27} strokeWidth={1} />
              <p>{item.excerpt}</p>
              <span>有些回忆，用文字留下。</span>
            </div>
          )}
          <span className="card-sequence">
            {String(index + 1).padStart(2, '0')}
          </span>
          {item.imageCount > 1 && (
            <span className="photo-count">
              <Images size={13} />
              {item.imageCount}
            </span>
          )}
          <span className="memory-open-indicator" aria-hidden="true">
            <ArrowUpRight size={22} />
          </span>
        </div>
        <div className="memory-caption">
          <div>
            {item.title && <h2>{item.title}</h2>}
            <span>
              {item.displayName || '匿名'}
              <i>留下的片刻</i>
            </span>
          </div>
          <span className="caption-plus" aria-hidden="true">
            ＋
          </span>
        </div>
      </button>
    </article>
  )
}
