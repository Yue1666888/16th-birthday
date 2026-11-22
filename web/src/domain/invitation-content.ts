import { publicAsset } from '@/lib/public-asset'
import source from '@/content/invitation-template.txt?raw'

export function parseInvitationTemplate(text: string) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .split('\n')
  const subject =
    lines
      .shift()
      ?.replace(/^主题\s*[:：]\s*/, '')
      .trim() || ''
  const textBody = lines.join('\n').trim()
  const date = textBody.match(/时间\s*[:：]\s*(\d{4})年(\d{1,2})月(\d{1,2})日/)
  const venue = textBody.match(/地点\s*[:：]\s*([^\n]+)/)?.[1].trim()
  if (!subject || !date || !venue)
    throw new Error('邀请函模板缺少主题、日期或地点')
  return {
    subject,
    textBody,
    venue,
    dateLabel: `${date[1]}年${date[2]}月${date[3]}日`,
    dateISO: `${date[1]}-${date[2].padStart(2, '0')}-${date[3].padStart(2, '0')}`,
  }
}
export const invitationContent = parseInvitationTemplate(source)
export const invitationPoster = publicAsset('/invitation/invitation-16th.webp')
export const invitationOriginal = publicAsset('/invitation/invitation-16th.png')
export function createInvitationMailPreset(name?: string) {
  return {
    subject: invitationContent.subject,
    textBody:
      name === undefined
        ? invitationContent.textBody
        : invitationContent.textBody.replace(/\{\{name\}\}/g, () => name),
  }
}
