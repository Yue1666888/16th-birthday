import { Link } from 'react-router'
export function HomePage() {
  return (
    <main
      style={{
        maxWidth: 450,
        margin: '0 auto',
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 32,
      }}
    >
      <div>
        <p style={{ letterSpacing: 3, color: '#8797b2' }}>SIPC · 16</p>
        <h1 style={{ fontSize: 24 }}>十六周年邀请函</h1>
        <p style={{ color: '#8a96aa', fontSize: 13 }}>
          开场动画正在准备中，期待与你再次相聚。
        </p>
        <Link to="/invitation">进入首页，填写邀请回执 ↗</Link>
      </div>
    </main>
  )
}
