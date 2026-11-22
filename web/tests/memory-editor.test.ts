import { describe, expect, it } from 'vitest'
import { memorySchema } from '../src/pages/admin/memories/schemas/memory.schema'
const empty = {
  displayName: '',
  title: '',
  content: '',
  imageIds: [] as string[],
}
describe('administrator memory content', () => {
  it('accepts anonymous text or image-only memories but not a title alone', () => {
    expect(
      memorySchema.safeParse({ ...empty, content: '一段回忆' }).success,
    ).toBe(true)
    expect(
      memorySchema.safeParse({
        ...empty,
        imageIds: ['10000000-0000-4000-8000-000000000001'],
      }).success,
    ).toBe(true)
    expect(
      memorySchema.safeParse({ ...empty, title: '只有标题' }).success,
    ).toBe(false)
  })
  it('rejects duplicate/too many images and counts Unicode body characters correctly', () => {
    const image = '10000000-0000-4000-8000-000000000001'
    expect(
      memorySchema.safeParse({ ...empty, imageIds: [image, image] }).success,
    ).toBe(false)
    expect(
      memorySchema.safeParse({ ...empty, imageIds: Array(10).fill(image) })
        .success,
    ).toBe(false)
    expect(
      memorySchema.safeParse({ ...empty, content: '🌟'.repeat(5000) }).success,
    ).toBe(true)
    expect(
      memorySchema.safeParse({ ...empty, content: '🌟'.repeat(5001) }).success,
    ).toBe(false)
  })
})
