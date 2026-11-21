import type { OpeningAssetId } from './assets'

export interface OpeningDialogue {
  readonly speaker: string
  readonly start: number
  readonly end: number
  readonly text: string
}
export interface OpeningScene {
  readonly id: string
  readonly title: string
  readonly duration: number
  readonly start: number
  readonly end: number
  readonly wait: string | null
  readonly waitAt: number | null
  readonly desktop: readonly (OpeningAssetId | 'DOM')[]
  readonly mobile: readonly (OpeningAssetId | 'DOM')[]
  readonly shots: readonly string[]
  readonly dialogues: readonly OpeningDialogue[]
  readonly interaction: string
}
