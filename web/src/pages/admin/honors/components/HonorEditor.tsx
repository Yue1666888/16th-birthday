import { useEffect, useRef, useState } from 'react'
import { useImageUploads } from '@/hooks/use-image-uploads'
import { uploadLabel } from '@/lib/upload-label'
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
  const uploads = useImageUploads(row?.images || [], honorsApi.upload)
  const items = uploads.items.map((item) => ({
    ...item,
    status:
      item.state === 'ready'
        ? 'ready'
        : item.state === 'failed'
          ? 'error'
          : item.state === 'selected'
            ? 'selected'
            : 'uploading',
    error: item.message,
  }))
  const [error, setError] = useState<unknown>(null),
    [view, setView] = useState<ImageItem | null>(null)
  const [requestId] = useState(() => crypto.randomUUID())
  const dragIndex = useRef<number | null>(null)
  const { errors, isDirty, isSubmitting } = form.formState,
    uploading = uploads.busy,
    guard = useDiscardGuard(isDirty || uploads.changed || uploading, onClose)
  useEffect(() => {
    const ids = uploads.items.map((item) => item.image?.id || item.key)
    if (JSON.stringify(ids) !== JSON.stringify(form.getValues('imageIds')))
      form.setValue('imageIds', ids, {
        shouldDirty: true,
        shouldValidate: true,
      })
  }, [uploads.items, form])
  function add(files: FileList | null) {
    if (!isSubmitting) uploads.add(files)
  }
  function move(from: number, to: number) {
    if (!isSubmitting) uploads.move(from, to - from)
  }
  const submit = form.handleSubmit(async (values) => {
    if (uploading) return
    setError(null)
    try {
      const uploaded = await uploads.uploadAll()
      const body = {
        ...values,
        imageIds: uploaded.map((image) => image.id),
        requestId,
        ...(row ? { expectedVersion: row.version } : {}),
      }
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
              disabled={isSubmitting}
              form="honor-edit"
              type="submit"
            >
              {isSubmitting
                ? uploading
                  ? '正在上传照片…'
                  : '保存中'
                : row
                  ? '保存'
                  : '新增'}
            </button>
          </>
        }
      >
        <ErrorBanner error={error} />
        {uploads.error && (
          <div className="field-error" role="alert">
            {uploads.error}
          </div>
        )}
        {uploading && (
          <button className="btn" type="button" onClick={uploads.cancel}>
            取消上传，保留编辑
          </button>
        )}
        <form id="honor-edit" onSubmit={submit} noValidate>
          <fieldset
            disabled={isSubmitting}
            style={{ border: 0, padding: 0, margin: 0 }}
          >
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
                <span className="help">
                  直接填写展示文本，无需关联成员档案。
                </span>
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
                      {item.preview || item.image ? (
                        <img
                          src={
                            item.preview ||
                            item.image?.thumbnailUrl ||
                            item.image?.url
                          }
                          alt={'荣誉图片 ' + (index + 1)}
                          onClick={() => {
                            if (item.image) setView(item.image)
                          }}
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
                          {item.status === 'uploading' ||
                          item.status === 'selected' ? (
                            uploadLabel(item.state, item.progress)
                          ) : (
                            <div>
                              {item.error}
                              <button
                                type="button"
                                className="text-btn"
                                onClick={() => uploads.retry(item.key)}
                              >
                                <RefreshCw size={13} />
                                重试
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {index === 0 && <span className="cover-tag">封面</span>}
                      <span className="upload-phase">
                        {uploadLabel(item.state, item.progress)}
                      </span>
                      <button
                        className="remove-photo"
                        type="button"
                        aria-label={'删除第' + (index + 1) + '张图片'}
                        onClick={() => {
                          uploads.remove(item.key)
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
          </fieldset>
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
