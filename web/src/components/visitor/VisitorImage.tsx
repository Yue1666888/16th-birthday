import { useState } from 'react'
export function VisitorImage({
  src,
  thumbnailSrc,
  alt,
  eager = false,
}: {
  src: string
  thumbnailSrc?: string | null
  alt: string
  eager?: boolean
}) {
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null)
  const [failedOriginal, setFailedOriginal] = useState<string | null>(null)
  const display =
    thumbnailSrc && failedThumbnail !== thumbnailSrc ? thumbnailSrc : src
  if (display === src && failedOriginal === src)
    return (
      <span className="visitor-image-error">
        图片暂时无法显示，点击查看原图
      </span>
    )
  return (
    <img
      src={display}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => {
        if (display !== src) setFailedThumbnail(display)
        else setFailedOriginal(src)
      }}
    />
  )
}
