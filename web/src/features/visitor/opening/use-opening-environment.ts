import { useSyncExternalStore } from 'react'

function mediaSubscribe(query: string, changed: () => void) {
  const media = matchMedia(query)
  media.addEventListener('change', changed)
  return () => media.removeEventListener('change', changed)
}
const subscribeMotion = (changed: () => void) =>
  mediaSubscribe('(prefers-reduced-motion: reduce)', changed)
const subscribeVisibility = (changed: () => void) => {
  document.addEventListener('visibilitychange', changed)
  return () => document.removeEventListener('visibilitychange', changed)
}
export function useOpeningEnvironment() {
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    () => document.hidden,
    () => false,
  )
  return { reduced, hidden }
}
