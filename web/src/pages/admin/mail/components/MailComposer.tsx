import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useAdminStore } from '@/store/admin/use-admin-store'
import { mailApi } from '@/api/admin/mail.api'
import { ErrorBanner } from '@/components/common/AsyncState'
import { AppApiError } from '@/lib/api-error'
import { createMailSchema } from '../schemas/mail.schema'
import type { MailForm } from '../schemas/mail.schema'
import type { Invitation, MailPreview } from '@/domain/api.types'
import { attendanceLabels } from '@/domain/status'
import { createInvitationMailPreset } from '@/domain/invitation-content'
export function MailComposer({
  mode,
  recipient,
  selectedIds,
  selectionId,
  onPreview,
}: {
  mode: 'SINGLE' | 'BULK'
  recipient: Invitation | null
  selectedIds: string[]
  selectionId: string | null
  onPreview: (preview: MailPreview) => void
}) {
  const key = mode === 'BULK' ? 'bulk' : 'single:' + recipient?.id
  const saved = useAdminStore((s) => s.mailDrafts[key]),
    saveDraft = useAdminStore((s) => s.saveMailDraft)
  const [initial] = useState(
    () =>
      saved ||
      createInvitationMailPreset(
        mode === 'BULK' ? undefined : recipient?.name || '',
      ),
  )
  const form = useForm<MailForm>({
      resolver: zodResolver(createMailSchema(mode === 'BULK')),
      defaultValues: initial,
    }),
    [error, setError] = useState<unknown>(null),
    [stored, setStored] = useState(true)
  const [subject, textBody] = useWatch({
    control: form.control,
    name: ['subject', 'textBody'],
  })
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setStored(
          saveDraft(key, { subject: subject || '', textBody: textBody || '' }),
        ),
      400,
    )
    return () => {
      clearTimeout(timer)
      saveDraft(key, { subject: subject || '', textBody: textBody || '' })
    }
  }, [subject, textBody, key, saveDraft])
  const active = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const count = mode === 'BULK' ? selectedIds.length : recipient ? 1 : 0,
    { errors, isSubmitting } = form.formState
  const submit = form.handleSubmit(async (values) => {
    setError(null)
    saveDraft(key, values)
    try {
      const preview = await mailApi.preview({
        ...values,
        mode,
        ...(mode === 'BULK' && selectionId
          ? { selectionId }
          : {
              recipientIds:
                mode === 'BULK' ? selectedIds : recipient ? [recipient.id] : [],
            }),
      })
      onPreview(preview)
    } catch (e) {
      setError(e)
      if (e instanceof AppApiError)
        for (const name of ['subject', 'textBody'] as const)
          if (e.fields[name]) form.setError(name, { message: e.fields[name] })
    }
  })
  function insert(variable: string) {
    const element = active.current || document.getElementById('compose-body')
    if (!(
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ))
      return
    const name = element.id === 'compose-subject' ? 'subject' : 'textBody',
      value = form.getValues(name),
      start = element.selectionStart ?? value.length,
      end = element.selectionEnd ?? start,
      token = '{{' + variable + '}}'
    if (
      value.length - end + start + token.length >
      (name === 'subject' ? 200 : 10000)
    ) {
      toast.error('当前字段已达到长度上限')
      return
    }
    form.setValue(name, value.slice(0, start) + token + value.slice(end), {
      shouldDirty: true,
      shouldValidate: true,
    })
    queueMicrotask(() => {
      element.focus()
      element.setSelectionRange(start + token.length, start + token.length)
    })
  }
  return (
    <section className="mail-compose">
      <div className="mail-panel-title">
        <span>{mode === 'BULK' ? '编辑群发模板' : '编辑专属邮件'}</span>
        <span className="help">
          {stored ? '草稿保存在本机当前会话' : '草稿暂存失败，请复制内容'}
        </span>
      </div>
      <div className="mail-context">
        {mode === 'SINGLE' && recipient ? (
          <>
            <span className="person-icon">{recipient.name.slice(0, 1)}</span>
            <div className="context-copy">
              <strong>{recipient.name}</strong>
              <small>{recipient.email}</small>
            </div>
            <span className="pill">
              {attendanceLabels[recipient.attendance]}
            </span>
          </>
        ) : (
          <div className="context-copy">
            <strong>已选择 {count} 位报名者</strong>
            <small>
              {selectionId
                ? '已冻结筛选结果，确认前仍会检查资料版本。'
                : '在左侧勾选报名者，或选择全部筛选结果。'}
            </small>
          </div>
        )}
      </div>
      <form id="mail-compose" onSubmit={submit} noValidate>
        <div className="compose-body">
          <ErrorBanner error={error} />
          <div className="form-field">
            <label className="editor-label" htmlFor="compose-subject">
              <span>
                邮件主题<span className="required">*</span>
              </span>
              <span className="help">{subject?.length || 0} / 200</span>
            </label>
            <input
              id="compose-subject"
              {...form.register('subject')}
              maxLength={200}
              onFocus={(e) => (active.current = e.currentTarget)}
            />
            {errors.subject && (
              <span className="field-error">{errors.subject.message}</span>
            )}
          </div>
          {mode === 'BULK' && (
            <div className="variable-box">
              <p>点击插入变量，服务端会为每位报名者生成专属邮件。</p>
              <div className="variable-chips">
                {[
                  { key: 'name', label: '姓名' },
                  { key: 'attendance', label: '是否到场' },
                  { key: 'giftChoice', label: '礼物方式' },
                  { key: 'id', label: '回执编号' },
                ].map((v) => (
                  <button
                    type="button"
                    className="variable-chip"
                    key={v.key}
                    onClick={() => insert(v.key)}
                  >
                    {v.label}
                    <code>{'{{' + v.key + '}}'}</code>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="form-field">
            <label className="editor-label" htmlFor="compose-body">
              <span>
                邮件正文<span className="required">*</span>
              </span>
              <span className="help">{textBody?.length || 0} 字</span>
            </label>
            <textarea
              id="compose-body"
              {...form.register('textBody')}
              maxLength={10000}
              onFocus={(e) => (active.current = e.currentTarget)}
            />
            {errors.textBody && (
              <span className="field-error">{errors.textBody.message}</span>
            )}
          </div>
        </div>
        <div className="note compose-alert">
          {mode === 'BULK'
            ? '每人单独生成一封邮件，不会暴露其他人的邮箱。发送前可逐人预览替换结果。'
            : '内容可逐人定制。切换报名者前会保留当前草稿；保存草稿不发送邮件。'}
        </div>
        <div className="compose-foot">
          <span className="help">
            {mode === 'BULK'
              ? '将分别生成 ' + count + ' 封邮件'
              : '发送给 ' + count + ' 位报名者'}
          </span>
          <div className="compose-actions">
            <button
              className="btn"
              type="button"
              onClick={() => {
                const values = createInvitationMailPreset(
                  mode === 'BULK' ? undefined : recipient?.name || '',
                )
                form.reset(values)
                setStored(saveDraft(key, values))
                toast.success('已载入邀请函模板，可继续编辑')
              }}
            >
              载入邀请函模板
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setStored(saveDraft(key, form.getValues()))
                toast.success('草稿已保存')
              }}
            >
              保存草稿
            </button>
            <button
              className="btn primary"
              disabled={!count || isSubmitting}
              type="submit"
            >
              <Mail />
              {isSubmitting ? '生成预览' : '预览并确认'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
