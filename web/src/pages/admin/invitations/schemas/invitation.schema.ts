import { z } from 'zod'
export const invitationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, '请填写姓名')
      .refine((v) => [...v].length <= 50, '姓名不能超过50字'),
    email: z.string().trim().email('请填写有效邮箱').max(254, '邮箱过长'),
    attendance: z.enum(['ATTENDING', 'NOT_ATTENDING']),
    giftChoice: z.enum(['NONE', 'PICKUP', 'MAIL']),
    mailingAddress: z
      .string()
      .trim()
      .refine((v) => [...v].length <= 500, '地址不能超过500字'),
  })
  .superRefine((v, ctx) => {
    if (v.attendance === 'NOT_ATTENDING' && v.giftChoice === 'PICKUP')
      ctx.addIssue({
        code: 'custom',
        path: ['giftChoice'],
        message: '不到场时不能选择到场领取',
      })
    if (v.giftChoice === 'MAIL' && !v.mailingAddress)
      ctx.addIssue({
        code: 'custom',
        path: ['mailingAddress'],
        message: '请填写邮寄地址',
      })
  })
export type InvitationForm = z.infer<typeof invitationSchema>
