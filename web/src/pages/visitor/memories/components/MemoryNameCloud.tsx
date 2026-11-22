import { useEffect, useRef, useState } from 'react'
import {
  cloudFontSize,
  layoutNameCloud,
  nameCloudPath,
} from './name-cloud-layout'
import type { NameEntry, NameCloudResult } from './name-cloud-layout'

function description(entry: NameEntry) {
  return `${entry.name} · ${entry.submissionCount} 篇，占全部投稿 ${(entry.weight * 100).toFixed(1)}%`
}

export function MemoryNameCloud({
  names,
  mobile,
}: {
  names: NameEntry[]
  mobile: boolean
}) {
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const height = Math.round(
    mobile
      ? Math.max(250, Math.min(360, width * 0.82))
      : Math.max(300, Math.min(460, width * 0.42)),
  )
  const [result, setResult] = useState<{
    key: string
    value: NameCloudResult
  } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const key = JSON.stringify([width, height, mobile, names])
  const current = result?.key === key ? result.value : null
  const font =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif'
  useEffect(() => {
    const element = container.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width / 2) * 2),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!width) return
    const controller = new AbortController()
    void layoutNameCloud(names, width, height, mobile, font, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setResult({ key, value })
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({ key, value: { words: [], overflow: names } })
      })
    return () => controller.abort()
  }, [names, width, height, mobile, key])
  const peak = names.reduce(
    (maximum, entry) => Math.max(maximum, entry.weight),
    0.000001,
  )
  const active = names.find((entry) => entry.name === selected)
  return (
    <>
      <div
        ref={container}
        className="memory-names-cloud"
        data-shape="115"
        data-layout-state={current ? 'ready' : 'loading'}
        style={{ height }}
        aria-busy={!current}
      >
        <svg
          viewBox={`0 0 ${width || 1000} ${height}`}
          width="100%"
          height="100%"
          aria-label="115形状的回忆姓名词云"
        >
          <path
            className="memory-cloud-outline"
            d={nameCloudPath}
            transform={`scale(${(width || 1000) / 1000} ${height / 360})`}
            aria-hidden="true"
          />
          {current?.words.map((word) => (
            <g
              key={word.entry.name}
              transform={`translate(${word.x} ${word.y})`}
              className="memory-cloud-word"
              role="button"
              tabIndex={0}
              aria-label={`${word.entry.name}，${word.entry.submissionCount}篇回忆`}
              onMouseEnter={() => setSelected(word.entry.name)}
              onFocus={() => setSelected(word.entry.name)}
              onClick={() => setSelected(word.entry.name)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setSelected(word.entry.name)
                }
              }}
            >
              <title>{description(word.entry)}</title>
              <text
                className={`memory-name memory-name-tone-${word.tone}`}
                fontFamily={font}
                fontSize={word.size}
                fontWeight={word.weight}
                textAnchor="middle"
                style={{ fontSize: word.size }}
              >
                {word.lines.map((line, index) => (
                  <tspan
                    key={index}
                    x={0}
                    y={word.baseline + index * word.lineHeight}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p className="memory-cloud-info" role="status">
        {active ? description(active) : '每一份回忆，都在这里留下名字。'}
      </p>
      {!!current?.overflow.length && (
        <details className="memory-cloud-more">
          <summary>还有 {current.overflow.length} 个名字，展开查看</summary>
          <div className="memory-cloud-overflow" aria-label="更多回忆姓名">
            {current.overflow.map((entry, index) => (
              <button
                key={entry.name}
                type="button"
                className="memory-cloud-extra-name"
                title={description(entry)}
                style={{
                  fontSize: cloudFontSize(entry.weight, mobile, peak),
                }}
                aria-label={`${entry.name}，${entry.submissionCount}篇回忆`}
                onClick={() => setSelected(entry.name)}
              >
                <span className={`memory-name memory-name-tone-${index % 4}`}>
                  {entry.name}
                </span>
              </button>
            ))}
          </div>
        </details>
      )}
    </>
  )
}
