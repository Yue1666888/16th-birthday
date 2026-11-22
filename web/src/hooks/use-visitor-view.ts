import { useSyncExternalStore } from 'react'
import { useOutletContext } from 'react-router'
import {
  desktopWideQuery,
  desktopCompactQuery,
  desktopHoverQuery,
  selectVisitorView,
} from '@/lib/visitor-view'
function subscribe(change: () => void) {
  const queries = [
    matchMedia(desktopWideQuery),
    matchMedia(desktopCompactQuery),
    matchMedia(desktopHoverQuery),
  ]
  queries.forEach((query) => query.addEventListener('change', change))
  return () =>
    queries.forEach((query) => query.removeEventListener('change', change))
}
export function useVisitorContext() {
  return useOutletContext<ReturnType<typeof useVisitorView>>()
}
export function useVisitorView() {
  const desktop = useSyncExternalStore(
    subscribe,
    () =>
      selectVisitorView(
        matchMedia(desktopWideQuery).matches,
        matchMedia(desktopCompactQuery).matches,
        matchMedia(desktopHoverQuery).matches,
      ) === 'desktop',
    () => false,
  )
  const canHover = useSyncExternalStore(
    subscribe,
    () => matchMedia(desktopHoverQuery).matches,
    () => false,
  )
  return {
    view: desktop ? ('desktop' as const) : ('mobile' as const),
    canHover,
  }
}
