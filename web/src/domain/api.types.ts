export interface ApiResponse<T> {
  code: string
  message: string
  data: T
  fieldErrors: Record<string, string>
  traceId: string
}
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
export type Attendance = 'ATTENDING' | 'NOT_ATTENDING'
export type GiftChoice = 'NONE' | 'PICKUP' | 'MAIL'
export type EmailStatus =
  'NOT_SENT' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'DISABLED'
export interface Invitation {
  id: string
  name: string
  phone: string
  email: string
  attendance: Attendance
  giftChoice: GiftChoice
  mailingAddress: string | null
  version: string
  createdAt: string
  updatedAt: string
  emailNotifyStatus: EmailStatus
  emailNotifiedAt: string | null
}
export interface InvitationStats {
  total: number
  attendance: { attending: number; notAttending: number }
  gifts: { none: number; pickup: number; mail: number }
  email: {
    notSent: number
    pending: number
    success: number
    failed: number
    disabled: number
  }
}
export interface ImageItem {
  id: string
  url: string
  width: number | null
  height: number | null
}
export interface Honor {
  id: string
  title: string
  people: string
  images: ImageItem[]
  version: string
  createdAt: string
  updatedAt: string
}
export interface AdminMemory {
  id: string
  displayName: string | null
  title: string | null
  content: string | null
  images: ImageItem[]
  version: string
  publishedAt: string
  updatedAt: string
  source: 'VISITOR' | 'ADMIN'
}
export interface RecipientQuery {
  keyword?: string
  attendance?: string
  giftChoice?: string
  emailNotifyStatus?: string
}
export interface Recipient {
  invitationId: string
  expectedVersion: string
  name: string
  recipientEmail: string
  attendance: Attendance
  giftChoice: GiftChoice
}
export interface MailMessage {
  recipient: Recipient
  subject: string
  textBody: string
}
export interface MailPreview {
  id: string
  mode: 'SINGLE' | 'BULK'
  previewHash: string
  expiresAt: string
  emailEnabled: boolean
  recipientCount: number
  messages: MailMessage[]
}
export interface MailBatch {
  id: string
  mode: 'SINGLE' | 'BULK'
  recipientCount: number
  counts: Record<EmailStatus, number>
  confirmedAt: string
}
export interface EmailNotification {
  id: string
  invitationId: string
  invitationVersion: string
  sendNo: number
  requestId: string
  recipientEmail: string
  subject: string
  textBody: string
  htmlBody: string | null
  emailNotifyStatus: EmailStatus
  taskStatus: string
  remoteMailId: string | null
  remoteStatus: string | null
  confirmedBySub: string
  confirmedByName: string | null
  confirmedAt: string
  acceptedAt: string | null
  sentAt: string | null
  submitAttempts: number
  smtpAttempts: number | null
  nextCheckAt: string | null
  lastErrorCode: string | null
  lastErrorMessage: string | null
  createdAt: string
  updatedAt: string
}
export interface MailHistory {
  notification: EmailNotification
  recipientName: string
  mode: 'SINGLE' | 'BULK' | 'LEGACY'
  batchId: string | null
}
export interface LogEntry {
  id: string
  level: string
  text: string
}
export interface LogChunk {
  entries: LogEntry[]
  nextCursor: string
  rotated: boolean
  truncated: boolean
  source: string
}
