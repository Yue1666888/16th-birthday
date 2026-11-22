import { publicAsset } from '@/lib/public-asset'
import { ArrowUpRight } from 'lucide-react'
import { Link, NavLink, useSearchParams } from 'react-router'
export function VisitorNavigation() {
  const [params] = useSearchParams()
  const preview = import.meta.env.DEV && params.get('preview') === '1'
  const suffix = preview ? '?preview=1' : ''
  return (
    <header className="visitor-nav">
      <Link
        className="visitor-brand"
        to="/invitation"
        aria-label="SIPC 十六周年邀请函"
      >
        <img
          className="brand-logo"
          src={publicAsset('/brand/sipc-logo.png')}
          alt="SIPC"
          width="2085"
          height="608"
        />
        <span className="brand-caption">16TH ANNIVERSARY</span>
      </Link>
      <nav aria-label="公开访客导航">
        <NavLink to={'/invitation' + suffix}>
          <span aria-hidden="true">00</span>首页
        </NavLink>
        <NavLink to={'/memories' + suffix}>
          <span aria-hidden="true">01</span>回忆墙
        </NavLink>
        <NavLink to={'/honors' + suffix}>
          <span aria-hidden="true">02</span>荣誉墙
        </NavLink>
        <NavLink to={'/chronicle' + suffix}>
          <span aria-hidden="true">03</span>115编年史
        </NavLink>
      </nav>
      <Link className="invitation-link" to="/?replay=1">
        重播开场 <ArrowUpRight size={15} />
      </Link>
    </header>
  )
}
