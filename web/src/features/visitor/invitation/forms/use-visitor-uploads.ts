import { useState } from 'react'
import { uploadVisitorImage } from '@/api/public/invitation.api'
import { useImageUploads } from '@/hooks/use-image-uploads'
import type { ImageItem } from '@/domain/api.types'
import { newSubmissionId } from './drafts'
function photoDraftKey() {
  const storageKey = 'birthday16:photo-draft-key'
  try {
    const existing = sessionStorage.getItem(storageKey)
    if (existing) return existing
    const key = newSubmissionId()
    sessionStorage.setItem(storageKey, key)
    return key
  } catch {
    return undefined
  }
}
export function useVisitorUploads(initial: ImageItem[]) {
  const [key] = useState(photoDraftKey)
  const uploads = useImageUploads(initial, uploadVisitorImage, key)
  return {
    ...uploads,
    draftNotice:
      uploads.draftNotice ||
      (!key ? '本浏览器无法保存照片草稿，请保留当前页面。' : ''),
  }
}
