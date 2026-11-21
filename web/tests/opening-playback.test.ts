import { describe, expect, it } from 'vitest'
import {
  advanceOpening,
  initialPlayback,
  releaseOpening,
  turnMemoryPage,
  typedText,
} from '../src/features/visitor/opening/playback'
import { openingScenes } from '../src/features/visitor/opening/script'

describe('interactive opening clock', () => {
  it('keeps one continuous 109-second script and readable nonoverlapping captions', () => {
    let cursor = 0
    for (const scene of openingScenes) {
      expect(scene.start).toBe(cursor)
      cursor = scene.end
      expect(scene.end - scene.start).toBe(scene.duration)
      let previous = 0
      for (const line of scene.dialogues) {
        expect(line.start).toBeGreaterThanOrEqual(previous)
        expect(line.end).toBeLessThanOrEqual(scene.duration)
        expect(line.end).toBeGreaterThan(line.start)
        previous = line.end
      }
    }
    expect(cursor).toBe(109)
  })

  it('stops walking on release but continues the final approach automatically', () => {
    const start = { ...initialPlayback, index: 1 }
    const waiting = advanceOpening(start, 2, false)
    expect(waiting.time).toBe(1.2)
    const moving = advanceOpening(waiting, 2, true)
    expect(moving.time).toBe(3.2)
    expect(advanceOpening(moving, 5, false)).toEqual(moving)
    const close = advanceOpening(moving, 3, true)
    expect(advanceOpening(close, 1, false).index).toBe(2)
    expect(releaseOpening(start).time).toBe(6)
  })

  it('gates boarding, door, lamp and letter, and a repeated click cannot replay a transition', () => {
    for (const index of [2, 6, 7, 9]) {
      const scene = openingScenes[index]
      const waiting = advanceOpening({ ...initialPlayback, index }, 50, false)
      expect(waiting.time).toBe(scene.waitAt)
      const released = releaseOpening(waiting)
      expect(releaseOpening(released)).toEqual(released)
      expect(advanceOpening(released, 50, false).index).toBe(index + 1)
    }
  })

  it('does not move into an undecoded scene and finishes only at the end', () => {
    const end = advanceOpening(initialPlayback, 10, false, false)
    expect(end.index).toBe(0)
    expect(end.time).toBe(8)
    expect(advanceOpening(end, 0.1, false).index).toBe(1)
    expect(
      advanceOpening({ ...initialPlayback, index: 10 }, 7, false).finished,
    ).toBe(true)
  })

  it('turns memory pages without carrying over a partially read caption', () => {
    const page = { ...initialPlayback, index: 4, time: 13.4 }
    expect(turnMemoryPage(page, 1).time).toBe(18.8)
    expect(turnMemoryPage(page, -1).time).toBe(0.8)
    expect(turnMemoryPage({ ...page, time: 35 }, 1).time).toBe(27.8)
  })

  it('types unicode characters progressively and leaves time to read the full line', () => {
    expect(typedText('欢迎回家🌤', 0, 3, false)).toBe('')
    const partial = typedText('欢迎回家🌤', 0.2, 3, false)
    expect(partial.length).toBeGreaterThan(0)
    expect(partial).not.toBe('欢迎回家🌤')
    expect(typedText('欢迎回家🌤', 2, 3, false)).toBe('欢迎回家🌤')
    expect(typedText('欢迎回家🌤', 0, 3, true)).toBe('欢迎回家🌤')
  })
})
