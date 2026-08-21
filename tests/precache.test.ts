import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const distDir = resolve('dist')
const serviceWorkerPath = join(distDir, 'sw.js')
const hasBuild = existsSync(serviceWorkerPath)

if (!hasBuild) console.warn('Precache-Test uebersprungen: dist/sw.js fehlt. Erst npm run build ausfuehren.')

function listDistFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? listDistFiles(path) : [path]
  })
}

describe.skipIf(!hasBuild)('production precache', () => {
  const distFiles = listDistFiles(distDir)
  const precacheFiles = distFiles
    .map((path) => relative(distDir, path).split(sep).join('/'))
    .filter((path) => /\.(?:js|css|html|png|webmanifest)$/.test(path))
    .filter((path) => path !== 'sw.js' && !/(?:^|\/)workbox-.*\.js$/.test(path))

  it('includes every emitted offline asset in the service-worker precache', () => {
    const serviceWorker = readFileSync(serviceWorkerPath, 'utf8')
    const precacheUrls = [...serviceWorker.matchAll(/url:"([^"]+)"/g)].map((match) => match[1])

    expect(precacheFiles).not.toHaveLength(0)
    expect(precacheUrls).toEqual(expect.arrayContaining(precacheFiles))
  })

  it('does not emit source maps', () => {
    const sourceMaps = distFiles
      .map((path) => relative(distDir, path).split(sep).join('/'))
      .filter((path) => path.endsWith('.map'))

    expect(sourceMaps).toEqual([])
  })
})
