import { useCallback, useEffect, useRef, useState } from 'react'
import { AppApiError } from '@/lib/api-error'
export function useResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  initialData: T | null = null,
) {
  const [data, setData] = useState<T | null>(initialData),
    [error, setError] = useState<unknown>(null),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0)
  const sequence = useRef(0)
  useEffect(() => {
    const token = ++sequence.current,
      controller = new AbortController()
    queueMicrotask(() => {
      if (token === sequence.current) {
        setLoading(true)
        setError(null)
      }
    })
    void load(controller.signal)
      .then((value) => {
        if (token === sequence.current && !controller.signal.aborted)
          setData(value)
      })
      .catch((e) => {
        if (
          token === sequence.current &&
          !controller.signal.aborted &&
          !(e instanceof AppApiError && e.code === 'ERR_CANCELED')
        )
          setError(e)
      })
      .finally(() => {
        if (token === sequence.current && !controller.signal.aborted)
          setLoading(false)
      })
    return () => controller.abort()
  }, [load, version])
  return {
    data,
    error,
    loading,
    reload: useCallback(() => setVersion((v) => v + 1), []),
  }
}
