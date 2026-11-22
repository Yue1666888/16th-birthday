export const desktopWideQuery = '(min-width: 1024px)'
export const desktopCompactQuery = '(min-width: 768px)'
export const desktopHoverQuery = '(any-hover: hover) and (any-pointer: fine)'
export function selectVisitorView(
  wide: boolean,
  compact: boolean,
  fineHover: boolean,
) {
  return wide || (compact && fineHover)
    ? ('desktop' as const)
    : ('mobile' as const)
}
