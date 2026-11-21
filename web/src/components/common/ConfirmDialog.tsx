import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认',
  onCancel,
  onConfirm,
  destructive = false,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => void
  destructive?: boolean
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onCancel()
      }}
    >
      <AlertDialogContent className="admin-app">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>取消</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? 'bg-red-500 hover:bg-red-600' : ''}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
