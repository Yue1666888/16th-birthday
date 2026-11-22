import { describe, expect, it } from 'vitest'
import {
  capLoadingProgress,
  createLoadingPlan,
  plannedLoadingPercent,
} from '../src/features/visitor/opening/loading-progress'
import { punctuationPhrases } from '../src/lib/punctuation'

describe('opening preparation pacing', () => {
  it('starts at zero, pauses at intermediate checkpoints and takes at least several seconds', () => {
    const plan = createLoadingPlan(() => 0.5)
    expect(plannedLoadingPercent(plan, 0)).toBe(0)
    let elapsed = 0
    for (const step of plan) {
      elapsed += step.moveMs
      expect(plannedLoadingPercent(plan, elapsed)).toBe(step.to)
      if (step.holdMs)
        expect(plannedLoadingPercent(plan, elapsed + step.holdMs / 2)).toBe(
          step.to,
        )
      elapsed += step.holdMs
    }
    expect(elapsed).toBeGreaterThan(4500)
    expect(plannedLoadingPercent(plan, elapsed)).toBe(100)
  })
  it('changes the intermediate checkpoints while preserving their order', () => {
    const low = createLoadingPlan(() => 0),
      high = createLoadingPlan(() => 0.99)
    expect(low.map((s) => s.to)).not.toEqual(high.map((s) => s.to))
    for (const plan of [low, high])
      expect(plan.map((s) => s.to)).toEqual(
        [...plan.map((s) => s.to)].sort((a, b) => a - b),
      )
  })
  it('never presents resources as complete early and does not jump to 100 in one frame', () => {
    expect(capLoadingProgress(40, 100, 65, 1000)).toBe(65)
    expect(capLoadingProgress(0, 100, 100, 16)).toBeLessThan(1)
  })
})

describe('punctuation-aware copy', () => {
  it('keeps complete phrases and punctuation without dropping any source text', () => {
    const text = '有些地方，离开很久，也不会陌生。'
    expect(punctuationPhrases(text)).toEqual([
      '有些地方，',
      '离开很久，',
      '也不会陌生。',
    ])
    expect(punctuationPhrases(text).join('')).toBe(text)
  })
  it('preserves Latin text and mixed punctuation', () => {
    const text = 'Dear SIPCer，Welcome Back！'
    expect(punctuationPhrases(text).join('')).toBe(text)
  })
})
