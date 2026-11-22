import { ArrowLeft, ArrowUpRight, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'
import { PunctuatedText } from './PunctuatedText'
import '@/styles/status-page.css'

export function StatusPage({ kind }: { kind: 'not-found' | 'error' }) {
  const missing = kind === 'not-found'
  return (
    <main className="status-page">
      <header>
        <Link to="/invitation" aria-label="SIPC首页">
          <img src="/brand/sipc-logo.png" alt="SIPC" />
        </Link>
        <span>16TH ANNIVERSARY</span>
      </header>
      <section className="status-page-content">
        <div className="status-orbit-art" aria-hidden="true">
          <i />
          <i />
          <i />
          <span className="status-orbit-center">115</span>
          <span className="status-orbit-dot" />
          <span className="status-orbit-code">{missing ? '404' : '…'}</span>
          <span className="status-coordinate">FIND OUR WAY BACK</span>
        </div>
        <div className="status-page-copy">
          <p className="status-page-eyebrow">
            // SIPC · {missing ? 'SIGNAL NOT FOUND' : 'A MOMENT TO RECONNECT'}
          </p>
          <p className="status-page-number">{missing ? '404' : 'PAUSE'}</p>
          <h1
            aria-label={
              missing ? '这一页，还没有写下。' : '旅程，暂时停了一下。'
            }
          >
            <PunctuatedText
              text={missing ? '这一页，还没有写下。' : '旅程，暂时停了一下。'}
            />
          </h1>
          <p className="status-page-description">
            <PunctuatedText
              text={
                missing
                  ? '也许地址写错了，也许故事换了一个地方。回到首页，我们继续。'
                  : '这段画面暂时没能打开。可以重新加载，或先回到熟悉的首页。'
              }
            />
          </p>
          <div className="status-page-actions">
            {!missing && (
              <button onClick={() => window.location.reload()}>
                <RefreshCw size={18} />
                重新加载
              </button>
            )}
            <Link to="/invitation">
              回到首页
              <ArrowUpRight size={19} />
            </Link>
            <button
              className="status-back"
              onClick={() => {
                if (window.history.length > 1) window.history.back()
                else window.location.assign('/invitation')
              }}
            >
              <ArrowLeft size={17} />
              返回上一页
            </button>
          </div>
        </div>
      </section>
      <footer>
        <span>SIPC · 过去已去，未来已来。</span>
        <span>故事未完，我们继续。</span>
      </footer>
    </main>
  )
}
