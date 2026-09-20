import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { BALANCE_V2, tiefenSkala } from '../src/v2/balanceV2'

const scene = readFileSync(new URL('../src/v2/RunGunV2Scene.ts', import.meta.url), 'utf8')

describe('Run Gun V2 — N11 sichtbarer Endboss', () => {
  it('bleibt am Horizont mindestens so gross wie ein Helm im Vordergrund', () => {
    const effektiveStartSkala = BALANCE_V2.ende.bossStartScale * tiefenSkala(844, BALANCE_V2.track.horizonY)
    expect(effektiveStartSkala).toBeGreaterThan(0.45)
  })

  it('liegt mit Bild und Zaehler vor Massen und Mauern', () => {
    // Seit N14 kommen alle Ebenen aus einer Tabelle; der Test prueft die Ordnung
    // dort und nicht mehr die nackten Zahlen im Szenencode.
    expect(BALANCE_V2.ebenen.boss).toBeGreaterThan(BALANCE_V2.ebenen.massen)
    expect(BALANCE_V2.ebenen.boss).toBeGreaterThan(BALANCE_V2.ebenen.mauer)
    expect(BALANCE_V2.ebenen.bossZaehler).toBeGreaterThan(BALANCE_V2.ebenen.boss)
    expect(scene).toContain('BALANCE_V2.ebenen.boss')
    expect(scene).toContain('BALANCE_V2.ebenen.bossZaehler')
  })

  it('laedt alle Laufbilder und spielt sie als endlose Animation mit zehn Bildern pro Sekunde', () => {
    for (let index = 1; index <= 12; index += 1) expect(scene).toContain(`boss-elite-move-${index}.png`)
    expect(scene).toContain('Array.from({ length: 12 }')
    expect(scene).toContain('v2-boss-elite-move-${index + 1}')
    expect(scene).toContain('frameRate: 10')
    expect(scene).toContain('repeat: -1')
  })
})
