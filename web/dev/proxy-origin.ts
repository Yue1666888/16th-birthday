/** Only normalize the browser's own Vite origin; preserve unrelated origins for backend rejection. */
export function isSameOriginProxyRequest(
  origin: string | undefined,
  host: string | undefined,
) {
  if (!origin || !host || !URL.canParse(origin)) return false
  const parsed = new URL(origin)
  return (
    (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
    !parsed.username &&
    !parsed.password &&
    parsed.pathname === '/' &&
    !parsed.search &&
    !parsed.hash &&
    parsed.host.toLowerCase() === host.toLowerCase()
  )
}
