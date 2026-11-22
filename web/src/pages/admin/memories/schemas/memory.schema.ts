import { z } from 'zod'
export const memorySchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .refine((v) => [...v].length <= 50, '姓名不能超过50字'),
    title: z
      .string()
      .trim()
      .refine((v) => [...v].length <= 100, '标题不能超过100字'),
    content: z
      .string()
      .trim()
      .refine((v) => [...v].length <= 5000, '正文不能超过5000字'),
    imageIds: z
      .array(z.string().uuid())
      .max(9, '最多上传9张图片')
      .refine((v) => new Set(v).size === v.length, '图片不能重复'),
  })
  .superRefine((value, context) => {
    if (!value.content && !value.imageIds.length)
      context.addIssue({
        code: 'custom',
        path: ['content'],
        message: '正文和图片至少填写一项',
      })
  })
export type MemoryForm = z.infer<typeof memorySchema>
