import * as Dialog from '@radix-ui/react-dialog'
import { createPortal } from 'react-dom'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { X, ArrowUpRight } from 'lucide-react'
import type { MemoryDetail } from '@/types/public/walls.types'
import type { GallerySelection } from '@/components/visitor/VisitorImageGallery'
import { VisitorImage } from '@/components/visitor/VisitorImage'
import { useResource } from '@/hooks/use-resource'
import { getMemory } from '@/api/public/walls.api'
import { errorMessage } from '@/lib/api-error'
import type { MemorySelection } from '../hooks/use-memory-preview'
const details = new Map<string, MemoryDetail>()
interface Props {
  selection: MemorySelection
  mobile: boolean
  preview: boolean
  galleryOpen: boolean
  close: (restore?: boolean) => void
  enter: () => void
  leave: () => void
  openGallery: (selection: GallerySelection) => void
}
export function MemoryDetailCard({
  selection,
  mobile,
  preview,
  galleryOpen,
  close,
  enter,
  leave,
  openGallery,
}: Props) {
  const container = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: 20, top: 120 })
  const load = useCallback(
    async (signal: AbortSignal) => {
      const key = (preview ? 'preview:' : '') + selection.id
      const cached = details.get(key)
      if (cached) return cached
      const data =
        preview && import.meta.env.DEV
          ? (await import('@/dev/wall-preview')).previewMemories.find(
              (item) => item.id === selection.id,
            )
          : await getMemory(selection.id, signal)
      if (!data) throw new Error('这段回忆暂时无法找到')
      if (!signal.aborted) details.set(key, data)
      return data
    },
    [preview, selection.id],
  )
  const resource = useResource(load)
  const data = resource.data?.id === selection.id ? resource.data : null
  useLayoutEffect(() => {
    if (mobile) return
    const update = () => {
      const anchor = selection.anchor.isConnected
        ? selection.anchor
        : document.querySelector<HTMLElement>(
            '[data-memory-id="' + CSS.escape(selection.id) + '"]',
          )
      const rect = anchor?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(390, innerWidth - 32)
      const panelHeight = Math.min(550, innerHeight - 112)
      setPosition({
        left: Math.max(
          16,
          Math.min(
            rect.right + 12 + width < innerWidth
              ? rect.right + 12
              : rect.left - width - 12,
            innerWidth - width - 16,
          ),
        ),
        top: Math.max(88, Math.min(rect.top, innerHeight - panelHeight - 16)),
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update)
    }
  }, [mobile, selection.anchor, selection.id])
  useEffect(() => {
    if (!mobile && selection.pinned)
      container.current
        ?.querySelector<HTMLButtonElement>('button')
        ?.focus({ preventScroll: true })
  }, [mobile, selection.pinned])
  useEffect(() => {
    if (mobile || galleryOpen) return
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true)
    }
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target) &&
        !selection.anchor.contains(event.target)
      )
        close()
    }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('keydown', key)
      document.removeEventListener('pointerdown', outside)
    }
  }, [mobile, galleryOpen, close, selection.anchor])
  const contents = (
    <>
      <div className="detail-topline">
        <span>MEMORY / 留忆档案</span>
        <button
          className="visitor-icon"
          onClick={() => close(true)}
          aria-label="关闭回忆详情"
        >
          <X size={18} />
        </button>
      </div>
      {resource.error ? (
        <div className="detail-status" role="alert">
          <p>{errorMessage(resource.error)}</p>
          <button className="visitor-button" onClick={resource.reload}>
            重新加载
          </button>
        </div>
      ) : !data ? (
        <p className="detail-status" role="status">
          正在打开这段回忆…
        </p>
      ) : (
        <>
          {data.title && <h2 id="memory-detail-title">{data.title}</h2>}
          {!data.title && (
            <h2 id="memory-detail-title" className="sr-only">
              一段回忆
            </h2>
          )}
          <p className="detail-author">
            <span className="live-dot" />
            {data.displayName || '匿名'}
            <span>留下的片刻</span>
          </p>
          {data.content && (
            <div className="memory-fulltext" tabIndex={0}>
              {data.content}
            </div>
          )}
          {data.images.length > 0 && (
            <>
              <p className="detail-image-label">
                {data.images.length} 张照片 · 点击查看原图{' '}
                <ArrowUpRight size={13} />
              </p>
              <div className="detail-images">
                {data.images.map((image, index) => (
                  <button
                    key={image.id}
                    aria-label={'查看回忆图片第' + (index + 1) + '张'}
                    onClick={() =>
                      openGallery({
                        images: data.images,
                        index,
                        title: data.title || '回忆照片',
                      })
                    }
                  >
                    <VisitorImage
                      src={image.url}
                      alt={'回忆照片 ' + (index + 1)}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  )
  if (mobile)
    return (
      <Dialog.Root
        open
        onOpenChange={(open) => {
          if (!open) close(true)
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="visitor-app visitor-detail-overlay" />
          <Dialog.Content
            data-visitor-modal
            className="visitor-app memory-mobile-detail"
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              if (selection.anchor.isConnected)
                selection.anchor.focus({ preventScroll: true })
            }}
          >
            <Dialog.Title className="sr-only">回忆详情</Dialog.Title>
            <div className="sheet-grip" aria-hidden="true" />
            <div className="detail-scroll">{contents}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  return createPortal(
    <div
      ref={container}
      role="dialog"
      aria-label="回忆详情"
      className="visitor-app memory-desktop-detail"
      style={position}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onFocus={enter}
      onBlur={leave}
      data-pinned={selection.pinned}
      data-visitor-modal
    >
      {contents}
      {!selection.pinned && (
        <p className="hover-tip">点击原卡片可固定这段回忆</p>
      )}
    </div>,
    document.body,
  )
}
