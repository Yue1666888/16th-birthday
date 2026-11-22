import { describe, expect, it } from 'vitest'
import {
  createInvitationMailPreset,
  invitationContent,
  parseInvitationTemplate,
} from '../src/domain/invitation-content'

describe('supplied invitation content', () => {
  it('keeps the supplied subject and event details as a shared source', () => {
    expect(invitationContent.subject).toBe('山海几重，今盼汝归')
    expect(invitationContent.dateISO).toBe('2026-12-19')
    expect(invitationContent.dateLabel).toBe('2026年12月19日')
    expect(invitationContent.venue).toBe('天津理工大学7号教学楼115室')
    expect(invitationContent.textBody).toContain(
      '程序有始终，热爱无穷期；代码可重构，回忆日日新。',
    )
  })
  it('keeps the bulk placeholder and replaces a single recipient in one pass', () => {
    expect(createInvitationMailPreset().textBody).toContain(
      '{{name}}，好久不见！',
    )
    const single = createInvitationMailPreset('王同学{{id}}')
    expect(single.subject).toBe(invitationContent.subject)
    expect(single.textBody).toContain('王同学{{id}}，好久不见！')
    expect(single.textBody).not.toContain('{{name}}')
  })
  it('handles Windows line endings and rejects a template missing event details', () => {
    expect(
      parseInvitationTemplate(
        '\uFEFF主题：邀请\r\n\r\n时间：2026年12月19日\r\n地点：115室',
      ).venue,
    ).toBe('115室')
    expect(() => parseInvitationTemplate('主题：缺少活动信息')).toThrow()
  })
})
