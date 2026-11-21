import { HonorCard, type HonorCardProps } from '../../components/HonorCard'
export function HonorWallDesktopView({
  items,
  selectedId,
  pinned,
  ...handlers
}: {
  items: HonorCardProps['item'][]
  selectedId: string | null
  pinned: boolean
} & Omit<HonorCardProps, 'item' | 'index' | 'mobile' | 'expanded' | 'pinned'>) {
  return (
    <div className="honor-grid honor-grid-desktop" aria-label="荣誉列表">
      {items.map((item, index) => (
        <HonorCard
          key={item.id}
          item={item}
          index={index}
          mobile={false}
          expanded={selectedId === item.id}
          pinned={selectedId === item.id && pinned}
          {...handlers}
        />
      ))}
    </div>
  )
}
