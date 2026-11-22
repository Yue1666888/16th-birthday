import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { invitationPoster } from '@/domain/invitation-content'
import type { InvitationFlight as Flight } from './context'

export function InvitationFlight({
  flight,
  target,
  onDone,
}: {
  flight: Flight
  target: RefObject<HTMLImageElement | null>
  onDone: () => void
}) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = host.current,
      destination = target.current?.getBoundingClientRect()
    if (!element || !destination) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const frame = requestAnimationFrame(onDone)
      return () => cancelAnimationFrame(frame)
    }
    let active = true
    const animation = element.animate(
      [
        {
          left: `${flight.left}px`,
          top: `${flight.top}px`,
          width: `${flight.width}px`,
          height: `${flight.height}px`,
          rotate: '0deg',
          opacity: 1,
        },
        {
          left: `${destination.left}px`,
          top: `${destination.top}px`,
          width: `${destination.width}px`,
          height: `${destination.height}px`,
          rotate: '-6deg',
          opacity: 1,
        },
      ],
      { duration: 1150, easing: 'cubic-bezier(.25,.7,.2,1)', fill: 'forwards' },
    )
    void animation.finished.then(
      () => {
        if (active) onDone()
      },
      () => {
        if (active) onDone()
      },
    )
    return () => {
      active = false
      animation.cancel()
    }
  }, [flight, target, onDone])
  return (
    <div
      ref={host}
      className="invitation-flight"
      data-invitation-flight
      aria-hidden="true"
      style={{
        left: flight.left,
        top: flight.top,
        width: flight.width,
        height: flight.height,
      }}
    >
      <img src={invitationPoster} alt="" />
    </div>
  )
}
