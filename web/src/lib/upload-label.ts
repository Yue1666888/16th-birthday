import type { UploadState } from '@/hooks/use-image-uploads'
export function uploadLabel(state: UploadState, progress: number) {
  if (state === 'selected') return '已选择，提交后上传'
  if (state === 'compressing') return `正在压缩 ${progress}%`
  if (state === 'queued') return '等待上传'
  if (state === 'uploading') return `正在上传 ${progress}%`
  if (state === 'processing') return '图传处理中…'
  if (state === 'failed') return '上传失败，可重试'
  return '已上传'
}

export function uploadRetrySeconds(serverSeconds: number, attempt: number) {
  return Math.max(1, Math.min(86400, serverSeconds), Math.min(20, 2 ** attempt))
}
