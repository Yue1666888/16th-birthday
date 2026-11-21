import type { LogEntry } from '@/domain/api.types'
export function appendLogEntries(
  previous: LogEntry[],
  incoming: LogEntry[],
  maxCount = 2000,
  maxBytes = 2 * 1024 * 1024,
) {
  const seen = new Set(previous.map((e) => e.id)),
    combined = [...previous]
  for (const entry of incoming)
    if (!seen.has(entry.id)) {
      combined.push(entry)
      seen.add(entry.id)
    }
  let result = combined.slice(-maxCount),
    bytes = result.reduce(
      (n, e) => n + new TextEncoder().encode(e.text).length,
      0,
    ),
    start = 0
  while (bytes > maxBytes && start < result.length) {
    bytes -= new TextEncoder().encode(result[start].text).length
    start++
  }
  result = result.slice(start)
  return { entries: result, truncated: result.length < combined.length }
}
