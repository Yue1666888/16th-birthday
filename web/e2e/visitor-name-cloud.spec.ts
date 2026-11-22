import { expect, test } from '@playwright/test'
import { mockVisitorApi } from './visitor-fixtures'

test.use({ hasTouch: true })
test('115 cloud packs real names, preserves every entry and adapts to a phone', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mockVisitorApi(page)
  const names = Array.from({ length: 78 }, (_, index) => ({
    name:
      ['林', '陈', '刘', '张', '王', '赵'][index % 6] +
      [
        '晓',
        '雨',
        '明',
        '安',
        '星',
        '子',
        '远',
        '思',
        '文',
        '清',
        '宁',
        '乐',
        '晨',
      ][Math.floor(index / 6)] +
      (index % 4 === 0 ? '阳' : ''),
    submissionCount: 80 - index,
    weight: (80 - index) / 4000,
  }))
  await page.route('**/api/v1/memories/names', (route) =>
    route.fulfill({
      json: {
        code: 'OK',
        message: '成功',
        data: {
          totalSubmissions: 4000,
          namedSubmissions: names.reduce(
            (sum, item) => sum + item.submissionCount,
            0,
          ),
          names,
        },
        fieldErrors: {},
        traceId: 'cloud-test',
      },
    }),
  )
  await page.goto('/memories')
  const wall = page.getByRole('region', { name: '回忆姓名墙', exact: true })
  const cloud = wall.locator('[data-shape="115"]')
  await expect(cloud).toHaveAttribute('data-layout-state', 'ready')
  await expect(wall.locator('.memory-name')).toHaveCount(names.length)
  expect(await cloud.locator('.memory-cloud-word').count()).toBeGreaterThan(40)
  // Check the actual SVG glyphs against the outline, rather than bounding boxes
  // (interlocking glyphs may legitimately have overlapping bounding boxes).
  const outsidePixels = await cloud
    .locator('svg')
    .evaluate((svg: SVGSVGElement) => {
      const box = svg.viewBox.baseVal
      const mask = document.createElement('canvas')
      mask.width = box.width
      mask.height = box.height
      const ink = document.createElement('canvas')
      ink.width = box.width
      ink.height = box.height
      const allowed = mask.getContext('2d')!,
        drawn = ink.getContext('2d')!
      allowed.scale(box.width / 1000, box.height / 360)
      allowed.fill(new Path2D(svg.querySelector('path')!.getAttribute('d')!))
      for (const group of svg.querySelectorAll<SVGGElement>(
        '.memory-cloud-word',
      )) {
        const text = group.querySelector('text')!,
          style = getComputedStyle(text)
        const matrix = group.transform.baseVal.consolidate()!.matrix
        drawn.save()
        drawn.translate(matrix.e, matrix.f)
        drawn.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        drawn.textAlign = 'center'
        for (const line of text.querySelectorAll('tspan'))
          drawn.fillText(
            line.textContent!,
            Number(line.getAttribute('x')),
            Number(line.getAttribute('y')),
          )
        drawn.restore()
      }
      const a = allowed.getImageData(0, 0, mask.width, mask.height).data
      const b = drawn.getImageData(0, 0, ink.width, ink.height).data
      let outside = 0
      for (let index = 3; index < b.length; index += 4)
        if (b[index] > 100 && a[index] < 100) outside++
      return outside
    })
  expect(outsidePixels).toBeLessThan(8)
  await wall.screenshot({ path: testInfo.outputPath('names-115-desktop.png') })
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(page.locator('.visitor-app')).toHaveAttribute(
      'data-view',
      'mobile',
    )
    await expect(cloud).toHaveAttribute('data-layout-state', 'ready')
    await expect(wall.locator('.memory-name')).toHaveCount(names.length)
    await expect
      .poll(() => cloud.locator('.memory-cloud-word').count())
      .toBeGreaterThan(12)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy()
    const word = cloud.locator('.memory-cloud-word').first()
    const title = await word.locator('title').textContent()
    await word.tap()
    await expect(wall.locator('.memory-cloud-info')).toHaveText(title!)
  }
  await wall.screenshot({ path: testInfo.outputPath('names-115-mobile.png') })
  await wall.locator('.memory-cloud-more summary').click()
  await expect(wall.locator('.memory-cloud-overflow')).toBeVisible()
  const extra = wall.locator('.memory-cloud-extra-name').first()
  const extraTitle = await extra.getAttribute('title')
  await extra.click()
  await expect(wall.locator('.memory-cloud-info')).toHaveText(extraTitle!)
  expect(errors).toEqual([])
})
