import { useEffect, useRef } from 'react'
import * as THREE from 'three'
interface Settings {
  scene: 'memories' | 'honors'
  mobile: boolean
}
export function VisitorParticles(props: Settings) {
  const host = useRef<HTMLCanvasElement>(null)
  const settings = useRef(props)
  useEffect(() => {
    settings.current = props
  }, [props])
  useEffect(() => {
    const canvas = host.current
    if (!canvas) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let renderer: THREE.WebGLRenderer
    // No WebGL is a supported static fallback, not a content loading failure.
    if (!canvas.getContext('webgl2', { alpha: true, antialias: false })) return
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
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1)
    const count = 900
    const positions = new Float32Array(count * 3)
    const seeds = Float32Array.from({ length: count * 4 }, () => Math.random())
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      uniforms: { opacity: { value: 0.5 }, ratio: { value: 1 } },
      vertexShader:
        'uniform float ratio; void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_PointSize=2.2*ratio;}',
      fragmentShader:
        'uniform float opacity; void main(){float d=length(gl_PointCoord-vec2(.5)); float a=1.0-smoothstep(.05,.5,d);gl_FragColor=vec4(.28,.76,.84,a*opacity);}',
    })
    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    scene.add(points)
    const fireflyPositions = new Float32Array(32 * 3)
    const fireflyAlphas = new Float32Array(32)
    const fireflyGeometry = new THREE.BufferGeometry()
    fireflyGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(fireflyPositions, 3),
    )
    fireflyGeometry.setAttribute(
      'alpha',
      new THREE.BufferAttribute(fireflyAlphas, 1),
    )
    const fireflyMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      uniforms: { opacity: { value: 0.35 }, ratio: { value: 1 } },
      vertexShader:
        'attribute float alpha; varying float vAlpha; uniform float ratio; void main(){vAlpha=alpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=3.8*ratio;}',
      fragmentShader:
        'varying float vAlpha; uniform float opacity; void main(){float d=length(gl_PointCoord-vec2(.5)); float a=1.0-smoothstep(.05,.5,d);gl_FragColor=vec4(.28,.76,.84,a*opacity*vAlpha);}',
    })
    const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial)
    fireflies.frustumCulled = false
    scene.add(fireflies)
    let width = 1,
      height = 1,
      frame = 0,
      last = 0,
      time = 0,
      slow = 0,
      sceneAge = 0
    let currentScene = settings.current.scene
    let mouseX = 0,
      mouseY = 0
    const resize = () => {
      width = Math.max(1, canvas.clientWidth)
      height = Math.max(1, canvas.clientHeight)
      const ratio = Math.min(
        devicePixelRatio || 1,
        settings.current.mobile ? 1.25 : 1.5,
      )
      renderer.setPixelRatio(ratio)
      renderer.setSize(width, height, false)
      material.uniforms.ratio.value = ratio
      fireflyMaterial.uniforms.ratio.value = ratio
      camera.right = width
      camera.top = height
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    const pointer = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.clientY < 350) {
        mouseX = (event.clientX / width - 0.5) * 16
        mouseY = (event.clientY / height - 0.5) * 10
      }
    }
    window.addEventListener('pointermove', pointer, { passive: true })
    const render = (now: number) => {
      frame = 0
      if (document.hidden || document.querySelector('[data-visitor-modal]'))
        return
      const dt = Math.min((now - (last || now)) / 1000, 0.06)
      last = now
      time += dt
      sceneAge += dt
      if (currentScene !== settings.current.scene) {
        currentScene = settings.current.scene
        sceneAge = 0
      }
      const mobile = settings.current.mobile
      if (dt > 0.045) slow = Math.min(slow + 1, 120)
      const visible = slow > 70 ? (mobile ? 180 : 400) : mobile ? 300 : count
      geometry.setDrawRange(0, visible)
      const smooth = reduced.matches ? 1 : 1 - Math.exp(-dt * 4)
      for (let i = 0; i < visible; i++) {
        const seed = i * 4
        const angle = seeds[seed] * Math.PI * 2
        const radius = 65 + seeds[seed + 1] * 80
        const ring = currentScene === 'honors'
        const scatter = reduced.matches ? 0 : Math.max(0, 1 - sceneAge / 0.8)
        const targetX =
          width * (mobile ? 0.82 : 0.8) +
          (ring ? Math.cos(angle) * radius : (seeds[seed] - 0.5) * 290) +
          (seeds[seed + 2] - 0.5) * scatter * 200 +
          (reduced.matches ? 0 : mouseX)
        const targetY =
          height -
          (mobile ? 170 : 225) +
          (ring
            ? Math.sin(angle) * radius * 0.65
            : (seeds[seed + 1] - 0.5) * 115) +
          (reduced.matches ? 0 : Math.sin(time * 0.25 + angle) * 4 + mouseY)
        const x = i * 3
        if (!positions[x]) {
          positions[x] = targetX + (seeds[seed + 3] - 0.5) * 200
          positions[x + 1] = targetY
        }
        positions[x] += (targetX - positions[x]) * smooth
        positions[x + 1] += (targetY - positions[x + 1]) * smooth
      }
      geometry.attributes.position.needsUpdate = true
      material.uniforms.opacity.value = mobile ? 0.33 : 0.48
      const flyCount = mobile ? 12 : 32
      fireflyGeometry.setDrawRange(0, flyCount)
      for (let i = 0; i < flyCount; i++) {
        const seed = i * 4
        const life =
          (seeds[seed + 1] + time * (0.008 + seeds[seed + 2] * 0.012)) % 1
        fireflyPositions[i * 3] =
          seeds[seed] * width + Math.sin(time * 0.15 + i) * 12
        fireflyPositions[i * 3 + 1] = life * height
        fireflyAlphas[i] = Math.sin(life * Math.PI)
      }
      fireflyGeometry.attributes.position.needsUpdate = true
      fireflyGeometry.attributes.alpha.needsUpdate = true
      fireflyMaterial.uniforms.opacity.value = mobile ? 0.2 : 0.32
      renderer.render(scene, camera)
      if (!reduced.matches) frame = requestAnimationFrame(render)
    }
    const resume = () => {
      if (!frame) {
        last = 0
        frame = requestAnimationFrame(render)
      }
    }
    const visibility = () => {
      cancelAnimationFrame(frame)
      frame = 0
      if (!document.hidden) resume()
    }
    // Modal open/close pauses the canvas without coupling the frame loop to React renders.
    const modals = new MutationObserver(resume)
    modals.observe(document.body, { childList: true, subtree: true })
    document.addEventListener('visibilitychange', visibility)
    reduced.addEventListener('change', visibility)
    resume()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      modals.disconnect()
      window.removeEventListener('pointermove', pointer)
      document.removeEventListener('visibilitychange', visibility)
      reduced.removeEventListener('change', visibility)
      geometry.dispose()
      material.dispose()
      fireflyGeometry.dispose()
      fireflyMaterial.dispose()
      renderer.dispose()
    }
  }, [])
  return <canvas ref={host} className="visitor-particles" aria-hidden="true" />
}
