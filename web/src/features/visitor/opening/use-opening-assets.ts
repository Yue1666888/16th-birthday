import { useCallback, useEffect, useState } from 'react'
import { openingAssets } from './assets'
import { openingScenes } from './script'

type Status = 'loaded' | 'failed'
const decoded = new Map<string, Promise<void>>()
function decodeImage(url: string) {
  const old = decoded.get(url)
  if (old) return old
  const task = new Promise<void>((resolve, reject) => {
    const image = new Image()
    const timer = setTimeout(() => {
      image.src = ''
      reject(new Error('图像准备超时'))
    }, 12000)
    image.onload = () => {
      image.decode().then(
        () => {
          clearTimeout(timer)
          resolve()
        },
        () => {
          clearTimeout(timer)
          reject(new Error('图像解码失败'))
        },
      )
    }
    image.onerror = () => {
      clearTimeout(timer)
      reject(new Error('图像加载失败'))
    }
    image.src = url
  }).catch((error: unknown) => {
    decoded.delete(url)
    throw error
  })
  decoded.set(url, task)
  return task
}

export function useOpeningAssets(mobile: boolean) {
  const [statuses, setStatuses] = useState<Record<string, Status>>({})
  const [attempt, setAttempt] = useState(0)
  const [fontReady, setFontReady] = useState(false)
  const core: [string, number][] = [
    [openingAssets[mobile ? 'M01' : 'D01'], 25],
    [openingAssets.B01, 15],
    [openingAssets[mobile ? 'M02' : 'D02'], 20],
    ['/brand/sipc-emblem.png', 10],
    [openingAssets.DIALOGUE, 10],
    [openingAssets.NARRATION, 10],
  ]
  useEffect(() => {
    let active = true
    const load = async (url: string) => {
      try {
        await decodeImage(url)
        if (active) setStatuses((s) => ({ ...s, [url]: 'loaded' }))
      } catch {
        if (active) setStatuses((s) => ({ ...s, [url]: 'failed' }))
      }
    }
    const first = [
      openingAssets[mobile ? 'M01' : 'D01'],
      openingAssets.B01,
      openingAssets[mobile ? 'M02' : 'D02'],
      '/brand/sipc-emblem.png',
      openingAssets.DIALOGUE,
      openingAssets.NARRATION,
    ]
    const rest = [
      ...new Set(
        openingScenes.flatMap((s) =>
          [...(mobile ? s.mobile : s.desktop)]
            .filter((id) => id !== 'DOM')
            .map((id) => openingAssets[id]),
        ),
      ),
    ].filter((url) => !first.includes(url))
    void Promise.all(first.map(load)).then(async () => {
      // Small batches keep late-scene prefetch from competing with the first frame.
      for (let i = 0; i < rest.length && active; i += 3)
        await Promise.all(rest.slice(i, i + 3).map(load))
    })
    void Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => setTimeout(resolve, 1500)),
    ]).then(() => {
      if (active) setFontReady(true)
    })
    return () => {
      active = false
    }
  }, [mobile, attempt])
  const retry = useCallback(() => {
    setStatuses((s) =>
      Object.fromEntries(
        Object.entries(s).filter(([, status]) => status === 'loaded'),
      ),
    )
    setAttempt((n) => n + 1)
  }, [])
  const sceneAssets = (index: number) => {
    const scene = openingScenes[index]
    return (mobile ? scene.mobile : scene.desktop)
      .filter((id) => id !== 'DOM')
      .map((id) => openingAssets[id])
  }
  const isReady = (index: number) =>
    sceneAssets(index).every((url) => statuses[url] === 'loaded')
  const hasFailure = (index: number) =>
    sceneAssets(index).some((url) => statuses[url] === 'failed')
  const progress =
    5 +
    (fontReady ? 5 : 0) +
    core.reduce(
      (sum, [url, weight]) => sum + (statuses[url] === 'loaded' ? weight : 0),
      0,
    )
  return {
    progress,
    ready: progress === 100,
    coreFailed: core.some(([url]) => statuses[url] === 'failed'),
    isReady,
    hasFailure,
    retry,
  }
}
