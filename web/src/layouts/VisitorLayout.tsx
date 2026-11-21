import { Suspense, lazy, useLayoutEffect, useRef } from 'react'
import { Outlet, useLocation, useSearchParams } from 'react-router'
import { VisitorNavigation } from '@/components/visitor/VisitorNavigation'
import { useVisitorView } from '@/hooks/use-visitor-view'
import '@/styles/visitor.css'
const VisitorParticles = lazy(() =>
  import('@/components/visitor/VisitorParticles').then((module) => ({
    default: module.VisitorParticles,
  })),
)
export function VisitorLayout() {
  const mode = useVisitorView()
  const location = useLocation()
  const [params] = useSearchParams()
  const scrollPositions = useRef(new Map<string, number>())
  const preview =
    import.meta.env.DEV &&
    params.get('preview') === '1' &&
    location.pathname !== '/chronicle'
  useLayoutEffect(() => {
    const old = history.scrollRestoration
    history.scrollRestoration = 'manual'
    const positions = scrollPositions.current
    const key = location.pathname + location.search
    const target = positions.get(key) || 0
    let restored = false
    // Capture while the old page is still present, before route replacement
    // can shrink the document and clamp scrollY to the new page's height.
    const remember = () => {
      if (restored) positions.set(key, window.scrollY)
    }
    window.addEventListener('scroll', remember, { passive: true })
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, target)
      positions.set(key, window.scrollY)
      restored = true
    })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', remember)
      history.scrollRestoration = old
    }
  }, [location.pathname, location.search])
  return (
    <div className={'visitor-app visitor-' + mode.view} data-view={mode.view}>
      <a href="#visitor-content" className="visitor-skip">
        跳转到内容
      </a>
      <Suspense fallback={null}>
        <VisitorParticles
          scene={
            location.pathname.includes('honors')
              ? 'honors'
              : location.pathname === '/chronicle'
                ? 'chronicle'
                : 'memories'
          }
          mobile={mode.view === 'mobile'}
        />
      </Suspense>
      <VisitorNavigation />
      {preview && (
        <div className="visitor-preview-banner">
          示例预览 · 以下为排版示例，不是真实投稿或荣誉。
          <a href={location.pathname}>查看真实内容 ↗</a>
        </div>
      )}
      <main id="visitor-content" className="visitor-main">
        <Outlet context={mode} />
      </main>
      <footer className="visitor-footer">
        <span>SIPC · 16TH ANNIVERSARY</span>
        <span>
          故事未完，我们继续。<b aria-hidden="true">＋</b>
        </span>
      </footer>
    </div>
  )
}
