import { describe, expect, test } from 'vitest'
import {
  advanceParticles,
  createParticleField,
  driftParticleTargets,
  evenlySelectPoints,
} from '@/features/visitor/particles/particle-field'
describe('particle repulsion and spring recovery', () => {
  test('idle paths vary in both directions, stay bounded and do not jump between frames', () => {
    const homes = new Float32Array([100, 200, 300, 400])
    const previous = new Float32Array(4),
      next = new Float32Array(4)
    driftParticleTargets(previous, homes, 2, 0, 12)
    driftParticleTargets(next, homes, 2, 4, 12)
    expect(Array.from(next)).not.toEqual(Array.from(previous))
    for (let frame = 0; frame < 600; frame++) {
      driftParticleTargets(previous, homes, 2, frame / 60, 12)
      driftParticleTargets(next, homes, 2, (frame + 1) / 60, 12)
      for (let coordinate = 0; coordinate < 4; coordinate++) {
        expect(
          Math.abs(next[coordinate] - homes[coordinate]),
        ).toBeLessThanOrEqual(12.001)
        expect(Math.abs(next[coordinate] - previous[coordinate])).toBeLessThan(
          0.2,
        )
      }
    }
  })
  test('after repulsion ends, particles recover to the moving idle path', () => {
    const reference = createParticleField(1),
      disturbed = createParticleField(1)
    const homes = new Float32Array([100, 100])
    reference.positions.set([100, 100, 0])
    disturbed.positions.set([100, 100, 0])
    for (let frame = 0; frame < 300; frame++) {
      for (const field of [reference, disturbed]) {
        driftParticleTargets(field.targets, homes, 1, frame / 60, 16)
        advanceParticles(
          field,
          1,
          1 / 60,
          { x: 100, y: 100, active: field === disturbed && frame < 60 },
          72,
          18000,
        )
      }
    }
    expect(
      Math.hypot(
        disturbed.positions[0] - reference.positions[0],
        disturbed.positions[1] - reference.positions[1],
      ),
    ).toBeLessThan(0.1)
    expect(
      Math.hypot(reference.positions[0] - 100, reference.positions[1] - 100),
    ).toBeGreaterThan(2)
  })
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
