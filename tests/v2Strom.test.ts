import { describe, expect, it } from 'vitest'
import { BALANCE_V2 } from '../src/v2/balanceV2'
import { bewegeStromFigur, figurenProSekunde, stromDarstellungsPosition, stromLaufdauerSek } from '../src/v2/strom'

describe('Run Gun V2 — S3 der Strom', () => {
  it('steigt mit der Truppe, sichert drei Werte und respektiert die Obergrenze', () => {
    expect(figurenProSekunde(1)).toBe(1)
    expect(figurenProSekunde(10)).toBe(1.6)
    expect(figurenProSekunde(30)).toBe(4.8)
    for (let groesse = 0; groesse < 200; groesse += 1) {
      expect(figurenProSekunde(groesse + 1)).toBeGreaterThanOrEqual(figurenProSekunde(groesse))
      expect(figurenProSekunde(groesse)).toBeLessThanOrEqual(BALANCE_V2.strom.maximaleRateProSek)
    }
  })

  it('hält mehr Vorrat als maximale Rate mal Laufdauer bereit', () => {
    expect(BALANCE_V2.strom.vorratGroesse).toBeGreaterThan(
      BALANCE_V2.strom.maximaleRateProSek * stromLaufdauerSek(),
    )
  })

  it('bewegt die Logik in einer Sekunde genau um das Tempo, auch bei Bildversatz', () => {
    const start = { aktiv: true, x: 195, y: 700 }
    const bewegt = bewegeStromFigur(start, 1000)
    const mitWippen = stromDarstellungsPosition(bewegt, 13)
    expect(bewegt.y).toBe(start.y - BALANCE_V2.strom.tempoPxProSek)
    expect(mitWippen.y).toBe(bewegt.y + 13)
    expect(bewegeStromFigur(bewegt, 1000).y).toBe(start.y - 2 * BALANCE_V2.strom.tempoPxProSek)
  })
})
