import { MemoryCard } from '../../components/MemoryCard'
import type { ComponentProps } from 'react'
type CardProps = ComponentProps<typeof MemoryCard>
export function MemoryWallDesktopView({
  items,
  selectedId,
  ...handlers
}: { items: CardProps['item'][]; selectedId?: string } & Pick<
  CardProps,
  'canHover' | 'open' | 'leave'
>) {
  return (
    <div className="memory-grid memory-grid-desktop" aria-label="回忆列表">
      {items.map((item, index) => (
        <MemoryCard
          key={item.id}
          item={item}
          index={index}
          selected={selectedId === item.id}
          {...handlers}
        />
      ))}
    </div>
  )
}
