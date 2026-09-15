import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getWeaponRewardChoices } from '../src/systems/weaponChoices'
import {
  PROBELAUF_REGELN,
  TESTGELAENDE_REGELN,
  getFassGateSchritte,
  getFassTreffer,
  getFassWaffe,
  getProbeHaerte,
  getTorStartwert,
  type BahnKontext,
} from '../src/systems/versuchPlan'

/**
 * PROBELAUF (Thomas 2026-09-15): die Bahnen nach der Logik des echten Runs - Waffen nach
 * Freischaltung und Kauf, Haerte mit dem Level, rote Faesser, Muenzen - und NICHTS wird
 * gespeichert.
 */
const kontext = (teil: Partial<BahnKontext> = {}): BahnKontext => ({
  level: 1, truppe: 30, schussProSek: 3, waffe: 'pistol', gekaufte: [], waffenIndex: 0, rotSerie: 0, ...teil,
})
const gameScene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')

describe('Probelauf', () => {
  describe('der Spielstand bleibt unberuehrt', () => {
    it('haengt am unveraenderlichen probe-Feld, nicht an einstieg', () => {
      // stelleEinstiegHer schreibt `einstieg` um - haengte der Probelauf daran, waere der
      // Waechter ohne gesicherten Run still aus (Angriffssicht 2026-09-15).
      expect(gameScene).toMatch(/private istProbelauf\(\): boolean \{\s*\n\s*return this\.probe !== undefined/)
      const zuweisungen = gameScene.split('\n').filter((zeile) => /this\.probe = /.test(zeile))
      expect(zuweisungen).toHaveLength(1)
      expect(gameScene).toMatch(/public init\([\s\S]{0,500}?this\.probe = /)
    })

    it('sperrt den Speicher-Waechter auch im Probelauf', () => {
      expect(gameScene).toMatch(/private speichere\(data: SaveData\): void \{\s*\n\s*if \(this\.istTestgelaende\(\) \|\| this\.istProbelauf\(\)\) return/)
    })

    it('fuehrt aus dem Probelauf nie in die GameOverScene', () => {
      // Deren WEITERSPIELEN ruft writeSave direkt, am Waechter vorbei.
      expect(gameScene).toMatch(/private triggerGameOver\(\): void \{\s*\n\s*if \(this\.istProbelauf\(\)\) return this\.beendeProbelauf\(\)/)
    })

    it('baut den Probe-Einstieg vor jedem Zugriff auf den gesicherten Run', () => {
      const start = gameScene.indexOf('private stelleEinstiegHer(): void {')
      const probe = gameScene.indexOf('if (probe !== undefined) {', start)
      const run = gameScene.indexOf('loadSave().run', start)
      expect(start).toBeGreaterThan(0)
      expect(probe).toBeGreaterThan(start)
      expect(probe).toBeLessThan(run)
    })

    it('bucht Muenzen und Kaeufe gegen das Speicherkonto, nicht gegen den Spielstand', () => {
      expect(gameScene).toMatch(/this\.kontoStand = \(this\.istProbelauf\(\) \? this\.kontoStand : saved\.coins\) \+ offen/)
      expect(gameScene).toMatch(/if \(this\.istProbelauf\(\)\) \{\s*\n\s*const probePreis = [^\n]*\n\s*if \(probePreis === undefined \|\| this\.kontoStand < probePreis\) return/)
    })
  })

  describe('Waffen wie das Wandtor', () => {
    it('bietet auf Level 1 ohne Kaeufe keine Waffe an', () => {
      expect(PROBELAUF_REGELN.fassWaffe(kontext(), () => 0.5)).toBeUndefined()
    })

    it('bietet eine gekaufte Waffe schon auf Level 1 an', () => {
      expect(PROBELAUF_REGELN.fassWaffe(kontext({ gekaufte: ['laser'] }), () => 0.5)).toBe('laser')
    })

    it('zieht auf jedem Level nur, was dort freigeschaltet oder gekauft ist', () => {
      for (const level of [2, 5, 12, 20, 30]) {
        const erlaubt = getWeaponRewardChoices('normal', level, ['laser'])
        for (let i = 0; i < 50; i += 1) {
          const waffe = PROBELAUF_REGELN.fassWaffe(kontext({ level, waffe: 'normal', gekaufte: ['laser'] }), () => i / 50)
          expect(erlaubt).toContain(waffe)
        }
      }
    })
  })

  describe('Haerte waechst mit dem Level', () => {
    it('beginnt auf Level 1 beim Wert des abgenommenen Versuchs', () => {
      expect(getProbeHaerte(1, BALANCE.versuch.probe.fassHaerteDeckel)).toBe(1)
      expect(PROBELAUF_REGELN.fassTreffer(kontext())).toBe(TESTGELAENDE_REGELN.fassTreffer(kontext()))
    })

    it('waechst wie die Wandkachel und endet am Deckel', () => {
      const deckel = BALANCE.versuch.probe.fassHaerteDeckel
      let vorher = 0
      for (let level = 1; level <= 40; level += 1) {
        const haerte = getProbeHaerte(level, deckel)
        expect(haerte).toBeGreaterThanOrEqual(vorher)
        expect(haerte).toBeLessThanOrEqual(deckel)
        vorher = haerte
      }
      expect(getProbeHaerte(2, deckel)).toBeCloseTo(BALANCE.wallHardness.perLevelGrowth)
      expect(PROBELAUF_REGELN.fassTreffer(kontext({ level: 20 })))
        .toBe(Math.round(getFassTreffer(30, 3) * deckel))
    })

    it('laesst Tore mit dem Level tiefer im Minus starten', () => {
      expect(PROBELAUF_REGELN.torStartwert(0.5, kontext({ level: 12 })))
        .toBeLessThan(PROBELAUF_REGELN.torStartwert(0.5, kontext({ level: 1 })))
    })

    it('gibt je DMG/RATE-Fass eine feste Schrittzahl, nicht den Restweg-Anteil', () => {
      expect(PROBELAUF_REGELN.fassSchritte('damage', 1, 7)).toBe(BALANCE.versuch.probe.fassSchritte)
    })
  })

  describe('rote Faesser wie die rote Wandkachel', () => {
    it('ziehen so viele Schritte ab, wie ein gutes Fass gibt', () => {
      // Messung 2026-09-15: Mit 3 Schritten fuer Gut und 1 fuer Rot wuchs die Feuerkraft
      // auf Level 12/20 weiter, wo der Run sie durch Rot stillhaelt.
      expect(PROBELAUF_REGELN.rotSchritte).toBe(PROBELAUF_REGELN.fassSchritte('damage', 1, 7))
      expect(TESTGELAENDE_REGELN.rotSchritte).toBe(1)
    })

    it('kommen nicht vor badMinLevel und nie laenger als badMaxRun in Folge', () => {
      const immerRot = () => 0
      expect(PROBELAUF_REGELN.fassRot(kontext({ level: BALANCE.walls.badMinLevel - 1 }), immerRot)).toBeUndefined()
      expect(PROBELAUF_REGELN.fassRot(kontext({ level: 5, rotSerie: BALANCE.walls.badMaxRun }), immerRot)).toBeUndefined()
      expect(PROBELAUF_REGELN.fassRot(kontext({ level: 5 }), immerRot)).toBe('weakenDamage')
      expect(PROBELAUF_REGELN.fassRot(kontext({ level: 5 }), () => 0.99)).toBeUndefined()
    })

    it('wirft je gutem Fass so viel ab wie mehrere Wandkacheln - ein Fass ersetzt mehrere', () => {
      // Gemessen 2026-09-15: Im Probelauf werden 2,6- bis 5,2-mal weniger Faesser
      // zerschossen als im Run Kacheln. Ein Fass muss deshalb ein Vielfaches tragen,
      // sonst verdient der Probelauf nur ein Drittel.
      expect(PROBELAUF_REGELN.fassMuenzen % BALANCE.walls.coinReward).toBe(0)
      expect(PROBELAUF_REGELN.fassMuenzen / BALANCE.walls.coinReward).toBeGreaterThanOrEqual(2)
      expect(PROBELAUF_REGELN.fassMuenzen / BALANCE.walls.coinReward).toBeLessThanOrEqual(6)
    })
  })

  describe('das Testgelaende bleibt, wie es war', () => {
    it('liefert dieselben Werte wie die abgenommenen Funktionen', () => {
      let zufallAufgerufen = false
      const zufall = () => { zufallAufgerufen = true; return 0 }
      for (const truppe of [1, 12, 30, 100]) {
        for (const level of [1, 5, 20]) {
          const k = kontext({ truppe, level, schussProSek: 4, waffenIndex: truppe % 13 })
          expect(TESTGELAENDE_REGELN.fassTreffer(k)).toBe(getFassTreffer(truppe, 4))
          expect(TESTGELAENDE_REGELN.torStartwert(0.3, k)).toBe(getTorStartwert(0.3, truppe))
          expect(TESTGELAENDE_REGELN.fassWaffe(k, zufall)).toBe(getFassWaffe(truppe % 13))
          expect(TESTGELAENDE_REGELN.fassRot(k, zufall)).toBeUndefined()
          expect(TESTGELAENDE_REGELN.fassSchritte('damage', 1.2, 7)).toBe(getFassGateSchritte('damage', 1.2, 7))
        }
      }
      // Kein Wuerfel darf im Testgelaende zusaetzlich rollen - sonst verschoebe sich die
      // Zufallsfolge des abgenommenen Versuchs.
      expect(zufallAufgerufen).toBe(false)
      expect(TESTGELAENDE_REGELN.fassMuenzen).toBe(0)
      expect(TESTGELAENDE_REGELN.torMuenzen).toBe(0)
    })
  })
})
