export interface ParticleField {
  positions: Float32Array
  targets: Float32Array
  velocities: Float32Array
}
export interface ParticlePointer {
  x: number
  y: number
  active: boolean
}
export function createParticleField(capacity: number): ParticleField {
  return {
    positions: new Float32Array(capacity * 3),
    targets: new Float32Array(capacity * 2),
    velocities: new Float32Array(capacity * 2),
  }
}
/** Damped springs restore each particle; the pointer applies a local outward force. */
export function advanceParticles(
  field: ParticleField,
  count: number,
  elapsed: number,
  pointer: ParticlePointer,
  radius: number,
  force: number,
) {
  const duration = Math.max(0, Math.min(elapsed, 0.1))
  const steps = Math.max(1, Math.ceil(duration * 120)),
    dt = duration / steps
  for (let step = 0; step < steps; step++) {
    for (let i = 0; i < count; i++) {
      const p = i * 3,
        v = i * 2
      let ax =
        (field.targets[v] - field.positions[p]) * 38 -
        field.velocities[v] * 12.5
      let ay =
        (field.targets[v + 1] - field.positions[p + 1]) * 38 -
        field.velocities[v + 1] * 12.5
      if (pointer.active) {
        let dx = field.positions[p] - pointer.x,
          dy = field.positions[p + 1] - pointer.y
        const distance = Math.hypot(dx, dy)
        if (distance < radius) {
          if (distance < 0.001) {
            dx = Math.cos(i * 2.39996 + 0.31)
            dy = Math.sin(i * 2.39996 + 0.31)
          } else {
            dx /= distance
            dy /= distance
          }
          const repulsion = force * (1 - distance / radius) ** 2
          ax += dx * repulsion
          ay += dy * repulsion
        }
      }
      field.velocities[v] += ax * dt
      field.velocities[v + 1] += ay * dt
      field.positions[p] += field.velocities[v] * dt
      field.positions[p + 1] += field.velocities[v + 1] * dt
    }
  }
}
/** Independent low-frequency paths move the home targets smoothly, without per-frame randomness. */
export function driftParticleTargets(
  targets: Float32Array,
  homes: Float32Array,
  count: number,
  time: number,
  amplitude: number,
) {
  for (let i = 0; i < count; i++) {
    const phase = i * 2.39996,
      speed = 0.22 + (i % 11) * 0.014
    const extent = amplitude * (0.7 + 0.3 * ((i * 0.61803398875) % 1))
    targets[i * 2] =
      homes[i * 2] +
      extent *
        (0.7 * Math.sin(time * speed + phase) +
          0.3 * Math.sin(time * speed * 1.93 + phase * 0.73))
    targets[i * 2 + 1] =
      homes[i * 2 + 1] +
      extent *
        (0.7 * Math.sin(time * speed * 0.83 + phase * 1.37) +
          0.3 * Math.cos(time * speed * 1.61 + phase * 0.41))
  }
}
export function evenlySelectPoints(points: number[], budget: number) {
  const available = points.length / 2,
    count = Math.min(available, budget)
  const result = new Float32Array(count * 2)
  for (let i = 0; i < count; i++) {
    const source = Math.floor((i * available) / count) * 2
    result[i * 2] = points[source]
    result[i * 2 + 1] = points[source + 1]
  }
  return result
}
