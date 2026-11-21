import { describe, it, expect } from 'vitest'
import { invitationSchema } from '../src/pages/admin/invitations/schemas/invitation.schema'
import { honorSchema } from '../src/pages/admin/honors/schemas/honor.schema'
import {
  createMailSchema,
  validateVariables,
} from '../src/pages/admin/mail/schemas/mail.schema'
import { appendLogEntries } from '../src/pages/admin/logs/utils/log-buffer'
describe('cross-field forms', () => {
  const base = {
    name: '张三',
    email: 'test@example.com',
    attendance: 'ATTENDING',
    giftChoice: 'NONE',
    mailingAddress: '',
  }
  it('does not accept pickup when absent or empty mailing address', () => {
    expect(
      invitationSchema.safeParse({
        ...base,
        attendance: 'NOT_ATTENDING',
        giftChoice: 'PICKUP',
      }).success,
    ).toBe(false)
    expect(
      invitationSchema.safeParse({ ...base, giftChoice: 'MAIL' }).success,
    ).toBe(false)
  })
  it('keeps Unicode name lengths aligned with server', () => {
    expect(
      invitationSchema.safeParse({ ...base, name: '😀'.repeat(50) }).success,
    ).toBe(true)
    expect(
      invitationSchema.safeParse({ ...base, name: '😀'.repeat(51) }).success,
    ).toBe(false)
  })
  it('requires people and one to nine unique honor image IDs', () => {
    expect(
      honorSchema.safeParse({ title: '荣誉', people: '', imageIds: [] })
        .success,
    ).toBe(false)
    expect(
      honorSchema.safeParse({
        title: '荣誉',
        people: '成员',
        imageIds: [
          '10000000-0000-4000-8000-000000000001',
          '10000000-0000-4000-8000-000000000001',
        ],
      }).success,
    ).toBe(false)
  })
})
describe('mail schema', () => {
  it('allows only known complete bulk placeholders', () => {
    expect(validateVariables('{{name}} {{giftChoice}}')).toBeNull()
    expect(validateVariables('{{unknown}}')).toContain('未知变量')
    expect(validateVariables('{{name')).toContain('不完整')
  })
  it('keeps single custom text literal', () => {
    expect(
      createMailSchema(false).safeParse({
        subject: '主题',
        textBody: '{{literal}}',
      }).success,
    ).toBe(true)
    expect(
      createMailSchema(true).safeParse({
        subject: '主题',
        textBody: '{{literal}}',
      }).success,
    ).toBe(false)
  })
})
describe('log ring buffer', () => {
  it('deduplicates stable cursor entries and bounds count', () => {
    const a = { id: '1', level: 'INFO', text: '中文' }
    const result = appendLogEntries(
      [a],
      [a, { ...a, id: '2' }, { ...a, id: '3' }],
      2,
    )
    expect(result.entries.map((e) => e.id)).toEqual(['2', '3'])
    expect(result.truncated).toBe(true)
  })
  it('bounds UTF-8 bytes rather than UTF-16 string length', () => {
    const result = appendLogEntries(
      [],
      [
        { id: '1', level: 'INFO', text: '中文' },
        { id: '2', level: 'INFO', text: '字' },
      ],
      2000,
      4,
    )
    expect(result.entries.map((e) => e.id)).toEqual(['2'])
  })
})
