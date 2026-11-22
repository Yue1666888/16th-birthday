import { invitationContent } from '@/domain/invitation-content'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { openingAssets } from './assets'
import type { OpeningAssetId } from './assets'
import { clamp, ease } from './playback'

function Picture({
  id,
  opacity = 1,
  scale = 1,
  mobile,
}: {
  id: OpeningAssetId
  opacity?: number
  scale?: number
  mobile: boolean
}) {
  const doorway = ['D04', 'D05', 'M04', 'M05'].includes(id)
  return (
    <div
      className={
        doorway
          ? `opening-door-frame ${mobile ? 'is-portrait' : ''}`
          : 'opening-picture-frame'
      }
      style={{
        opacity,
        transform: doorway
          ? `translate(-50%, -50%) scale(${scale})`
          : `scale(${scale})`,
      }}
    >
      <img
        className="opening-painting"
        src={openingAssets[id]}
        alt=""
        draggable={false}
      />
      {id === 'M04' && <span className="opening-door-number">115</span>}
      {doorway && mobile && (
        <span className="opening-door-banner">欢迎回家</span>
      )}
    </div>
  )
}

function Balloon({
  x,
  y,
  height,
  time,
  empty = false,
  rotate = 0,
  opacity = 1,
}: {
  x: number
  y: number
  height: number
  time: number
  empty?: boolean
  rotate?: number
  opacity?: number
}) {
  return (
    <svg
      className="opening-balloon"
      aria-hidden="true"
      viewBox={empty ? '506 93 264 385' : '193 27 305 493'}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        height: `${height}%`,
        opacity,
        transform: `translate(-50%, -50%) translateY(${Math.sin(time * 1.3) * 4}px) rotate(${rotate}deg)`,
        aspectRatio: empty ? '264 / 385' : '305 / 493',
      }}
    >
      <image
        href={openingAssets[empty ? 'B02' : 'B01']}
        width="1280"
        height="714"
      />
    </svg>
  )
}

const memoryPages = [
  {
    title: '故事，从一个小小的坐标开始',
    english: 'WHERE IT ALL BEGAN',
    photos: [],
    captions: [],
  },
  {
    title: '一起想办法，把经验传下去',
    english: 'LEARN · CREATE · SHARE',
    photos: ['P03', 'P09'],
    captions: ['一起想办法', '把经验传下去'],
  },
  {
    title: '相聚的日子，总值得被记得',
    english: 'THE DAYS WE SHARED',
    photos: ['P11', 'P18'],
    captions: ['围坐的时刻', '把热爱讲给更多人'],
  },
  {
    title: '新的伙伴，继续同行',
    english: '2025—2026 · TO BE CONTINUED',
    photos: ['P01', 'P02'],
    captions: ['在这里，相识', '把故事，接着写'],
  },
] as const

function MemoryCloud({
  time,
  mobile,
  reduced,
}: {
  time: number
  mobile: boolean
  reduced: boolean
}) {
  const page = Math.min(3, Math.floor(time / 9))
  const within = time % 9
  const data = memoryPages[page]
  const fade = reduced
    ? 1
    : Math.min(ease(within / 0.8), ease((9 - within) / 0.6))
  const photoIndex = mobile ? Math.min(1, Math.floor(within / 4.5)) : -1
  return (
    <section
      className="opening-memory-cloud"
      aria-label={`云中回忆第${page + 1}页`}
      style={{
        opacity: fade,
        translate: `${reduced ? 0 : (1 - ease(within / 0.8)) * (mobile ? 18 : 40)}px 0`,
      }}
    >
      <img className="opening-cloud-base" src={openingAssets.S03} alt="" />
      <div className="opening-cloud-paper">
        <span className="opening-eyebrow">
          {data.english}
          <b>0{page + 1} / 04</b>
        </span>
        <h2>{data.title}</h2>
        {page === 0 ? (
          <div className="opening-history-stamps">
            <div>
              <strong>
                2009<span>09</span>
              </strong>
              <p>602工作室</p>
              <small>从这里，出发</small>
            </div>
            <div>
              <strong>
                2010<span>秋</span>
              </strong>
              <p>115工作室</p>
              <small>故事的新坐标</small>
            </div>
            <div>
              <strong>
                2010<span>12.10</span>
              </strong>
              <p>学生创新实践中心</p>
              <small>一个共同的名字 · SIPC</small>
            </div>
          </div>
        ) : (
          <div className="opening-photo-row">
            {data.photos.map(
              (id, index) =>
                (photoIndex < 0 || photoIndex === index) && (
                  <figure key={id}>
                    <img src={openingAssets[id]} alt={data.captions[index]} />
                    <figcaption>{data.captions[index]}</figcaption>
                  </figure>
                ),
            )}
          </div>
        )}
      </div>
      {page === 0 && (
        <div className="opening-bird">
          <img src={openingAssets.S02} alt="" />
          <span>下一站 · 115</span>
        </div>
      )}
    </section>
  )
}

