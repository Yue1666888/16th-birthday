import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useVisitorContext } from '@/hooks/use-visitor-view'
import { usePagedFeed } from '@/hooks/use-paged-feed'
import { getHonors } from '@/api/public/walls.api'
import type { PublicHonor } from '@/types/public/walls.types'
import { WallHeading } from '@/components/visitor/WallHeading'
import { WallFeedStatus } from '@/components/visitor/WallFeedStatus'
import {
  VisitorImageGallery,
  type GallerySelection,
} from '@/components/visitor/VisitorImageGallery'
import { HonorWallMobileView } from './views/mobile/HonorWallMobileView'
import { HonorWallDesktopView } from './views/desktop/HonorWallDesktopView'
export function HonorWallPage() {
  const { view, canHover } = useVisitorContext()
  const [params] = useSearchParams()
  const preview = import.meta.env.DEV && params.get('preview') === '1'
  const load = useCallback(
    async (page: number, signal: AbortSignal) =>
      preview && import.meta.env.DEV
        ? (await import('@/dev/wall-preview')).getPreviewHonors(page)
        : getHonors(page, signal),
    [preview],
  )
  const feed = usePagedFeed('honors:' + preview, load)
  const [people, setPeople] = useState<{ id: string; pinned: boolean } | null>(
    null,
  )
  const [gallery, setGallery] = useState<GallerySelection | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cancel = () => clearTimeout(timer.current)
  const close = () => {
    cancel()
    setPeople(null)
  }
  const show = (id: string) => {
    cancel()
    timer.current = setTimeout(
      () =>
        setPeople((previous) =>
          previous?.pinned ? previous : { id, pinned: false },
        ),
      180,
    )
  }
  const leave = () => {
    cancel()
    timer.current = setTimeout(
      () => setPeople((previous) => (previous?.pinned ? previous : null)),
      160,
    )
  }
  const toggle = (id: string) => {
    cancel()
    setPeople((previous) =>
      previous?.id === id && previous.pinned ? null : { id, pinned: true },
    )
  }
  const openImages = (item: PublicHonor) => {
    cancel()
    if (item.images.length)
      setGallery({ images: item.images, index: 0, title: item.title })
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!gallery && event.key === 'Escape') setPeople(null)
    }
    const outside = (event: PointerEvent) => {
      if (
        !gallery &&
        event.target instanceof Element &&
        !event.target.closest('.honor-card')
      )
        setPeople(null)
    }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('keydown', key)
      document.removeEventListener('pointerdown', outside)
    }
  }, [gallery])
  const props = {
    items: feed.items,
    selectedId: people?.id || null,
    show,
    leave,
    cancel,
    toggle,
    close,
    openImages,
  }
  return (
    <div className="wall-page">
      <WallHeading kind="honors" total={feed.total} />
      {view === 'desktop' ? (
        <HonorWallDesktopView
          {...props}
          pinned={!!people?.pinned}
          canHover={canHover}
        />
      ) : (
        <HonorWallMobileView {...props} />
      )}
      <WallFeedStatus
        loading={feed.loading}
        error={feed.error}
        empty={!feed.items.length}
        hasMore={feed.page < feed.pages}
        retry={feed.retry}
        more={feed.more}
      />
      {gallery && (
        <VisitorImageGallery
          selection={gallery}
          onClose={() => setGallery(null)}
        />
      )}
    </div>
  )
}
