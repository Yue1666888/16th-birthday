import * as Alert from '@radix-ui/react-alert-dialog'
import { useBeforeUnload, useBlocker } from 'react-router'
import { useCallback } from 'react'
export function useInvitationGuard(dirty: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  )
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
  return (
    <Alert.Root open={blocker.state === 'blocked'}>
      <Alert.Portal>
        <Alert.Overlay className="visitor-app invitation-dialog-overlay" />
        <Alert.Content
          className="visitor-app invitation-dialog"
          data-visitor-modal
        >
          <Alert.Title>暂时离开填写页？</Alert.Title>
          <Alert.Description>
            文字和已上传照片会保留在当前标签页的草稿中；尚未上传的照片需要重新选择。
          </Alert.Description>
          <div>
            <Alert.Cancel
              className="visitor-button"
              onClick={() => {
                if (blocker.state === 'blocked') blocker.reset()
              }}
            >
              继续填写
            </Alert.Cancel>
            <Alert.Action
              className="visitor-button"
              onClick={() => {
                if (blocker.state === 'blocked') blocker.proceed()
              }}
            >
              离开并保留草稿
            </Alert.Action>
          </div>
        </Alert.Content>
      </Alert.Portal>
    </Alert.Root>
  )
}
