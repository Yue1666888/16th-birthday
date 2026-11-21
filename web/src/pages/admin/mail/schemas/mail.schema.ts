import { z } from 'zod'
const variables = new Set(['name', 'attendance', 'giftChoice', 'id'])
export function validateVariables(text: string) {
  const token = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*}}/g
  const residue = text.replace(token, '')
  if (residue.includes('{{') || residue.includes('}}'))
    return '模板变量格式不完整'
  for (const match of text.matchAll(token))
    if (!variables.has(match[1])) return '未知变量：' + match[1]
  return null
}
export function createMailSchema(bulk: boolean) {
  return z
    .object({
      subject: z
        .string()
        .trim()
        .min(1, '请填写邮件主题')
        .refine((v) => [...v].length <= 200, '主题不能超过200字'),
      textBody: z
        .string()
        .trim()
        .min(1, '请填写邮件正文')
        .refine((v) => [...v].length <= 10000, '正文不能超过10000字'),
    })
    .superRefine((value, ctx) => {
      if (bulk)
        for (const field of ['subject', 'textBody'] as const) {
          const message = validateVariables(value[field])
          if (message) ctx.addIssue({ code: 'custom', path: [field], message })
        }
    })
}
export type MailForm = z.infer<ReturnType<typeof createMailSchema>>
