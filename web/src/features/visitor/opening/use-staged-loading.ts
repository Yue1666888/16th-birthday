import { useEffect, useRef, useState } from 'react'
import {
  capLoadingProgress,
  createLoadingPlan,
  plannedLoadingPercent,
} from './loading-progress'

export function useStagedLoading(actual: number, active: boolean) {
  const [plan] = useState(createLoadingPlan)
  const [displayed, setDisplayed] = useState(0)
  const elapsed = useRef(0)
  const position = useRef(0)
  useEffect(() => {
    if (!active) return
    let frame = 0
    let previous = performance.now()
    const total = plan.reduce((sum, step) => sum + step.moveMs + step.holdMs, 0)
    const tick = (now: number) => {
      const delta = Math.min(100, now - previous)
      previous = now
      elapsed.current += delta
      const target = plannedLoadingPercent(plan, elapsed.current)
      const next = capLoadingProgress(position.current, target, actual, delta)
      position.current = next
      setDisplayed(next)
      if (
        next < 100 &&
        (elapsed.current < total || next < Math.min(target, actual))
      )
        frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, actual, plan])
  return Math.floor(displayed)
}
