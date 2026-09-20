import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function sources(directory: URL): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory)
    return entry.isDirectory() ? sources(path) : entry.name.endsWith('.ts') ? [readFileSync(path, 'utf8')] : []
  })
}

describe('kein ehemaliger Modus', () => {
  it('enthaelt keine Verweise darauf mehr', () => {
    expect([...sources(new URL('../src/', import.meta.url)), ...sources(new URL('./', import.meta.url))].join('\n')).not.toMatch(new RegExp('tor' + 'lauf', 'i'))
  })

  it('behaelt die drei verbleibenden Menue-Starts', () => {
    const menu = readFileSync(new URL('../src/scenes/MenuScene.ts', import.meta.url), 'utf8')
    expect(menu).toContain("'TESTGELÄNDE'")
    expect(menu).toContain("'PROBELAUF'")
    expect(menu).toContain("this.scene.start('RunGunV2Scene')")
  })
})
