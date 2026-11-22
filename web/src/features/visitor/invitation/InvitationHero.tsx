import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { MouseEvent } from 'react'
const patterns = ['SIPC', '115', '602', 'TUT', '16TH', 'LOGO'] as const
function scrollToForm(event: MouseEvent<HTMLAnchorElement>, id: string) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  document.getElementById(id)?.scrollIntoView({
    block: 'start',
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth',
  })
}
const reducedQuery = '(prefers-reduced-motion: reduce)'
const subscribe = (callback: () => void) => {
  const media = matchMedia(reducedQuery)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
export function InvitationHero({
  names,
  namesError,
  reloadNames,
}: {
  names: string[]
  namesError: boolean
  reloadNames: () => void
}) {
  const host = useRef<HTMLElement>(null)
  const [index, setIndex] = useState(0),
    [visible, setVisible] = useState(true),
    [foreground, setForeground] = useState(!document.hidden)
  const reduced = useSyncExternalStore(
    subscribe,
    () => matchMedia(reducedQuery).matches,
    () => true,
  )
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    )
    if (host.current) observer.observe(host.current)
    const change = () => setForeground(!document.hidden)
    document.addEventListener('visibilitychange', change)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', change)
    }
  }, [])
  useEffect(() => {
    if (reduced || !visible || !foreground) return
    const interval = setInterval(
      () => setIndex((old) => (old + 1) % patterns.length),
      6500,
    )
    return () => clearInterval(interval)
  }, [reduced, visible, foreground])
  const pattern = reduced ? 'SIPC' : patterns[index]
  const displayedNames = names.length ? names : ['SIPCer', '等你归来', '115']
  return (
    <section
      ref={host}
      className="invitation-hero"
      aria-labelledby="invitation-heading"
    >
      <div className="invitation-hero-eyebrow">
        <span className="live-dot" />
        SIPC · THE SIXTEENTH REUNION<span>00 / HOME</span>
      </div>
      <div className="invitation-hero-art">
        <div
          className="invitation-name-rain"
          data-invitation-names
          aria-hidden="true"
        >
          <div className="invitation-names-fallback">
            {displayedNames.map((name, index) => (
              <span key={name + index} data-invitation-name>
                {name}
              </span>
            ))}
          </div>
        </div>
        <div className="invitation-mark-zone">
          <div
            className="invitation-mark"
            data-invitation-pattern={pattern}
            data-particle-word={pattern === 'LOGO' ? '' : pattern}
            aria-hidden="true"
          >
            {pattern === 'LOGO' ? (
              <img src="/brand/sipc-emblem.png" alt="" />
            ) : (
              <span>{pattern}</span>
            )}
          </div>
          <p className="invitation-mark-motto">过去已去，未来已来.</p>
        </div>
      </div>
      <div className="invitation-welcome">
        <p className="invitation-motto">过去已去，未来已来</p>
        <div className="invitation-greeting">
          <h1 id="invitation-heading">
            Dear SIPCer
            <span className="invitation-greeting-comma" aria-hidden="true">
              ,
            </span>
          </h1>
          <p className="invitation-welcome-back">Welcome Back！</p>
        </div>
        <div className="invitation-welcome-actions">
          <a
            className="visitor-button"
            href="#reply"
            onClick={(event) => scrollToForm(event, 'reply')}
          >
            填写回执 ↙
          </a>
          <a
            className="invitation-memory-link"
            href="#contribution"
            onClick={(event) => scrollToForm(event, 'contribution')}
          >
            留下回忆 ↗
          </a>
        </div>
      </div>
      {namesError && (
        <p className="invitation-names-note">
          姓名暂时未能加载。<button onClick={reloadNames}>重新加载</button>
        </p>
      )}
    </section>
  )
}
