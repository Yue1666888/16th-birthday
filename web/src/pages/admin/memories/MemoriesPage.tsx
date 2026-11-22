import { useCallback, useRef, useState } from 'react'
import { Plus, RefreshCw, Search, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { memoriesApi } from '@/api/admin/memories.api'
import { useResource } from '@/hooks/use-resource'
import { invalidatePublicMemories } from '@/hooks/use-paged-feed'
import { PageHeading } from '@/components/common/PageHeading'
import { Pagination } from '@/components/common/Pagination'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Panel } from '@/components/common/Panel'
import { ErrorBanner, EmptyState } from '@/components/common/AsyncState'
import { formatTime } from '@/lib/format'
import { errorMessage } from '@/lib/api-error'
import type { AdminMemory, ImageItem } from '@/domain/api.types'
import { MemoryEditor } from './components/MemoryEditor'
import '@/styles/memory-admin.css'

export function MemoriesPage() {
  const [page, setPage] = useState(1),
    [size, setSize] = useState(20),
    [keyword, setKeyword] = useState('')
  const [editing, setEditing] = useState<{ row: AdminMemory | null } | null>(
      null,
    ),
    [detail, setDetail] = useState<AdminMemory | null>(null),
    [view, setView] = useState<ImageItem | null>(null)
  const [remove, setRemove] = useState<AdminMemory | null>(null),
    [deleting, setDeleting] = useState(false)
  const sequence = useRef(0),
    deleteIds = useRef(new Map<string, string>())
  const data = useResource(
    useCallback(
      (signal: AbortSignal) => memoriesApi.list(page, size, keyword, signal),
      [page, size, keyword],
    ),
  )
  const saved = () => {
    invalidatePublicMemories()
    setPage(1)
    data.reload()
  }
  async function read(row: AdminMemory, edit = false) {
    const token = ++sequence.current
    try {
      const latest = await memoriesApi.detail(row.id)
      if (token === sequence.current) {
        if (edit) setEditing({ row: latest })
        else setDetail(latest)
      }
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }
  async function deleteMemory() {
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
      await memoriesApi.delete(row.id, row.version, requestId)
      invalidatePublicMemories()
      toast.success('回忆已删除')
      if (data.data?.content.length === 1 && page > 1) setPage(page - 1)
      else data.reload()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setDeleting(false)
    }
  }
  return (
    <>
      <PageHeading
        title="回忆管理"
        description="整理每一份回忆，保存后同步更新公开回忆墙。"
      >
        <button
          className="btn primary"
          onClick={() => setEditing({ row: null })}
        >
          <Plus />
          新增回忆
        </button>
      </PageHeading>
      <section className="panel">
        <div className="memory-admin-toolbar">
          <div className="table-title">
            <h2>
              回忆档案
              <span className="count">{data.data?.totalElements ?? '—'}</span>
            </h2>
          </div>
          <div className="memory-admin-tools">
            <div className="input-wrap">
              <Search />
              <input
                aria-label="搜索回忆"
                placeholder="搜索姓名、标题或正文"
                value={keyword}
                maxLength={100}
                onChange={(event) => {
                  setKeyword(event.target.value)
                  setPage(1)
                }}
              />
            </div>
            <button
              className="icon-btn"
              aria-label="刷新回忆列表"
              onClick={data.reload}
            >
              <RefreshCw />
            </button>
          </div>
        </div>
        <ErrorBanner error={data.error} />
        {data.loading && !data.data ? (
          <div className="loading-row">正在读取回忆…</div>
        ) : data.error && !data.data ? (
          <EmptyState>暂时无法读取回忆，请点击右上角刷新重试。</EmptyState>
        ) : !data.data?.content.length ? (
          <EmptyState>
            {keyword.trim()
              ? '没有找到匹配的回忆，试试其他关键词。'
              : '还没有回忆，访客投稿或点击“新增回忆”即可添加。'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="memory-admin-table">
              <thead>
                <tr>
                  {['封面', '回忆内容', '姓名', '来源', '更新时间', '操作'].map(
                    (label) => (
                      <th key={label}>{label}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.data.content.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button
                        className="memory-admin-cover"
                        aria-label={'查看回忆' + (row.title || row.id)}
                        onClick={() => void read(row)}
                      >
                        {row.images[0] ? (
                          <img
                            src={row.images[0].url}
                            alt={row.title || '回忆封面'}
                          />
                        ) : (
                          <FileText size={24} />
                        )}
                      </button>
                    </td>
                    <td>
                      <strong className="memory-admin-title">
                        {row.title || '无标题回忆'}
                      </strong>
                      <p className="memory-admin-excerpt">
                        {row.content || '仅图片投稿'}
                      </p>
                      <span className="memory-admin-muted">
                        {row.images.length} 张图片 · 发布于{' '}
                        {formatTime(row.publishedAt)}
                      </span>
                    </td>
                    <td>
                      {row.displayName || (
                        <span className="memory-admin-muted">匿名</span>
                      )}
                    </td>
                    <td>
                      <span className="pill">
                        {row.source === 'ADMIN' ? '管理员发布' : '访客投稿'}
                      </span>
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
          total={data.data?.totalElements || 0}
          totalPages={data.data?.totalPages || 0}
          onPage={setPage}
          onSize={(value) => {
            setSize(value)
            setPage(1)
          }}
        />
      </section>
      {editing && (
        <MemoryEditor
          key={editing.row ? editing.row.id + ':' + editing.row.version : 'new'}
          row={editing.row}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      )}
      {detail && (
        <Panel
          title="回忆详情"
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
                  void read(detail, true)
                  setDetail(null)
                }}
              >
                编辑
              </button>
            </>
          }
        >
          <div className="memory-admin-detail-meta">
            <span>{detail.displayName || '匿名'}</span>
            <span>{detail.source === 'ADMIN' ? '管理员发布' : '访客投稿'}</span>
          </div>
          <h3 className="memory-admin-detail-title">
            {detail.title || '无标题回忆'}
          </h3>
          <div className="memory-admin-body">
            {detail.content || '这份回忆以图片记录。'}
          </div>
          <div className="section-label">
            回忆图片 <span className="count">{detail.images.length}</span>
          </div>
          <div className="photo-grid">
            {detail.images.map((image, index) => (
              <button
                key={image.id}
                className="memory-admin-photo"
                aria-label={'查看回忆图片第' + (index + 1) + '张'}
                onClick={() => setView(image)}
              >
                <img src={image.url} alt={'回忆图片 ' + (index + 1)} />
              </button>
            ))}
          </div>
          <div className="detail-meta">
            <span>发布 {formatTime(detail.publishedAt)}</span>
            <span>更新 {formatTime(detail.updatedAt)}</span>
          </div>
        </Panel>
      )}
      {view && (
        <Panel title="回忆图片" open onClose={() => setView(null)}>
          <img
            src={view.url}
            alt="回忆大图"
            style={{ width: '100%', maxHeight: '70dvh', objectFit: 'contain' }}
          />
        </Panel>
      )}
      <ConfirmDialog
        open={!!remove}
        title="删除这段回忆？"
        description={
          '“' +
          (remove?.title || '无标题回忆') +
          '”将从公开回忆墙和姓名墙统计中移除，原始记录会保留。'
        }
        confirmLabel="删除"
        destructive
        onCancel={() => setRemove(null)}
        onConfirm={() => void deleteMemory()}
      />
    </>
  )
}
