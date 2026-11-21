import { useEffect, useState } from 'react'
import { mailApi } from '@/api/admin/mail.api'
import { Panel } from '@/components/common/Panel'
import { ErrorBanner } from '@/components/common/AsyncState'
import type { MailPreview, MailBatch } from '@/domain/api.types'
export function MailPreviewDialog({
  preview,
  onClose,
  onRegistered,
}: {
  preview: MailPreview
  onClose: () => void
  onRegistered: (batch: MailBatch) => void
}) {
  const [index, setIndex] = useState(0),
    [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [requestId] = useState(() => crypto.randomUUID()),
    [expired, setExpired] = useState(
      () => Date.now() >= Date.parse(preview.expiresAt),
    )
  useEffect(() => {
    const timer = setTimeout(
      () => setExpired(true),
      Math.max(0, Date.parse(preview.expiresAt) - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [preview.expiresAt])
  const message = preview.messages[index]
  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      const batch = await mailApi.confirm({
        requestId,
        previewId: preview.id,
        previewHash: preview.previewHash,
      })
      onRegistered(batch)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Panel
      title={preview.mode === 'BULK' ? '群发预览与确认' : '单发预览与确认'}
      description="核对收件人、主题和正文后，再确认登记发送任务"
      open
      onClose={() => {
        if (!busy) onClose()
      }}
      footer={
        <>
          <button className="btn" disabled={busy} onClick={onClose}>
            返回
          </button>
          <button
            className="btn primary"
            disabled={!checked || busy || expired}
            onClick={() => void confirm()}
          >
            {busy ? '登记中' : '确认'}
          </button>
        </>
      }
    >
      <ErrorBanner error={error} />
      <div className="preview-picker">
        <label htmlFor="preview-recipient">预览收件人</label>
        <select
          id="preview-recipient"
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
        >
          {preview.messages.map((m, i) => (
            <option key={m.recipient.invitationId} value={i}>
              {m.recipient.name} · {m.recipient.recipientEmail}
            </option>
          ))}
        </select>
        <span className="preview-count">
          {index + 1} / {preview.recipientCount}
        </span>
      </div>
      <div className="mail-meta">
        <div>
          <label>收件人</label>
          <strong>{message?.recipient.recipientEmail}</strong>
        </div>
        <div>
          <label>主题</label>
          {message?.subject}
        </div>
      </div>
      <div className="mail-paper">{message?.textBody}</div>
      <div
        className={'note ' + (!preview.emailEnabled ? 'warning' : '')}
        style={{ marginTop: 18 }}
      >
        {preview.emailEnabled
          ? '确认后将为 ' +
            preview.recipientCount +
            ' 位报名者分别登记发送任务。任务登记不代表邮件已经投递成功。'
          : '本环境关闭了实际发送。确认后只保存禁用状态的邮件记录，不会实际发送。'}
      </div>
      <div className="recipients-overview">
        完整收件名单：{preview.messages.map((m) => m.recipient.name).join('、')}
      </div>
      {expired && (
        <div className="note warning" style={{ marginTop: 12 }}>
          预览已过期，请返回重新预览。
        </div>
      )}
      <label className="confirm-check">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        我已核对全部收件人、主题及邮件正文
      </label>
    </Panel>
  )
}
