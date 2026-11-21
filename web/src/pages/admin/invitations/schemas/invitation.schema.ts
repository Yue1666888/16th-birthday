import { z } from 'zod'
import {
  invitationEditableFields,
  refineInvitation,
} from '@/features/invitations/invitation.rules'
export const invitationSchema = z
  .object(invitationEditableFields)
  .superRefine(refineInvitation)
export type InvitationForm = z.infer<typeof invitationSchema>
