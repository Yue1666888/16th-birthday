import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
export function publicAssetVersion(root: string) {
  const hash = createHash('sha256')
  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (entry.isFile()) {
        hash.update(relative(root, path).replaceAll('\\', '/'))
        hash.update(readFileSync(path))
      }
    }
  }
  visit(root)
  return hash.digest('hex').slice(0, 16)
}
