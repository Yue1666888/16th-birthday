import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { chronicleEvents } from '../data/chronicle'
import { createChronicleSpiral } from '../lib/spiral-geometry'
import { ChronicleNodeDetail } from './ChronicleNodeDetail'
const spiral = createChronicleSpiral(chronicleEvents.length)
type Selection = { index: number; source: 'hover' | 'press' | 'focus' }
export function ChronicleSpiral({
  mobile,
  canHover,
}: {
  mobile: boolean
  canHover: boolean
}) {
  const [selected, setSelected] = useState<Selection | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fade = useId()
  const cancel = useCallback(() => clearTimeout(timer.current), [])
  const close = useCallback(() => {
    cancel()
    setSelected(null)
  }, [cancel])
  const show = (index: number, source: Selection['source']) => {
    cancel()
    setSelected({ index, source })
  }
  const leave = () => {
    cancel()
    timer.current = setTimeout(
      () => setSelected((value) => (value?.source === 'hover' ? null : value)),
      140,
    )
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <div
      className={
        'chronicle-spiral ' +
        (mobile ? 'chronicle-spiral-mobile' : 'chronicle-spiral-desktop')
      }
    >
      <div className="chronicle-spiral-tools">
        <div>
          <span>2009 → 2026</span>
          <p>
            {mobile ? '轻触或长按年份，展开历史' : '悬停年份，回望来时的路'}
          </p>
        </div>
      </div>
      <div className="chronicle-spiral-stage">
        <svg
          viewBox="70 70 860 860"
          className="chronicle-spiral-svg"
          role="group"
          aria-label="115编年史时间螺旋"
          onPointerDown={(event) => {
            if (
              event.target instanceof Element &&
              !event.target.closest('[data-chronicle-node]')
            )
              close()
          }}
          onContextMenu={(event) => {
            if (mobile) event.preventDefault()
          }}
        >
          <defs>
            <linearGradient
              id={fade}
              gradientUnits="userSpaceOnUse"
              x1={spiral.futureStart.x}
              y1={spiral.futureStart.y}
              x2={spiral.futureEnd.x}
              y2={spiral.futureEnd.y}
            >
              <stop offset="0" stopColor="#5ad9ed" stopOpacity=".65" />
              <stop offset="1" stopColor="#5ad9ed" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className="chronicle-spiral-geometry">
            <path className="chronicle-orbit" d={spiral.line} fill="none" />
            {selected && (
              <path
                className="chronicle-orbit-progress"
                d={spiral.progress[selected.index]}
                fill="none"
              />
            )}
            <path
              className="chronicle-orbit-future"
              d={spiral.future}
              stroke={'url(#' + fade + ')'}
              fill="none"
            />
            <text
              className="chronicle-future-label"
              x="790"
              y="246"
              textAnchor="middle"
            >
              未完待续
            </text>
            {chronicleEvents.map((event, index) => {
              const point = spiral.nodes[index]
              return (
                <g
                  key={event.id}
                  className={
                    'chronicle-spiral-node ' +
                    (selected?.index === index ? 'is-selected' : '')
                  }
                  transform={'translate(' + point.x + ' ' + point.y + ')'}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    event.year + '年' + (event.period || '') + '，查看历史节点'
                  }
                  aria-expanded={selected?.index === index}
                  data-chronicle-node={index}
                  data-year={event.year}
                  onPointerEnter={(input) => {
                    if (canHover && input.pointerType === 'mouse')
                      show(index, 'hover')
                  }}
                  onPointerLeave={leave}
                  onPointerDown={(input) => {
                    if (!canHover || input.pointerType !== 'mouse')
                      show(index, 'press')
                  }}
                  onFocus={(input) => {
                    if (input.currentTarget.matches(':focus-visible'))
                      show(index, 'focus')
                  }}
                  onBlur={leave}
                  onKeyDown={(input) => {
                    if (input.key === 'Enter' || input.key === ' ') {
                      input.preventDefault()
                      show(index, 'focus')
                    }
                  }}
                >
                  <circle className="chronicle-node-hit" r="56" />
                  <circle
                    className="chronicle-node-halo"
                    r={mobile ? 34 : 15}
                    cy={mobile ? -13 : 0}
                  />
                  <circle
                    className="chronicle-node-dot"
                    r={index === 0 ? 5 : 4}
                  />
                  <text
                    className={
                      index === 0
                        ? 'chronicle-node-year chronicle-node-origin'
                        : 'chronicle-node-year'
                    }
                    y="-13"
                    textAnchor="middle"
                  >
                    {event.year}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>
      {selected && (
        <ChronicleNodeDetail
          event={chronicleEvents[selected.index]}
          index={selected.index}
          mobile={mobile}
          close={close}
          enter={cancel}
          leave={leave}
        />
      )}
    </div>
  )
}
