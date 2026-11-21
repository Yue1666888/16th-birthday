import { emailLabels, attendanceLabels } from '@/domain/status'
import type { Attendance, EmailStatus } from '@/domain/api.types'
export function StatusBadge({ status }: { status: Attendance | EmailStatus }) {
  const label =
    status in emailLabels
      ? emailLabels[status as EmailStatus]
      : attendanceLabels[status as Attendance]
  const kind =
    {
      SUCCESS: 'success',
      PENDING: 'pending',
      FAILED: 'failed',
      ATTENDING: 'attend',
    }[status as 'SUCCESS' | 'PENDING' | 'FAILED' | 'ATTENDING'] || ''
  return <span className={'pill ' + kind}>{label || status}</span>
}
