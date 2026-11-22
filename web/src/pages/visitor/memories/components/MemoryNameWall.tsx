import { useCallback, useEffect } from 'react'
import { subscribePublicMemories } from '@/hooks/use-paged-feed'
import { useResource } from '@/hooks/use-resource'
import { useVisitorContext } from '@/hooks/use-visitor-view'
import { getMemoryNames } from '@/api/public/walls.api'
import type { MemoryNameWallResponse } from '@/types/public/walls.types'
import { errorMessage } from '@/lib/api-error'
import { MemoryNameCloud } from './MemoryNameCloud'
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
  useEffect(
    () => (!preview ? subscribePublicMemories(reload) : undefined),
    [preview, reload],
  )
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
      <MemoryNameCloud names={data.names} mobile={view === 'mobile'} />
      {!!error && (
        <p className="memory-names-stale" role="status">
          姓名统计更新失败，暂时显示上次结果。
          <button onClick={reload}>重试姓名墙</button>
        </p>
      )}
    </section>
  )
}
