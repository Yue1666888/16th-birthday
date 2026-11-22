import { z } from 'zod'
import type { ImageItem } from '@/domain/api.types'

export interface StoredUpload {
  key: string
  file?: File
  prepared?: boolean
  image?: ImageItem
}
const imageSchema = z.object({
  id: z.uuid(),
  url: z.string().max(3000),
  thumbnailUrl: z.string().max(3000).nullable().optional(),
  width: z.number().nullable(),
  height: z.number().nullable(),
})
const draftSchema = z.object({
  savedAt: z.number(),
  items: z
    .array(
      z.object({
        key: z.uuid(),
        file: z.custom<File>((value) => value instanceof File).optional(),
        prepared: z.boolean().optional(),
        image: imageSchema.optional(),
      }),
    )
    .max(9),
})
const writes = new Map<string, Promise<void>>()
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('birthday16-photo-drafts', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('drafts')
    request.onsuccess = () => {
      const db = request.result
      const cleanup = db
        .transaction('drafts', 'readwrite')
        .objectStore('drafts')
        .openCursor()
      cleanup.onsuccess = () => {
        const cursor = cleanup.result
        if (!cursor) return
        const record = draftSchema.safeParse(cursor.value as unknown)
        if (!record.success || record.data.savedAt < Date.now() - 7 * 86400000)
          cursor.delete()
        cursor.continue()
      }
      resolve(db)
    }
    request.onerror = () =>
      reject(request.error || new Error('照片草稿存储不可用'))
    request.onblocked = () =>
      reject(new Error('请关闭旧页面后重试照片草稿存储'))
  })
}
export async function loadUploadDraft(
  key: string,
): Promise<StoredUpload[] | null> {
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('drafts').objectStore('drafts').get(key)
      request.onsuccess = () => {
        const parsed = draftSchema.safeParse(request.result as unknown)
        resolve(
          parsed.success && parsed.data.savedAt >= Date.now() - 7 * 86400000
            ? parsed.data.items
            : null,
        )
      }
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}
export function saveUploadDraft(key: string, items: StoredUpload[]) {
  const previous = writes.get(key) || Promise.resolve()
  const task = previous
    .catch(() => undefined)
    .then(async () => {
      const db = await database()
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction('drafts', 'readwrite')
          if (
            items.reduce((sum, item) => sum + (item.file?.size || 0), 0) >
            50 * 1024 * 1024
          ) {
            reject(new Error('照片草稿超过50MB'))
            return
          }
          if (items.length)
            transaction
              .objectStore('drafts')
              .put({ items, savedAt: Date.now() }, key)
          else transaction.objectStore('drafts').delete(key)
          transaction.oncomplete = () => resolve()
          transaction.onerror = () => reject(transaction.error)
          transaction.onabort = () => reject(transaction.error)
        })
      } finally {
        db.close()
      }
    })
  writes.set(key, task)
  void task
    .finally(() => {
      if (writes.get(key) === task) writes.delete(key)
    })
    .catch(() => undefined)
  return task
}
