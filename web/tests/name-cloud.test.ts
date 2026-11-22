import { expect, test } from 'vitest'
import {
  cloudFontSize,
  wrapCloudName,
} from '../src/pages/visitor/memories/components/name-cloud-layout'

test('name sizing honors contribution weight and bounds malformed weights', () => {
  expect(cloudFontSize(0.5, false)).toBeGreaterThan(cloudFontSize(0.1, false))
  expect(cloudFontSize(0, true)).toBeGreaterThanOrEqual(12)
  expect(cloudFontSize(-1, false)).toBe(cloudFontSize(0, false))
  expect(cloudFontSize(8, true)).toBe(cloudFontSize(1, true))
})
test('long Unicode names wrap without dropping or splitting characters', () => {
  const name = '归来的同学🌤张三'
  const lines = wrapCloudName(name, 3, (text) => Array.from(text).length)
  expect(lines.join('')).toBe(name)
  expect(lines.every((line) => Array.from(line).length <= 3)).toBeTruthy()
})
