import { ChronicleSpiral } from '../../components/ChronicleSpiral'
export function ChronicleMobileView({ canHover }: { canHover: boolean }) {
  return (
    <div className="chronicle-layout-mobile">
      <ChronicleSpiral mobile canHover={canHover} />
    </div>
  )
}
