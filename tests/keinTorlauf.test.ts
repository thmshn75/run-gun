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

  it('behaelt die zwei Testmodi im Menue und den 3D-Start im Titel', () => {
    const menu = readFileSync(new URL('../src/scenes/MenuScene.ts', import.meta.url), 'utf8')
    expect(menu).toContain("'TESTGELÄNDE'")
    expect(menu).toContain("'PROBELAUF'")
    expect(menu).not.toContain("'RUN GUN 3D'")
    const title = readFileSync(new URL('../src/scenes/TitleScene.ts', import.meta.url), 'utf8')
    expect(title).toContain("'RUN GUN 3D'")
    expect(title).toContain("import('../v3d/einstieg')")
    expect(menu).not.toContain("this.scene.start('RunGunV2Scene')")
  })
})
