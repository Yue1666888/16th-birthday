import { X } from 'lucide-react'
export function HonorPeopleHint({
  id,
  people,
  mobile,
  close,
}: {
  id: string
  people: string
  mobile: boolean
  close: () => void
}) {
  return (
    <div
      id={id}
      className={
        'honor-people ' +
        (mobile ? 'honor-people-inline' : 'honor-people-floating')
      }
      role="region"
      aria-label="荣誉人员"
    >
      <div>
        <span>PEOPLE / 荣誉人员</span>
        <button
          className="visitor-icon"
          aria-label="关闭人员名单"
          onClick={close}
        >
          <X size={16} />
        </button>
      </div>
      <p tabIndex={0}>{people}</p>
    </div>
  )
}
