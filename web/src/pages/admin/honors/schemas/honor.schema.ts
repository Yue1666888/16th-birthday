import { z } from 'zod'
export const honorSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '请填写荣誉标题')
    .refine((v) => [...v].length <= 100, '标题不能超过100字'),
  people: z
    .string()
    .trim()
    .min(1, '请填写人员')
    .refine((v) => [...v].length <= 200, '人员不能超过200字'),
  imageIds: z
    .array(z.string().uuid())
    .min(1, '请上传至少一张图片')
    .max(9, '最多上传9张图片')
    .refine((v) => new Set(v).size === v.length, '图片不能重复'),
})
export type HonorForm = z.infer<typeof honorSchema>
