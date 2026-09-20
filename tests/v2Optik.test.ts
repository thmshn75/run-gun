import { describe, expect, it } from 'vitest'
import { BALANCE_V2 } from '../src/v2/balanceV2'

function kanaele(farbe: number) {
  return { rot: farbe >> 16 & 0xff, gruen: farbe >> 8 & 0xff, blau: farbe & 0xff }
}

describe('Run Gun V2 — S8 Optik', () => {
  it('trennt die eigene blaue und die gegnerische rote Seite klar ueber ihre RGB-Werte', () => {
    const eigene = kanaele(BALANCE_V2.colors.eigeneSeite)
    const gegner = kanaele(BALANCE_V2.colors.gegnerSeite)
    expect(eigene.blau).toBeGreaterThan(eigene.rot + 80)
    expect(eigene.blau).toBeGreaterThan(eigene.gruen + 40)
    expect(gegner.rot).toBeGreaterThan(gegner.blau + 80)
    expect(gegner.rot).toBeGreaterThan(gegner.gruen + 40)
  })
})
