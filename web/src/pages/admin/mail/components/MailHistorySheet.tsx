import { useCallback, useEffect, useState } from 'react'
import { Mail, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Panel } from '@/components/common/Panel'
import { Pagination } from '@/components/common/Pagination'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ErrorBanner, EmptyState } from '@/components/common/AsyncState'
import { mailApi } from '@/api/admin/mail.api'
import { useResource } from '@/hooks/use-resource'
import { formatTime } from '@/lib/format'
import { errorMessage } from '@/lib/api-error'
import type { MailHistory } from '@/domain/api.types'
export function MailHistorySheet({
  invitationId,
  batchId,
  onClose,
  onWrite,
}: {
  invitationId?: string
  batchId?: string
  onClose: () => void
  onWrite: (id: string) => void
}) {
  const [keyword, setKeyword] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [size, setSize] = useState(20),
    [record, setRecord] = useState<MailHistory | null>(null)
  const data = useResource(
    useCallback(
      (signal: AbortSignal) =>
        mailApi.history(
          {
            invitationId,
            batchId,
            keyword: keyword || undefined,
            emailNotifyStatus: status || undefined,
            page,
            size,
          },
          signal,
        ),
      [invitationId, batchId, keyword, status, page, size],
    ),
  )
  const reload = data.reload
  const pending =
    data.data?.content.some(
      (r) => r.notification.emailNotifyStatus === 'PENDING',
    ) ?? false
  useEffect(() => {
    if (!pending) return
    const timer = setInterval(() => {
      if (!document.hidden) reload()
    }, 10000)
    return () => clearInterval(timer)
  }, [pending, reload])
  async function read(row: MailHistory) {
    try {
      setRecord(await mailApi.send(row.notification.id))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  return (
    <>
      <Panel
        title="邮件发送记录"
        description={
          batchId
            ? '查看本次批次的逐人发送状态'
            : '集中查看单发、群发与回执确认邮件'
        }
        open
        drawer
        onClose={onClose}
        footer={
          <button className="btn" onClick={onClose}>
            关闭
          </button>
        }
      >
        <div className="record-toolbar">
          <input
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(1)
            }}
            placeholder="搜索姓名、邮箱或主题"
            aria-label="搜索发送记录"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            aria-label="发送状态筛选"
          >
            <option value="">全部状态</option>
            <option value="PENDING">处理中</option>
            <option value="SUCCESS">发送成功</option>
            <option value="FAILED">发送失败</option>
            <option value="NOT_SENT">未发送</option>
            <option value="DISABLED">已禁用</option>
          </select>
          <button
            className="icon-btn"
            aria-label="刷新发送记录"
            onClick={data.reload}
          >
            <RefreshCw />
          </button>
        </div>
        <ErrorBanner error={data.error} />
        {data.loading && !data.data ? (
          <div className="loading-row">正在读取发送记录…</div>
        ) : !data.data?.content.length ? (
          <EmptyState>
            <Mail />
            <p>还没有匹配的发送记录。</p>
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="mail-record-table">
              <thead>
                <tr>
                  <th>收件人 / 主题</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.data.content.map((row) => (
                  <tr key={row.notification.id}>
                    <td>
                      <div>
                        {row.recipientName} · {row.notification.recipientEmail}
                      </div>
                      <div className="record-subject">
                        {row.notification.subject}
                      </div>
                      <div className="record-meta">
                        {row.mode === 'BULK'
                          ? '群发'
                          : row.mode === 'SINGLE'
                            ? '单发'
                            : '回执确认'}{' '}
                        · {formatTime(row.notification.confirmedAt)}
                      </div>
                    </td>
                    <td>
                      <StatusBadge
                        status={row.notification.emailNotifyStatus}
                      />
                    </td>
                    <td>
                      <button
                        className="text-btn"
                        onClick={() => void read(row)}
                      >
                        查看正文
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          size={size}
          total={data.data?.totalElements ?? 0}
          totalPages={data.data?.totalPages ?? 0}
          onPage={setPage}
          onSize={(v) => {
            setPage(1)
            setSize(v)
          }}
        />
      </Panel>
      {record && (
        <Panel
          title="邮件记录详情"
          description={
            '回执 #' +
            record.notification.invitationId +
            ' · 版本 ' +
            record.notification.invitationVersion
          }
          open
          onClose={() => setRecord(null)}
          footer={
            <>
              <button className="btn" onClick={() => setRecord(null)}>
                返回
              </button>
              <button
                className="btn primary"
                onClick={() => onWrite(record.notification.invitationId)}
              >
                写信
              </button>
            </>
          }
        >
          <div className="mail-meta">
            <div>
              <label>收件人</label>
              {record.recipientName} · {record.notification.recipientEmail}
            </div>
            <div>
              <label>主题</label>
              {record.notification.subject}
            </div>
            <div>
              <label>状态</label>
              <StatusBadge status={record.notification.emailNotifyStatus} />
            </div>
            <div>
              <label>确认人员</label>
              {record.notification.confirmedByName || '社团成员'}
            </div>
            <div>
              <label>确认时间</label>
              {formatTime(record.notification.confirmedAt)}
            </div>
          </div>
          <div className="mail-paper">{record.notification.textBody}</div>
          {record.notification.lastErrorMessage && (
            <div className="note error" style={{ marginTop: 17 }}>
              {record.notification.lastErrorMessage}
            </div>
          )}
        </Panel>
      )}
    </>
  )
}
