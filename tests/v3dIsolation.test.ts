import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const basis = resolve('src/v3d')
const dateien = readdirSync(basis).filter(name => name.endsWith('.ts'))
describe('3D-Isolation', () => {
  it('haelt die 3D-Module getrennt und offline', () => {
    for (const name of dateien) {
      const text = readFileSync(join(basis, name), 'utf8')
      expect(text, name).not.toMatch(/from\s+['"][^'"]*(?:systems|config|v2|scenes)\//)
      expect(text, name).not.toMatch(/https?:\/\//)
      if (name === 'rechnen.ts' || name === 'speicher.ts') expect(text, name).not.toMatch(/from\s+['"][^'"]*(?:three|renderer)/)
      if (/Phaser/.test(text)) expect(text, name).not.toMatch(/import\s+(?!type\b).*Phaser/)
    }
  })
})
