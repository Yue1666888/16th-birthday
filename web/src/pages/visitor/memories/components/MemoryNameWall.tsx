import { useCallback } from 'react'
import { useResource } from '@/hooks/use-resource'
import { useVisitorContext } from '@/hooks/use-visitor-view'
import { getMemoryNames } from '@/api/public/walls.api'
import type { MemoryNameWallResponse } from '@/types/public/walls.types'
import { errorMessage } from '@/lib/api-error'
const cache = new Map<boolean, MemoryNameWallResponse>()
export function MemoryNameWall({ preview }: { preview: boolean }) {
  const { view } = useVisitorContext()
  const load = useCallback(
    async (signal: AbortSignal) => {
      const value =
        preview && import.meta.env.DEV
          ? (await import('@/dev/wall-preview')).getPreviewMemoryNames()
          : await getMemoryNames(signal)
      if (!signal.aborted) cache.set(preview, value)
      return value
    },
    [preview],
  )
  const { data, error, reload } = useResource(load, cache.get(preview) || null)
  if (!data)
    return error ? (
      <section className="memory-names-error" role="status">
        <p>姓名墙暂时无法加载：{errorMessage(error)}</p>
        <button className="visitor-button" onClick={reload}>
          重试姓名墙
        </button>
      </section>
    ) : null
  if (data.totalSubmissions === 0 || data.names.length === 0) return null
  return (
    <section className="memory-names" aria-labelledby="memory-name-wall-title">
      <div className="memory-names-heading">
        <div>
          <span>THE NAMES WE REMEMBER</span>
          <h2 id="memory-name-wall-title">回忆姓名墙</h2>
        </div>
        <p>
          {data.names.length} 个名字<span> · </span>
          {data.namedSubmissions} 篇署名回忆
        </p>
      </div>
      <div className="memory-names-cloud" aria-label="投稿姓名，按投稿次数排序">
        {data.names.map((entry, index) => {
          const scale = Math.sqrt(Math.max(0, Math.min(1, entry.weight)))
          return (
            <span
              key={entry.name}
              className={'memory-name memory-name-tone-' + (index % 4)}
              style={{
                fontSize:
                  (view === 'mobile' ? 14 + 22 * scale : 18 + 44 * scale) +
                  'px',
                fontWeight: entry.weight >= 0.2 ? 600 : 400,
                paddingTop: [0, 9, 3, 15][index % 4],
              }}
              title={
                entry.name +
                ' · ' +
                entry.submissionCount +
                ' 篇，占全部投稿 ' +
                (entry.weight * 100).toFixed(1) +
                '%'
              }
              aria-label={entry.name + '，' + entry.submissionCount + '篇回忆'}
            >
              {entry.name}
            </span>
          )
        })}
      </div>
      {!!error && (
        <p className="memory-names-stale" role="status">
          姓名统计更新失败，暂时显示上次结果。
          <button onClick={reload}>重试姓名墙</button>
        </p>
      )}
    </section>
  )
}
