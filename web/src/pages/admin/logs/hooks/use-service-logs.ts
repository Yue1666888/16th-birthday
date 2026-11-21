import { useEffect, useRef, useState } from 'react'
import { logsApi } from '@/api/admin/logs.api'
import type { LogEntry } from '@/domain/api.types'
import { appendLogEntries } from '../utils/log-buffer'
export function useServiceLogs() {
  const [entries, setEntries] = useState<LogEntry[]>([]),
    [error, setError] = useState<unknown>(null),
    [loading, setLoading] = useState(true),
    [truncated, setTruncated] = useState(false),
    [rotated, setRotated] = useState(false),
    [source, setSource] = useState('application.log')
  const cursor = useRef<string | undefined>(undefined),
    buffer = useRef<LogEntry[]>([])
  useEffect(() => {
    let active = true,
      inFlight = false,
      timer: ReturnType<typeof setTimeout> | undefined,
      controller: AbortController | null = null,
      failures = 0
    async function poll() {
      if (!active || document.hidden || inFlight) return
      inFlight = true
      const currentController = new AbortController()
      controller = currentController
      try {
        const chunk = await logsApi.read(
          cursor.current,
          currentController.signal,
        )
        if (!active || currentController.signal.aborted) return
        cursor.current = chunk.nextCursor
        setSource(chunk.source)
        setError(null)
        failures = 0
        const next = appendLogEntries(
          chunk.rotated ? [] : buffer.current,
          chunk.entries,
        )
        buffer.current = next.entries
        setEntries(next.entries)
        if (chunk.rotated) {
          setRotated(true)
          setTruncated(chunk.truncated || next.truncated)
        } else if (chunk.truncated || next.truncated) setTruncated(true)
      } catch (e) {
        if (active && !currentController.signal.aborted) {
          setError(e)
          failures++
        }
      } finally {
        inFlight = false
        if (active) {
          setLoading(false)
          if (!document.hidden)
            timer = setTimeout(
              () => void poll(),
              Math.min(30000, 5000 * 2 ** Math.min(failures, 3)),
            )
        }
      }
    }
    function visibility() {
      if (timer) clearTimeout(timer)
      if (document.hidden) controller?.abort()
      else void poll()
    }
    void poll()
    document.addEventListener('visibilitychange', visibility)
    return () => {
      active = false
      controller?.abort()
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])
  return { entries, error, loading, truncated, rotated, source }
}
