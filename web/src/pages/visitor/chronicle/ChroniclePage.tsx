import { useVisitorContext } from '@/hooks/use-visitor-view'
import { WallHeading } from '@/components/visitor/WallHeading'
import { chronicleEvents } from './data/chronicle'
import { ChronicleDesktopView } from './views/desktop/ChronicleDesktopView'
import { ChronicleMobileView } from './views/mobile/ChronicleMobileView'
import '@/styles/chronicle.css'
export function ChroniclePage() {
  const { view, canHover } = useVisitorContext()
  return (
    <div className="chronicle-page">
      <WallHeading kind="chronicle" total={chronicleEvents.length} />
      {view === 'mobile' ? (
        <ChronicleMobileView canHover={canHover} />
      ) : (
        <ChronicleDesktopView canHover={canHover} />
      )}
    </div>
  )
}
