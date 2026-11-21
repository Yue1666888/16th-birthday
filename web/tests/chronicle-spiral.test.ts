import { expect, test } from 'vitest'
import { createChronicleSpiral } from '@/pages/visitor/chronicle/lib/spiral-geometry'
test('history starts at the center and grows outward without reordering or clipping node touch targets', () => {
  const spiral = createChronicleSpiral(13)
  expect(spiral.nodes).toHaveLength(13)
  expect(spiral.nodes[0]).toMatchObject({ x: 500, y: 500, angle: 0 })
  let previous = -1
  for (const node of spiral.nodes) {
    const radius = Math.hypot(node.x - 500, node.y - 500)
    expect(radius).toBeGreaterThan(previous)
    previous = radius
    expect(node.x - 56).toBeGreaterThanOrEqual(70)
    expect(node.y - 56).toBeGreaterThanOrEqual(70)
    expect(node.x + 56).toBeLessThanOrEqual(930)
    expect(node.y + 56).toBeLessThanOrEqual(930)
  }
  expect(previous).toBeCloseTo(360)
  expect(
    Math.hypot(spiral.futureEnd.x - 500, spiral.futureEnd.y - 500),
  ).toBeGreaterThan(previous)
})
test('adjacent history markers remain distinct near the center', () => {
  const { nodes } = createChronicleSpiral(13)
  for (let index = 1; index < nodes.length; index++)
    expect(
      Math.hypot(
        nodes[index].x - nodes[index - 1].x,
        nodes[index].y - nodes[index - 1].y,
      ),
    ).toBeGreaterThan(80)
})
