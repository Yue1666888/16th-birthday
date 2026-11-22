import { publicAsset } from '@/lib/public-asset'
import { useState } from 'react'
import type { RefObject } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { CalendarDays, MapPin, Pause, Play, X, Maximize2 } from 'lucide-react'
import {
  invitationContent,
  invitationOriginal,
  invitationPoster,
} from '@/domain/invitation-content'
import { useVisitorExperience } from './context'

export function InvitationDock({
  cardRef,
  flying,
}: {
  cardRef: RefObject<HTMLImageElement | null>
  flying: boolean
}) {
  const [open, setOpen] = useState(false)
  const music = useVisitorExperience()
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="invitation-dock"
          type="button"
          aria-label="打开邀请函与音乐播放器"
          data-invitation-dock
        >
          <img
            ref={cardRef}
            className="invitation-dock-card"
            src={invitationPoster}
            alt=""
            style={{ opacity: flying ? 0 : 1 }}
          />
          <span className="invitation-dock-title">邀请函</span>
          <span
            className="invitation-mini-record"
            data-playing={music.playing}
            aria-hidden="true"
          >
            <img src={publicAsset('/brand/sipc-emblem.png')} alt="" />
          </span>
          <span
            className="invitation-dock-signal"
            data-playing={music.playing}
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
          </span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="invitation-viewer-overlay" />
        <Dialog.Content
          className="invitation-viewer"
          aria-describedby="invitation-viewer-description"
        >
          <header>
            <div>
              <p>SIPC · THE SIXTEENTH REUNION</p>
              <Dialog.Title>你的十六周年邀请函</Dialog.Title>
            </div>
            <Dialog.Close
              className="invitation-viewer-close"
              aria-label="关闭邀请函"
            >
              <X size={23} />
            </Dialog.Close>
          </header>
          <Dialog.Description
            id="invitation-viewer-description"
            className="invitation-viewer-description"
          >
            把邀请留在这里，随时翻开，也让音乐陪你继续。
          </Dialog.Description>
          <div className="invitation-viewer-body">
            <figure>
              <img
                className="invitation-full-poster"
                src={invitationPoster}
                alt={`SIPC十六周年邀请函，${invitationContent.dateLabel}，${invitationContent.venue}`}
              />
              <a href={invitationOriginal} target="_blank" rel="noreferrer">
                <Maximize2 size={15} />
                查看原图
              </a>
            </figure>
            <section
              className="invitation-record-panel"
              aria-label="邀请信息与音乐控制"
            >
              <div className="invitation-event-meta">
                <p>
                  <CalendarDays size={20} />
                  <time dateTime={invitationContent.dateISO}>
                    {invitationContent.dateLabel}
                  </time>
                </p>
                <p>
                  <MapPin size={20} />
                  <span>{invitationContent.venue}</span>
                </p>
              </div>
              <div className="invitation-turntable">
                <button
                  className="invitation-record"
                  type="button"
                  data-playing={music.playing}
                  aria-label={music.playing ? '暂停背景音乐' : '播放背景音乐'}
                  aria-pressed={music.playing}
                  onClick={() => music.setMusicEnabled(!music.playing)}
                >
                  <span className="invitation-record-label">
                    SIPC<small>115 · 16TH</small>
                  </span>
                  <span className="invitation-record-control">
                    {music.playing ? <Pause size={25} /> : <Play size={25} />}
                  </span>
                </button>
                <span className="invitation-record-arm" aria-hidden="true" />
              </div>
              <p className="invitation-record-status">
                {music.playing
                  ? '让音乐，陪你继续。'
                  : '轻点唱片，让音乐响起。'}
              </p>
              <p className="invitation-record-hint">
                {music.playing
                  ? '音乐播放中'
                  : music.musicEnabled
                    ? '点击唱片开始或继续'
                    : '当前音乐已关闭'}
              </p>
              {music.musicNotice && (
                <button
                  className="invitation-music-retry"
                  onClick={() => music.setMusicEnabled(true)}
                >
                  {music.musicNotice}
                </button>
              )}
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
