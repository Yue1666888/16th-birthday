import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { useResource } from '@/hooks/use-resource'
import { getMemoryNames } from '@/api/public/walls.api'
import { InvitationHero } from '@/features/visitor/invitation/InvitationHero'
import { useReplyForm } from '@/features/visitor/invitation/forms/use-reply-form'
import { useContributionForm } from '@/features/visitor/invitation/forms/use-contribution-form'
import { ReplyForm } from '@/features/visitor/invitation/forms/ReplyForm'
import { ContributionForm } from '@/features/visitor/invitation/forms/ContributionForm'
import { useInvitationGuard } from '@/features/visitor/invitation/use-invitation-guard'
import '@/styles/invitation.css'
export function InvitationPage() {
  const [params] = useSearchParams()
  const preview = import.meta.env.DEV && params.get('preview') === '1'
  const load = useCallback(
    async (signal: AbortSignal) =>
      preview && import.meta.env.DEV
        ? (await import('@/dev/wall-preview')).getPreviewMemoryNames()
        : getMemoryNames(signal),
    [preview],
  )
  const names = useResource(load),
    reply = useReplyForm(),
    memory = useContributionForm(names.reload)
  const confirmation = useInvitationGuard(reply.dirty || memory.dirty)
  return (
    <div className="invitation-page">
      <InvitationHero
        names={names.data?.names.map((item) => item.name) || []}
        namesError={!!names.error}
        reloadNames={names.reload}
      />
      <div className="invitation-forms">
        <ReplyForm controller={reply} />
        <ContributionForm controller={memory} />
      </div>
      {confirmation}
    </div>
  )
}
