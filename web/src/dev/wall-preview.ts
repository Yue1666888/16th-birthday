import type { ImageItem, PageResponse } from '@/domain/api.types'
import type {
  MemoryDetail,
  MemorySummary,
  PublicHonor,
} from '@/types/public/walls.types'
// Explicit development preview only. Never an API error fallback or a database seed.
function artwork(index: number, certificate = false): ImageItem {
  const colors = ['#39565c', '#54625c', '#6c6156', '#4a5872', '#495e63']
  const tone = colors[index % colors.length]
  const svg = certificate
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850"><rect width="1200" height="850" fill="#e8e4d9"/><rect x="48" y="48" width="1104" height="754" fill="none" stroke="#87958b" stroke-width="2"/><path d="M0 0h290L0 290z" fill="${tone}"/><text x="600" y="190" text-anchor="middle" fill="#52605a" font-size="18" font-family="sans-serif" letter-spacing="8">SIPC / SAMPLE COLLECTION</text><text x="600" y="365" text-anchor="middle" fill="#25332f" font-size="72" font-family="sans-serif">每一份热爱，都有回响</text><path d="M460 430h280" stroke="#9caa9f"/><text x="600" y="520" text-anchor="middle" fill="#52605a" font-size="26" font-family="sans-serif">荣誉墙排版示例 · 非真实奖项</text><circle cx="600" cy="660" r="42" fill="none" stroke="#87958b" stroke-width="2"/><text x="600" y="672" text-anchor="middle" fill="#52605a" font-size="28" font-family="sans-serif">16</text></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${tone}"/><stop offset="1" stop-color="#18262d"/></linearGradient><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".12"/></feComponentTransfer></filter></defs><rect width="1200" height="850" fill="url(#sky)"/><circle cx="${780 - (index % 3) * 170}" cy="220" r="95" fill="#ddd7bd" opacity=".7"/><path d="M0 650L200 360 440 580 650 310 940 620 1200 410V850H0z" fill="#233d40"/><path d="M0 750L340 480 600 720 950 480 1200 660V850H0z" fill="#122d34"/><path d="M500 850L650 650 790 850z" fill="#c7c0a3" opacity=".2"/><rect width="1200" height="850" filter="url(#grain)" opacity=".45"/><text x="52" y="72" font-family="sans-serif" font-size="17" letter-spacing="5" fill="#e7eee9" opacity=".75">SIPC / MOMENT ${String(index + 1).padStart(2, '0')}</text><text x="54" y="790" font-family="sans-serif" font-size="22" letter-spacing="3" fill="#e7eee9" opacity=".65">ILLUSTRATION · 示例画面</text></svg>`
  return {
    id: 'preview-image-' + certificate + index,
    url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
    width: 1200,
    height: 850,
  }
}
const names = ['林同学', '陈同学', null, '周同学', '一位老朋友']
const titles = [
  '一起走过的，那一段路',
  '总有一些日子，闪闪发光',
  null,
  '下一次，再一起看日落',
  '晚风替我们记得',
]
const paragraphs = [
  '还记得那天，我们一起留到很晚。屏幕上的光、走廊里的笑声，还有最后终于跑通时的欢呼。很多事情已经模糊了，但和大家并肩的感觉一直都在。',
  '后来去了不同的城市，开始了各自的新生活。但偶尔翻开相册，还是会想起这里。希望下次再见，大家依然带着那份认真与热爱。',
  '这是没有照片的一段回忆。那些说不完的话，就留在这里吧。愿我们一直保持好奇，一直有勇气出发。',
]
export const previewMemories: MemoryDetail[] = Array.from(
  { length: 25 },
  (_, index) => ({
    id: 'preview-memory-' + index,
    displayName: names[index % 5],
    title: titles[index % 5],
    content:
      index === 4
        ? null
        : paragraphs[index % 3] +
          (index === 3 ? '\n\n' + paragraphs.join('\n\n').repeat(12) : ''),
    images:
      index === 2 || index === 7
        ? []
        : Array.from(
            { length: index === 0 ? 9 : (index % 3) + 1 },
            (_, image) => artwork(index + image),
          ),
    publishedAt: '2026-11-21T09:00:00+08:00',
  }),
)
export const previewHonors: PublicHonor[] = Array.from(
  { length: 8 },
  (_, index) => ({
    id: 'preview-honor-' + index,
    title:
      [
        '让想法生根，让热爱被看见',
        '并肩出发，一起抵达',
        '从第一行代码，到新的可能',
        '把每一次尝试，写成答案',
      ][index % 4] + ' · 示例',
    people:
      index === 2
        ? Array.from({ length: 40 }, (_, i) => '示例成员' + (i + 1)).join('、')
        : '示例成员：林同学、陈同学、周同学',
    images: Array.from(
      { length: index === 0 ? 9 : (index % 3) + 1 },
      (_, image) => artwork(index + image, true),
    ),
  }),
)
function paginate<T>(rows: T[], page: number): PageResponse<T> {
  return {
    content: rows.slice((page - 1) * 20, page * 20),
    page,
    size: 20,
    totalElements: rows.length,
    totalPages: Math.ceil(rows.length / 20),
  }
}
export const getPreviewMemories = (page: number) =>
  paginate<MemorySummary>(
    previewMemories.map((item) => ({
      ...item,
      excerpt: item.content?.slice(0, 120) || null,
      coverImage: item.images[0] || null,
      imageCount: item.images.length,
    })),
    page,
  )
export const getPreviewHonors = (page: number) => paginate(previewHonors, page)
