import { z } from 'zod'
import {
  invitationEditableFields,
  refineInvitation,
} from '@/features/invitations/invitation.rules'
const uuid = z.string().uuid()
export const replyDraftSchema = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  attendance: z.enum(['ATTENDING', 'NOT_ATTENDING']),
  giftChoice: z.enum(['NONE', 'PICKUP', 'MAIL']),
  mailingAddress: z.string(),
})
export const replySchema = z
  .object({
    ...invitationEditableFields,
    phone: z
      .string()
      .trim()
      .regex(/^1[3-9][0-9]{9}$/, '请输入11位大陆手机号'),
  })
  .superRefine(refineInvitation)
export type ReplyFormValues = z.infer<typeof replySchema>
export const emptyReply: ReplyFormValues = {
  name: '',
  phone: '',
  email: '',
  attendance: 'ATTENDING',
  giftChoice: 'PICKUP',
  mailingAddress: '',
}
export const memoryDraftSchema = z.object({
  displayName: z.string(),
  title: z.string(),
  content: z.string(),
  imageIds: z.array(uuid).max(9),
})
const optionalText = (limit: number, message: string) =>
  z
    .string()
    .trim()
    .refine((value) => [...value].length <= limit, message)
export const contributionSchema = z
  .object({
    displayName: optionalText(50, '姓名不能超过50字'),
    title: optionalText(100, '标题不能超过100字'),
    content: optionalText(5000, '正文不能超过5000字'),
    imageIds: z.array(uuid).max(9, '最多上传9张图片'),
  })
  .superRefine((value, context) => {
    if (!value.content && !value.imageIds.length)
      context.addIssue({
        code: 'custom',
        path: ['content'],
        message: '正文和图片至少填写一项',
      })
  })
export type ContributionFormValues = z.infer<typeof contributionSchema>
export const emptyContribution: ContributionFormValues = {
  displayName: '',
  title: '',
  content: '',
  imageIds: [],
}
export const memoryPayloadSchema = z.object({
  submissionId: uuid,
  displayName: z.string().nullable(),
  title: z.string().nullable(),
  content: z.string().nullable(),
  imageIds: z.array(uuid).max(9),
})
export type MemoryPayload = z.infer<typeof memoryPayloadSchema>
export const storedImageSchema = z.object({
  id: uuid,
  url: z.string().max(3000),
  width: z.number().nullable(),
  height: z.number().nullable(),
})
export const storedMemorySchema = z.object({
  fields: memoryDraftSchema,
  images: z.array(storedImageSchema).max(9),
  attempt: memoryPayloadSchema.nullable(),
})
export type StoredMemory = z.infer<typeof storedMemorySchema>
