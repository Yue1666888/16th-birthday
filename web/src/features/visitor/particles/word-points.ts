import { evenlySelectPoints } from './particle-field'
/** Rasterize only when text/layout changes, never inside the frame update. */
export function sampleWordPoints(
  element: HTMLElement,
  mobile: boolean,
  budget: number,
): Float32Array {
  const rect = element.getBoundingClientRect(),
    canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(rect.width))
  canvas.height = Math.max(1, Math.ceil(rect.height))
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return new Float32Array()
  const style = getComputedStyle(element),
    word = element.dataset.particleWord || ''
  context.font = style.fontWeight + ' 100px ' + style.fontFamily
  const size = Math.min(
    rect.height * 0.86,
    ((rect.width - 12) / Math.max(1, context.measureText(word).width)) * 100,
  )
  context.font = style.fontWeight + ' ' + size + 'px ' + style.fontFamily
  context.fillStyle = '#fff'
  context.textAlign = 'center'
  const metrics = context.measureText(word)
  const top =
    (rect.height -
      metrics.actualBoundingBoxAscent -
      metrics.actualBoundingBoxDescent) /
    2
  context.fillText(word, rect.width / 2, top + metrics.actualBoundingBoxAscent)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  const spacing = mobile ? 3.5 : 4.5,
    points: number[] = []
  for (let y = spacing / 2; y < canvas.height; y += spacing) {
    for (let x = spacing / 2; x < canvas.width; x += spacing) {
      if (pixels[(Math.floor(y) * canvas.width + Math.floor(x)) * 4 + 3] > 100)
        points.push(x, y)
    }
  }
  return evenlySelectPoints(points, budget)
}