function SkyClouds({
  time,
  mobile,
  reduced,
}: {
  time: number
  mobile: boolean
  reduced: boolean
}) {
  const [clouds] = useState(() =>
    Array.from({ length: 8 }, () => ({
      phase: Math.random() * 140,
      top: 6 + Math.random() * 43,
      width: 9 + Math.random() * 7,
      speed: 1.2 + Math.random() * 1.5,
      opacity: 0.65 + Math.random() * 0.25,
    })),
  )
  return (
    <>
      {clouds.slice(0, mobile ? 5 : 8).map((cloud, index) => (
        <img
          key={index}
          className="opening-sky-cloud"
          src={openingAssets.CLOUD}
          alt=""
          style={{
            left: `${115 - ((cloud.phase + (reduced ? 0 : time * cloud.speed)) % 145)}%`,
            top: `${cloud.top}%`,
            width: `${cloud.width * (mobile ? 1.4 : 1)}%`,
            opacity: cloud.opacity,
          }}
        />
      ))}
    </>
  )
}

const balloonPaths = [
  { from: [26, 96], to: [83, 0], height: 17, delay: 0, duration: 7.2 },
  { from: [52, 83], to: [96, 4], height: 11, delay: 0.7, duration: 8 },
  { from: [68, 54], to: [113, -14], height: 8, delay: 0.2, duration: 10 },
  { from: [80, 26], to: [120, -20], height: 14, delay: 1.1, duration: 7.8 },
  { from: [88, 48], to: [128, 2], height: 6, delay: 0, duration: 9 },
  { from: [39, 40], to: [90, -24], height: 21, delay: 1.6, duration: 8.5 },
  { from: [10, 85], to: [76, -10], height: 10, delay: 0.5, duration: 9 },
  { from: [14, 110], to: [38, 36], height: 9, delay: 0.4, duration: 8.4 },
] as const
function DistantBalloons({
  time,
  mobile,
  reduced,
}: {
  time: number
  mobile: boolean
  reduced: boolean
}) {
  return (
    <>
      {balloonPaths.slice(0, mobile ? 5 : 8).map((path, index) => {
        const progress = reduced
          ? 0.5
          : clamp((time - path.delay) / path.duration)
        const x = path.from[0] + (path.to[0] - path.from[0]) * progress
        const y =
          path.from[1] +
          (path.to[1] - path.from[1]) * progress +
          (reduced ? 0 : Math.sin(time * 0.8 + index * 1.9) * 2)
        const cell = index % 6
        return (
          <svg
            key={index}
            className="opening-distant-balloon"
            aria-hidden="true"
            viewBox={`${(cell % 3) * 512} ${Math.floor(cell / 3) * 512} 512 512`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              height: `${path.height * (mobile ? 0.85 : 1)}%`,
              opacity: ease((time - path.delay) / 0.7),
              rotate: `${reduced ? 0 : Math.sin(time * 0.6 + index) * 4}deg`,
            }}
          >
            <image href={openingAssets.S05} width="1536" height="1024" />
          </svg>
        )
      })}
    </>
  )
}

function LampFrames({ mobile }: { mobile: boolean }) {
  return (
    <div
      className={`opening-door-frame opening-lamp-frame ${mobile ? 'is-portrait' : ''}`}
      style={{ transform: 'translate(-50%, -50%) scale(1.12)' }}
    >
      <img
        className="opening-lamp-off"
        src={openingAssets[mobile ? 'LMO' : 'LDO']}
        alt=""
      />
      <img
        className="opening-lamp-bright"
        src={openingAssets[mobile ? 'LMB' : 'LDB']}
        alt=""
      />
    </div>
  )
}

