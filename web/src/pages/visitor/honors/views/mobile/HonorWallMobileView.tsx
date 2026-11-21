import { HonorCard, type HonorCardProps } from '../../components/HonorCard'
export function HonorWallMobileView({
  items,
  selectedId,
  ...handlers
}: { items: HonorCardProps['item'][]; selectedId: string | null } & Omit<
  HonorCardProps,
  'item' | 'index' | 'mobile' | 'expanded' | 'pinned' | 'canHover'
>) {
  return (
    <div className="honor-grid honor-grid-mobile" aria-label="荣誉列表">
      {items.map((item, index) => (
        <HonorCard
          key={item.id}
          item={item}
          index={index}
          mobile
          canHover={false}
          expanded={selectedId === item.id}
          pinned={selectedId === item.id}
          {...handlers}
        />
      ))}
    </div>
  )
}
