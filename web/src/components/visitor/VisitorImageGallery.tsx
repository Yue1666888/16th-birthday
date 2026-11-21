import * as Dialog from '@radix-ui/react-dialog'
import { ChevronLeft, ChevronRight, X, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ImageItem } from '@/domain/api.types'
export interface GallerySelection {
  images: ImageItem[]
  index: number
  title: string
}
export function VisitorImageGallery({
  selection,
  onClose,
}: {
  selection: GallerySelection
  onClose: () => void
}) {
  const [index, setIndex] = useState(selection.index)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [returnFocus] = useState(() => document.activeElement)
  const start = useRef<{ x: number; y: number } | null>(null)
  const current = selection.images[index]
  const move = (step: number) => {
    setIndex((value) =>
      Math.max(0, Math.min(selection.images.length - 1, value + step)),
    )
    setFailed(false)
  }
  useEffect(() => {
    const next = selection.images[index + 1]
    if (next) {
      const image = new Image()
      image.src = next.url
    }
  }, [index, selection.images])
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="visitor-app visitor-gallery-overlay" />
        <Dialog.Content
          data-visitor-modal
          className="visitor-app visitor-gallery"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (returnFocus instanceof HTMLElement && returnFocus.isConnected)
              returnFocus.focus({ preventScroll: true })
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              move(-1)
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault()
              move(1)
            }
          }}
        >
          <header>
            <Dialog.Title>{selection.title}</Dialog.Title>
            <span aria-live="polite">
              {index + 1} / {selection.images.length}
            </span>
            <Dialog.Close className="visitor-icon" aria-label="关闭图片预览">
              <X size={22} />
            </Dialog.Close>
          </header>
          <div
            className="gallery-stage"
            onPointerDown={(event) => {
              if (event.pointerType === 'touch')
                start.current = { x: event.clientX, y: event.clientY }
            }}
            onPointerUp={(event) => {
              const point = start.current
              start.current = null
              if (
                point &&
                Math.abs(event.clientX - point.x) > 60 &&
                Math.abs(event.clientX - point.x) >
                  Math.abs(event.clientY - point.y) * 1.5
              )
                move(event.clientX < point.x ? 1 : -1)
            }}
          >
            {failed ? (
              <div className="gallery-failure">
                <p>图片暂时无法加载</p>
                <button
                  className="visitor-button"
                  onClick={() => {
                    setAttempt(attempt + 1)
                    setFailed(false)
                  }}
                >
                  <RotateCcw size={16} />
                  重试图片
                </button>
              </div>
            ) : (
              <img
                key={current.id + attempt}
                src={current.url}
                alt={selection.title + '，第' + (index + 1) + '张'}
                onError={() => setFailed(true)}
                draggable={false}
              />
            )}
          </div>
          <footer>
            <button
              className="visitor-icon"
              disabled={index === 0}
              onClick={() => move(-1)}
              aria-label="上一张"
            >
              <ChevronLeft />
            </button>
            <span>
              ← → 切换图片
              <span className="gallery-touch-tip"> · 也可左右滑动</span>
            </span>
            <button
              className="visitor-icon"
              disabled={index === selection.images.length - 1}
              onClick={() => move(1)}
              aria-label="下一张"
            >
              <ChevronRight />
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
