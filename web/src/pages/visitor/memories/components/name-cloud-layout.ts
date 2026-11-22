import CloudLayout from 'd3-cloud'
import type { MemoryNameWallResponse } from '@/types/public/walls.types'

export type NameEntry = MemoryNameWallResponse['names'][number]
// A wide-stemmed 115 gives Chinese names enough room inside each digit.
export const nameCloudPath = [
  'M35 84 L135 16 H235 V300 H265 V344 H50 V300 H120 V104 L70 134 Z',
  'M325 84 L425 16 H525 V300 H555 V344 H340 V300 H410 V104 L360 134 Z',
  'M640 16 H960 V96 H740 V140 H850 Q965 140 965 245 Q965 344 850 344 H620 V266 H841 Q875 266 875 242 Q875 218 841 218 H640 Z',
].join(' ')
export interface CloudName {
  entry: NameEntry
  x: number
  y: number
  size: number
  weight: number
  lines: string[]
  baseline: number
  lineHeight: number
  tone: number
}
export interface NameCloudResult {
  words: CloudName[]
  overflow: NameEntry[]
}

export function cloudFontSize(weight: number, mobile: boolean, peak = 1) {
  const fraction = Math.sqrt(
    Math.max(0, Math.min(1, weight / Math.max(peak, 0.000001))),
  )
  return Math.round((mobile ? 12 : 16) + (mobile ? 8 : 20) * fraction)
}

/** Wrap whole Unicode code points; keep the full name, including long signatures. */
export function wrapCloudName(
  name: string,
  maxWidth: number,
  measure: (text: string) => number,
) {
  const lines: string[] = []
  let line = ''
  for (const character of Array.from(name)) {
    if (line && measure(line + character) > maxWidth) {
      lines.push(line)
      line = character
    } else line += character
  }
  if (line) lines.push(line)
  return lines
}

function seededRandom(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export async function layoutNameCloud(
  names: NameEntry[],
  width: number,
  height: number,
  mobile: boolean,
  font: string,
  signal: AbortSignal,
): Promise<NameCloudResult> {
  await document.fonts.ready
  const result: NameCloudResult = { words: [], overflow: [] }
  if (signal.aborted) return result
  const layout = new CloudLayout()
    .size([width, height])
    .overflow(false)
    .random(seededRandom(115))
  const mask = document.createElement('canvas')
  mask.width = width
  mask.height = height
  const context = mask.getContext('2d')
  if (!context) return { words: [], overflow: names }
  context.fillRect(0, 0, width, height)
  context.save()
  context.scale(width / 1000, height / 360)
  context.globalCompositeOperation = 'destination-out'
  context.fill(new Path2D(nameCloudPath))
  context.restore()
  // Occupy every pixel outside the digits before placing any words.
  const blocker = layout.getSprite(mask)
  if (!blocker || !layout.place(blocker, { x: 0, y: 0, strategy: 'none' }))
    return { words: [], overflow: names }

  const peak = names.reduce(
    (maximum, entry) => Math.max(maximum, entry.weight),
    0.000001,
  )
  const positionRandom = seededRandom(1153)
  const start = performance.now()
  for (let index = 0; index < names.length; index++) {
    if (signal.aborted) return result
    if (performance.now() - start > 1400) {
      result.overflow.push(...names.slice(index))
      break
    }
    const entry = names[index]
    const size = cloudFontSize(entry.weight, mobile, peak)
    const weight = entry.weight / peak >= 0.65 ? 600 : 400
    const digit = [2, 0, 1][index % 3]
    const paper = document.createElement('canvas')
    const painter = paper.getContext('2d')
    if (!painter) {
      result.overflow.push(entry)
      continue
    }
    painter.font = `${weight} ${size}px ${font}`
    const lines = wrapCloudName(
      entry.name,
      width * (digit === 2 ? 0.27 : 0.105),
      (text) => painter.measureText(text).width,
    )
    const padding = mobile ? 2 : 3
    const lineHeight = Math.ceil(size * 1.18)
    paper.width = Math.ceil(
      Math.max(...lines.map((line) => painter.measureText(line).width)) +
        padding * 2,
    )
    paper.height = lines.length * lineHeight + padding * 2
    painter.font = `${weight} ${size}px ${font}`
    painter.textAlign = 'center'
    painter.textBaseline = 'alphabetic'
    painter.lineJoin = 'round'
    painter.lineWidth = padding * 2
    for (let row = 0; row < lines.length; row++) {
      painter.strokeText(
        lines[row],
        paper.width / 2,
        padding + size + row * lineHeight,
      )
      painter.fillText(
        lines[row],
        paper.width / 2,
        padding + size + row * lineHeight,
      )
    }
    const sprite = layout.getSprite(paper)
    const seedX =
      digit === 2 ? 0.76 + positionRandom() * 0.08 : [0.1775, 0.4675][digit]
    const seedY =
      digit === 2
        ? [0.155, 0.845, 0.53, 0.68][Math.floor(index / 3) % 4]
        : 0.1 + positionRandom() * 0.78
    const placed =
      sprite &&
      layout.place(sprite, {
        x: Math.round(width * (seedX - 0.5)),
        y: Math.round(height * (seedY - 0.5)),
      })
    if (placed)
      result.words.push({
        entry,
        x: placed.x + width / 2,
        y: placed.y + height / 2,
        size,
        weight,
        lines,
        lineHeight,
        baseline: padding + size - paper.height / 2,
        tone: index % 4,
      })
    else result.overflow.push(entry)
    // Give scrolling, particles and cancellation a turn between batches.
    if (index % 4 === 3)
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
  return result
}
