import * as THREE from 'three'
import {
  advanceParticles,
  createParticleField,
  evenlySelectPoints,
} from '@/features/visitor/particles/particle-field'
import type { ParticlePointer } from '@/features/visitor/particles/particle-field'
import { sampleWordPoints } from '@/features/visitor/particles/word-points'
let outline: Float32Array | null = null
let outlinePromise: Promise<void> | null = null
function loadOutline() {
  if (!outlinePromise)
    outlinePromise = new Promise<void>((resolve) => {
      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) {
          resolve()
          return
        }
        context.drawImage(image, 0, 0, 256, 256)
        const pixels = context.getImageData(0, 0, 256, 256).data,
          points: number[] = []
        const value = (x: number, y: number) => {
          if (x < 0 || y < 0 || x >= 256 || y >= 256) return 0
          const i = (y * 256 + x) * 4
          return pixels[i + 3] < 80
            ? 0
            : (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3 > 200
              ? 2
              : 1
        }
        for (let y = 0; y < 256; y += 2)
          for (let x = 0; x < 256; x += 2) {
            const current = value(x, y)
            if (
              current &&
              [
                [x - 2, y],
                [x + 2, y],
                [x, y - 2],
                [x, y + 2],
              ].some(([nx, ny]) => value(nx, ny) !== current)
            )
              points.push(x / 256 - 0.5, y / 256 - 0.5)
          }
        outline = evenlySelectPoints(points, 2200)
        resolve()
      }
      image.onerror = () => resolve()
      image.src = '/brand/sipc-emblem.png'
    })
  return outlinePromise
}
function namePoints(name: string, font: number) {
  const letters = [...name],
    canvas = document.createElement('canvas')
  canvas.width = Math.ceil(font * 1.25)
  canvas.height = Math.ceil(Math.max(1, letters.length) * font * 1.15)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return { points: new Float32Array(), height: canvas.height }
  context.font = '600 ' + font + 'px "Microsoft YaHei", sans-serif'
  context.fillStyle = '#fff'
  context.textAlign = 'center'
  context.textBaseline = 'top'
  letters.forEach((letter, index) =>
    context.fillText(letter, canvas.width / 2, index * font * 1.15),
  )
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data,
    points: number[] = []
  const step = font > 50 ? 2.7 : 2
  for (let y = 1; y < canvas.height; y += step)
    for (let x = 1; x < canvas.width; x += step)
      if (pixels[(Math.floor(y) * canvas.width + Math.floor(x)) * 4 + 3] > 90)
        points.push(x - canvas.width / 2, y)
  return { points: new Float32Array(points), height: canvas.height }
}
export function createInvitationScene(scene: THREE.Scene) {
  const namesMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    uniforms: {
      time: { value: 0 },
      left: { value: 0 },
      top: { value: 0 },
      width: { value: 1 },
      height: { value: 1 },
      viewport: { value: 1 },
      ratio: { value: 1 },
      pointSize: { value: 1.8 },
      speed: { value: 35 },
      pointer: { value: new THREE.Vector2() },
      push: { value: 0 },
    },
    vertexShader:
      'attribute float aCycle;attribute float aDirection;varying float vAlpha;uniform float time,left,top,width,height,viewport,ratio,pointSize,speed,push;uniform vec2 pointer;void main(){float yy=mod(position.y+time*speed*aDirection,aCycle);float xx=position.x+(yy-height*.5)*.09;vec2 p=vec2(left+xx,viewport-top-yy);vec2 d=p-pointer;float len=length(d);p+=d/max(len,.01)*pow(max(0.,1.-len/72.),2.)*48.*push;float x=p.x-left;float y=viewport-p.y-top;vAlpha=smoothstep(0.,32.,y)*(1.-smoothstep(height-32.,height,y))*step(0.,x)*step(x,width);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,0.,1.);gl_PointSize=pointSize*ratio;}',
    fragmentShader:
      'varying float vAlpha;void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.-smoothstep(.08,.5,d);gl_FragColor=vec4(.68,.92,.98,a*vAlpha*.86);}',
  })
  let namesGeometry = new THREE.BufferGeometry()
  const namesMesh = new THREE.Points(namesGeometry, namesMaterial)
  namesMesh.frustumCulled = false
  scene.add(namesMesh)
  const field = createParticleField(6500),
    positions = new THREE.BufferAttribute(field.positions, 3).setUsage(
      THREE.DynamicDrawUsage,
    )
  const markGeometry = new THREE.BufferGeometry()
  markGeometry.setAttribute('position', positions)
  const markMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    uniforms: {
      ratio: { value: 1 },
      opacity: { value: 0.9 },
      size: { value: 3 },
    },
    vertexShader:
      'uniform float ratio,size;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=size*ratio;}',
    fragmentShader:
      'uniform float opacity;void main(){float d=length(gl_PointCoord-vec2(.5));gl_FragColor=vec4(.65,.92,1.,(1.-smoothstep(.05,.5,d))*opacity);}',
  })
  const markMesh = new THREE.Points(markGeometry, markMaterial)
  markMesh.frustumCulled = false
  scene.add(markMesh)
  namesGeometry.setDrawRange(0, 0)
  markGeometry.setDrawRange(0, 0)
  const scatter = new Float32Array(13000)
  let dirty = true,
    disposed = false,
    nameKey = '',
    markKey = '',
    pattern = '',
    markCount = 0,
    morphStart = -99
  let nameAnchor: HTMLElement | null = null,
    markAnchor: HTMLElement | null = null
  let namesRect: DOMRect | null = null,
    markRect: DOMRect | null = null,
    lastMarkRect: DOMRect | null = null
  let lastViewport = 1
  void loadOutline().then(() => {
    if (!disposed) {
      markKey = ''
      dirty = true
    }
  })
  const hide = () => {
    namesGeometry.setDrawRange(0, 0)
    markGeometry.setDrawRange(0, 0)
  }
  const rebuildNames = (mobile: boolean, quality: number) => {
    if (!nameAnchor || !namesRect) return
    const pool = Array.from(
      nameAnchor.querySelectorAll<HTMLElement>('[data-invitation-name]'),
    )
      .map((element) => element.textContent?.trim() || '')
      .filter(Boolean)
    const key = [
      pool.join('|'),
      Math.round(namesRect.width),
      Math.round(namesRect.height),
      mobile,
      quality,
    ].join(':')
    if (key === nameKey) return
    nameKey = key
    const columns = mobile ? 3 : 4,
      font = mobile ? 36 : 68
    const records: number[] = []
    for (let column = 0; column < columns; column++) {
      const lane = pool.filter((_, index) => index % columns === column)
      if (!lane.length && pool.length) lane.push(pool[column % pool.length])
      if (!lane.length) continue
      const templates = lane.map((name) => namePoints(name, font)),
        longest = Math.max(...templates.map((template) => template.height))
      let cycle = templates.reduce(
          (sum, template) => sum + template.height + font,
          0,
        ),
        repeats = 1
      while (cycle * repeats < namesRect.height + longest + font) repeats++
      cycle *= repeats
      let offset = 0
      for (let repeat = 0; repeat < repeats; repeat++)
        for (const template of templates) {
          for (let p = 0; p < template.points.length; p += 2)
            records.push(
              ((column + 0.5) * namesRect.width) / columns + template.points[p],
              offset + template.points[p + 1] + column * 61,
              cycle,
              column % 2 ? -1 : 1,
            )
          offset += template.height + font
        }
    }
    const count = Math.min(
      Math.floor((mobile ? 9500 : 19000) * quality),
      records.length / 4,
    )
    const vertices = new Float32Array(count * 3),
      cycles = new Float32Array(count),
      directions = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const source = Math.floor((i * (records.length / 4)) / count) * 4
      vertices[i * 3] = records[source]
      vertices[i * 3 + 1] = records[source + 1]
      cycles[i] = records[source + 2]
      directions[i] = records[source + 3]
    }
    const next = new THREE.BufferGeometry()
    next.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    next.setAttribute('aCycle', new THREE.BufferAttribute(cycles, 1))
    next.setAttribute('aDirection', new THREE.BufferAttribute(directions, 1))
    namesGeometry.dispose()
    namesGeometry = next
    namesMesh.geometry = next
  }
  const rebuildMark = (
    mobile: boolean,
    quality: number,
    time: number,
    viewport: number,
  ) => {
    if (!markAnchor || !markRect) return
    const nextPattern = markAnchor.dataset.invitationPattern || 'SIPC'
    const key = [
      nextPattern,
      Math.round(markRect.width),
      Math.round(markRect.height),
      mobile,
      quality,
      !!outline,
    ].join(':')
    if (key !== markKey) {
      let sampled: Float32Array
      if (nextPattern === 'LOGO') {
        if (!outline) return
        const size = Math.min(markRect.width, markRect.height) * 0.86
        sampled = Float32Array.from(
          outline,
          (value, index) =>
            value * size + (index % 2 ? markRect!.height : markRect!.width) / 2,
        )
      } else sampled = sampleWordPoints(markAnchor, mobile, 6500)
      if (!sampled.length) return
      const previous = markCount
      markCount = Math.floor((mobile ? 2300 : 5400) * quality)
      if (pattern && pattern !== nextPattern) morphStart = time
      for (let i = 0; i < markCount; i++) {
        const source = Math.floor((i * (sampled.length / 2)) / markCount) * 2,
          t = i * 2,
          p = i * 3
        homes[t] = markRect.left + sampled[source]
        homes[t + 1] = viewport - markRect.top - sampled[source + 1]
        if (i >= previous) {
          field.positions[p] = homes[t] + Math.cos(i * 2.4) * 80
          field.positions[p + 1] = homes[t + 1] + Math.sin(i * 2.4) * 80
        }
        scatter[t] =
          markRect.left + markRect.width * (0.5 + Math.sin(i * 2.39996) * 0.85)
        scatter[t + 1] =
          viewport -
          markRect.top -
          markRect.height * (0.5 + Math.cos(i * 1.73) * 0.9)
      }
      pattern = nextPattern
      markKey = key
      lastMarkRect = markRect
    } else if (lastMarkRect) {
      const dx = markRect.left - lastMarkRect.left,
        dy = viewport - lastViewport + lastMarkRect.top - markRect.top
      for (let i = 0; i < markCount; i++) {
        field.positions[i * 3] += dx
        field.positions[i * 3 + 1] += dy
        homes[i * 2] += dx
        homes[i * 2 + 1] += dy
        scatter[i * 2] += dx
        scatter[i * 2 + 1] += dy
      }
      lastMarkRect = markRect
    }
  }
  const homes = new Float32Array(13000)
  return {
    invalidate() {
      dirty = true
    },
    hide,
    update({
      time,
      elapsed,
      viewport,
      mobile,
      pointer,
      ratio,
      quality,
    }: {
      time: number
      elapsed: number
      viewport: number
      mobile: boolean
      pointer: ParticlePointer
      ratio: number
      quality: number
    }) {
      if (dirty) {
        nameAnchor = document.querySelector<HTMLElement>(
          '[data-invitation-names]',
        )
        markAnchor = document.querySelector<HTMLElement>(
          '[data-invitation-pattern]',
        )
        namesRect = nameAnchor?.getBoundingClientRect() || null
        markRect = markAnchor?.getBoundingClientRect() || null
        rebuildNames(mobile, quality)
        rebuildMark(mobile, quality, time, viewport)
        lastViewport = viewport
        dirty = false
      }
      if (!namesRect || !markRect) {
        hide()
        return false
      }
      const namesVisible = namesRect.bottom > 0 && namesRect.top < viewport,
        markVisible = markRect.bottom > 0 && markRect.top < viewport
      namesGeometry.setDrawRange(
        0,
        namesVisible ? namesGeometry.getAttribute('position')?.count || 0 : 0,
      )
      namesMaterial.uniforms.time.value = time
      namesMaterial.uniforms.left.value = namesRect.left
      namesMaterial.uniforms.top.value = namesRect.top
      namesMaterial.uniforms.width.value = namesRect.width
      namesMaterial.uniforms.height.value = namesRect.height
      namesMaterial.uniforms.viewport.value = viewport
      namesMaterial.uniforms.ratio.value = ratio
      namesMaterial.uniforms.speed.value = mobile ? 24 : 37
      namesMaterial.uniforms.pointSize.value = mobile ? 1.65 : 1.8
      namesMaterial.uniforms.pointer.value.set(pointer.x, pointer.y)
      namesMaterial.uniforms.push.value +=
        (Number(pointer.active) - namesMaterial.uniforms.push.value) *
        (1 - Math.exp(-elapsed * 10))
      if (markVisible && markCount) {
        const age = time - morphStart,
          spreading = age >= 0 && age < 0.55
        for (let i = 0; i < markCount * 2; i++)
          field.targets[i] = spreading ? scatter[i] : homes[i]
        advanceParticles(field, markCount, elapsed, pointer, 72, 18000)
        positions.needsUpdate = true
        markGeometry.setDrawRange(0, markCount)
        markMaterial.uniforms.ratio.value = ratio
        markMaterial.uniforms.size.value = mobile ? 2.6 : 3.1
        markMaterial.uniforms.opacity.value = spreading
          ? 0.85 - (0.65 * age) / 0.55
          : Math.min(0.9, 0.18 + Math.max(0, age - 0.55) * 1.4)
      } else markGeometry.setDrawRange(0, 0)
      return markCount > 0
    },
    dispose() {
      disposed = true
      scene.remove(namesMesh, markMesh)
      namesGeometry.dispose()
      namesMaterial.dispose()
      markGeometry.dispose()
      markMaterial.dispose()
    },
  }
}
