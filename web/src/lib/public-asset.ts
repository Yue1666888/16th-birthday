/** Dev paths stay unchanged; release URLs change when public assets change. */
export function publicAsset(path: string) {
  if (/[?&]v=/.test(path)) return path
  return import.meta.env.PROD && typeof __PUBLIC_ASSET_VERSION__ !== 'undefined'
    ? path + (path.includes('?') ? '&' : '?') + 'v=' + __PUBLIC_ASSET_VERSION__
    : path
}
