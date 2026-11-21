import { useCallback, useEffect, useRef, useState } from 'react'
export interface MemorySelection {
  id: string
  pinned: boolean
  anchor: HTMLElement
}
export function useMemoryPreview() {
  const [selection, setSelection] = useState<MemorySelection | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const suppressFocus = useRef(false)
  const cancel = useCallback(() => {
    clearTimeout(timer.current)
  }, [])
  const close = useCallback(
    (restore = false) => {
      cancel()
      if (restore && selection) {
        const anchor = selection.anchor.isConnected
          ? selection.anchor
          : document.querySelector<HTMLElement>(
              '[data-memory-id="' + CSS.escape(selection.id) + '"]',
            )
        suppressFocus.current = true
        anchor?.focus({ preventScroll: true })
        suppressFocus.current = false
      }
      setSelection(null)
    },
    [cancel, selection],
  )
  const open = (id: string, anchor: HTMLElement, pinned: boolean) => {
    cancel()
    if (suppressFocus.current) return
    if (pinned)
      setSelection((previous) =>
        previous?.id === id && previous.pinned
          ? null
          : { id, anchor, pinned: true },
      )
    else
      timer.current = setTimeout(
        () =>
          setSelection((previous) =>
            previous?.pinned ? previous : { id, anchor, pinned: false },
          ),
        180,
      )
  }
  const leave = () => {
    cancel()
    timer.current = setTimeout(
      () => setSelection((previous) => (previous?.pinned ? previous : null)),
      160,
    )
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  const pin = () => {
    cancel()
    setSelection((previous) =>
      previous ? { ...previous, pinned: true } : null,
    )
  }
  return { selection, open, close, cancel, leave, pin }
}
