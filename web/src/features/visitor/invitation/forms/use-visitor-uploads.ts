import { useCallback, useEffect, useRef, useState } from 'react'
import { uploadVisitorImage } from '@/api/public/invitation.api'
import type { ImageItem } from '@/domain/api.types'
import { newSubmissionId } from './drafts'
import { errorMessage } from '@/lib/api-error'
export interface VisitorUpload {
  key: string
  file?: File
  preview?: string
  image?: ImageItem
  state: 'queued' | 'uploading' | 'ready' | 'failed'
  message?: string
}
export function useVisitorUploads(initial: ImageItem[]) {
  const [items, setItems] = useState<VisitorUpload[]>(() =>
    initial.map((image) => ({ key: image.id, image, state: 'ready' })),
  )
  const [error, setError] = useState('')
  const current = useRef(items),
    controllers = useRef(new Map<string, AbortController>()),
    mounted = useRef(false),
    bootstrap = useRef(false)
  const pump = useRef<() => void>(() => undefined)
  const update = useCallback(
    (change: (value: VisitorUpload[]) => VisitorUpload[]) => {
      const next = change(current.current)
      current.current = next
      setItems(next)
    },
    [],
  )
  useEffect(() => {
    mounted.current = true
    const active = controllers.current
    const schedule = () => {
      if (!mounted.current) return
      const capacity = bootstrap.current ? 2 : 1
      const queued = current.current
        .filter((item) => item.state === 'queued')
        .slice(0, Math.max(0, capacity - active.size))
      for (const item of queued) {
        if (!item.file) continue
        const controller = new AbortController()
        active.set(item.key, controller)
        update((old) =>
          old.map((entry) =>
            entry.key === item.key
              ? { ...entry, state: 'uploading', message: undefined }
              : entry,
          ),
        )
        void uploadVisitorImage(item.file, controller.signal)
          .then((image) => {
            if (controller.signal.aborted || !mounted.current) return
            bootstrap.current = true
            update((old) =>
              old.map((entry) =>
                entry.key === item.key
                  ? { ...entry, image, state: 'ready' }
                  : entry,
              ),
            )
          })
          .catch((failure) => {
            if (!controller.signal.aborted && mounted.current)
              update((old) =>
                old.map((entry) =>
                  entry.key === item.key
                    ? {
                        ...entry,
                        state: 'failed',
                        message: errorMessage(failure),
                      }
                    : entry,
                ),
              )
          })
          .finally(() => {
            active.delete(item.key)
            queueMicrotask(schedule)
          })
      }
    }
    pump.current = schedule
    return () => {
      mounted.current = false
      for (const controller of active.values()) controller.abort()
      active.clear()
    }
  }, [update])
  useEffect(
    () => () => {
      for (const item of current.current)
        if (item.preview) URL.revokeObjectURL(item.preview)
    },
    [],
  )
  const add = (files: FileList | File[]) => {
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
    if (batch.some((file) => !file.size || file.size > 10 * 1024 * 1024)) {
      setError('图片不能为空，单张不能超过10 MB')
      return
    }
    setError('')
    update((old) => [
      ...old,
      ...batch.map((file) => ({
        key: newSubmissionId(),
        file,
        preview: URL.createObjectURL(file),
        state: 'queued' as const,
      })),
    ])
    pump.current()
  }
  const remove = (key: string) => {
    controllers.current.get(key)?.abort()
    controllers.current.delete(key)
    const item = current.current.find((entry) => entry.key === key)
    if (item?.preview) URL.revokeObjectURL(item.preview)
    update((old) => old.filter((entry) => entry.key !== key))
    pump.current()
  }
  const retry = (key: string) => {
    update((old) =>
      old.map((entry) =>
        entry.key === key && entry.file ? { ...entry, state: 'queued' } : entry,
      ),
    )
    pump.current()
  }
  const move = (index: number, offset: number) => {
    update((old) => {
      const next = [...old],
        target = index + offset
      if (target < 0 || target >= next.length) return old
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }
  const clear = () => {
    for (const item of current.current) {
      controllers.current.get(item.key)?.abort()
      if (item.preview) URL.revokeObjectURL(item.preview)
    }
    controllers.current.clear()
    update(() => [])
  }
  return {
    items,
    error,
    add,
    remove,
    retry,
    move,
    clear,
    busy: items.some(
      (item) => item.state === 'queued' || item.state === 'uploading',
    ),
    failed: items.some((item) => item.state === 'failed'),
  }
}