function Letter({
  time,
  opened,
  mobile,
  reduced,
}: {
  time: number
  opened: boolean
  mobile: boolean
  reduced: boolean
}) {
  const arrive = ease(time / 1.5)
  const zoom = 0.6 + 0.4 * ease((time - 1.5) / 3)
  return (
    <div
      className={`opening-letter ${opened ? 'is-open' : ''}`}
      style={{
        opacity: opened ? 1 : arrive,
        translate: opened || reduced ? '0 0' : `0 ${(1 - arrive) * -80}dvh`,
        scale: opened || reduced ? 1 : zoom,
        rotate:
          opened || reduced
            ? '0deg'
            : `${Math.sin(time * 2) * (1 - clamp(time / 5)) * 3}deg`,
      }}
    >
      {opened && !mobile && (
        <div
          className="opening-letter-left"
          style={{ backgroundImage: `url(${openingAssets.S04})` }}
        >
          <span>SIPC</span>
          <strong>16TH</strong>
          <small>这一路，谢谢你。</small>
        </div>
      )}
      <div
        className="opening-letter-page"
        style={{
          backgroundImage: `url(${openingAssets.S04})`,
          transform:
            opened && !reduced
              ? `rotateY(${-90 * (1 - ease(time / 1.2))}deg)`
              : undefined,
          opacity: opened && !reduced ? ease(time / 0.6) : 1,
        }}
      >
        <span className="opening-letter-code">
          STUDENT INNOVATION & PRACTICE CENTER
        </span>
        {opened ? (
          <>
            <small>致每一位 SIPCer</small>
            <h1>Dear SIPCer</h1>
            <p className="opening-welcome">
              Welcome
              <br />
              Back!
            </p>
            <dl className="opening-invitation-details">
              <div>
                <dt>时间</dt>
                <dd>
                  <time dateTime={invitationContent.dateISO}>
                    {invitationContent.dateLabel}
                  </time>
                </dd>
              </div>
              <div>
                <dt>地点</dt>
                <dd>{invitationContent.venue}</dd>
              </div>
            </dl>
            <span className="opening-letter-mark">SIPC · 16TH ANNIVERSARY</span>
          </>
        ) : (
          <>
            <span className="opening-letter-seal">SIPC</span>
            <h1>一封，给你的邀请</h1>
            <p>致每一位 SIPCer</p>
            <b>16TH</b>
          </>
        )}
      </div>
      {!opened && <div className="opening-envelope-fold" aria-hidden="true" />}
    </div>
  )
}

