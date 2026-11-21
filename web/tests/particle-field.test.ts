import { describe, expect, test } from 'vitest'
import {
  advanceParticles,
  createParticleField,
  evenlySelectPoints,
} from '@/features/visitor/particles/particle-field'
describe('particle repulsion and spring recovery', () => {
  test('a centered pointer scatters a particle without NaN, then it returns to its home', () => {
    const field = createParticleField(1)
    field.targets.set([100, 100])
    field.positions.set([100, 100, 0])
    const pointer = { x: 100, y: 100, active: true }
    for (let i = 0; i < 60; i++)
      advanceParticles(field, 1, 1 / 60, pointer, 65, 23000)
    expect(
      Math.hypot(field.positions[0] - 100, field.positions[1] - 100),
    ).toBeGreaterThan(35)
    pointer.active = false
    for (let i = 0; i < 240; i++)
      advanceParticles(field, 1, 1 / 60, pointer, 65, 23000)
    expect(field.positions[0]).toBeCloseTo(100, 2)
    expect(field.positions[1]).toBeCloseTo(100, 2)
  })
  test('particles outside the smaller interaction radius stay still', () => {
    const field = createParticleField(1)
    field.targets.set([80, 0])
    field.positions.set([80, 0, 0])
    advanceParticles(field, 1, 1 / 30, { x: 0, y: 0, active: true }, 72, 18000)
    expect(field.positions[0]).toBe(80)
    expect(field.velocities[0]).toBe(0)
  })
  test('frame subdivision keeps 30/60/120Hz motion consistent', () => {
    const run = (fps: number) => {
      const field = createParticleField(1)
      field.targets.set([100, 50])
      for (let i = 0; i < fps; i++)
        advanceParticles(
          field,
          1,
          1 / fps,
          { x: 0, y: 0, active: false },
          65,
          23000,
        )
      return Array.from(field.positions)
    }
    expect(run(30)).toEqual(run(60))
    expect(run(60)).toEqual(run(120))
  })
  test('lower quality preserves points across the whole word instead of dropping the last letters', () => {
    const points = Array.from({ length: 100 }, (_, i) => [i, 0]).flat()
    const selected = evenlySelectPoints(points, 10)
    expect(selected.length).toBe(20)
    expect(selected[0]).toBe(0)
    expect(selected[18]).toBe(90)
  })
})
