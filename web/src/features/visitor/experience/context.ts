import { createContext, useContext } from 'react'

export interface InvitationFlight {
  id: number
  left: number
  top: number
  width: number
  height: number
}
export interface VisitorExperience {
  musicEnabled: boolean
  playing: boolean
  musicNotice: string
  setMusicEnabled: (enabled: boolean) => void
  activateMusic: () => void
  retryMusic: () => void
  setOpeningSuspended: (suspended: boolean) => void
  setMusicVolume: (volume: number) => void
  flyInvitation: (rect: DOMRect | null) => void
}
export const VisitorExperienceContext = createContext<VisitorExperience | null>(
  null,
)
export function useVisitorExperience() {
  const context = useContext(VisitorExperienceContext)
  if (!context) throw new Error('公开页面需要共用邀请函播放器')
  return context
}
