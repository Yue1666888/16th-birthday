import { punctuationPhrases } from '@/lib/punctuation'

export function PunctuatedText({ text }: { text: string }) {
  return (
    <>
      {punctuationPhrases(text).map((phrase, index) => (
        <span className="reading-phrase" key={index}>
          {phrase}
        </span>
      ))}
    </>
  )
}
