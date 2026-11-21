export function WallHeading({
  kind,
  total,
}: {
  kind: 'memories' | 'honors'
  total: number
}) {
  const memories = kind === 'memories'
  return (
    <section className="wall-heading" aria-labelledby="wall-title">
      <div className="wall-eyebrow">
        <span className="live-dot" /> SIPC · OUR SHARED ARCHIVE{' '}
        <span className="heading-index">{memories ? '01' : '02'} / 02</span>
      </div>
      <div className="wall-heading-main">
        <div>
          <p className="wall-kicker">
            {memories ? 'MOMENTS THAT STAY' : 'TOGETHER, WE ACHIEVE'}
          </p>
          <h1 id="wall-title">
            {memories ? '把时光，留在这里。' : '每一份热爱，都有回响。'}
            <span className="sr-only">{memories ? '回忆墙' : '荣誉墙'}</span>
          </h1>
          <p className="wall-intro">
            {memories
              ? '那些并肩的日子，总有一个瞬间，值得被记住。'
              : '从一个想法，到一次抵达。记录属于我们的闪光时刻。'}
          </p>
        </div>
        <span
          className="wall-wordmark"
          data-particle-word={memories ? 'MEMORIES' : 'HONORS'}
          aria-hidden="true"
        >
          {memories ? 'MEMORIES' : 'HONORS'}
        </span>
      </div>
      <div className="wall-heading-rule">
        <span>
          {memories
            ? '回忆档案 / MEMORY COLLECTION'
            : '荣誉陈列 / HONOR COLLECTION'}
        </span>
        <span>
          {String(total).padStart(2, '0')} RECORDS <i aria-hidden="true">↙</i>
        </span>
      </div>
    </section>
  )
}
