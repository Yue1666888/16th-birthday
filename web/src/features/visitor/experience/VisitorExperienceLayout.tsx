import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { openingMusic } from '../opening/assets'
import { VisitorExperienceContext } from './context'
import type { InvitationFlight as Flight } from './context'
import { InvitationDock } from './InvitationDock'
import { InvitationFlight } from './InvitationFlight'
import '@/styles/visitor-experience.css'

const preferenceKey = 'birthday16.visitor.music-enabled'
function readPreference() {
  try {
    return sessionStorage.getItem(preferenceKey) !== '0'
  } catch {
    return true
  }
}
export function VisitorExperienceLayout() {
  const location = useLocation()
  const opening = location.pathname === '/'
  const audio = useRef<HTMLAudioElement>(null)
  const dockCard = useRef<HTMLImageElement>(null)
  const [musicEnabled, setEnabled] = useState(readPreference)
  const enabled = useRef(musicEnabled),
    activated = useRef(false),
    suspended = useRef(opening)
  const [playing, setPlaying] = useState(false),
    [musicNotice, setNotice] = useState('')
  const [flight, setFlight] = useState<Flight | null>(null)
  const serial = useRef(0)
  const retryMusic = useCallback(() => {
    const element = audio.current
    if (!element || !enabled.current || !activated.current || suspended.current)
      return
    element.muted = false
    if (!element.paused) return
    void element.play().then(
      () => setNotice(''),
      () => setNotice('音乐暂未播放，点唱片或声音按钮重试。'),
    )
  }, [])
  const setMusicEnabled = useCallback(
    (value: boolean) => {
      enabled.current = value
      setEnabled(value)
      try {
        sessionStorage.setItem(preferenceKey, value ? '1' : '0')
      } catch {
        /* Playback works without preference storage. */
      }
      const element = audio.current
      if (element) element.muted = !value
      if (!value) {
        element?.pause()
        setNotice('')
      } else {
        activated.current = true
        retryMusic()
      }
    },
    [retryMusic],
  )
  const activateMusic = useCallback(() => {
    activated.current = true
    retryMusic()
  }, [retryMusic])
  const setOpeningSuspended = useCallback(
    (value: boolean) => {
      suspended.current = value
      if (value) audio.current?.pause()
      else retryMusic()
    },
    [retryMusic],
  )
  const setMusicVolume = useCallback((volume: number) => {
    if (audio.current) audio.current.volume = Math.min(1, Math.max(0, volume))
  }, [])
  const flyInvitation = useCallback((rect: DOMRect | null) => {
    if (!rect) {
      setFlight(null)
      return
    }
    if (rect.width < 30 || rect.height < 30) return
    setFlight({
      id: ++serial.current,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    })
  }, [])
  const finishFlight = useCallback(() => setFlight(null), [])
  useEffect(() => {
    if (!opening) {
      setOpeningSuspended(false)
      setMusicVolume(0.26)
    }
  }, [opening, setOpeningSuspended, setMusicVolume])
  useEffect(() => {
    const element = audio.current
    if (element) element.volume = 0.26
    return () => element?.pause()
  }, [])
  const value = useMemo(
    () => ({
      musicEnabled,
      playing,
      musicNotice,
      setMusicEnabled,
      activateMusic,
      retryMusic,
      setOpeningSuspended,
      setMusicVolume,
      flyInvitation,
    }),
    [
      musicEnabled,
      playing,
      musicNotice,
      setMusicEnabled,
      activateMusic,
      retryMusic,
      setOpeningSuspended,
      setMusicVolume,
      flyInvitation,
    ],
  )
  return (
    <VisitorExperienceContext.Provider value={value}>
      <div className="visitor-experience-shell">
        <audio
          id="visitor-background-audio"
          ref={audio}
          src={openingMusic}
          preload="none"
          loop
          muted={!musicEnabled}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => {
            setPlaying(false)
            setNotice('音乐文件暂时不可用，可以稍后重试。')
          }}
        />
        <Outlet />
        {!opening && <InvitationDock cardRef={dockCard} flying={!!flight} />}
        {!opening && flight && (
          <InvitationFlight
            key={flight.id}
            flight={flight}
            target={dockCard}
            onDone={finishFlight}
          />
        )}
      </div>
    </VisitorExperienceContext.Provider>
  )
}
