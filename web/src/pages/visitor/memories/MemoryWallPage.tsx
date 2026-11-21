import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useVisitorContext } from '@/hooks/use-visitor-view'
import { usePagedFeed } from '@/hooks/use-paged-feed'
import { getMemories } from '@/api/public/walls.api'
import { WallHeading } from '@/components/visitor/WallHeading'
import { WallFeedStatus } from '@/components/visitor/WallFeedStatus'
import {
  VisitorImageGallery,
  type GallerySelection,
} from '@/components/visitor/VisitorImageGallery'
import { MemoryWallMobileView } from './views/mobile/MemoryWallMobileView'
import { MemoryWallDesktopView } from './views/desktop/MemoryWallDesktopView'
import { MemoryDetailCard } from './components/MemoryDetailCard'
import { useMemoryPreview } from './hooks/use-memory-preview'
import { MemoryNameWall } from './components/MemoryNameWall'
export function MemoryWallPage() {
  const { view, canHover } = useVisitorContext()
  const [params] = useSearchParams()
  const preview = import.meta.env.DEV && params.get('preview') === '1'
  const load = useCallback(
    async (page: number, signal: AbortSignal) =>
      preview && import.meta.env.DEV
        ? (await import('@/dev/wall-preview')).getPreviewMemories(page)
        : getMemories(page, signal),
    [preview],
  )
  const feed = usePagedFeed('memories:' + preview, load)
  const detail = useMemoryPreview()
  const [gallery, setGallery] = useState<GallerySelection | null>(null)
  const openGallery = (value: GallerySelection) => {
    detail.pin()
    setGallery(value)
  }
  const props = {
    items: feed.items,
    selectedId: detail.selection?.id,
    open: detail.open,
    leave: detail.leave,
  }
  return (
    <div className="wall-page" key={preview ? 'preview' : 'live'}>
      <WallHeading kind="memories" total={feed.total}>
        <MemoryNameWall preview={preview} />
      </WallHeading>
      {view === 'desktop' ? (
        <MemoryWallDesktopView {...props} canHover={canHover} />
      ) : (
        <MemoryWallMobileView {...props} />
      )}
      <WallFeedStatus
        loading={feed.loading}
        error={feed.error}
        empty={!feed.items.length}
        hasMore={feed.page < feed.pages}
        retry={feed.retry}
        more={feed.more}
      />
      {detail.selection && (
        <MemoryDetailCard
          selection={detail.selection}
          mobile={view === 'mobile'}
          preview={preview}
          galleryOpen={!!gallery}
          close={detail.close}
          enter={detail.cancel}
          leave={detail.leave}
          openGallery={openGallery}
        />
      )}
      {gallery && (
        <VisitorImageGallery
          selection={gallery}
          onClose={() => setGallery(null)}
        />
      )}
    </div>
  )
}
