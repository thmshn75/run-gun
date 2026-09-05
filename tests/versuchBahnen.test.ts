import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import {
  VERSUCH_WAFFENREIHE,
  getFassInhalt,
  getFassTreffer,
  getFassWaffe,
  getRollBild,
  getRollUmfang,
  getTorStand,
  getTorStartwert,
  getTruppeNachTor,
  haeltJetzt,
} from '../src/systems/versuchPlan'

/**
 * VERSUCH "ZWEI BAHNEN" (Thomas 2026-09-05) - rechts Gegner und Minus-Tore, links
 * stehende Faesser mit den Aufruestungen. Laeuft ausschliesslich im Testgelaende.
 */
describe('Versuch Zwei Bahnen', () => {
  const gameScene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')

  describe('der echte Run bleibt unberuehrt', () => {
    it('baut die Versuchsbahnen NUR im Testgelaende - an genau einer Stelle', () => {
      // DAS IST DIE WICHTIGSTE ZUSAGE DES GANZEN VERSUCHS (Thomas: "wenn wir etwas
      // versuchen, dann NUR im Testgelaende"). Sie haengt an einer einzigen Weiche;
      // eine zweite Aufrufstelle waere der Weg, auf dem der Versuch doch in Bennis
      // Lauf gelangt. Geprueft wird der Quelltext, weil die Szene ohne Phaser nicht
      // laeuft - dieselbe Bauart wie der Spielstand-Waechter in testgelaende.test.ts.
      const aufrufe = gameScene.split('\n').filter((zeile) => /new VersuchBahnen\(/.test(zeile))
      expect(aufrufe).toHaveLength(1)
      expect(gameScene).toMatch(/if \(this\.istTestgelaende\(\)\) \{\s*\n\s*this\.walls = this\.baueVersuchsBahnen\(\)/)
      // Und der einzige Bauplatz liegt in baueVersuchsBahnen, nicht irgendwo sonst.
      expect(gameScene).toMatch(/private baueVersuchsBahnen\(\): BahnSystem \{\s*\n\s*return new VersuchBahnen\(/)
    })

    it('schickt die Gegner nur im Testgelaende nach rechts', () => {
      const aufrufe = gameScene.split('\n').filter((zeile) => /setVersuchsBahnen\(/.test(zeile))
      expect(aufrufe).toHaveLength(1)
      expect(aufrufe[0]).toContain('this.istTestgelaende()')
    })

    it('laesst die abgenommene Testgelaende-Dauer als Wert stehen', () => {
      // Der Versuch braucht eine laengere Gegnerphase, aber die abgenommene Regel
      // "maximal die Haelfte" (Thomas 2026-08-26) bleibt als Wert erhalten: Endet der
      // Versuch, gilt sie ohne weiteres Zutun wieder.
      expect(BALANCE.testground.normalPhaseSec).toBe(20)
      expect(BALANCE.versuch.gegnerphaseSec).toBeGreaterThan(BALANCE.testground.normalPhaseSec)
    })
  })

  describe('Minus-Tore rechts', () => {
    it('startet immer im Minus und innerhalb des Bandes', () => {
      for (const zufall of [0, 0.25, 0.5, 0.75, 0.9999]) {
        const start = getTorStartwert(zufall)
        expect(start).toBeLessThan(0)
        expect(Math.abs(start)).toBeGreaterThanOrEqual(BALANCE.versuch.tor.startMin)
        expect(Math.abs(start)).toBeLessThanOrEqual(BALANCE.versuch.tor.startMax)
      }
      // Die Spanne wird auch wirklich ausgeschoepft - sonst haette jedes Tor dieselbe
      // Antwort und die Frage "schaffe ich die Null noch?" waere auswendig gelernt.
      const werte = new Set(Array.from({ length: 200 }, (_, i) => getTorStartwert(i / 200)))
      expect(werte.size).toBeGreaterThan(5)
    })

    it('zaehlt EINEN Punkt je Treffer, ueber Null hinaus, und stoppt am Deckel', () => {
      // Thomas 2026-09-05: "jeder treffer eine punkt +". Kein Schaden, keine Umrechnung.
      expect(getTorStand(-12, 0)).toBe(-12)
      expect(getTorStand(-12, 5)).toBe(-7)
      expect(getTorStand(-12, 12)).toBe(0)
      expect(getTorStand(-12, 15)).toBe(3)
      expect(getTorStand(-12, 1e9)).toBe(BALANCE.versuch.tor.plusMax)
    })

    it('faellt nie unter den Startwert und nie ueber den Deckel', () => {
      for (let i = 0; i < 500; i += 1) {
        const start = getTorStartwert(i / 500)
        const stand = getTorStand(start, i % 37)
        expect(stand).toBeGreaterThanOrEqual(start)
        expect(stand).toBeLessThanOrEqual(BALANCE.versuch.tor.plusMax)
      }
    })

    it('ist mit genau so vielen Treffern auf Null, wie draufsteht', () => {
      // Die Zusage der neuen Kopplung: Was auf dem Tor steht, ist zugleich die Zahl der
      // Kugeln bis zur Null - keine verborgene Umrechnung dazwischen.
      for (const zufall of [0, 0.4, 0.9999]) {
        const start = getTorStartwert(zufall)
        expect(getTorStand(start, Math.abs(start) - 1)).toBe(-1)
        expect(getTorStand(start, Math.abs(start))).toBe(0)
        expect(getTorStand(start, Math.abs(start) + 1)).toBe(1)
      }
    })

    it('gibt beim Durchfahren genau den Stand - und laesst nie weniger als eine Figur uebrig', () => {
      expect(getTruppeNachTor(30, -12)).toBe(18)
      expect(getTruppeNachTor(30, 5)).toBe(35)
      expect(getTruppeNachTor(4, -18)).toBe(1)
      expect(getTruppeNachTor(1, -18)).toBe(1)
    })
  })

  describe('stehende Faesser links', () => {
    it('haelt an und bleibt stehen, egal wie weit die Strasse noch laeuft', () => {
      const halteY = 500
      expect(haeltJetzt(300, halteY, false)).toBe(false)
      expect(haeltJetzt(500, halteY, false)).toBe(true)
      // Und das Entscheidende: Einmal angehalten, bleibt es stehen. Ohne diese Zusage
      // wuerde das Fass beim naechsten Bild weiterrutschen und waere wieder eine Wand.
      expect(haeltJetzt(200, halteY, true)).toBe(true)
      expect(haeltJetzt(-9999, halteY, true)).toBe(true)
    })

    it('rollt gegen die Fahrtrichtung und laeuft dabei sauber im Kreis', () => {
      const { umfangPx, bilder } = BALANCE.versuch.fass
      const folge = Array.from({ length: bilder }, (_, i) => getRollBild((i * umfangPx) / bilder))
      // Der Umfang folgt der ANZEIGEGROESSE, sonst dreht ein perspektivisch kleineres
      // Fass zu langsam und rutscht sichtbar ueber die Strasse.
      expect(getRollUmfang(96)).toBeCloseTo(Math.PI * 96, 5)
      // Jedes Bild genau einmal je Umlauf - kein Stocken, kein Sprung.
      expect(new Set(folge).size).toBe(bilder)
      expect(Math.min(...folge)).toBe(0)
      expect(Math.max(...folge)).toBe(bilder - 1)
      // Rueckwaerts: Das Fass rollt relativ zur Strasse von uns weg (Herleitung in
      // versuchBahnen.ts). Vorwaerts saehe es aus, als rutsche es.
      expect(folge[1]).toBe(folge[0] - 1 < 0 ? bilder - 1 : folge[0] - 1)
      // Nach einem vollen Umfang steht wieder dasselbe Bild da.
      expect(getRollBild(umfangPx)).toBe(getRollBild(0))
    })

    it('haelt genug Treffer aus, dass die linke Bahn Zeit kostet', () => {
      // Das Fass ist das einzige Ziel der linken Bahn. Faellt es nach ein paar Kugeln,
      // kostet die Bahn keine Zeit - und der Zielkonflikt, um den es im Versuch geht,
      // entsteht gar nicht erst. Bezug ist die GEMESSENE Trefferrate an einem Objekt der
      // Seitenbahn (3,3 Treffer je Sekunde bei mittig stehender Truppe, im Browser
      // gezaehlt), nicht die Zahl der abgefeuerten Kugeln - die ist rund 27-mal hoeher
      // und hat beim ersten Anlauf zu einem Fass gefuehrt, das 24 Sekunden stand.
      const trefferJeSekunde = 3.3
      expect(getFassTreffer() / trefferJeSekunde).toBeGreaterThan(3)
      expect(getFassTreffer() / trefferJeSekunde).toBeLessThan(12)
    })

    it('liefert die Inhalte in fester Reihenfolge, die Waffen aufsteigend nach Staerke', () => {
      const inhalte = Array.from({ length: 12 }, (_, i) => getFassInhalt(i))
      expect(inhalte).toEqual([
        'weapon', 'damage', 'rate',
        'weapon', 'damage', 'rate',
        'weapon', 'damage', 'rate',
        'weapon', 'damage', 'rate',
      ])
      // Die Waffenreihe ist die Staffelung des Spiels, nicht eine neu erfundene:
      // aufsteigend nach minLevel, jede genau einmal, bevor sie sich wiederholt.
      const waffen = Array.from({ length: VERSUCH_WAFFENREIHE.length }, (_, i) => getFassWaffe(i))
      expect(waffen).toEqual([...VERSUCH_WAFFENREIHE])
      expect(new Set(waffen).size).toBe(waffen.length)
      const stufen = waffen.map((waffe) => (BALANCE.weapon[waffe] as { minLevel: number }).minLevel)
      expect([...stufen].sort((a, b) => a - b)).toEqual(stufen)
      // Und sie schliesst sich zum Kreis, statt undefined zu liefern.
      expect(getFassWaffe(VERSUCH_WAFFENREIHE.length)).toBe(VERSUCH_WAFFENREIHE[0])
    })

    it('ist als Aufruestung mehrere Tore wert - sonst lohnt die linke Bahn nicht', () => {
      // Thomas: "die upgrades muessen entsprechend gut sein". Gerechnet am Durchsatz:
      // ein Fass je rund 4 s gegen rund zwei Wandkacheln je Sekunde.
      // Im Browser gemessen: vier Schritte hoben den Schaden in 30 s um vier Prozent -
      // unter der Wahrnehmungsschwelle. Untergrenze ist deshalb ein Viertel Levelsprung
      // je Fass; die Obergrenze bleibt ein voller Levelsprung, darueber ersetzt ein
      // einziges Fass eine ganze Levelstufe.
      expect(BALANCE.versuch.fass.torSchritte).toBeGreaterThanOrEqual(BALANCE.walls.gatesPerLevelStep / 4)
      expect(BALANCE.versuch.fass.torSchritte).toBeLessThan(BALANCE.walls.gatesPerLevelStep)
    })
  })

  describe('Gegnerband rechts', () => {
    it('bleibt innerhalb der Strasse und laesst die linke Haelfte frei', () => {
      const { gegnerBandMitte: mitte, gegnerBandBreite: breite } = BALANCE.versuch
      // Nach aussen nicht weiter als im echten Run - dort beginnt die Wandzone.
      expect(mitte + breite).toBeLessThanOrEqual(BALANCE.enemy.spawnBands.singleLaneShare)
      // Nach innen bleibt ein Streifen um die Mitte frei, damit die linke Fahrbahn den
      // Faessern gehoert und der Bahnwechsel eine echte Fahrt ist.
      expect(mitte - breite).toBeGreaterThan(0)
    })
  })
})
