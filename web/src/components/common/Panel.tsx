import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
export function Panel({
  title,
  description,
  open,
  onClose,
  children,
  footer,
  drawer = false,
}: {
  title: string
  description?: string
  open: boolean
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  drawer?: boolean
}) {
  const content = (
    <>
      <header className="dialog-head">
        <div>
          {drawer ? (
            <SheetTitle>{title}</SheetTitle>
          ) : (
            <DialogTitle>{title}</DialogTitle>
          )}
          {drawer ? (
            <SheetDescription>{description || ''}</SheetDescription>
          ) : (
            <DialogDescription>{description || ''}</DialogDescription>
          )}
        </div>
      </header>
      <div className="dialog-body">{children}</div>
      {footer && <footer className="dialog-foot">{footer}</footer>}
    </>
  )
  return drawer ? (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose()
      }}
    >
      <SheetContent className="admin-app app-sheet">
        <div className="sheet-frame">{content}</div>
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose()
      }}
    >
      <DialogContent className="admin-app app-dialog">
        <div className="modal-frame">{content}</div>
      </DialogContent>
    </Dialog>
  )
}
