import type { FormEvent } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { publishMemory } from '@/api/public/invitation.api'
import type { MemoryDetail } from '@/types/public/walls.types'
import { AppApiError } from '@/lib/api-error'
import { invalidatePublicMemories } from '@/hooks/use-paged-feed'
import {
  contributionSchema,
  emptyContribution,
  storedMemorySchema,
  type ContributionFormValues,
  type MemoryPayload,
} from './schemas'
import {
  memoryDraftKey,
  newSubmissionId,
  readDraft,
  removeDraft,
  writeDraft,
} from './drafts'
import { useVisitorUploads } from './use-visitor-uploads'
export function useContributionForm(onPublished: () => void) {
  const [stored] = useState(() => readDraft(memoryDraftKey, storedMemorySchema))
  const form = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionSchema),
    defaultValues: stored?.fields || emptyContribution,
  })
  const uploads = useVisitorUploads(stored?.images || [])
  const [attempt, setAttempt] = useState<MemoryPayload | null>(
    stored?.attempt || null,
  )
  const [error, setError] = useState<unknown>(null),
    [result, setResult] = useState<MemoryDetail | null>(null)
  const frozen = useRef<MemoryPayload | null>(stored?.attempt || null),
    request = useRef<AbortController | null>(null)
  const images = useRef(stored?.images || [])
  const sent = useRef(false)
  const persist = () =>
    writeDraft(memoryDraftKey, {
      fields: form.getValues(),
      images: images.current,
      attempt: frozen.current,
    })
  useLayoutEffect(() => {
    images.current = uploads.items.flatMap((item) =>
      item.image ? [item.image] : [],
    )
    const ids = images.current.map((image) => image.id)
    if (JSON.stringify(ids) !== JSON.stringify(form.getValues('imageIds')))
      form.setValue('imageIds', ids, {
        shouldValidate: true,
        shouldDirty: uploads.items.length > 0,
      })
    if (
      !sent.current &&
      (images.current.length || form.formState.isDirty || frozen.current)
    )
      writeDraft(memoryDraftKey, {
        fields: form.getValues(),
        images: images.current,
        attempt: frozen.current,
      })
  }, [uploads.items, form])
  useEffect(() => {
    const subscription = form.subscribe({
      formState: { values: true },
      callback: (info) => {
        if (info.type === 'change') {
          sent.current = false
          setResult(null)
        }
        if (!sent.current)
          writeDraft(memoryDraftKey, {
            fields: form.getValues(),
            images: images.current,
            attempt: frozen.current,
          })
      },
    })
    return () => {
      subscription()
      request.current?.abort()
    }
  }, [form])
  const submit = (event: FormEvent<HTMLFormElement>) =>
    form.handleSubmit(async (value) => {
      if (uploads.busy || uploads.failed) return
      const payload = frozen.current || {
        submissionId: newSubmissionId(),
        displayName: value.displayName || null,
        title: value.title || null,
        content: value.content || null,
        imageIds: [...value.imageIds],
      }
      frozen.current = payload
      setAttempt(payload)
      persist()
      setError(null)
      const controller = new AbortController()
      request.current = controller
      try {
        const saved = await publishMemory(payload, controller.signal)
        sent.current = true
        frozen.current = null
        setAttempt(null)
        uploads.clear()
        form.reset(emptyContribution)
        removeDraft(memoryDraftKey)
        setResult(saved)
        invalidatePublicMemories()
        onPublished()
      } catch (failure) {
        if (controller.signal.aborted) return
        setError(failure)
        if (
          failure instanceof AppApiError &&
          failure.status >= 400 &&
          failure.status < 500 &&
          failure.code !== 'IDEMPOTENCY_CONFLICT'
        ) {
          frozen.current = null
          setAttempt(null)
          persist()
          for (const key of [
            'displayName',
            'title',
            'content',
            'imageIds',
          ] as const)
            if (failure.fields[key])
              form.setError(key, { message: failure.fields[key] })
        }
      } finally {
        if (request.current === controller) request.current = null
      }
    })(event)
  const values = form.getValues()
  return {
    form,
    uploads: {
      ...uploads,
      add: (files: FileList | File[]) => {
        sent.current = false
        setResult(null)
        uploads.add(files)
      },
    },
    submit,
    error,
    result,
    uncertain: !!attempt && !form.formState.isSubmitting,
    locked: !!attempt,
    dirty:
      !!attempt ||
      uploads.busy ||
      uploads.items.length > 0 ||
      (!result &&
        (form.formState.isDirty ||
          !!(values.displayName || values.title || values.content))),
  }
}
