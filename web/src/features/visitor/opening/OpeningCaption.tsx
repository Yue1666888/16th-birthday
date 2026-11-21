import { useState } from 'react'
import type { OpeningDialogue } from './types'
import { typedText } from './playback'

export function OpeningCaption({
  line,
  time,
  reduced,
  sceneId,
}: {
  line: OpeningDialogue
  time: number
  reduced: boolean
  sceneId: string
}) {
  const [revealed, setRevealed] = useState(false)
  const narrator = ['旁白', '同行提示', '信中文字'].includes(line.speaker)
  const text = revealed
    ? line.text
    : typedText(line.text, time - line.start, line.end - line.start, reduced)
  return (
    <div
      className={`opening-caption ${narrator ? 'is-narration' : 'is-dialogue'} ${sceneId === 'S01' ? 'is-prologue' : ''} ${sceneId === 'S11' ? 'is-letter-copy' : ''}`}
    >
      {!narrator && (
        <span className="opening-speaker">
          {line.speaker === '大家' ? '115的大家' : '同行的同学'}
          <i aria-hidden="true">✦</i>
        </span>
      )}
      <button
        className="opening-typewriter"
        type="button"
        onClick={() => setRevealed(true)}
        aria-label={line.text + '，点击显示整句'}
      >
        <span className="opening-sr-only">{line.text}</span>
        <span aria-hidden="true">
          {text}
          <span className="opening-caret">│</span>
        </span>
      </button>
      {!revealed && text !== line.text && (
        <small aria-hidden="true">轻点文字，读完这一句</small>
      )}
    </div>
  )
}
