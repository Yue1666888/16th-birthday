import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Panel } from '@/components/common/Panel'
import { ErrorBanner } from '@/components/common/AsyncState'
import { invitationsApi } from '@/api/admin/invitations.api'
import { invitationSchema } from '../schemas/invitation.schema'
import type { InvitationForm } from '../schemas/invitation.schema'
import type { Invitation } from '@/domain/api.types'
import { useDiscardGuard } from '@/hooks/use-discard-guard'
import { AppApiError } from '@/lib/api-error'
import { toast } from 'sonner'
export function InvitationEditor({
  row,
  onClose,
  onSaved,
}: {
  row: Invitation
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<InvitationForm>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      name: row.name,
      email: row.email,
      attendance: row.attendance,
      giftChoice: row.giftChoice,
      mailingAddress: row.mailingAddress || '',
    },
  })
  const [error, setError] = useState<unknown>(null),
    [requestId] = useState(() => crypto.randomUUID())
  const { errors, isDirty, isSubmitting, dirtyFields } = form.formState
  const values = useWatch({ control: form.control }),
    guard = useDiscardGuard(isDirty, onClose)
  const submit = form.handleSubmit(async (value) => {
    setError(null)
    const changes: Record<string, unknown> = {
      requestId,
      expectedVersion: row.version,
    }
    for (const field of ['name', 'email', 'attendance', 'giftChoice'] as const)
      if (dirtyFields[field]) changes[field] = value[field]
    if (dirtyFields.mailingAddress || dirtyFields.giftChoice)
      changes.mailingAddress =
        value.giftChoice === 'MAIL' ? value.mailingAddress : null
    if (Object.keys(changes).length === 2) {
      onClose()
      return
    }
    try {
      await invitationsApi.update(row.id, changes)
      form.reset(value)
      toast.success('报名回执已保存，未自动发送邮件')
      onSaved()
      onClose()
    } catch (e) {
      setError(e)
      if (e instanceof AppApiError)
        for (const field of [
          'name',
          'email',
          'attendance',
          'giftChoice',
          'mailingAddress',
        ] as const)
          if (e.fields[field])
            form.setError(field, { message: e.fields[field] })
    }
  })
  const fieldError = (name: keyof InvitationForm) =>
    errors[name]?.message && (
      <span className="field-error">{errors[name]?.message}</span>
    )
  return (
    <>
      <Panel
        title="修改报名回执"
        description={'回执 #' + row.id + ' · 保存不会自动发送邮件'}
        open
        onClose={guard.requestClose}
        drawer
        footer={
          <>
            <span className="foot-note">带 * 的字段为必填项</span>
            <button
              className="btn"
              disabled={isSubmitting}
              onClick={guard.requestClose}
            >
              取消
            </button>
            <button
              className="btn primary"
              form="invitation-edit"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? '保存中' : '保存'}
            </button>
          </>
        }
      >
        <ErrorBanner error={error} />
        <form id="invitation-edit" onSubmit={submit} noValidate>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="edit-name">
                姓名<span className="required">*</span>
              </label>
              <input
                id="edit-name"
                {...form.register('name')}
                aria-invalid={Boolean(errors.name)}
              />
              {fieldError('name')}
            </div>
            <div className="form-field">
              <label htmlFor="edit-phone">手机号</label>
              <input id="edit-phone" value={row.phone} disabled />
              <span className="help">手机号用于识别回执，不支持在此修改。</span>
            </div>
            <div className="form-field full">
              <label htmlFor="edit-email">
                邮箱<span className="required">*</span>
              </label>
              <input
                id="edit-email"
                {...form.register('email')}
                aria-invalid={Boolean(errors.email)}
              />
              {fieldError('email')}
            </div>
            <div className="form-field full">
              <label htmlFor="edit-attendance">
                是否到场<span className="required">*</span>
              </label>
              <select
                id="edit-attendance"
                {...form.register('attendance', {
                  onChange: (e) => {
                    if (
                      e.target.value === 'NOT_ATTENDING' &&
                      form.getValues('giftChoice') === 'PICKUP'
                    )
                      form.setValue('giftChoice', 'NONE', {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                  },
                })}
              >
                <option value="ATTENDING">到场</option>
                <option value="NOT_ATTENDING">不到场</option>
              </select>
              {fieldError('attendance')}
            </div>
            <div className="form-field full">
              <label htmlFor="edit-gift">
                礼物领取方式<span className="required">*</span>
              </label>
              <select id="edit-gift" {...form.register('giftChoice')}>
                {values.attendance === 'ATTENDING' && (
                  <option value="PICKUP">到场领取</option>
                )}
                <option value="MAIL">邮寄</option>
                <option value="NONE">不领取</option>
              </select>
              {fieldError('giftChoice')}
            </div>
            {values.giftChoice === 'MAIL' && (
              <div className="form-field full">
                <label htmlFor="edit-address">
                  邮寄地址<span className="required">*</span>
                </label>
                <textarea
                  id="edit-address"
                  {...form.register('mailingAddress')}
                  aria-invalid={Boolean(errors.mailingAddress)}
                />
                {fieldError('mailingAddress')}
              </div>
            )}
          </div>
          <div className="note warning" style={{ marginTop: 24 }}>
            修改回执后，请前往邮件管理重新核对内容，再手动确认发送。
          </div>
        </form>
      </Panel>
      {guard.confirmation}
    </>
  )
}
