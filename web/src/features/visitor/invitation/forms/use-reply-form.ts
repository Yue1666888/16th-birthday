import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { submitReply, type ReplyResult } from '@/api/public/invitation.api'
import { AppApiError } from '@/lib/api-error'
import {
  emptyReply,
  replyDraftSchema,
  replySchema,
  type ReplyFormValues,
} from './schemas'
import { readDraft, removeDraft, replyDraftKey, writeDraft } from './drafts'
export function useReplyForm() {
  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: readDraft(replyDraftKey, replyDraftSchema) || emptyReply,
  })
  const [error, setError] = useState<unknown>(null),
    [result, setResult] = useState<ReplyResult | null>(null)
  const sent = useRef(false),
    request = useRef<AbortController | null>(null)
  useEffect(() => {
    const subscription = form.subscribe({
      formState: { values: true },
      callback: (info) => {
        if (info.type === 'change') {
          sent.current = false
          setResult(null)
        }
        if (!sent.current) writeDraft(replyDraftKey, form.getValues())
      },
    })
    return () => {
      subscription()
      request.current?.abort()
    }
  }, [form])
  const submit = (event: FormEvent<HTMLFormElement>) =>
    form.handleSubmit(async (value) => {
      setError(null)
      const controller = new AbortController()
      request.current = controller
      try {
        const saved = await submitReply(value, controller.signal)
        sent.current = true
        form.reset(value)
        removeDraft(replyDraftKey)
        setResult(saved)
      } catch (failure) {
        if (controller.signal.aborted) return
        setError(failure)
        if (failure instanceof AppApiError)
          for (const key of [
            'name',
            'phone',
            'email',
            'attendance',
            'giftChoice',
            'mailingAddress',
          ] as const)
            if (failure.fields[key])
              form.setError(key, { message: failure.fields[key] })
      } finally {
        if (request.current === controller) request.current = null
      }
    })(event)
  const values = form.getValues()
  return {
    form,
    error,
    result,
    submit,
    dirty:
      !result &&
      (form.formState.isDirty ||
        !!(
          values.name ||
          values.phone ||
          values.email ||
          values.mailingAddress
        )),
  }
}
