import { ChronicleSpiral } from '../../components/ChronicleSpiral'
export function ChronicleDesktopView({ canHover }: { canHover: boolean }) {
  return (
    <div className="chronicle-layout-desktop">
      <ChronicleSpiral mobile={false} canHover={canHover} />
    </div>
  )
}
