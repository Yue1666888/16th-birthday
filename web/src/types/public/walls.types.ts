import type { ImageItem } from '@/domain/api.types'
export interface MemorySummary {
  id: string
  displayName: string | null
  title: string | null
  excerpt: string | null
  coverImage: ImageItem | null
  imageCount: number
  publishedAt: string
}
export interface MemoryDetail {
  id: string
  displayName: string | null
  title: string | null
  content: string | null
  images: ImageItem[]
  publishedAt: string
}
export interface PublicHonor {
  id: string
  title: string
  people: string
  images: ImageItem[]
}
