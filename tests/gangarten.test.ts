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
  it('das mittlere Tempo je Staerke steht auf seinem dokumentierten Wert', () => {
    // Nur die mittleren sind neutral. Leicht (0,93) und schwer (0,91) liegen bewusst
    // darunter: Die schweren kamen als Ganzes zu schnell heran, und der Renner mit 1,54
    // war zu schnell (beides Thomas 2026-09-05). Das macht beide Sorten rund ein
    // Zehntel langsamer und damit etwas leichter - eine bewusste Entscheidung aus dem
    // Spielgefuehl, kein Versehen. Wer diese Zahlen aendert, aendert die Schwierigkeit
    // und muss das hier mitschreiben.
    const soll: Readonly<Record<string, number>> = {
      'enemy-light': 0.93,
      'enemy-standard': 0.95,
      'enemy-heavy': 0.91,
    }
    for (const basis of grundgestalten) {
      const eigene = Object.keys(gangarten).filter((k) => k.startsWith(`${basis}-`))
      expect(eigene.length, `${basis} hat keine Sondergestalten`).toBeGreaterThan(0)
      const summe = eigene.reduce((s, k) => s + gangarten[k].tempo, 1) // 1 = Grundgestalt
      const mittel = summe / (eigene.length + 1)
      expect(mittel, `${basis} verschiebt die Schwierigkeit`).toBeCloseTo(soll[basis], 2)
    }
  })

  it('keine Gangart wirkt hektisch oder schleppend', () => {
    // NICHT der Takt entscheidet ueber die gefuehlte Hektik, sondern die AENDERUNG JE
    // SEKUNDE: Silhouettensprung je Bild x Bilder je Sekunde. Die leichten Saetze
    // springen fast doppelt so weit wie die schweren (kleine Figuren brauchen groessere
    // Posenwechsel, um lesbar zu sein) - bei gleichem Takt wirken sie deshalb doppelt
    // so hektisch. Genau daran ist die erste Korrektur vom 2026-09-05 vorbeigegangen.
    //
    // Die Sprungwerte sind an den Bilddateien gemessen. Springt ein neuer Satz anders,
    // faellt es hier auf, statt erst am Bildschirm.
    const sprungJeBild: Readonly<Record<string, number>> = {
      'enemy-light-e': 31.2, 'enemy-light-f': 37.8, 'enemy-light-g': 28.0, 'enemy-light-i': 32.5,
      'enemy-standard-e': 20.0, 'enemy-standard-g': 25.5, 'enemy-standard-i': 24.1,
      'enemy-heavy-e': 23.4, 'enemy-heavy-g': 16.0, 'enemy-heavy-i': 22.1,
    }
    for (const [key, g] of Object.entries(gangarten)) {
      const sprung = sprungJeBild[key]
      expect(sprung, `${key} hat keinen gemessenen Sprungwert`).toBeDefined()
      const aenderungJeSekunde = sprung * g.takt * 12
      // 120 %/s ist der Wert, den Thomas ausdruecklich als gut bezeichnet hat
      // (`heavy-g`). Alle Gangarten stehen darauf; die Toleranz faengt nur Rundung.
      expect(aenderungJeSekunde, `${key} wirkt hektisch`).toBeLessThanOrEqual(130)
      expect(aenderungJeSekunde, `${key} wirkt schleppend`).toBeGreaterThanOrEqual(110)
    }
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
