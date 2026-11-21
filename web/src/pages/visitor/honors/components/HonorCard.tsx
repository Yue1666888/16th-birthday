import { ArrowUpRight, ChevronDown, Images, Users } from 'lucide-react'
import { useId } from 'react'
import type { PublicHonor } from '@/types/public/walls.types'
import { VisitorImage } from '@/components/visitor/VisitorImage'
import { HonorPeopleHint } from './HonorPeopleHint'
export interface HonorCardProps {
  item: PublicHonor
  index: number
  mobile: boolean
  canHover: boolean
  expanded: boolean
  pinned: boolean
  show: (id: string) => void
  leave: () => void
  cancel: () => void
  toggle: (id: string) => void
  close: () => void
  openImages: (item: PublicHonor) => void
}
export function HonorCard({
  item,
  index,
  mobile,
  canHover,
  expanded,
  pinned,
  show,
  leave,
  cancel,
  toggle,
  close,
  openImages,
}: HonorCardProps) {
  const hintId = useId()
  const cover = item.images[0]
  return (
    <article
      className="honor-card visitor-enter"
      style={{ animationDelay: Math.min(index, 5) * 35 + 'ms' }}
      onPointerEnter={(event) => {
        if (!mobile && canHover && event.pointerType === 'mouse') show(item.id)
      }}
      onPointerLeave={() => {
        if (!mobile && canHover) leave()
      }}
      data-expanded={expanded}
      data-pinned={pinned}
    >
      <div className="honor-artwork">
        <button
          className="honor-image-trigger"
          onClick={() => openImages(item)}
          aria-label={'查看荣誉图片：' + item.title}
          disabled={!cover}
        >
          {cover ? (
            <VisitorImage src={cover.url} alt={item.title} eager={index < 2} />
          ) : (
            <span>图片暂时无法显示</span>
          )}
          <span className="honor-image-open" aria-hidden="true">
            <ArrowUpRight size={20} />
          </span>
        </button>
        {item.images.length > 1 && (
          <span className="photo-count">
            <Images size={13} />1 / {item.images.length}
          </span>
        )}
      </div>
      <div className="honor-caption">
        <span className="honor-index">
          {String(index + 1).padStart(2, '0')} / HONOR
        </span>
        <h2>{item.title}</h2>
        <button
          className="honor-people-trigger"
          aria-expanded={expanded}
          aria-controls={hintId}
          onFocus={() => {
            if (!mobile && canHover) show(item.id)
          }}
          onBlur={() => {
            if (!mobile && canHover) leave()
          }}
          onClick={() => toggle(item.id)}
        >
          <Users size={14} />
          {mobile ? '查看人员' : '荣誉人员'}
          <ChevronDown size={13} />
        </button>
      </div>
      {expanded && (
        <div
          onPointerEnter={cancel}
          onPointerLeave={() => {
            if (!mobile) leave()
          }}
          onFocus={cancel}
          onBlur={() => {
            if (!mobile) leave()
          }}
        >
          <HonorPeopleHint
            id={hintId}
            people={item.people}
            mobile={mobile}
            close={close}
          />
        </div>
      )}
    </article>
  )
}
