import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import {
  advanceParticles,
  createParticleField,
  driftParticleTargets,
} from '@/features/visitor/particles/particle-field'
import type { ParticlePointer } from '@/features/visitor/particles/particle-field'
import { sampleWordPoints } from '@/features/visitor/particles/word-points'
interface Settings {
  scene: 'memories' | 'honors'
  mobile: boolean
}
export function VisitorParticles(props: Settings) {
  const host = useRef<HTMLCanvasElement>(null),
    settings = useRef(props)
  const refresh = useRef<(() => void) | null>(null)
  useEffect(() => {
    settings.current = props
    refresh.current?.()
  }, [props])
  useEffect(() => {
    const canvas = host.current
    if (!canvas) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    if (!canvas.getContext('webgl2', { alpha: true, antialias: false })) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
      })
    } catch (error) {
      console.warn('背景粒子不可用，保留静态背景。', error)
      return
    }
    const scene = new THREE.Scene(),
      camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1)
    function makeLayer(capacity: number, opacity: number) {
      const field = createParticleField(capacity),
        geometry = new THREE.BufferGeometry()
      const sizes = new Float32Array(capacity),
        alphas = new Float32Array(capacity)
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(field.positions, 3).setUsage(
          THREE.DynamicDrawUsage,
        ),
      )
      geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
      geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        uniforms: { opacity: { value: opacity }, pixelRatio: { value: 1 } },
        vertexShader:
          'attribute float aSize;attribute float aAlpha;varying float vAlpha;uniform float pixelRatio;void main(){vAlpha=aAlpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=aSize*pixelRatio;}',
        fragmentShader:
          'varying float vAlpha;uniform float opacity;void main(){float d=length(gl_PointCoord-vec2(.5));float core=1.0-smoothstep(.06,.4,d);float glow=(1.0-smoothstep(.12,.5,d))*.2;gl_FragColor=vec4(.38,.85,.94,(core+glow)*vAlpha*opacity);}',
      })
      const points = new THREE.Points(geometry, material)
      points.frustumCulled = false
      geometry.setDrawRange(0, 0)
      scene.add(points)
      return {
        field,
        geometry,
        material,
        sizes,
        alphas,
        homes: new Float32Array(capacity * 2),
      }
    }
    const background = makeLayer(1800, 0.62),
      words = makeLayer(3200, 0.92)
    const seeds = Float32Array.from({ length: 1800 * 3 }, () => Math.random())
    let width = 1,
      height = 1,
      frame = 0,
      last = 0,
      time = 0,
      slow = 0,
      quality = 1
    let backgroundCount = 0,
      wordCount = 0,
      disposed = false,
      dirty = true
    let anchor: HTMLElement | null = null,
      anchorLeft = 0,
      anchorTop = 0,
      anchorHeight = 1
    let sampleKey = ''
    let sampled: Float32Array = new Float32Array()
    let wordVisible = false
    let pointerExpires = 0
    let touchHeld = false
    const pointer: ParticlePointer = { x: 0, y: 0, active: false }
    const populateBackground = () => {
      const mobile = settings.current.mobile
      backgroundCount = Math.floor(
        Math.min(1800, mobile ? 440 : Math.max(850, (width * height) / 950)) *
          quality,
      )
      for (let i = 0; i < backgroundCount; i++) {
        const p = i * 3,
          t = i * 2
        const x = ((i * 0.61803398875 + seeds[p] * 0.025) % 1) * width
        const y = ((i * 0.75487766624 + seeds[p + 1] * 0.025) % 1) * height
        background.homes[t] = x
        background.homes[t + 1] = y
        background.field.positions[p] = x
        background.field.positions[p + 1] = y
        background.field.velocities[t] = 0
        background.field.velocities[t + 1] = 0
        background.sizes[i] = (mobile ? 3 : 3.8) + seeds[p + 2] * 2.5
        background.alphas[i] = 0.35 + seeds[p + 1] * 0.55
      }
      background.geometry.setDrawRange(0, backgroundCount)
      background.geometry.attributes.aSize.needsUpdate = true
      background.geometry.attributes.aAlpha.needsUpdate = true
    }
    const resize = () => {
      const nextWidth = Math.max(1, canvas.clientWidth),
        nextHeight = Math.max(1, canvas.clientHeight)
      const ratio = Math.min(
        devicePixelRatio || 1,
        settings.current.mobile ? 1.25 : 1.5,
      )
      if (
        width !== nextWidth ||
        height !== nextHeight ||
        renderer.getPixelRatio() !== ratio
      ) {
        width = nextWidth
        height = nextHeight
        renderer.setPixelRatio(ratio)
        renderer.setSize(width, height, false)
        camera.right = width
        camera.top = height
        camera.updateProjectionMatrix()
        background.material.uniforms.pixelRatio.value = ratio
        words.material.uniforms.pixelRatio.value = ratio
        populateBackground()
      }
      dirty = true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    const measureWord = () => {
      dirty = false
      const element = document.querySelector<HTMLElement>(
        '[data-particle-word]',
      )
      if (element !== anchor) {
        if (anchor) observer.unobserve(anchor)
        anchor = element
        if (anchor) observer.observe(anchor)
      }
      if (!anchor) {
        wordVisible = false
        return
      }
      const rect = anchor.getBoundingClientRect()
      wordVisible = rect.bottom > 0 && rect.top < height && rect.width > 0
      const key = [
        anchor.dataset.particleWord,
        Math.round(rect.width),
        Math.round(rect.height),
        settings.current.mobile,
        quality,
      ].join(':')
      if (key !== sampleKey) {
        const points = sampleWordPoints(
          anchor,
          settings.current.mobile,
          Math.floor((settings.current.mobile ? 1400 : 3200) * quality),
        )
        const previousCount = wordCount
        sampled = points
        sampleKey = key
        wordCount = sampled.length / 2
        for (let i = 0; i < wordCount; i++) {
          const p = i * 3,
            t = i * 2,
            x = rect.left + sampled[t],
            y = height - rect.top - sampled[t + 1]
          words.homes[t] = x
          words.homes[t + 1] = y
          if (i >= previousCount) {
            words.field.positions[p] = x + Math.cos(i * 2.39996) * 65
            words.field.positions[p + 1] = y + Math.sin(i * 2.39996) * 65
            words.field.velocities[t] = 0
            words.field.velocities[t + 1] = 0
          }
          words.sizes[i] = settings.current.mobile ? 4 : 4.8
          words.alphas[i] = 0.75 + (i % 7) / 28
        }
        words.geometry.attributes.aSize.needsUpdate = true
        words.geometry.attributes.aAlpha.needsUpdate = true
      } else {
        const dx = rect.left - anchorLeft,
          dy = height - anchorHeight + anchorTop - rect.top
        for (let i = 0; i < wordCount; i++) {
          words.field.positions[i * 3] += dx
          words.field.positions[i * 3 + 1] += dy
          words.homes[i * 2] = rect.left + sampled[i * 2]
          words.homes[i * 2 + 1] = height - rect.top - sampled[i * 2 + 1]
        }
      }
      anchorLeft = rect.left
      anchorTop = rect.top
      anchorHeight = height
    }
    const render = (now: number) => {
      frame = 0
      if (
        disposed ||
        document.hidden ||
        reduced.matches ||
        document.querySelector('[data-visitor-modal]')
      )
        return
      const elapsed = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60
      last = now
      time += elapsed
      if (pointer.active && now > pointerExpires) pointer.active = false
      if (dirty) measureWord()
      slow = elapsed > 0.045 ? slow + 1 : Math.max(0, slow - 1)
      if (slow > 120 && quality === 1) {
        quality = 0.7
        populateBackground()
        sampleKey = ''
        dirty = true
      }
      driftParticleTargets(
        background.field.targets,
        background.homes,
        backgroundCount,
        time,
        settings.current.mobile ? 11 : 16,
      )
      if (wordVisible)
        driftParticleTargets(
          words.field.targets,
          words.homes,
          wordCount,
          time,
          settings.current.mobile ? 0.65 : 0.95,
        )
      advanceParticles(
        background.field,
        backgroundCount,
        elapsed,
        pointer,
        72,
        18000,
      )
      if (wordVisible)
        advanceParticles(words.field, wordCount, elapsed, pointer, 65, 23000)
      for (let i = 0; i < backgroundCount; i++)
        background.alphas[i] =
          (0.35 + seeds[i * 3 + 1] * 0.55) *
          (0.86 + Math.sin(time * 0.55 + i) * 0.14)
      background.geometry.attributes.position.needsUpdate = true
      background.geometry.attributes.aAlpha.needsUpdate = true
      words.geometry.attributes.position.needsUpdate = true
      words.geometry.setDrawRange(0, wordVisible ? wordCount : 0)
      renderer.render(scene, camera)
      canvas.dataset.wordReady = wordCount && wordVisible ? 'true' : 'false'
      frame = requestAnimationFrame(render)
    }
    const resume = () => {
      if (!disposed && !frame && !document.hidden && !reduced.matches) {
        last = 0
        frame = requestAnimationFrame(render)
      }
    }
    const invalidate = () => {
      dirty = true
      resume()
    }
    refresh.current = () => {
      resize()
      invalidate()
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        pointer.x = event.clientX
        pointer.y = height - event.clientY
        pointer.active = true
        pointerExpires = Infinity
      }
    }
    const leave = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && !event.relatedTarget)
        pointer.active = false
    }
    // Passive touch events continue during native scrolling after pointercancel.
    const touch = (event: TouchEvent) => {
      const finger = event.touches[0]
      if (!finger) return
      pointer.x = finger.clientX
      pointer.y = height - finger.clientY
      pointer.active = true
      touchHeld = true
      pointerExpires = Infinity
    }
    const endTouch = () => {
      if (touchHeld) pointerExpires = performance.now() + 180
      touchHeld = false
    }
    const blur = () => {
      pointer.active = false
      touchHeld = false
    }
    const visibility = () => {
      cancelAnimationFrame(frame)
      frame = 0
      pointer.active = false
      if (reduced.matches) {
        delete canvas.dataset.wordReady
        renderer.clear()
      }
      invalidate()
    }
    const mutations = new MutationObserver(invalidate)
    mutations.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerout', leave, { passive: true })
    window.addEventListener('touchstart', touch, { passive: true })
    window.addEventListener('touchmove', touch, { passive: true })
    window.addEventListener('touchend', endTouch, { passive: true })
    window.addEventListener('touchcancel', endTouch, { passive: true })
    window.addEventListener('blur', blur)
    window.addEventListener('scroll', invalidate, { passive: true })
    document.addEventListener('visibilitychange', visibility)
    reduced.addEventListener('change', visibility)
    void document.fonts.ready.then(() => {
      if (!disposed) {
        sampleKey = ''
        invalidate()
      }
    })
    resume()
    return () => {
      disposed = true
      refresh.current = null
      cancelAnimationFrame(frame)
      delete canvas.dataset.wordReady
      observer.disconnect()
      mutations.disconnect()
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerout', leave)
      window.removeEventListener('touchstart', touch)
      window.removeEventListener('touchmove', touch)
      window.removeEventListener('touchend', endTouch)
      window.removeEventListener('touchcancel', endTouch)
      window.removeEventListener('blur', blur)
      window.removeEventListener('scroll', invalidate)
      document.removeEventListener('visibilitychange', visibility)
      reduced.removeEventListener('change', visibility)
      for (const layer of [background, words]) {
        layer.geometry.dispose()
        layer.material.dispose()
      }
      renderer.dispose()
    }
  }, [])
  return <canvas ref={host} className="visitor-particles" aria-hidden="true" />
}
