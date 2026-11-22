import { useState } from 'react'
import type { OpeningDialogue } from './types'
import { typedText } from './playback'
import { punctuationPhrases } from '@/lib/punctuation'
import { openingAssets } from './assets'

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
  let offset = 0
  const visibleCount = Array.from(text).length
  return (
    <div
      className={`opening-caption ${narrator ? 'is-narration' : 'is-dialogue'} ${sceneId === 'S01' ? 'is-prologue' : ''} ${sceneId === 'S11' ? 'is-letter-copy' : ''}`}
    >
      <img
        className="opening-caption-art"
        src={narrator ? openingAssets.NARRATION : openingAssets.DIALOGUE}
        alt=""
        aria-hidden="true"
      />
      <span className="opening-caption-label">{narrator ? '115' : 'SIPC'}</span>
      <span className="opening-speaker">
        {narrator
          ? '回到115的路上'
          : line.speaker === '大家'
            ? '115的大家'
            : '同行的同学'}
      </span>
      <button
        className="opening-typewriter"
        type="button"
        onClick={() => setRevealed(true)}
        aria-label={line.text + '，点击显示整句'}
      >
        <span className="opening-sr-only">{line.text}</span>
        <span aria-hidden="true" className="opening-phrases">
          {punctuationPhrases(line.text).map((phrase, phraseIndex) => (
            <span className="reading-phrase" key={phraseIndex}>
              {Array.from(phrase).map((character) => {
                const index = offset++
                return (
                  <span
                    key={index}
                    className={
                      index === visibleCount - 1 &&
                      visibleCount < Array.from(line.text).length
                        ? 'opening-last-character'
                        : undefined
                    }
                    style={{
                      visibility: index < visibleCount ? 'visible' : 'hidden',
                    }}
                  >
                    {character}
                  </span>
                )
              })}
            </span>
          ))}
        </span>
      </button>
    </div>
  )
}
