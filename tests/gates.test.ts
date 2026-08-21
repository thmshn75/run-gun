import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'

describe('normal gates', () => {
  it('contains no weapon-gate cadence or weapon-selection branch', () => {
    const gatesSource = readFileSync(new URL('../src/systems/gates.ts', import.meta.url), 'utf8')
    expect('weaponGateEvery' in BALANCE.gates).toBe(false)
    expect(gatesSource).not.toContain('Weapon')
    expect(gatesSource).not.toContain("kind === 'weapon'")
  })
})
