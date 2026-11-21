import type { Attendance, GiftChoice, EmailStatus } from './api.types'
export const attendanceLabels: Record<Attendance, string> = {
  ATTENDING: '到场',
  NOT_ATTENDING: '不到场',
}
export const giftLabels: Record<GiftChoice, string> = {
  NONE: '不领取',
  PICKUP: '到场领取',
  MAIL: '邮寄',
}
export const emailLabels: Record<EmailStatus, string> = {
  NOT_SENT: '未发送',
  PENDING: '处理中',
  SUCCESS: '发送成功',
  FAILED: '发送失败',
  DISABLED: '已禁用',
}
