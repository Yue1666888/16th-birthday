import { afterEach, expect, test, vi } from 'vitest'
import {
  replySchema,
  contributionSchema,
  memoryPayloadSchema,
  emptyReply,
  emptyContribution,
} from '@/features/visitor/invitation/forms/schemas'
import { newSubmissionId } from '@/features/visitor/invitation/forms/drafts'
afterEach(() => vi.unstubAllGlobals())
test('reply requires mainland phone and conditional address, rejecting pickup for absentees', () => {
  const good = {
    ...emptyReply,
    name: ' 回来的同学 ',
    phone: '13800138000',
    email: 'person@example.com',
  }
  expect(replySchema.parse(good).name).toBe('回来的同学')
  expect(
    replySchema.safeParse({ ...good, phone: '+8613800138000' }).success,
  ).toBe(false)
  expect(
    replySchema.safeParse({
      ...good,
      attendance: 'NOT_ATTENDING',
      giftChoice: 'PICKUP',
    }).success,
  ).toBe(false)
  expect(
    replySchema.safeParse({ ...good, giftChoice: 'MAIL', mailingAddress: ' ' })
      .success,
  ).toBe(false)
  expect(
    replySchema.safeParse({
      ...good,
      giftChoice: 'MAIL',
      mailingAddress: '天津市某地址',
    }).success,
  ).toBe(true)
})
test('contribution supports anonymous text or image-only and counts Unicode characters', () => {
  expect(contributionSchema.safeParse(emptyContribution).success).toBe(false)
  expect(
    contributionSchema.safeParse({ ...emptyContribution, title: '仅标题' })
      .success,
  ).toBe(false)
  expect(
    contributionSchema.parse({ ...emptyContribution, content: '  一段回忆  ' })
      .content,
  ).toBe('一段回忆')
  expect(
    contributionSchema.safeParse({
      ...emptyContribution,
      imageIds: [newSubmissionId()],
    }).success,
  ).toBe(true)
  expect(
    contributionSchema.safeParse({
      ...emptyContribution,
      content: '记忆',
      displayName: '🎂'.repeat(50),
    }).success,
  ).toBe(true)
  expect(
    contributionSchema.safeParse({
      ...emptyContribution,
      content: '记忆',
      displayName: '🎂'.repeat(51),
    }).success,
  ).toBe(false)
  expect(
    contributionSchema.safeParse({
      ...emptyContribution,
      imageIds: Array.from({ length: 10 }, newSubmissionId),
    }).success,
  ).toBe(false)
})
test('LAN submission UUIDs work without crypto.randomUUID and frozen snapshots remain serializable', () => {
  const random = globalThis.crypto.getRandomValues.bind(globalThis.crypto)
  vi.stubGlobal('crypto', { getRandomValues: random })
  const id = newSubmissionId()
  expect(id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  )
  const payload = {
    submissionId: id,
    displayName: null,
    title: null,
    content: '回来看看',
    imageIds: [],
  }
  expect(
    memoryPayloadSchema.parse(JSON.parse(JSON.stringify(payload))),
  ).toEqual(payload)
  expect(newSubmissionId()).not.toBe(id)
})
