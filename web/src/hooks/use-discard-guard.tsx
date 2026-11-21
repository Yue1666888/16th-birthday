import { useCallback, useState } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
export function useDiscardGuard(dirty: boolean, onClose: () => void) {
  const [closing, setClosing] = useState(false),
    blocker = useBlocker(dirty)
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (dirty) {
          event.preventDefault()
          event.returnValue = ''
        }
      },
      [dirty],
    ),
  )
  const requestClose = () => {
    if (dirty) setClosing(true)
    else onClose()
  }
  const confirmation = (
    <ConfirmDialog
      open={closing || blocker.state === 'blocked'}
      title="放弃未保存的修改？"
      description="离开后，本次尚未保存的修改将丢失。"
      confirmLabel="放弃"
      onCancel={() => {
        setClosing(false)
        if (blocker.state === 'blocked') blocker.reset()
      }}
      onConfirm={() => {
        setClosing(false)
        if (blocker.state === 'blocked') blocker.proceed()
        else onClose()
      }}
      destructive
    />
  )
  return { requestClose, confirmation }
}
