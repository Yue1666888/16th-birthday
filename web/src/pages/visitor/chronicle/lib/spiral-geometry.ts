export interface SpiralPoint {
  x: number
  y: number
  angle: number
}
const center = 500,
  turns = Math.PI * 4,
  growth = 360 / turns
function point(angle: number): SpiralPoint {
  const radius = growth * angle
  return {
    x: center + radius * Math.cos(angle - Math.PI / 2),
    y: center + radius * Math.sin(angle - Math.PI / 2),
    angle,
  }
}
function path(from: number, to: number, steps: number) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const p = point(from + ((to - from) * index) / steps)
    return (index ? 'L' : 'M') + p.x.toFixed(2) + ' ' + p.y.toFixed(2)
  }).join(' ')
}
export function createChronicleSpiral(count: number) {
  const samples = Array.from({ length: 501 }, (_, index) =>
    point((turns * index) / 500),
  )
  const lengths = [0]
  for (let index = 1; index < samples.length; index++)
    lengths.push(
      lengths[index - 1] +
        Math.hypot(
          samples[index].x - samples[index - 1].x,
          samples[index].y - samples[index - 1].y,
        ),
    )
  const total = lengths.at(-1)!
  const nodes = Array.from({ length: count }, (_, index) => {
    const target = count > 1 ? (total * index) / (count - 1) : 0
    const next = Math.max(
      1,
      lengths.findIndex((length) => length >= target),
    )
    const fraction =
      (target - lengths[next - 1]) / (lengths[next] - lengths[next - 1])
    return point(
      samples[next - 1].angle +
        (samples[next].angle - samples[next - 1].angle) * fraction,
    )
  })
  return {
    nodes,
    line: path(0, turns, 500),
    future: path(turns, turns + 1.65, 90),
    futureStart: point(turns),
    futureEnd: point(turns + 1.65),
    progress: nodes.map((node) =>
      path(0, node.angle, Math.max(1, Math.ceil(node.angle * 36))),
    ),
  }
}
