import type { ReactNode } from 'react'
import { errorMessage } from '@/lib/api-error'
export function ErrorBanner({ error }: { error: unknown }) {
  return error ? (
    <div className="error-banner" role="alert">
      {errorMessage(error)}
    </div>
  ) : null
}
export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>
}
