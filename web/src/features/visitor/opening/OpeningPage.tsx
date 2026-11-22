import { publicAsset } from '@/lib/public-asset'
import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  List,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useVisitorView } from '@/hooks/use-visitor-view'
import { useVisitorExperience } from '../experience/context'
import { openingDuration, openingScenes } from './script'
import { advanceOpening, initialPlayback, releaseOpening } from './playback'
import { useOpeningAssets } from './use-opening-assets'
import { useStagedLoading } from './use-staged-loading'
import { useOpeningEnvironment } from './use-opening-environment'
import { OpeningSceneView } from './OpeningSceneView'
import { OpeningCaption } from './OpeningCaption'
import '@/styles/opening.css'

const completionKey = 'birthday16.opening.v1.completed'
function hasCompleted() {
  try {
    return sessionStorage.getItem(completionKey) === '1'
  } catch {
    return false
  }
}

export function OpeningPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [seen] = useState(hasCompleted)
  const replay = params.get('replay') === '1'
  const mobile = useVisitorView().view === 'mobile'
  const { reduced, hidden } = useOpeningEnvironment()
  const assets = useOpeningAssets(mobile)
  const [started, setStarted] = useState(false)
  const displayedProgress = useStagedLoading(assets.progress, !started)
  const readyToStart = assets.ready && displayedProgress === 100
  const [paused, setPaused] = useState(false)
  const [chapters, setChapters] = useState(false)
  const {
    musicEnabled,
    musicNotice: audioNotice,
    setMusicEnabled,
    activateMusic,
    retryMusic,
    setOpeningSuspended,
    setMusicVolume,
    flyInvitation,
  } = useVisitorExperience()
  const muted = !musicEnabled
  const [homePrefetchFailed, setHomePrefetchFailed] = useState(false)
  const [loadingSlow, setLoadingSlow] = useState(false)
  const [state, setState] = useState(initialPlayback)
  const scene = openingScenes[state.index]
  const nextIndex = Math.min(state.index + 1, openingScenes.length - 1)
  const nextReady = assets.isReady(nextIndex)
  const pendingIndex = state.time >= scene.duration ? nextIndex : state.index
  const waitingForAsset = !assets.isReady(pendingIndex)
  const assetFailed = assets.hasFailure(pendingIndex)
  const stopped = paused || hidden || chapters || waitingForAsset

  const finish = useCallback(() => {
    // Storage is optional; opening failure must never block the invitation forms.
    try {
      sessionStorage.setItem(completionKey, '1')
    } catch {
      /* Private mode may deny storage. */
    }
    const card =
      scene.id === 'S11' ? document.querySelector('.opening-letter-page') : null
    flyInvitation(card?.getBoundingClientRect() ?? null)
    navigate('/invitation', { replace: true })
  }, [navigate, scene.id, flyInvitation])

  useEffect(() => {
    if (seen && !replay) navigate('/invitation', { replace: true })
  }, [seen, replay, navigate])
  useEffect(() => {
    if (state.finished && !homePrefetchFailed) finish()
  }, [state.finished, homePrefetchFailed, finish])
  useEffect(() => {
    const timeout = setTimeout(() => setLoadingSlow(true), 8000)
    return () => clearTimeout(timeout)
  }, [])
  useEffect(() => {
    setOpeningSuspended(!started || stopped || waitingForAsset)
  }, [started, stopped, waitingForAsset, setOpeningSuspended])
  useEffect(() => () => setOpeningSuspended(false), [setOpeningSuspended])
  useEffect(() => {
    if (!started) return
    const fadeIn = scene.id === 'S01' ? Math.min(1, state.time / 1.5) : 1
    setMusicVolume(0.26 * fadeIn)
  }, [started, scene.id, state.time, setMusicVolume])

  useEffect(() => {
    if (!started || stopped || state.finished) return
    let frame = 0
    let previous = performance.now()
    const tick = (now: number) => {
      const elapsed = now - previous
      if (elapsed >= 1000 / 30) {
        previous = now
        setState((s) =>
          advanceOpening(s, Math.min(elapsed / 1000, 0.12), nextReady),
        )
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [started, stopped, nextReady, state.finished])

  const begin = () => {
    if (!readyToStart) return
    setStarted(true)
    setOpeningSuspended(false)
    activateMusic()
    // Prefetch the route module while the first line is being read.
    void import('@/pages/visitor/invitation/InvitationPage').catch(() =>
      setHomePrefetchFailed(true),
    )
  }
  const release = () => {
    setState(releaseOpening)
  }
  const jump = (index: number) => {
    setChapters(false)
    setPaused(false)
    setState({ ...initialPlayback, index })
  }
  const line = scene.dialogues.find(
    (item) => state.time >= item.start && state.time < item.end,
  )
  const action = (
    {
      S03: '上热气球',
      S07: '推开115的门',
      S08: '点亮115',
      S10: '打开邀请函',
    } as Record<string, string>
  )[scene.id]
  const progress = Math.min(
    100,
    ((scene.start + state.time) / openingDuration) * 100,
  )

  if (seen && !replay) return null
  return (
    <main
      className={`opening-app ${mobile ? 'opening-mobile' : 'opening-desktop'} ${!started ? 'is-loading' : ''} ${scene.id === 'S08' ? 'is-night' : ''}`}
      data-scene={started ? scene.id : 'S00'}
      data-paused={stopped}
      data-reduced={reduced}
      onClick={(event) => {
        if (!started || !paused || chapters) return
        const target = event.target
        if (
          target instanceof Element &&
          !target.closest(
            '.opening-topbar, .opening-chapters, .opening-scene-actions, .opening-buffer, .opening-audio-notice, a, input, select, textarea',
          )
        )
          setPaused(false)
      }}
    >
      <h1 className="opening-sr-only">回到115的风 · SIPC十六周年邀请函</h1>
      <header className="opening-topbar">
        <Link
          to="/invitation"
          className="opening-brand"
          onClick={(e) => {
            e.preventDefault()
            finish()
          }}
          aria-label="SIPC，直接进入首页"
        >
          <img src={publicAsset('/brand/sipc-emblem.png')} alt="" />
          <span>
            SIPC <small>16TH ANNIVERSARY</small>
          </span>
        </Link>
        <div className="opening-top-controls">
          {started && (
            <>
              <button
                aria-label={muted ? '开启音乐' : '关闭音乐'}
                onClick={() => {
                  setMusicEnabled(!musicEnabled)
                }}
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button
                aria-label={paused ? '继续旅程' : '暂停旅程'}
                onClick={() => {
                  setPaused(!paused)
                }}
              >
                {paused ? <Play size={17} /> : <Pause size={17} />}
              </button>
              <button
                aria-label="旅程章节"
                aria-expanded={chapters}
                onClick={() => {
                  setChapters(!chapters)
                }}
              >
                <List size={19} />
              </button>
            </>
          )}
          <button className="opening-skip" onClick={finish}>
            跳过开场 <ArrowRight size={15} />
          </button>
        </div>
      </header>

      {!started ? (
        <section className="opening-loader" aria-label="启程准备">
          <span className="opening-loader-code">
            // SIPC · RETURN JOURNEY / 001
          </span>
          <div className="opening-loader-symbol">
            <img
              src={publicAsset('/brand/sipc-emblem.png')}
              alt="SIPC社团标识"
            />
            <i />
            <i />
          </div>
          <h2>{readyToStart ? '风已经到了。' : '正在准备，回到115的旅程'}</h2>
          <p>
            {readyToStart
              ? '我们出发吧。'
              : '整理行囊中，每一段回忆都值得被好好安放。'}
          </p>
          <div
            className="opening-loading-track"
            role="progressbar"
            aria-label="启程资源准备"
            aria-valuenow={displayedProgress}
            data-resource-progress={assets.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: `${displayedProgress}%` }} />
          </div>
          <div className="opening-loading-detail">
            <span>LOADING — {displayedProgress}%</span>
            <span>
              {readyToStart
                ? 'READY FOR DEPARTURE'
                : 'PREPARING OUR MEMORIES ......'}
            </span>
          </div>
          {readyToStart ? (
            <>
              <button className="opening-start" onClick={begin}>
                启程 <ArrowRight size={19} />
              </button>
              <label className="opening-sound-choice">
                <input
                  type="checkbox"
                  checked={!muted}
                  onChange={(e) => setMusicEnabled(e.target.checked)}
                />
                开启背景音乐，也可以安静观看
              </label>
            </>
          ) : (
            <div className="opening-loader-wait">
              {(assets.coreFailed || loadingSlow) && (
                <>
                  <p role="status">
                    {assets.coreFailed
                      ? '有一件行囊还没准备好，请重试或直接进入首页。'
                      : '准备需要一点时间，你也可以先去首页。'}
                  </p>
                  <button onClick={assets.retry}>重新准备</button>
                  <button onClick={finish}>直接进入首页</button>
                </>
              )}
            </div>
          )}
          <span className="opening-loader-foot">
            PAST HAS PASSED. THE FUTURE IS HERE.
          </span>
        </section>
      ) : (
        <>
          <div className="opening-stage" aria-label={scene.title}>
            <OpeningSceneView
              id={scene.id}
              time={state.time}
              mobile={mobile}
              reduced={reduced}
            />
            <div className="opening-air" aria-hidden="true">
              {Array.from({ length: mobile ? 12 : 24 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    left: `${(i * 43) % 100}%`,
                    top: `${(i * 29) % 100}%`,
                    animationDelay: `${-i * 0.7}s`,
                    animationDuration: `${12 + (i % 7)}s`,
                  }}
                />
              ))}
            </div>
            {line && (
              <OpeningCaption
                key={`${scene.id}-${line.start}`}
                line={line}
                time={state.time}
                reduced={reduced}
                sceneId={scene.id}
              />
            )}
            <div className="opening-scene-actions">
              {action && !state.released && (
                <button
                  className="opening-action"
                  onClick={release}
                  disabled={stopped || (scene.id === 'S10' && state.time < 4.5)}
                >
                  {action}
                  <ArrowRight size={18} />
                </button>
              )}
              {scene.id === 'S11' &&
                (homePrefetchFailed ? (
                  <a className="opening-action" href="/invitation">
                    重新打开首页
                    <ArrowRight size={18} />
                  </a>
                ) : (
                  <button className="opening-action" onClick={finish}>
                    立即进入首页
                    <ArrowRight size={18} />
                  </button>
                ))}
            </div>
            {waitingForAsset && (
              <div className="opening-buffer" role="status">
                <span>下一段旅程准备中</span>
                <p>
                  {assetFailed
                    ? '这段画面暂时无法载入，可以重试或略过。'
                    : '请稍等，我们正在整理下一页回忆。'}
                </p>
                <button onClick={assets.retry}>重试加载</button>
                <button
                  onClick={() =>
                    jump(Math.min(pendingIndex + 1, openingScenes.length - 1))
                  }
                >
                  跳过本段
                </button>
              </div>
            )}
          </div>
          <footer className="opening-bottom">
            <div className="opening-story-progress">
              <i style={{ width: `${progress}%` }} />
            </div>
          </footer>
          {paused && !chapters && (
            <button
              className="opening-resume"
              aria-label="从暂停处继续"
              onClick={() => setPaused(false)}
            >
              <Play size={17} /> 继续旅程
            </button>
          )}
        </>
      )}
      {audioNotice && started && (
        <button className="opening-audio-notice" onClick={retryMusic}>
          {audioNotice}
        </button>
      )}
      {chapters && (
        <div
          className="opening-chapters"
          role="dialog"
          aria-modal="true"
          aria-label="旅程章节"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setChapters(false)
            if (e.key === 'Tab') {
              const buttons =
                e.currentTarget.querySelectorAll<HTMLButtonElement>('button')
              const first = buttons[0],
                last = buttons[buttons.length - 1]
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last?.focus()
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first?.focus()
              }
            }
          }}
        >
          <div className="opening-chapter-panel">
            <header>
              <div>
                <span>OUR RETURN JOURNEY</span>
                <h2>这一程，回到115</h2>
              </div>
              <button
                aria-label="关闭章节"
                onClick={() => setChapters(false)}
                autoFocus
              >
                <X size={22} />
              </button>
            </header>
            <p>可以选择一段重看，也可以从这里继续。</p>
            <ol>
              {openingScenes.map((s, index) => (
                <li key={s.id}>
                  <button
                    onClick={() => jump(index)}
                    aria-current={state.index === index ? 'step' : undefined}
                  >
                    <small>{s.id.replace('S', '')}</small>
                    {s.title}
                    <ArrowRight size={15} />
                  </button>
                </li>
              ))}
            </ol>
            <button
              className="opening-chapter-continue"
              onClick={() => setChapters(false)}
            >
              继续当前旅程
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
