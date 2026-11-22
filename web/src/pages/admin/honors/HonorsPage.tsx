import { invalidatePublicHonors } from '@/hooks/use-paged-feed'
import { useCallback, useRef, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { honorsApi } from '@/api/admin/honors.api'
import { useResource } from '@/hooks/use-resource'
import { PageHeading } from '@/components/common/PageHeading'
import { Pagination } from '@/components/common/Pagination'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Panel } from '@/components/common/Panel'
import { ErrorBanner, EmptyState } from '@/components/common/AsyncState'
import { formatTime } from '@/lib/format'
import { errorMessage } from '@/lib/api-error'
import type { Honor, ImageItem } from '@/domain/api.types'
import { HonorEditor } from './components/HonorEditor'
export function HonorsPage() {
  const [page, setPage] = useState(1),
    [size, setSize] = useState(20),
    [editing, setEditing] = useState<{ row: Honor | null } | null>(null),
    [detail, setDetail] = useState<Honor | null>(null),
    [view, setView] = useState<ImageItem | null>(null),
    [remove, setRemove] = useState<Honor | null>(null),
    [deleting, setDeleting] = useState(false)
  const seq = useRef(0),
    deleteIds = useRef(new Map<string, string>()),
    data = useResource(
      useCallback(
        (signal: AbortSignal) => honorsApi.list(page, size, signal),
        [page, size],
      ),
    )
  async function read(row: Honor, edit = false) {
    const token = ++seq.current
    try {
      const latest = await honorsApi.detail(row.id)
      if (token === seq.current) {
        if (edit) setEditing({ row: latest })
        else setDetail(latest)
      }
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  async function confirmDelete() {
    if (!remove) return
    const row = remove,
      key = row.id + ':' + row.version
    let requestId = deleteIds.current.get(key)
    if (!requestId) {
      requestId = crypto.randomUUID()
      deleteIds.current.set(key, requestId)
    }
    setDeleting(true)
    setRemove(null)
    try {
      await honorsApi.delete(row.id, row.version, requestId)
      invalidatePublicHonors()
      toast.success('荣誉已删除')
      data.reload()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setDeleting(false)
    }
  }
  return (
    <>
      <PageHeading
        title="荣誉墙"
        description="记录每一份荣誉，让共同的成绩被看见。"
      >
        <button
          className="btn primary"
          onClick={() => setEditing({ row: null })}
        >
          <Plus />
          新增荣誉
        </button>
      </PageHeading>
      <section className="panel">
        <div
          className="table-title"
          style={{ paddingTop: 24, paddingBottom: 24 }}
        >
          <h2>
            全部荣誉
            <span className="count">{data.data?.totalElements ?? '—'}</span>
          </h2>
          <button
            className="icon-btn"
            aria-label="刷新荣誉列表"
            onClick={data.reload}
          >
            <RefreshCw />
          </button>
        </div>
        <ErrorBanner error={data.error} />
        {data.loading && !data.data ? (
          <div className="loading-row">正在读取荣誉…</div>
        ) : !data.data?.content.length ? (
          <EmptyState>还没有荣誉记录，点击“新增荣誉”添加第一项。</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="honor-table">
              <thead>
                <tr>
                  {['封面', '标题', '人员', '更新时间', '操作'].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.content.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button
                        style={{ border: 0, background: 'none', padding: 0 }}
                        aria-label={'查看' + row.title}
                        onClick={() => void read(row)}
                      >
                        <img
                          className="honor-thumb"
                          src={row.images[0]?.url}
                          alt={row.title}
                        />
                      </button>
                    </td>
                    <td>
                      <div className="honor-title">{row.title}</div>
                      <div className="honor-small">
                        {row.images.length} 张图片
                      </div>
                    </td>
                    <td>
                      <div className="honor-people">{row.people}</div>
                    </td>
                    <td className="date">{formatTime(row.updatedAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="text-btn"
                          onClick={() => void read(row)}
                        >
                          查看
                        </button>
                        <button
                          className="text-btn"
                          onClick={() => void read(row, true)}
                        >
                          编辑
                        </button>
                        <span className="separator" />
                        <button
                          className="text-btn danger-text"
                          disabled={deleting}
                          onClick={() => setRemove(row)}
                        >
                          删除
                        </button>
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
          total={data.data?.totalElements ?? 0}
          totalPages={data.data?.totalPages ?? 0}
          onPage={setPage}
          onSize={(v) => {
            setPage(1)
            setSize(v)
          }}
        />
      </section>
      {editing && (
        <HonorEditor
          key={editing.row?.id || 'new'}
          row={editing.row}
          onClose={() => setEditing(null)}
          onSaved={() => {
            invalidatePublicHonors()
            data.reload()
          }}
        />
      )}
      {detail && (
        <Panel
          title="荣誉详情"
          description={'当前版本 v' + detail.version}
          open
          drawer
          onClose={() => setDetail(null)}
          footer={
            <>
              <button className="btn" onClick={() => setDetail(null)}>
                关闭
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setEditing({ row: detail })
                  setDetail(null)
                }}
              >
                编辑
              </button>
            </>
          }
        >
          <div className="section-label">{detail.title}</div>
          <div className="info-item">
            <label>人员</label>
            {detail.people}
          </div>
          <div className="section-label">
            荣誉图片 <span className="count">{detail.images.length}</span>
          </div>
          <div className="photo-grid">
            {detail.images.map((image, i) => (
              <div key={image.id} className="photo-tile">
                <img
                  src={image.url}
                  alt={'荣誉图片 ' + (i + 1)}
                  onClick={() => setView(image)}
                />
                {i === 0 && <span className="cover-tag">封面</span>}
              </div>
            ))}
          </div>
          <div className="detail-meta">
            <span>最近更新 {formatTime(detail.updatedAt)}</span>
          </div>
        </Panel>
      )}
      {view && (
        <Panel title="荣誉图片" open onClose={() => setView(null)}>
          <img
            style={{ width: '100%', maxHeight: '70dvh', objectFit: 'contain' }}
            src={view.url}
            alt="荣誉大图"
          />
        </Panel>
      )}
      <ConfirmDialog
        open={Boolean(remove)}
        title="删除这项荣誉？"
        description={'“' + (remove?.title || '') + '”将从荣誉墙移除。'}
        confirmLabel="删除"
        destructive
        onCancel={() => setRemove(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}
