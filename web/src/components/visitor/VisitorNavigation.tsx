import { ArrowUpRight } from 'lucide-react'
import { Link, NavLink, useSearchParams } from 'react-router'
export function VisitorNavigation() {
  const [params] = useSearchParams()
  const preview = import.meta.env.DEV && params.get('preview') === '1'
  const suffix = preview ? '?preview=1' : ''
  return (
    <header className="visitor-nav">
      <Link className="visitor-brand" to="/" aria-label="SIPC 十六周年邀请函">
        <span className="brand-symbol" aria-hidden="true">
          S<span>/</span>
        </span>
        <span>
          SIPC<span className="brand-caption">16TH ANNIVERSARY</span>
        </span>
      </Link>
      <nav aria-label="公开访客导航">
        <NavLink to={'/memories' + suffix}>
          <span aria-hidden="true">01</span>回忆墙
        </NavLink>
        <NavLink to={'/honors' + suffix}>
          <span aria-hidden="true">02</span>荣誉墙
        </NavLink>
      </nav>
      <Link className="invitation-link" to="/">
        返回邀请函 <ArrowUpRight size={15} />
      </Link>
    </header>
  )
}