export function OpeningSceneView({
  id,
  time,
  mobile,
  reduced,
}: {
  id: string
  time: number
  mobile: boolean
  reduced: boolean
}) {
  const picture = (
    d: OpeningAssetId,
    m: OpeningAssetId,
    opacity = 1,
    scale = 1,
  ) => (
    <Picture
      id={mobile ? m : d}
      mobile={mobile}
      opacity={opacity}
      scale={reduced ? 1 : scale}
    />
  )
  const flightTime = id === 'S06' ? time + 36 : time
  const flight = (
    <div
      className="opening-flight-layer"
      style={{
        transform: reduced
          ? undefined
          : `translateX(${-clamp(flightTime / 43) * 3}%) scale(${1 + ease(flightTime / 3) * 0.05})`,
      }}
    >
      {picture('D03', 'M03')}
      <SkyClouds time={flightTime} mobile={mobile} reduced={reduced} />
    </div>
  )
  return (
    <div className={`opening-scenery opening-scenery-${id}`} aria-hidden="true">
      {id === 'S01' && (
        <>
          {time > 7.5 && picture('D01', 'M01', ease((time - 7.5) / 0.5))}
          <div className="opening-prologue-line" />
          <span className="opening-prologue-sign">A JOURNEY BACK TO 115</span>
          <div
            className="opening-scene-veil"
            style={{ background: '#081420', opacity: 1 - ease(time / 0.8) }}
          />
        </>
      )}
      {id === 'S02' && (
        <>
          {picture('D01', 'M01', 1, 1 + ease((time - 1.2) / 4.8) * 0.08)}
          <Balloon
            x={mobile ? 50 : 53}
            y={mobile ? 44 : 49}
            height={
              reduced
                ? mobile
                  ? 38
                  : 44
                : 18 + ease((time - 1.2) / 4.8) * (mobile ? 24 : 32)
            }
            time={reduced ? 0 : time}
          />
          {time > 6 && picture('D02', 'M02', ease(time - 6), 1.015)}
        </>
      )}
      {id === 'S03' && (
        <>
          {picture('D02', 'M02', 1, 1.015)}
          <div
            className="opening-scene-veil"
            style={{ background: '#fff5dc', opacity: ease((time - 8.6) / 0.4) }}
          />
        </>
      )}
      {id === 'S04' && (
        <>
          {picture('D01', 'M01', 1 - ease((time - 1) / 3))}
          {picture('D03', 'M03', ease((time - 1) / 3))}
          <Balloon
            x={
              reduced
                ? 19
                : time < 2
                  ? 53 + ease(time / 2) * 20
                  : 73 - ease((time - 2) / 2.5) * 54
            }
            y={
              reduced
                ? mobile
                  ? 18
                  : 47
                : mobile
                  ? 44 - ease(time / 6) * 26
                  : 49 - ease(time / 3) * 2
            }
            height={
              reduced
                ? mobile
                  ? 23
                  : 50
                : mobile
                  ? 42 - ease(time / 6) * 19
                  : 50
            }
            time={reduced ? 0 : time}
          />
          <SkyClouds time={time} mobile={mobile} reduced={reduced} />
          <div
            className="opening-scene-veil"
            style={{ background: '#fff5dc', opacity: 1 - ease(time / 0.4) }}
          />
        </>
      )}
      {(id === 'S05' || id === 'S06') && (
        <>
          {flight}
          {id === 'S06' && (
            <DistantBalloons time={time} mobile={mobile} reduced={reduced} />
          )}
          <Balloon
            x={19}
            y={mobile ? 18 : 47}
            height={mobile ? 23 : 50}
            time={reduced ? 0 : time}
          />
          {id === 'S05' ? (
            <MemoryCloud time={time} mobile={mobile} reduced={reduced} />
          ) : (
            <>
              <Balloon
                x={-15 + ease((time - 4.5) / 2.5) * 65}
                y={85 - ease((time - 4.5) / 2.5) * 35}
                height={20 + ease((time - 4.5) / 2.5) * 620}
                time={0}
                empty
                opacity={reduced ? 0 : clamp(time - 4.5)}
              />
              <div
                className="opening-balloon-wipe"
                style={{
                  opacity: reduced
                    ? ease((time - 6.5) / 0.5)
                    : ease((time - 6.2) / 0.8),
                }}
              />
            </>
          )}
        </>
      )}
      {id === 'S07' && (
        <>
          {picture(
            'D04',
            'M04',
            1 - ease((time - 5.8) / 1.2),
            1 + ease((time - 5.8) / 1.2) * 0.12,
          )}
          {time > 5.8 &&
            picture(
              'D05',
              'M05',
              ease((time - 5.8) / 1.2),
              1 + ease((time - 5.8) / 1.2) * 0.12,
            )}
          <div
            className="opening-scene-veil"
            style={{ background: '#e3a16a', opacity: 1 - ease(time / 0.8) }}
          />
        </>
      )}
      {id === 'S08' && (
        <>
          {picture('D05', 'M05', 1, 1.12)}
          {!reduced && <LampFrames mobile={mobile} />}
          {time > 5.2 && (
            <>
              {picture('D06', 'M06', ease((time - 6.2) / 0.8))}
              <div
                className="opening-light-wipe"
                style={{
                  opacity:
                    time < 6.2
                      ? ease((time - 5.2) / 0.8)
                      : 1 - ease((time - 6.2) / 0.8),
                }}
              />
            </>
          )}
        </>
      )}
      {(id === 'S09' || id === 'S10') && (
        <>
          {picture(
            'D06',
            'M06',
            1,
            1 + (id === 'S09' ? ease(time / 6) * 0.015 : 0.015),
          )}
          {id === 'S09' && (
            <div className="opening-confetti">
              {Array.from({ length: mobile ? 16 : 28 }, (_, i) => (
                <i
                  key={i}
                  style={
                    {
                      left: `${(i * 37) % 100}%`,
                      top: `${-8 + clamp(time / 5) * (70 + (i % 30))}%`,
                      opacity: 1 - clamp((time - 3) / 2),
                      rotate: `${time * (i % 2 ? 60 : -60)}deg`,
                      background: ['#67acbc', '#df976e', '#d7b766', '#8da782'][
                        i % 4
                      ],
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}
          {id === 'S10' && (
            <>
              <div
                className="opening-letter-shade"
                style={{ opacity: ease(time / 4.5) }}
              />
              <Letter
                time={time}
                opened={false}
                mobile={mobile}
                reduced={reduced}
              />
            </>
          )}
        </>
      )}
      {id === 'S11' && (
        <>
          <Letter time={time} opened mobile={mobile} reduced={reduced} />
        </>
      )}
    </div>
  )
}
