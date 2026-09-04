import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'

/**
 * Jede Gestalt hat ihre eigene Gangart, und die traegt zwei Werte: den Bildtakt und das
 * Fortbewegungstempo. Die Tests halten fest, was dabei NICHT passieren darf.
 */
describe('Gangarten', () => {
  const gangarten = BALANCE.enemy.bilder.gangarten
  const saetze = BALANCE.enemy.bilder.saetze
  const grundgestalten = ['enemy-light', 'enemy-standard', 'enemy-heavy'] as const

  it('jede Gestalt mit eigenem Bewegungssatz hat auch Takt und Tempo', () => {
    for (const gestalt of Object.keys(saetze)) {
      if ((grundgestalten as readonly string[]).includes(gestalt)) continue
      expect(gangarten[gestalt], `${gestalt} fehlt in gangarten`).toBeDefined()
    }
  })

  it('umgekehrt hat jede Gangart auch einen Bewegungssatz', () => {
    for (const gestalt of Object.keys(gangarten)) {
      expect(saetze[gestalt], `${gestalt} hat Takt/Tempo, aber keinen Bildersatz`).toBeDefined()
    }
  })

  /**
   * DER EIGENTLICHE SCHUTZ. Das Tempo je Gangart darf die Schwierigkeit nicht
   * verschieben: Ueber alle Gestalten EINER Staerke - einschliesslich der Grundgestalt,
   * die mit Tempo 1,0 taumelt - muss das Mittel 1,0 bleiben. Sonst wird eine Staerke
   * durch die Hintertuer schneller oder langsamer, ohne dass jemand an speedFactor
   * gedreht haette.
   */
  it('je Staerke bleibt das mittlere Tempo 1,0', () => {
    for (const basis of grundgestalten) {
      const eigene = Object.keys(gangarten).filter((k) => k.startsWith(`${basis}-`))
      expect(eigene.length, `${basis} hat keine Sondergestalten`).toBeGreaterThan(0)
      const summe = eigene.reduce((s, k) => s + gangarten[k].tempo, 1) // 1 = Grundgestalt
      const mittel = summe / (eigene.length + 1)
      expect(mittel, `${basis} verschiebt die Schwierigkeit`).toBeCloseTo(1, 2)
    }
  })

  it('der Bildtakt bleibt fluessig und die Spanne beherrschbar', () => {
    const takte = Object.values(gangarten).map((g) => g.takt)
    // Zwoelf Bilder: unter 0,5 Zyklen/s steht ein Bild laenger als 167 ms und die
    // Bewegung zerfaellt in Einzelbilder.
    expect(Math.min(...takte)).toBeGreaterThanOrEqual(0.5)
    expect(Math.max(...takte)).toBeLessThanOrEqual(2)
    const tempi = Object.values(gangarten).map((g) => g.tempo)
    // Ungedaempft laege der Renner zum Zucker bei 8,4 : 1 - das kippt den
    // Durchkommensanteil. Gedaempft bleibt es unter 2,5 : 1.
    expect(Math.max(...tempi) / Math.min(...tempi)).toBeLessThan(2.5)
  })

  it('schnellere Gangarten haben auch den schnelleren Bildtakt als das Taumeln', () => {
    // Rennen ist die schnellste Gangart und muss sich auch im Bild am schnellsten regen.
    const rennen = gangarten['enemy-light-e']
    for (const [key, g] of Object.entries(gangarten)) {
      if (key === 'enemy-light-e') continue
      expect(rennen.tempo, `${key} ist schneller als Rennen`).toBeGreaterThan(g.tempo)
    }
  })
})
