import '@/styles/mail.css'
import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Mail, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { mailApi } from '@/api/admin/mail.api'
import { invitationsApi } from '@/api/admin/invitations.api'
import { useResource } from '@/hooks/use-resource'
import { PageHeading } from '@/components/common/PageHeading'
import { ErrorBanner, EmptyState } from '@/components/common/AsyncState'
import { Panel } from '@/components/common/Panel'
import { emailLabels } from '@/domain/status'
import { errorMessage } from '@/lib/api-error'
import type { RecipientQuery, MailPreview, MailBatch } from '@/domain/api.types'
import { MailComposer } from './components/MailComposer'
import { MailPreviewDialog } from './components/MailPreviewDialog'
import { MailHistorySheet } from './components/MailHistorySheet'
export function MailPage() {
  const [params, setParams] = useSearchParams(),
    mode = params.get('mode') === 'bulk' ? 'BULK' : 'SINGLE'
  const [keyword, setKeyword] = useState(''),
    [attendance, setAttendance] = useState(''),
    [gift, setGift] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<Set<string>>(() => new Set()),
    [selectionId, setSelectionId] = useState<string | null>(null),
    [selecting, setSelecting] = useState(false)
  const q = JSON.stringify({
      keyword: keyword.trim() || undefined,
      attendance: attendance || undefined,
      giftChoice: gift || undefined,
      emailNotifyStatus: status || undefined,
    }),
    data = useResource(
      useCallback(
        (signal: AbortSignal) =>
          mailApi.recipients(JSON.parse(q) as RecipientQuery, page, 20, signal),
        [q, page],
      ),
    )
  const id = params.get('recipientId') || data.data?.content[0]?.id,
    person = useResource(
      useCallback(
        () => (id ? invitationsApi.detail(id) : Promise.resolve(null)),
        [id],
      ),
    )
  const [preview, setPreview] = useState<MailPreview | null>(null),
    [result, setResult] = useState<MailBatch | null>(null),
    [history, setHistory] = useState<{
      invitationId?: string
      batchId?: string
    } | null>(() =>
      params.get('view') === 'history'
        ? { invitationId: params.get('recipientId') || undefined }
        : null,
    )
  const changeFilter = (setter: (value: string) => void, value: string) => {
    setter(value)
    setPage(1)
  }
  const chooseSingle = (recipientId: string) => {
    const next = new URLSearchParams(params)
    next.set('recipientId', recipientId)
    next.set('mode', 'single')
    next.delete('view')
    setParams(next)
  }
  async function selectFiltered() {
    setSelecting(true)
    try {
      const snapshot = await mailApi.select(JSON.parse(q) as RecipientQuery)
      const next = new Set([...selected, ...snapshot.recipientIds])
      if (next.size > 500) {
        toast.error('一次最多选择500位报名者，请分批发送')
        return
      }
      setSelected(next)
      setSelectionId(next.size === snapshot.recipientCount ? snapshot.id : null)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSelecting(false)
    }
  }
  const rows = data.data?.content || [],
    allPage = rows.length > 0 && rows.every((r) => selected.has(r.id))
  return (
    <>
      <PageHeading
        title="邮件管理"
        description="编辑内容、选择收件人，在确认后寄出每一份心意。"
      >
        <button className="btn" onClick={() => setHistory({})}>
          <Mail />
          发送记录
        </button>
      </PageHeading>
      <div className="mail-modebar">
        <div className="mail-modes" role="tablist" aria-label="邮件发送模式">
          {[
            ['SINGLE', '单发模式'],
            ['BULK', '群发模式'],
          ].map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={mode === value}
              className={'mail-mode ' + (mode === value ? 'active' : '')}
              onClick={() => {
                const next = new URLSearchParams(params)
                next.set('mode', value.toLowerCase())
                next.delete('view')
                setParams(next)
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="mail-mode-hint">
          {mode === 'BULK'
            ? '一份模板，为每位报名者生成专属内容'
            : '为每位报名者分别编辑邮件内容'}
        </span>
      </div>
      <div className="mail-workspace">
        <section className="mail-side">
          <div className="mail-panel-title">
            <span>选择报名者</span>
            <span className="count">{data.data?.totalElements ?? '—'}</span>
          </div>
          <div className="recipient-filters">
            <div className="input-wrap">
              <Search />
              <input
                value={keyword}
                onChange={(e) => changeFilter(setKeyword, e.target.value)}
                placeholder="搜索姓名、手机号或邮箱"
                aria-label="搜索收件人"
              />
            </div>
            <div className="recipient-filter-row">
              <select
                value={attendance}
                aria-label="到场状态筛选"
                onChange={(e) => changeFilter(setAttendance, e.target.value)}
              >
                <option value="">全部到场状态</option>
                <option value="ATTENDING">到场</option>
                <option value="NOT_ATTENDING">不到场</option>
              </select>
              <select
                value={gift}
                aria-label="领取方式筛选"
                onChange={(e) => changeFilter(setGift, e.target.value)}
              >
                <option value="">全部领取方式</option>
                <option value="PICKUP">到场领取</option>
                <option value="MAIL">邮寄</option>
                <option value="NONE">不领取</option>
              </select>
              <select
                className="recipient-status-filter"
                value={status}
                aria-label="邮件状态筛选"
                onChange={(e) => changeFilter(setStatus, e.target.value)}
              >
                <option value="">全部邮件状态</option>
                {Object.entries(emailLabels).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {mode === 'BULK' && (
            <div className="recipient-tools">
              <button
                disabled={selecting}
                onClick={() => void selectFiltered()}
              >
                {selecting ? '正在选择' : '选择全部筛选结果'}
              </button>
              <button
                onClick={() => {
                  setSelected(new Set())
                  setSelectionId(null)
                }}
              >
                清空已选
              </button>
            </div>
          )}
          <ErrorBanner error={data.error} />
          <div className="recipient-list">
            {data.loading && !data.data ? (
              <div className="loading-row">正在读取报名者…</div>
            ) : !rows.length ? (
              <EmptyState>没有匹配的报名者</EmptyState>
            ) : (
              rows.map((row) => {
                const content = (
                  <>
                    <span className="person-icon">{row.name.slice(0, 1)}</span>
                    <span className="recipient-copy">
                      <strong>{row.name}</strong>
                      <small>{row.email}</small>
                    </span>
                  </>
                )
                return mode === 'SINGLE' ? (
                  <button
                    className={'recipient ' + (row.id === id ? 'selected' : '')}
                    key={row.id}
                    onClick={() => chooseSingle(row.id)}
                  >
                    {content}
                    <span className="recipient-dot" />
                  </button>
                ) : (
                  <label
                    className={
                      'recipient ' + (selected.has(row.id) ? 'selected' : '')
                    }
                    key={row.id}
                  >
                    <input
                      type="checkbox"
                      aria-label={'选择' + row.name}
                      checked={selected.has(row.id)}
                      onChange={(e) => {
                        const next = new Set(selected)
                        if (e.target.checked) {
                          if (next.size >= 500) {
                            toast.error('最多选择500位报名者')
                            return
                          }
                          next.add(row.id)
                        } else next.delete(row.id)
                        setSelected(next)
                        setSelectionId(null)
                      }}
                    />
                    {content}
                  </label>
                )
              })
            )}
          </div>
          <div className="recipient-tools">
            <span>
              第 {page} / {Math.max(1, data.data?.totalPages || 0)} 页
              {mode === 'BULK' ? ' · 已选 ' + selected.size + ' 人' : ''}
            </span>
            <div className="button-row">
              <button
                aria-label="收件人上一页"
                disabled={page <= 1}
                onClick={() => setPage((v) => v - 1)}
              >
                <ChevronLeft size={13} />
              </button>
              <button
                aria-label="收件人下一页"
                disabled={page >= (data.data?.totalPages || 1)}
                onClick={() => setPage((v) => v + 1)}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
          {mode === 'BULK' && (
            <div className="help" style={{ padding: '0 17px 12px' }}>
              切换筛选保留已选人员。{allPage ? '本页已全部选中。' : ''}
            </div>
          )}
        </section>
        <div>
          <ErrorBanner error={person.error} />
          {mode === 'SINGLE' && (!person.data || person.data.id !== id) ? (
            <section className="mail-compose">
              <EmptyState>
                {person.loading ? '正在读取收件人…' : '请先选择一位报名者'}
              </EmptyState>
            </section>
          ) : (
            <MailComposer
              key={mode === 'BULK' ? 'bulk' : 'single:' + person.data?.id}
              mode={mode}
              recipient={person.data || null}
              selectedIds={[...selected]}
              selectionId={selectionId}
              onPreview={setPreview}
            />
          )}
        </div>
      </div>
      {preview && (
        <MailPreviewDialog
          preview={preview}
          onClose={() => setPreview(null)}
          onRegistered={(batch) => {
            setPreview(null)
            setResult(batch)
            data.reload()
            person.reload()
            if (mode === 'BULK') {
              setSelected(new Set())
              setSelectionId(null)
            }
          }}
        />
      )}
      {result && (
        <Panel
          title="发送任务已登记"
          description={
            '批次 #' + result.id + ' · ' + result.recipientCount + ' 位报名者'
          }
          open
          onClose={() => setResult(null)}
          footer={
            <>
              <button className="btn" onClick={() => setResult(null)}>
                完成
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setHistory({ batchId: result.id })
                  setResult(null)
                }}
              >
                记录
              </button>
            </>
          }
        >
          <div className="history-empty" style={{ padding: '25px 10px' }}>
            <Mail />
            <strong>{result.recipientCount} 封邮件已登记</strong>
            <p>
              任务处理中 {result.counts.PENDING || 0} · 发送已禁用{' '}
              {result.counts.DISABLED || 0}
            </p>
          </div>
          <div className="note">
            登记不等于投递成功。请在发送记录中查看后续状态。
          </div>
        </Panel>
      )}
      {history && (
        <MailHistorySheet
          {...history}
          onClose={() => setHistory(null)}
          onWrite={(recipientId) => {
            setHistory(null)
            chooseSingle(recipientId)
          }}
        />
      )}
    </>
  )
}
