import { z } from 'zod'
export const invitationEditableFields = {
  name: z
    .string()
    .trim()
    .min(1, '请填写姓名')
    .refine((value) => [...value].length <= 50, '姓名不能超过50字'),
  email: z.string().trim().email('请填写有效邮箱').max(254, '邮箱过长'),
  attendance: z.enum(['ATTENDING', 'NOT_ATTENDING']),
  giftChoice: z.enum(['NONE', 'PICKUP', 'MAIL']),
  mailingAddress: z
    .string()
    .trim()
    .refine((value) => [...value].length <= 500, '地址不能超过500字'),
}
export function refineInvitation(
  value: { attendance: string; giftChoice: string; mailingAddress: string },
  context: z.RefinementCtx,
) {
  if (value.attendance === 'NOT_ATTENDING' && value.giftChoice === 'PICKUP')
    context.addIssue({
      code: 'custom',
      path: ['giftChoice'],
      message: '不到场时不能选择到场领取',
    })
  if (value.giftChoice === 'MAIL' && !value.mailingAddress)
    context.addIssue({
      code: 'custom',
      path: ['mailingAddress'],
      message: '请填写邮寄地址',
    })
}
