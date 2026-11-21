import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { ChronicleEvent } from '../data/chronicle'
export function ChronicleNodeDetail({
  event,
  index,
  mobile,
  close,
  enter,
  leave,
}: {
  event: ChronicleEvent
  index: number
  mobile: boolean
  close: () => void
  enter: () => void
  leave: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: 16, top: 120 })
  useLayoutEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const anchor = document
        .querySelector<SVGGraphicsElement>(
          '[data-chronicle-node="' + index + '"]',
        )
        ?.getBoundingClientRect()
      if (!anchor) return
      if (anchor.bottom < 80 || anchor.top > innerHeight) {
        close()
        return
      }
      const width = Math.min(360, innerWidth - 32),
        height = Math.min(panel.current?.offsetHeight || 300, innerHeight - 110)
      setPosition({
        left: mobile
          ? Math.max(
              16,
              Math.min(
                anchor.left + anchor.width / 2 - width / 2,
                innerWidth - width - 16,
              ),
            )
          : Math.max(
              16,
              Math.min(
                anchor.right + width + 16 < innerWidth
                  ? anchor.right + 12
                  : anchor.left - width - 12,
                innerWidth - width - 16,
              ),
            ),
        top: Math.max(
          90,
          Math.min(
            anchor.bottom + height + 16 < innerHeight
              ? anchor.bottom + 10
              : anchor.top - height - 10,
            innerHeight - height - 16,
          ),
        ),
      })
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [index, mobile, close])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const outside = (event: globalThis.PointerEvent) => {
      if (
        event.target instanceof Element &&
        !panel.current?.contains(event.target) &&
        !event.target.closest('[data-chronicle-node]')
      )
        close()
    }
    window.addEventListener('keydown', key)
    window.addEventListener('pointerdown', outside)
    return () => {
      window.removeEventListener('keydown', key)
      window.removeEventListener('pointerdown', outside)
    }
  }, [close])
  return createPortal(
    <div
      ref={panel}
      className="visitor-app chronicle-node-detail"
      role="dialog"
      aria-label={event.year + '年' + (event.period || '') + '历史详情'}
      style={position}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onFocus={enter}
    >
      <div className="chronicle-detail-top">
        <span>
          {event.year}年{event.period || ''}
          <i> {String(index + 1).padStart(2, '0')} / 13</i>
        </span>
        <button
          className="visitor-icon"
          onClick={close}
          aria-label="关闭历史详情"
        >
          <X size={17} />
        </button>
      </div>
      <h2>{event.title}</h2>
      <ul>
        {event.details.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
      {event.highlights && (
        <div className="chronicle-highlights">
          {event.highlights.map((highlight) => (
            <span key={highlight}>{highlight}</span>
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
