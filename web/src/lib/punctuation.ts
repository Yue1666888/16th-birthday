/** Preserve punctuation and offer line breaks between complete phrases first. */
export function punctuationPhrases(text: string): string[] {
  return (
    text.match(
      /[^，。！？；：、,.!?;:]+[，。！？；：、,.!?;:]*|[，。！？；：、,.!?;:]+/gu,
    ) || [text]
  )
}
