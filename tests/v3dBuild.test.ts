import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const dist = resolve('dist')
describe.skipIf(!existsSync(join(dist, 'sw.js')))('3D-Build', () => {
  it('trennt Three vom Hauptbuendel und cached alle 3D-Dateien', () => {
    const html = readFileSync(join(dist, 'index.html'), 'utf8')
    const haupt = html.match(/<script[^>]*type="module"[^>]*src="\/run-gun\/([^"]+)"/)?.[1]
    expect(haupt).toBeTruthy()
    const hauptdatei = join(dist, haupt!)
    expect(statSync(hauptdatei).size).toBeLessThanOrEqual(1475425)
    expect(readFileSync(hauptdatei, 'utf8')).not.toContain('__THREE__')
    const dateien = readdirSync(join(dist, 'assets')).filter(n => n.endsWith('.js'))
    const v3d = dateien.filter(n => n.startsWith('v3d-'))
    expect(v3d.length).toBeGreaterThan(0)
    expect(v3d.some(n => readFileSync(join(dist, 'assets', n), 'utf8').includes('__THREE__'))).toBe(true)
    for (const name of dateien) if (`assets/${name}` !== haupt && !name.startsWith('workbox-')) expect(name).toContain('v3d')
    const urls = [...readFileSync(join(dist, 'sw.js'), 'utf8').matchAll(/url:"([^"]+)"/g)].map(m => m[1])
    for (const name of v3d) expect(urls).toContain(`assets/${name}`)
    expect(v3d.reduce((summe, name) => summe + statSync(join(dist, 'assets', name)).size, 0)).toBeLessThanOrEqual(25 * 1048576)
    expect(urls.some(url => url.includes('probe-3d'))).toBe(false)
  })
})
