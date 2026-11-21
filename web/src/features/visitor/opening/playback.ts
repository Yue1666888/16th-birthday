import { openingScenes } from './script'

export interface OpeningPlayback {
  index: number
  time: number
  released: boolean
  finished: boolean
}
export const initialPlayback: OpeningPlayback = {
  index: 0,
  time: 0,
  released: false,
  finished: false,
}
export const clamp = (n: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, n))
export const ease = (n: number) => {
  const t = clamp(n)
  return t * t * (3 - 2 * t)
}

/** All scene motion and captions share this logical, pausable clock. */
export function advanceOpening(
  state: OpeningPlayback,
  delta: number,
  walking: boolean,
  nextReady = true,
): OpeningPlayback {
  if (state.finished || delta <= 0) return state
  const scene = openingScenes[state.index]
  const waitingForConfirmation =
    scene.waitAt !== null && !state.released && scene.id !== 'S02'
  let time = Math.min(scene.duration, state.time + delta)
  if (scene.id === 'S02' && !state.released && !walking && state.time < 6) {
    time = Math.min(time, Math.max(state.time, 1.2))
  } else if (scene.waitAt !== null && !state.released && scene.id !== 'S02') {
    time = Math.min(time, scene.waitAt)
  }
  if (time >= scene.duration && nextReady && !waitingForConfirmation) {
    if (state.index === openingScenes.length - 1)
      return { ...state, time, finished: true }
    return { index: state.index + 1, time: 0, released: false, finished: false }
  }
  return time === state.time ? state : { ...state, time }
}

export function releaseOpening(state: OpeningPlayback): OpeningPlayback {
  const scene = openingScenes[state.index]
  if (!scene.wait || state.released) return state
  return {
    ...state,
    released: true,
    time: Math.max(state.time, scene.id === 'S02' ? 6 : (scene.waitAt ?? 0)),
  }
}

export function turnMemoryPage(
  state: OpeningPlayback,
  direction: -1 | 1,
): OpeningPlayback {
  if (openingScenes[state.index].id !== 'S05') return state
  return {
    ...state,
    // Manual browsing pauses after the entrance fade, so the selected photo stays visible.
    time: clamp(Math.floor(state.time / 9) + direction, 0, 3) * 9 + 0.8,
  }
}

export function typedText(
  text: string,
  elapsed: number,
  available: number,
  reduced: boolean,
) {
  const chars = Array.from(text)
  if (reduced) return text
  // Reserve at least the final ~45% of each caption for reading the whole sentence.
  const duration = Math.min(
    chars.length * 0.075,
    Math.max(0.3, available * 0.55),
  )
  return chars
    .slice(0, Math.floor(clamp(elapsed / duration) * chars.length))
    .join('')
}
