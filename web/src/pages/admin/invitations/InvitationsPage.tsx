import { useCallback, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  Download,
  RefreshCw,
  Users,
  CheckCircle,
  Package,
  Mail,
  Search,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { invitationsApi } from '@/api/admin/invitations.api'
import { useResource } from '@/hooks/use-resource'
import { PageHeading } from '@/components/common/PageHeading'
import { Pagination } from '@/components/common/Pagination'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ErrorBanner, EmptyState } from '@/components/common/AsyncState'
import { Panel } from '@/components/common/Panel'
import type { Invitation, RecipientQuery } from '@/domain/api.types'
import { giftLabels, attendanceLabels } from '@/domain/status'
import { formatTime } from '@/lib/format'
import { errorMessage } from '@/lib/api-error'
import { InvitationEditor } from './components/InvitationEditor'
export function InvitationsPage() {
  const [params, setParams] = useSearchParams(),
    [keyword, setKeyword] = useState(params.get('keyword') || ''),
    [attendance, setAttendance] = useState(params.get('attendance') || ''),
    [gift, setGift] = useState(params.get('giftChoice') || '')
  const page = Math.max(1, Number(params.get('page')) || 1),
    size = [20, 50, 100].includes(Number(params.get('size')))
      ? Number(params.get('size'))
      : 20
  const q = JSON.stringify({
    keyword: params.get('keyword') || undefined,
    attendance: params.get('attendance') || undefined,
    giftChoice: params.get('giftChoice') || undefined,
  })
  const query = useResource(
    useCallback(
      (signal: AbortSignal) =>
        invitationsApi.list(
          JSON.parse(q) as RecipientQuery,
          page,
          size,
          signal,
        ),
      [q, page, size],
    ),
  )
  const stats = useResource(useCallback(() => invitationsApi.stats(), []))
  const [detail, setDetail] = useState<Invitation | null>(null),
    [editing, setEditing] = useState<Invitation | null>(null),
    [exporting, setExporting] = useState(false)
  const navigateQuery = (p: number, s: number, filter?: RecipientQuery) => {
    const next = new URLSearchParams()
    const fields = filter || (JSON.parse(q) as RecipientQuery)
    for (const [key, value] of Object.entries(fields))
      if (value) next.set(key, value)
    if (p > 1) next.set('page', String(p))
    if (s !== 20) next.set('size', String(s))
    setParams(next)
  }
  const inspectSequence = useRef(0)
  async function inspect(row: Invitation, edit = false) {
    const token = ++inspectSequence.current
    try {
      const current = await invitationsApi.detail(row.id)
      if (token === inspectSequence.current) {
        if (edit) setEditing(current)
        else setDetail(current)
      }
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const reload = () => {
    query.reload()
    stats.reload()
  }
  const total = stats.data?.total,
    attending = stats.data?.attendance.attending,
    mail = stats.data?.gifts.mail
  return (
    <>
      <PageHeading
        title="报名管理"
        description="查看与维护邀请函回执，确认每一份重聚的心意。"
      >
        <button
          className="btn primary"
          disabled={exporting}
          onClick={() => {
            setExporting(true)
            void invitationsApi
              .export(JSON.parse(q) as RecipientQuery)
              .catch((e) => toast.error(errorMessage(e)))
              .finally(() => setExporting(false))
          }}
        >
          <Download />
          {exporting ? '导出中' : '导出回执'}
        </button>
      </PageHeading>
      <ErrorBanner error={stats.error} />
      <section className="stats">
        {[
          {
            label: '总回执数',
            n: total,
            Icon: Users,
            description: '全部已提交的报名回执',
          },
          {
            label: '确认到场',
            n: attending,
            Icon: CheckCircle,
            description: total
              ? '占总回执 ' + Math.round(((attending || 0) / total) * 100) + '%'
              : '等待报名者确认',
          },
          {
            label: '礼物邮寄',
            n: mail,
            Icon: Package,
            description: '需安排邮寄的礼物数量',
          },
          {
            label: '邮件已发送',
            n: stats.data?.email.success,
            Icon: Mail,
            description: stats.data
              ? '未发送 ' +
                stats.data.email.notSent +
                ' / 处理中 ' +
                stats.data.email.pending +
                ' / 失败 ' +
                stats.data.email.failed
              : '读取邮件统计',
          },
        ].map((card) => (
          <div className="stat" key={card.label}>
            <div className="stat-top">
              {card.label}
              <span className="stat-icon">
                <card.Icon />
              </span>
            </div>
            <div className="stat-number">{card.n ?? '—'}</div>
            <div className="stat-bottom">{card.description}</div>
          </div>
        ))}
      </section>
      <section className="panel">
        <form
          className="filterbar"
          onSubmit={(e) => {
            e.preventDefault()
            navigateQuery(1, size, {
              keyword: keyword.trim() || undefined,
              attendance: attendance || undefined,
              giftChoice: gift || undefined,
            })
          }}
        >
          <div className="field search">
            <label htmlFor="inv-keyword">搜索回执</label>
            <div className="input-wrap">
              <Search />
              <input
                id="inv-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索姓名、手机号或邮箱"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="inv-attendance">是否到场</label>
            <select
              id="inv-attendance"
              value={attendance}
              onChange={(e) => setAttendance(e.target.value)}
            >
              <option value="">全部状态</option>
              <option value="ATTENDING">到场</option>
              <option value="NOT_ATTENDING">不到场</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="inv-gift">礼物领取方式</label>
            <select
              id="inv-gift"
              value={gift}
              onChange={(e) => setGift(e.target.value)}
            >
              <option value="">全部方式</option>
              <option value="PICKUP">到场领取</option>
              <option value="MAIL">邮寄</option>
              <option value="NONE">不领取</option>
            </select>
          </div>
          <div className="filter-actions">
            <button className="btn primary" type="submit">
              查询
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setKeyword('')
                setAttendance('')
                setGift('')
                navigateQuery(1, size, {})
              }}
            >
              重置
            </button>
          </div>
        </form>
        <div className="table-title">
          <h2>
            全部回执
            <span className="count">{query.data?.totalElements ?? '—'}</span>
          </h2>
          <div className="table-tools">
            <span className="hint">
              <Info />
              邮件编辑与发送统一在邮件管理中操作
            </span>
            <button
              className="icon-btn"
              aria-label="刷新报名列表"
              onClick={reload}
            >
              <RefreshCw />
            </button>
          </div>
        </div>
        <ErrorBanner error={query.error} />
        {query.loading && !query.data ? (
          <div className="loading-row">正在读取回执…</div>
        ) : !query.data?.content.length ? (
          <EmptyState>没有匹配的回执。</EmptyState>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    '姓名',
                    '联系方式',
                    '是否到场',
                    '礼物领取方式',
                    '邮件状态',
                    '更新时间',
                    '操作',
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.content.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="person">
                        <span className="person-icon">
                          {row.name.slice(0, 1)}
                        </span>
                        <span className="person-name">{row.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="contact-phone">{row.phone}</div>
                      <div className="contact-email">{row.email}</div>
                    </td>
                    <td>
                      <StatusBadge status={row.attendance} />
                    </td>
                    <td>{giftLabels[row.giftChoice]}</td>
                    <td>
                      <StatusBadge status={row.emailNotifyStatus} />
                    </td>
                    <td className="date">{formatTime(row.updatedAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="text-btn"
                          onClick={() => void inspect(row)}
                        >
                          查看
                        </button>
                        <button
                          className="text-btn"
                          onClick={() => void inspect(row, true)}
                        >
                          修改
                        </button>
                        <span className="separator" />
                        <Link
                          className="text-btn mail"
                          to={'/admin/mail?mode=single&recipientId=' + row.id}
                        >
                          写邮件
                        </Link>
                      </div>
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
          total={query.data?.totalElements ?? 0}
          totalPages={query.data?.totalPages ?? 0}
          onPage={(p) => navigateQuery(p, size)}
          onSize={(s) => navigateQuery(1, s)}
        />
      </section>
      {detail && (
        <Panel
          title="报名详情"
          description={'回执 #' + detail.id + ' · 当前版本 v' + detail.version}
          open
          onClose={() => setDetail(null)}
          drawer
          footer={
            <>
              <button className="btn" onClick={() => setDetail(null)}>
                关闭
              </button>
              <button
                className="btn"
                onClick={() => {
                  setEditing(detail)
                  setDetail(null)
                }}
              >
                修改
              </button>
              <Link
                className="btn primary"
                to={'/admin/mail?mode=single&recipientId=' + detail.id}
              >
                写邮件
              </Link>
            </>
          }
        >
          <div className="summary-box">
            <span className="person-icon">{detail.name.slice(0, 1)}</span>
            <div>
              <strong>{detail.name}</strong>
              <small>{formatTime(detail.updatedAt)} 更新</small>
            </div>
            <StatusBadge status={detail.emailNotifyStatus} />
          </div>
          <div className="info-grid">
            {[
              ['姓名', detail.name],
              ['手机号', detail.phone],
              ['邮箱', detail.email],
              ['是否到场', attendanceLabels[detail.attendance]],
              ['礼物领取方式', giftLabels[detail.giftChoice]],
              ...(detail.giftChoice === 'MAIL'
                ? [['邮寄地址', detail.mailingAddress || '—']]
                : []),
            ].map(([label, value]) => (
              <div className="info-item" key={label}>
                <label>{label}</label>
                {value}
              </div>
            ))}
          </div>
          <div className="section-label">邮件通知</div>
          <div className="note">
            报名修正不会自动发送邮件。请前往邮件管理核对内容并手动确认。
          </div>
          <Link
            className="text-btn"
            style={{ display: 'inline-block', marginTop: 16 }}
            to={'/admin/mail?view=history&recipientId=' + detail.id}
          >
            查看邮件记录
          </Link>
        </Panel>
      )}
      {editing && (
        <InvitationEditor
          key={editing.id}
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </>
  )
}
