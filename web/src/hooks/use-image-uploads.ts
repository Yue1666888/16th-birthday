import { uploadRetrySeconds } from '@/lib/upload-label'
import { useEffect, useRef, useState } from 'react'
import type { ImageItem } from '@/domain/api.types'
import { AppApiError, errorMessage } from '@/lib/api-error'
import { prepareImage, prepareImagePreview } from '@/lib/prepare-image'
import { loadUploadDraft, saveUploadDraft } from '@/lib/upload-drafts'
import type { StoredUpload } from '@/lib/upload-drafts'
import { newSubmissionId } from '@/features/visitor/invitation/forms/drafts'

export type UploadState =
  | 'selected'
  | 'compressing'
  | 'queued'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed'
export interface ImageUploadItem {
  key: string
  file?: File
  preparedFile?: File
  preview?: string
  image?: ImageItem
  state: UploadState
  progress: number
  message?: string
}
export type ImageUploader = (
  file: File,
  signal: AbortSignal,
  progress?: (value: number) => void,
  uploadId?: string,
) => Promise<ImageItem>
function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      reject(new DOMException('已取消上传', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, milliseconds)
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
  })
}
export function useImageUploads(
  initial: ImageItem[],
  uploader: ImageUploader,
  draftKey?: string,
) {
  const [items, setItems] = useState<ImageUploadItem[]>(() =>
    initial.map((image) => ({
      key: image.id,
      image,
      state: 'ready',
      progress: 100,
    })),
  )
  const current = useRef(items),
    live = useRef(false),
    running = useRef(false),
    request = useRef<AbortController | null>(null)
  const lifetime = useRef(new AbortController())
  const restored = useRef(!draftKey)
  const [restoring, setRestoring] = useState(!!draftKey),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [draftNotice, setDraftNotice] = useState('')
  const revision = useRef(0)
  const previews = useRef(new Set<string>())
  const persist = (value: ImageUploadItem[]) => {
    if (!draftKey || !restored.current) return Promise.resolve()
    const token = ++revision.current
    const stored: StoredUpload[] = value.map((item) => ({
      key: item.key,
      ...(item.image ? { image: item.image } : {}),
      ...(item.file
        ? {
            file: item.preparedFile || item.file,
            prepared: !!item.preparedFile,
          }
        : {}),
    }))
    return saveUploadDraft(draftKey, stored)
      .then(() => {
        if (live.current && token === revision.current)
          setDraftNotice(value.length ? '照片草稿已保存在此浏览器。' : '')
      })
      .catch(() => {
        if (live.current && token === revision.current)
          setDraftNotice(
            '照片草稿未能保存，刷新后可能需要重新选择照片；文字草稿仍会保留。',
          )
      })
  }
  const update = (
    change: (value: ImageUploadItem[]) => ImageUploadItem[],
    save = false,
  ) => {
    const value = change(current.current)
    current.current = value
    if (live.current) setItems(value)
    if (save) void persist(value)
  }
  const makePreview = (key: string, file: File) => {
    if (previews.current.has(key)) return
    previews.current.add(key)
    void prepareImagePreview(file, lifetime.current.signal)
      .then((preview) => {
        if (
          !live.current ||
          !current.current.some((item) => item.key === key)
        ) {
          URL.revokeObjectURL(preview)
          return
        }
        update((old) =>
          old.map((item) => (item.key === key ? { ...item, preview } : item)),
        )
      })
      .catch(() => undefined)
      .finally(() => previews.current.delete(key))
  }
  useEffect(() => {
    live.current = true
    lifetime.current = new AbortController()
    let disposed = false
    if (draftKey)
      void loadUploadDraft(draftKey)
        .then((value) => {
          if (disposed || !value) return
          const restoredItems: ImageUploadItem[] = value.map((item) => ({
            ...item,
            ...(item.prepared ? { preparedFile: item.file } : {}),
            preview: undefined,
            state: item.image ? 'ready' : 'selected',
            progress: item.image ? 100 : 0,
          }))
          current.current = restoredItems
          setItems(restoredItems)
          for (const item of restoredItems)
            if (item.file && !item.image) {
              void prepareImagePreview(item.file, lifetime.current.signal)
                .then((preview) => {
                  if (
                    disposed ||
                    !current.current.some((entry) => entry.key === item.key)
                  ) {
                    URL.revokeObjectURL(preview)
                    return
                  }
                  current.current = current.current.map((entry) =>
                    entry.key === item.key ? { ...entry, preview } : entry,
                  )
                  setItems(current.current)
                })
                .catch(() => undefined)
            }
        })
        .catch(() => {
          if (!disposed)
            setDraftNotice('本浏览器暂时无法恢复照片草稿，请保留当前页面。')
        })
        .finally(() => {
          if (!disposed) {
            restored.current = true
            setRestoring(false)
          }
        })
    return () => {
      disposed = true
      live.current = false
      request.current?.abort()
      lifetime.current.abort()
      for (const item of current.current)
        if (item.preview) URL.revokeObjectURL(item.preview)
    }
  }, [draftKey])
  function add(files: FileList | File[] | null) {
    if (running.current || !files?.length) return
    if (!restored.current) {
      setError('照片草稿恢复中，请稍后选择照片')
      return
    }
    const batch = Array.from(files)
    if (current.current.length + batch.length > 9) {
      setError('最多上传9张图片')
      return
    }
    if (
      batch.some(
        (file) =>
          !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
            file.type,
          ),
      )
    ) {
      setError('请选择JPG、PNG、WebP或GIF图片')
      return
    }
    if (batch.some((file) => !file.size || file.size > 10485760)) {
      setError('图片不能为空，单张不能超过10 MB')
      return
    }
    setError('')
    update(
      (old) => [
        ...old,
        ...batch.map((file) => ({
          key: newSubmissionId(),
          file,
          preview: undefined,
          state: 'selected' as const,
          progress: 0,
        })),
      ],
      true,
    )
    for (const item of current.current)
      if (item.file && !item.preview && !item.image)
        makePreview(item.key, item.file)
  }
  function remove(key: string) {
    if (running.current) return
    const item = current.current.find((entry) => entry.key === key)
    if (item?.preview) URL.revokeObjectURL(item.preview)
    update((old) => old.filter((entry) => entry.key !== key), true)
  }
  function move(index: number, offset: number) {
    if (running.current) return
    update((old) => {
      const next = [...old],
        target = index + offset
      if (target < 0 || target >= old.length) return old
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    }, true)
  }
  async function uploadAll(): Promise<ImageItem[]> {
    if (running.current || !restored.current)
      throw new Error('请等待照片准备完成')
    running.current = true
    setBusy(true)
    setError('')
    const controller = new AbortController()
    request.current = controller
    const patch = (
      key: string,
      change: Partial<ImageUploadItem>,
      save = false,
    ) =>
      update(
        (old) =>
          old.map((item) => (item.key === key ? { ...item, ...change } : item)),
        save,
      )
    const upload = async (item: ImageUploadItem) => {
      if (item.image) return
      if (!item.file) throw new Error('照片文件已丢失，请重新选择')
      try {
        patch(item.key, {
          state: 'compressing',
          progress: 0,
          message: undefined,
        })
        const prepared =
          item.preparedFile ||
          (await prepareImage(item.file, controller.signal, (progress) => {
            if (!controller.signal.aborted) patch(item.key, { progress })
          }))
        patch(
          item.key,
          { preparedFile: prepared, state: 'queued', progress: 0 },
          true,
        )
        const retryStarted = Date.now()
        for (let attempt = 0; ; attempt++) {
          controller.signal.throwIfAborted()
          try {
            patch(item.key, {
              state: 'uploading',
              progress: 0,
              message: undefined,
            })
            const image = await uploader(
              prepared,
              controller.signal,
              (progress) => {
                if (!controller.signal.aborted)
                  patch(item.key, {
                    progress,
                    state: progress >= 100 ? 'processing' : 'uploading',
                  })
              },
              item.key,
            )
            patch(item.key, { image, state: 'ready', progress: 100 }, true)
            return
          } catch (failure) {
            if (
              !(failure instanceof AppApiError) ||
              (failure.status !== 429 && failure.code !== 'UPLOAD_BUSY') ||
              attempt >= 7 ||
              Date.now() - retryStarted > 120000
            )
              throw failure
            const seconds = uploadRetrySeconds(
              failure.retryAfterSeconds,
              attempt,
            )
            if (Date.now() - retryStarted + seconds * 1000 > 120000)
              throw failure
            patch(item.key, {
              state: 'queued',
              message: `上传较多，约${seconds}秒后重试`,
            })
            await wait(
              seconds * 1000 + Math.random() * Math.min(2000, seconds * 250),
              controller.signal,
            )
          }
        }
      } catch (failure) {
        patch(
          item.key,
          {
            state: controller.signal.aborted ? 'selected' : 'failed',
            message: controller.signal.aborted
              ? '已取消，照片仍保留'
              : errorMessage(failure),
          },
          true,
        )
        if (controller.signal.aborted)
          throw new Error('已取消上传，照片与草稿已保留', { cause: failure })
        throw failure
      }
    }
    try {
      const pending = current.current.filter((item) => !item.image)
      // The first request establishes the anonymous upload cookie before concurrent requests.
      if (pending.length) await upload(pending[0])
      for (let index = 1; index < pending.length; index += 2) {
        const outcomes = await Promise.allSettled(
          pending.slice(index, index + 2).map(upload),
        )
        const failed = outcomes.find((outcome) => outcome.status === 'rejected')
        if (failed?.status === 'rejected') throw failed.reason
      }
      return current.current.map((item) => {
        if (!item.image) throw new Error('照片尚未全部上传成功')
        return item.image
      })
    } finally {
      running.current = false
      request.current = null
      if (live.current) setBusy(false)
    }
  }
  async function clear() {
    request.current?.abort()
    for (const item of current.current)
      if (item.preview) URL.revokeObjectURL(item.preview)
    update(() => [])
    await persist([])
  }
  return {
    items,
    add,
    remove,
    move,
    uploadAll,
    clear,
    cancel: () => request.current?.abort(),
    busy,
    restoring,
    draftNotice,
    error,
    retry: (key: string) => {
      if (!running.current)
        update(
          (old) =>
            old.map((item) =>
              item.key === key
                ? { ...item, state: 'selected', message: undefined }
                : item,
            ),
          true,
        )
    },
    failed: items.some((item) => item.state === 'failed'),
    changed: items.some((item) => !!item.file),
  }
}
