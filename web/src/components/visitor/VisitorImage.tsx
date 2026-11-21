import { useState } from 'react'
export function VisitorImage({
  src,
  alt,
  eager = false,
}: {
  src: string
  alt: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)
  if (failed)
    return (
      <span className="visitor-image-error">
        图片暂时无法显示，点击查看原图
      </span>
    )
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
