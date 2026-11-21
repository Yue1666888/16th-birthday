import type { ReactNode } from 'react'
interface Heading {
  index: string
  kicker: string
  title: string
  label: string
  intro: string
  word: string
  collection: string
  unit: string
}
const headings: Record<'memories' | 'honors' | 'chronicle', Heading> = {
  memories: {
    index: '01',
    kicker: 'MOMENTS THAT STAY',
    title: '把时光，留在这里。',
    label: '回忆墙',
    intro: '那些并肩的日子，总有一个瞬间，值得被记住。',
    word: 'MEMORIES',
    collection: '回忆档案 / MEMORY COLLECTION',
    unit: 'RECORDS',
  },
  honors: {
    index: '02',
    kicker: 'TOGETHER, WE ACHIEVE',
    title: '每一份热爱，都有回响。',
    label: '荣誉墙',
    intro: '从一个想法，到一次抵达。记录属于我们的闪光时刻。',
    word: 'HONORS',
    collection: '荣誉陈列 / HONOR COLLECTION',
    unit: 'RECORDS',
  },
  chronicle: {
    index: '03',
    kicker: 'OUR STORY, STILL UNFOLDING',
    title: '115编年史',
    label: '115编年史',
    intro: '从602工作室，到学生创新实践中心。沿着时间，重走我们来时的路。',
    word: 'CHRONICLE',
    collection: '中心沿革 / 115 CHRONICLE',
    unit: 'MILESTONES',
  },
}
export function WallHeading({
  kind,
  total,
  children,
}: {
  kind: keyof typeof headings
  total: number
  children?: ReactNode
}) {
  const heading = headings[kind]
  return (
    <section className="wall-heading" aria-labelledby="wall-title">
      <div className="wall-eyebrow">
        <span className="live-dot" /> SIPC · OUR SHARED ARCHIVE{' '}
        <span className="heading-index">{heading.index} / 03</span>
      </div>
      <div className="wall-heading-main">
        <div>
          <p className="wall-kicker">{heading.kicker}</p>
          <h1 id="wall-title">
            {heading.title}
            {heading.title !== heading.label && (
              <span className="sr-only">{heading.label}</span>
            )}
          </h1>
          <p className="wall-intro">{heading.intro}</p>
        </div>
        <span
          className="wall-wordmark"
          data-particle-word={heading.word}
          aria-hidden="true"
        >
          {heading.word}
        </span>
      </div>
      {children}
      <div className="wall-heading-rule">
        <span>{heading.collection}</span>
        <span>
          {String(total).padStart(2, '0')} {heading.unit}{' '}
          <i aria-hidden="true">↙</i>
        </span>
      </div>
    </section>
  )
}
