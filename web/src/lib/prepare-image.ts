import imageCompression from 'browser-image-compression'
import workerUrl from 'browser-image-compression/dist/browser-image-compression.js?url'

// Do not decode many high-resolution photographs in parallel on a phone.
let compressionTail: Promise<unknown> = Promise.resolve()
export function prepareImage(
  file: File,
  signal: AbortSignal,
  onProgress: (value: number) => void,
): Promise<File> {
  const task = compressionTail
    .catch(() => undefined)
    .then(async () => {
      signal.throwIfAborted()
      // Preserve GIF/animated WebP and small originals, including transparent icons.
      if (
        file.type === 'image/gif' ||
        file.type === 'image/webp' ||
        file.size <= 256 * 1024
      )
        return file
      if (file.type === 'image/png' || file.type === 'image/webp') {
        const prefix = new Uint8Array(await file.slice(0, 65536).arrayBuffer())
        if (new TextDecoder('latin1').decode(prefix).match(/acTL|ANIM|ANMF/))
          return file
      }
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1920,
        initialQuality: 0.85,
        useWebWorker: true,
        libURL: new URL(workerUrl, window.location.href).href,
        signal,
        onProgress,
        fileType: file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp',
        preserveExif: false,
      })
      signal.throwIfAborted()
      if (compressed.size >= file.size) return file
      const suffix = compressed.type === 'image/webp' ? '.webp' : '.jpg'
      return new File(
        [compressed],
        file.name.replace(/\.[^.]+$/, '') + suffix,
        { type: compressed.type, lastModified: file.lastModified },
      )
    })
  compressionTail = task
  return task
}

/** Small local previews avoid decoding nine full-resolution images into the DOM. */
export function prepareImagePreview(
  file: File,
  signal: AbortSignal,
): Promise<string> {
  const task = compressionTail
    .catch(() => undefined)
    .then(async () => {
      signal.throwIfAborted()
      try {
        const bitmap = await createImageBitmap(file, {
          resizeWidth: 480,
          resizeQuality: 'medium',
        })
        try {
          signal.throwIfAborted()
          const canvas = document.createElement('canvas')
          canvas.width = bitmap.width
          canvas.height = bitmap.height
          const painter = canvas.getContext('2d')
          if (!painter) throw new Error('无法准备预览')
          painter.drawImage(bitmap, 0, 0)
          const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (value) =>
                value ? resolve(value) : reject(new Error('无法准备预览')),
              'image/webp',
              0.8,
            ),
          )
          signal.throwIfAborted()
          return URL.createObjectURL(blob)
        } finally {
          bitmap.close()
        }
      } catch (failure) {
        if (signal.aborted) throw failure
        return URL.createObjectURL(file)
      }
    })
  compressionTail = task
  return task
}
