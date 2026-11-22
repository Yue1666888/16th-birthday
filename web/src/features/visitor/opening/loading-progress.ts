import { clamp, ease } from './playback'

export interface LoadingStep {
  from: number
  to: number
  moveMs: number
  holdMs: number
}
export function createLoadingPlan(
  random: () => number = Math.random,
): LoadingStep[] {
  const targets = [
    22 + Math.floor(random() * 8),
    49 + Math.floor(random() * 11),
    79 + Math.floor(random() * 9),
    100,
  ]
  return targets.map((to, index) => ({
    from: index ? targets[index - 1] : 0,
    to,
    moveMs: 900 + Math.floor(random() * 300),
    holdMs: index === targets.length - 1 ? 0 : 320 + Math.floor(random() * 300),
  }))
}
export function plannedLoadingPercent(
  plan: readonly LoadingStep[],
  elapsedMs: number,
) {
  let remaining = Math.max(0, elapsedMs)
  for (const step of plan) {
    if (remaining < step.moveMs)
      return step.from + (step.to - step.from) * ease(remaining / step.moveMs)
    remaining -= step.moveMs
    if (remaining < step.holdMs) return step.to
    remaining -= step.holdMs
  }
  return 100
}
export function capLoadingProgress(
  displayed: number,
  planned: number,
  actual: number,
  deltaMs: number,
) {
  return clamp(Math.min(planned, actual, displayed + deltaMs * 0.045), 0, 100)
}
