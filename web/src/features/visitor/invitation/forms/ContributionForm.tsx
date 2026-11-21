import { Link } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react'
import { errorMessage } from '@/lib/api-error'
import type { useContributionForm } from './use-contribution-form'
export function ContributionForm({
  controller,
}: {
  controller: ReturnType<typeof useContributionForm>
}) {
  const { form, uploads, submit, error, result, locked, uncertain } = controller
  const { errors, isSubmitting } = form.formState
  return (
    <section
      className="invitation-form-section"
      id="contribution"
      aria-labelledby="contribution-heading"
    >
      <div className="invitation-section-title">
        <div>
          <span>02 / LEAVE A MEMORY</span>
          <h2 id="contribution-heading">留忆 · 把这一刻收藏</h2>
        </div>
        <p>一张照片，一段故事，都是我们。</p>
      </div>
      <div className="invitation-form-panel">
        <span className="form-corner top-left" />
        <span className="form-corner bottom-right" />
        <form onSubmit={submit} noValidate aria-label="回忆投稿">
          <fieldset disabled={isSubmitting || locked}>
            <div className="invitation-field">
              <label htmlFor="memory-name">
                姓名<small>选填</small>
              </label>
              <div>
                <input
                  id="memory-name"
                  placeholder="留个名字，也可以匿名"
                  {...form.register('displayName')}
                  aria-invalid={!!errors.displayName}
                />
                {errors.displayName && (
                  <p className="invitation-field-error">
                    {errors.displayName.message}
                  </p>
                )}
              </div>
            </div>
            <div className="invitation-field">
              <label htmlFor="memory-title">
                标题<small>选填</small>
              </label>
              <div>
                <input
                  id="memory-title"
                  placeholder="给这段回忆起个名字"
                  {...form.register('title')}
                  aria-invalid={!!errors.title}
                />
                {errors.title && (
                  <p className="invitation-field-error">
                    {errors.title.message}
                  </p>
                )}
              </div>
            </div>
            <div className="invitation-field">
              <label htmlFor="memory-content">回忆正文</label>
              <div>
                <textarea
                  id="memory-content"
                  rows={6}
                  placeholder="关于115，关于那些并肩的日子…"
                  {...form.register('content')}
                  aria-invalid={!!errors.content}
                />
                <p className="invitation-field-hint">
                  正文与图片至少填写一项 · 正文最多5000字
                </p>
                {errors.content && (
                  <p className="invitation-field-error">
                    {errors.content.message}
                  </p>
                )}
              </div>
            </div>
            <div className="invitation-field">
              <label htmlFor="memory-images">回忆照片</label>
              <div>
                <label
                  className="invitation-upload"
                  htmlFor="memory-images"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (!locked) uploads.add(event.dataTransfer.files)
                  }}
                >
                  <Upload size={21} />
                  <span>选择照片，或拖拽到这里</span>
                  <small>最多9张 · 单张10 MB · JPG / PNG / WebP / GIF</small>
                  <input
                    id="memory-images"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => {
                      if (event.target.files) uploads.add(event.target.files)
                      event.target.value = ''
                    }}
                  />
                </label>
                <div
                  className="invitation-upload-drop"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (!locked) uploads.add(event.dataTransfer.files)
                  }}
                >
                  <div className="invitation-photo-grid">
                    {uploads.items.map((item, index) => (
                      <div className="invitation-photo" key={item.key}>
                        <img
                          src={item.preview || item.image?.url}
                          alt={'回忆照片 ' + (index + 1)}
                        />
                        <button
                          type="button"
                          className="photo-remove"
                          aria-label={'移除第' + (index + 1) + '张照片'}
                          onClick={() => uploads.remove(item.key)}
                        >
                          <X size={13} />
                        </button>
                        <div className="invitation-photo-state">
                          {item.state === 'ready' ? (
                            <span>
                              <Check size={12} />
                              已上传
                            </span>
                          ) : item.state === 'failed' ? (
                            <button
                              type="button"
                              onClick={() => uploads.retry(item.key)}
                            >
                              <RefreshCw size={12} />
                              重试
                            </button>
                          ) : (
                            <span>
                              {item.state === 'queued'
                                ? '等待上传'
                                : '正在上传…'}
                            </span>
                          )}
                        </div>
                        {item.message && <p>{item.message}</p>}
                        <div className="invitation-photo-order">
                          <span>{index + 1}</span>
                          <button
                            type="button"
                            disabled={!index}
                            aria-label={'前移第' + (index + 1) + '张照片'}
                            onClick={() => uploads.move(index, -1)}
                          >
                            <ArrowLeft size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={index === uploads.items.length - 1}
                            aria-label={'后移第' + (index + 1) + '张照片'}
                            onClick={() => uploads.move(index, 1)}
                          >
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {uploads.error && (
                  <p className="invitation-field-error" role="alert">
                    {uploads.error}
                  </p>
                )}
                {errors.imageIds && (
                  <p className="invitation-field-error">
                    {errors.imageIds.message}
                  </p>
                )}
              </div>
            </div>
          </fieldset>
          {uncertain && (
            <p className="invitation-submit-error" role="status">
              尚未确认发布结果。请重试核对；本次内容暂时锁定，以免重复投稿。
            </p>
          )}
          {!!error && (
            <p className="invitation-submit-error" role="alert">
              {errorMessage(error)}
            </p>
          )}
          {result && (
            <div className="invitation-result" role="status">
              <Check size={18} />
              <div>
                <strong>回忆已发布</strong>
                <p>
                  谢谢你，把故事留在这里。
                  <Link to="/memories">去回忆墙看看 ↗</Link>
                </p>
              </div>
            </div>
          )}
          <div className="invitation-submit-row">
            <p>
              {uploads.busy
                ? '照片正在上传，完成后即可发布。'
                : uploads.failed
                  ? '请重试失败照片，或移除后再发布。'
                  : '投稿成功后会直接展示在回忆墙。'}
            </p>
            <button
              className="invitation-submit"
              type="submit"
              disabled={isSubmitting || uploads.busy || uploads.failed}
            >
              {isSubmitting
                ? '正在发布…'
                : uncertain
                  ? '重试并核对发布结果'
                  : '发布回忆'}
              <ArrowUpRight size={17} />
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
