import { useCallback, useEffect, useRef, useState } from 'react'
import type { PageResponse } from '@/domain/api.types'
interface Feed<T> {
  items: T[]
  page: number
  total: number
  pages: number
}
const savedFeeds = new Map<string, Feed<unknown>>()
function invalidateWall(kind: 'memories' | 'honors') {
  savedFeeds.delete(kind + ':false')
  window.dispatchEvent(new Event('birthday:' + kind + '-updated'))
  try {
    localStorage.setItem(
      'birthday16.' + kind + '-revision',
      Date.now().toString() + ':' + Math.random(),
    )
  } catch {
    /* Same-tab updates remain available when browser storage is disabled. */
  }
}
function subscribeWall(kind: 'memories' | 'honors', listener: () => void) {
  const changed = () => {
    savedFeeds.delete(kind + ':false')
    listener()
  }
  const storage = (event: StorageEvent) => {
    if (event.key === 'birthday16.' + kind + '-revision') changed()
  }
  window.addEventListener('birthday:' + kind + '-updated', changed)
  window.addEventListener('storage', storage)
  return () => {
    window.removeEventListener('birthday:' + kind + '-updated', changed)
    window.removeEventListener('storage', storage)
  }
}
export const invalidatePublicMemories = () => invalidateWall('memories')
export const invalidatePublicHonors = () => invalidateWall('honors')
export const subscribePublicMemories = (listener: () => void) =>
  subscribeWall('memories', listener)
export const subscribePublicHonors = (listener: () => void) =>
  subscribeWall('honors', listener)
export function usePagedFeed<T extends { id: string }>(
  key: string,
  load: (page: number, signal: AbortSignal) => Promise<PageResponse<T>>,
) {
  const [feed, setFeed] = useState<Feed<T>>(
    () =>
      (savedFeeds.get(key) as Feed<T> | undefined) || {
        items: [],
        page: 0,
        total: 0,
        pages: 1,
      },
  )
  const [loading, setLoading] = useState(!savedFeeds.has(key))
  const [error, setError] = useState<unknown>(null)
  const active = useRef<AbortController | null>(null)
  const requestedPage = useRef(1)
  const read = useCallback(
    async (page: number) => {
      requestedPage.current = page
      active.current?.abort()
      const controller = new AbortController()
      active.current = controller
      setLoading(true)
      setError(null)
      try {
        const result = await load(page, controller.signal)
        if (controller.signal.aborted) return
        setFeed((previous) => {
          const combined =
            page === 1 ? result.content : [...previous.items, ...result.content]
          const next = {
            items: [
              ...new Map(combined.map((item) => [item.id, item])).values(),
            ],
            page: result.page,
            total: result.totalElements,
            pages: result.totalPages,
          }
          savedFeeds.set(key, next)
          return next
        })
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    },
    [key, load],
  )
  useEffect(() => {
    // StrictMode's first cleanup cancels its scheduled initial read.
    let disposed = false
    if (!savedFeeds.has(key))
      queueMicrotask(() => {
        if (!disposed) void read(1)
      })
    return () => {
      disposed = true
      active.current?.abort()
    }
  }, [key, read])
  useEffect(
    () =>
      key === 'memories:false'
        ? subscribePublicMemories(() => {
            void read(1)
          })
        : key === 'honors:false'
          ? subscribePublicHonors(() => {
              void read(1)
            })
          : undefined,
    [key, read],
  )
  return {
    ...feed,
    loading,
    error,
    more: () => read(feed.page + 1),
    retry: () => read(requestedPage.current),
  }
}
