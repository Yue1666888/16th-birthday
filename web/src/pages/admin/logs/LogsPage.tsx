import { useEffect, useRef, useState } from 'react'
import { Download, Terminal } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeading } from '@/components/common/PageHeading'
import { ErrorBanner } from '@/components/common/AsyncState'
import { logsApi } from '@/api/admin/logs.api'
import { errorMessage } from '@/lib/api-error'
import { useServiceLogs } from './hooks/use-service-logs'
import '@/styles/logs.css'
export function LogsPage() {
  const logs = useServiceLogs(),
    viewport = useRef<HTMLDivElement | null>(null),
    follow = useRef(true),
    [downloading, setDownloading] = useState(false)
  useEffect(() => {
    if (follow.current && viewport.current)
      viewport.current.scrollTop = viewport.current.scrollHeight
  }, [logs.entries])
  return (
    <>
      <PageHeading
        title="日志管理"
        description="查看后端服务运行日志，追踪请求与异常，辅助定位问题。"
      >
        <button
          className="btn primary"
          disabled={downloading}
          onClick={() => {
            setDownloading(true)
            void logsApi
              .download()
              .then(() => toast.success('日志已下载'))
              .catch((e) => toast.error(errorMessage(e)))
              .finally(() => setDownloading(false))
          }}
        >
          <Download />
          {downloading ? '下载中' : '下载日志'}
        </button>
      </PageHeading>
      <ErrorBanner error={logs.error} />
      <section className="log-terminal" aria-label="后端服务日志">
        <header className="terminal-head">
          <div className="terminal-source">
            <Terminal />
            <strong>birthday16-api</strong>
            <span className="terminal-divider">/</span>
            <span>{logs.source}</span>
          </div>
          <div className="terminal-env">
            <span className="demo-dot" />
            服务日志<span className="terminal-divider">·</span>只读视图
          </div>
        </header>
        <div className="terminal-caption">
          <span>Java 21 · 后端服务</span>
          <span>
            {logs.error
              ? '暂时无法读取，正在尝试恢复'
              : logs.loading
                ? '正在连接…'
                : '每 5 秒更新'}
          </span>
        </div>
        <div
          className="log-viewport"
          id="log-viewport"
          tabIndex={0}
          role="region"
          aria-label="可滚动的服务日志"
          ref={viewport}
          onScroll={(e) => {
            const element = e.currentTarget
            follow.current =
              element.scrollHeight - element.scrollTop - element.clientHeight <
              45
          }}
        >
          <div className="log-lines">
            {logs.entries.length ? (
              logs.entries.map((entry, index) => (
                <div className={'log-row row-' + entry.level} key={entry.id}>
                  <span className="log-number">
                    {String(index + 1).padStart(3, '0')}
                  </span>
                  <span
                    className={
                      'log-content ' +
                      (entry.level === 'STACK'
                        ? 'log-stack'
                        : 'level-' + entry.level)
                    }
                  >
                    {entry.text}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ padding: 24, color: '#7f91ad' }}>
                {logs.loading
                  ? '正在读取应用日志…'
                  : logs.error
                    ? '日志源暂不可用，已保留当前显示内容。'
                    : '暂时没有日志记录。'}
              </div>
            )}
          </div>
        </div>
        <footer className="terminal-foot">
          <span>
            <span className="log-foot-dot" />
            {logs.rotated ? '日志文件已轮转' : '只读服务日志'}
            {logs.truncated ? ' · 较早内容已截断，下载可查看当前文件' : ''}
          </span>
          <span>{logs.entries.length} 行</span>
        </footer>
      </section>
    </>
  )
}
