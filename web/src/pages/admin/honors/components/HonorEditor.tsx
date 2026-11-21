import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Upload, ArrowLeft, ArrowRight, X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Panel } from '@/components/common/Panel'
import { ErrorBanner } from '@/components/common/AsyncState'
import { useDiscardGuard } from '@/hooks/use-discard-guard'
import { honorsApi } from '@/api/admin/honors.api'
import type { Honor, ImageItem } from '@/domain/api.types'
import { honorSchema } from '../schemas/honor.schema'
import type { HonorForm } from '../schemas/honor.schema'
import { AppApiError } from '@/lib/api-error'
type UploadItem = {
  key: string
  image?: ImageItem
  file?: File
  status: 'ready' | 'uploading' | 'error'
  error?: string
}
export function HonorEditor({
  row,
  onClose,
  onSaved,
}: {
  row: Honor | null
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<HonorForm>({
    resolver: zodResolver(honorSchema),
    defaultValues: {
      title: row?.title || '',
      people: row?.people || '',
      imageIds: row?.images.map((i) => i.id) || [],
    },
  })
  const [items, setItems] = useState<UploadItem[]>(
      () =>
        row?.images.map((image) => ({
          key: image.id,
          image,
          status: 'ready',
        })) || [],
    ),
    [error, setError] = useState<unknown>(null),
    [view, setView] = useState<ImageItem | null>(null)
  const [requestId] = useState(() => crypto.randomUUID())
  const controllers = useRef(new Map<string, AbortController>()),
    dragIndex = useRef<number | null>(null)
  const { errors, isDirty, isSubmitting } = form.formState,
    uploading = items.some((i) => i.status === 'uploading'),
    failed = items.some((i) => i.status === 'error'),
    guard = useDiscardGuard(isDirty || uploading || failed, onClose)
  useEffect(() => {
    const refs = controllers.current
    return () => {
      for (const controller of refs.values()) controller.abort()
    }
  }, [])
  useEffect(() => {
    const ids = items.flatMap((i) => (i.image ? [i.image.id] : []))
    if (JSON.stringify(ids) !== JSON.stringify(form.getValues('imageIds')))
      form.setValue('imageIds', ids, {
        shouldDirty: true,
        shouldValidate: true,
      })
  }, [items, form])
  function upload(item: UploadItem) {
    if (!item.file) return
    const controller = new AbortController()
    controllers.current.set(item.key, controller)
    setItems((old) =>
      old.map((i) =>
        i.key === item.key
          ? { ...i, status: 'uploading', error: undefined }
          : i,
      ),
    )
    void honorsApi
      .upload(item.file, controller.signal)
      .then((image) => {
        if (controllers.current.get(item.key) === controller)
          setItems((old) =>
            old.map((i) =>
              i.key === item.key
                ? { key: item.key, image, status: 'ready' }
                : i,
            ),
          )
      })
      .catch((e) => {
        if (
          !controller.signal.aborted &&
          controllers.current.get(item.key) === controller
        )
          setItems((old) =>
            old.map((i) =>
              i.key === item.key
                ? {
                    ...i,
                    status: 'error',
                    error: e instanceof Error ? e.message : '上传失败',
                  }
                : i,
            ),
          )
      })
      .finally(() => {
        if (controllers.current.get(item.key) === controller)
          controllers.current.delete(item.key)
      })
  }
  function add(files: FileList | null) {
    if (!files?.length) return
    const batch = Array.from(files)
    if (items.length + batch.length > 9) {
      toast.error('最多上传9张图片')
      return
    }
    if (
      batch.some(
        (f) =>
          !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
            f.type,
          ),
      )
    ) {
      toast.error('请选择JPG、PNG、WebP或GIF图片')
      return
    }
    if (batch.some((f) => f.size > 10485760)) {
      toast.error('单张图片不能超过10 MB')
      return
    }
    const next = batch.map((file) => ({
      key: crypto.randomUUID(),
      file,
      status: 'uploading' as const,
    }))
    setItems((old) => [...old, ...next])
    for (const item of next) upload(item)
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= items.length) return
    setItems((old) => {
      const copy = [...old],
        picked = copy.splice(from, 1)[0]
      copy.splice(to, 0, picked)
      return copy
    })
  }
  const submit = form.handleSubmit(async (values) => {
    if (uploading || failed) return
    setError(null)
    const body = {
      ...values,
      requestId,
      ...(row ? { expectedVersion: row.version } : {}),
    }
    try {
      if (row) await honorsApi.update(row.id, body)
      else await honorsApi.create(body)
      form.reset(values)
      toast.success(row ? '荣誉已更新' : '荣誉已创建')
      onSaved()
      onClose()
    } catch (e) {
      setError(e)
      if (e instanceof AppApiError)
        for (const key of ['title', 'people', 'imageIds'] as const)
          if (e.fields[key]) form.setError(key, { message: e.fields[key] })
    }
  })
  return (
    <>
      <Panel
        title={row ? '编辑荣誉' : '新增荣誉'}
        description="保存后将直接展示在公开荣誉墙"
        open
        onClose={guard.requestClose}
        drawer
        footer={
          <>
            <span className="foot-note">标题、人员和图片均为必填项</span>
            <button
              className="btn"
              disabled={isSubmitting}
              onClick={guard.requestClose}
            >
              取消
            </button>
            <button
              className="btn primary"
              disabled={isSubmitting || uploading || failed}
              form="honor-edit"
              type="submit"
            >
              {isSubmitting ? '保存中' : row ? '保存' : '新增'}
            </button>
          </>
        }
      >
        <ErrorBanner error={error} />
        <form id="honor-edit" onSubmit={submit} noValidate>
          <div className="form-grid">
            <div className="form-field full">
              <label htmlFor="honor-title">
                标题<span className="required">*</span>
              </label>
              <input
                id="honor-title"
                {...form.register('title')}
                placeholder="填写荣誉标题"
                aria-invalid={Boolean(errors.title)}
              />
              {errors.title && (
                <span className="field-error">{errors.title.message}</span>
              )}
            </div>
            <div className="form-field full">
              <label htmlFor="honor-people">
                人员<span className="required">*</span>
              </label>
              <input
                id="honor-people"
                {...form.register('people')}
                placeholder="填写姓名，多人可用顿号分隔"
                aria-invalid={Boolean(errors.people)}
              />
              <span className="help">直接填写展示文本，无需关联成员档案。</span>
              {errors.people && (
                <span className="field-error">{errors.people.message}</span>
              )}
            </div>
            <div className="form-field full">
              <label>
                图片<span className="required">*</span>
                <span className="help" style={{ float: 'right' }}>
                  {items.length} / 9 张
                </span>
              </label>
              <input
                type="file"
                id="honor-files"
                multiple
                hidden
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  add(e.target.files)
                  e.target.value = ''
                }}
              />
              <label
                className="upload-drop"
                htmlFor="honor-files"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  add(e.dataTransfer.files)
                }}
              >
                <Upload />
                <strong>点击选择图片，或拖拽到此处</strong>
                <small>JPG、PNG、WebP、GIF · 单张不超过10 MB</small>
              </label>
              <div className="photo-grid">
                {items.map((item, index) => (
                  <div
                    className="photo-tile"
                    key={item.key}
                    draggable
                    onDragStart={() => (dragIndex.current = index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (dragIndex.current !== null)
                        move(dragIndex.current, index)
                      dragIndex.current = null
                    }}
                  >
                    {item.image ? (
                      <img
                        src={item.image.url}
                        alt={'荣誉图片 ' + (index + 1)}
                        onClick={() => setView(item.image || null)}
                      />
                    ) : (
                      <div
                        style={{
                          aspectRatio: '1.4',
                          display: 'grid',
                          placeItems: 'center',
                          color: '#91a2bb',
                          padding: 10,
                          fontSize: 11,
                        }}
                      >
                        {item.status === 'uploading' ? (
                          '正在上传…'
                        ) : (
                          <div>
                            {item.error}
                            <button
                              type="button"
                              className="text-btn"
                              onClick={() => upload(item)}
                            >
                              <RefreshCw size={13} />
                              重试
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {index === 0 && <span className="cover-tag">封面</span>}
                    <button
                      className="remove-photo"
                      type="button"
                      aria-label={'删除第' + (index + 1) + '张图片'}
                      onClick={() => {
                        controllers.current.get(item.key)?.abort()
                        controllers.current.delete(item.key)
                        setItems((old) => old.filter((i) => i.key !== item.key))
                      }}
                    >
                      <X size={12} />
                    </button>
                    <div className="photo-tools">
                      <span>第 {index + 1} 张</span>
                      <div>
                        <button
                          type="button"
                          aria-label={'前移第' + (index + 1) + '张图片'}
                          disabled={index === 0}
                          onClick={() => move(index, index - 1)}
                        >
                          <ArrowLeft size={13} />
                        </button>
                        <button
                          type="button"
                          aria-label={'后移第' + (index + 1) + '张图片'}
                          disabled={index === items.length - 1}
                          onClick={() => move(index, index + 1)}
                        >
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <span className="help">
                至少1张，最多9张；第一张作为封面，可拖动或使用左右按钮排序。
              </span>
              {errors.imageIds && (
                <span className="field-error">{errors.imageIds.message}</span>
              )}
            </div>
          </div>
        </form>
      </Panel>
      {guard.confirmation}
      {view && (
        <Panel
          title="荣誉图片"
          open
          onClose={() => setView(null)}
          footer={
            <button className="btn" onClick={() => setView(null)}>
              关闭
            </button>
          }
        >
          <img
            src={view.url}
            alt="荣誉大图"
            style={{ width: '100%', maxHeight: '65dvh', objectFit: 'contain' }}
          />
        </Panel>
      )}
    </>
  )
}
