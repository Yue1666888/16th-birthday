import { useSyncExternalStore } from 'react'
import { useOutletContext } from 'react-router'
const desktopQuery = '(min-width: 1024px)'
const hoverQuery = '(hover: hover) and (pointer: fine)'
function subscribe(change: () => void) {
  const queries = [matchMedia(desktopQuery), matchMedia(hoverQuery)]
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
    () => matchMedia(desktopQuery).matches,
    () => false,
  )
  const canHover = useSyncExternalStore(
    subscribe,
    () => matchMedia(hoverQuery).matches,
    () => false,
  )
  return {
    view: desktop ? ('desktop' as const) : ('mobile' as const),
    canHover,
  }
}
