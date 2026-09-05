import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getGateGrowth, getStatCap } from '../src/systems/upgrades'
import {
  VERSUCH_WAFFENREIHE,
  getFassGateSchritte,
  getFassInhalt,
  getFassTreffer,
  getFassWaffe,
  getRollBild,
  getRollUmfang,
  getTorPlusDeckel,
  getTorStand,
  getTorStartwert,
  getTruppeNachTor,
  getWaffenStaerke,
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
    it('startet immer im Minus, im Anteilsband der Truppe', () => {
      const truppe = BALANCE.testground.truppe
      for (const zufall of [0, 0.25, 0.5, 0.75, 0.9999]) {
        const start = getTorStartwert(zufall, truppe)
        expect(start).toBeLessThan(0)
        expect(Math.abs(start)).toBeGreaterThanOrEqual(Math.round(BALANCE.versuch.tor.startAnteilMin * truppe))
        expect(Math.abs(start)).toBeLessThanOrEqual(Math.round(BALANCE.versuch.tor.startAnteilMax * truppe))
      }
      // Die Spanne wird auch wirklich ausgeschoepft - sonst haette jedes Tor dieselbe
      // Antwort und die Frage "schaffe ich die Null noch?" waere auswendig gelernt.
      const werte = new Set(Array.from({ length: 200 }, (_, i) => getTorStartwert(i / 200, truppe)))
      expect(werte.size).toBeGreaterThan(5)
    })

    it('waechst mit der Truppe, ohne dass die Zeit bis zur Null waechst', () => {
      // DAS IST DER PUNKT DER ANTEILSRECHNUNG (Thomas: "an die teamgroesse anpassen"):
      // Trefferrate UND Startwert haengen beide linear an der Truppe, also kuerzt sie
      // sich aus der Zeit heraus. Was waechst, ist der Einsatz - nicht die Wartezeit.
      const rate = BALANCE.stats.shotsPerSec.base
      const sekunden = (truppe: number) => {
        const start = Math.abs(getTorStartwert(0.5, truppe))
        const trefferProSek = truppe * rate * BALANCE.versuch.fass.trefferJeFigurUndSchuss
        return start / trefferProSek
      }
      expect(getTorStartwert(0.5, 100)).toBeLessThan(getTorStartwert(0.5, 30))
      expect(Math.abs(sekunden(100) - sekunden(30))).toBeLessThan(0.3)
    })

    it('zaehlt EINEN Punkt je Treffer, ueber Null hinaus, und stoppt am Deckel', () => {
      // Thomas 2026-09-05: "jeder treffer eine punkt +". Kein Schaden, keine Umrechnung.
      const truppe = BALANCE.testground.truppe
      const deckel = 60
      expect(getTorStand(-12, 0, truppe, deckel)).toBe(-12)
      expect(getTorStand(-12, 5, truppe, deckel)).toBe(-7)
      expect(getTorStand(-12, 12, truppe, deckel)).toBe(0)
      expect(getTorStand(-12, 15, truppe, deckel)).toBe(3)
      expect(getTorStand(-12, 1e9, truppe, deckel)).toBe(getTorPlusDeckel(truppe, deckel))
    })

    it('faellt nie unter den Startwert und nie ueber den Deckel', () => {
      for (let i = 0; i < 500; i += 1) {
        const truppe = 1 + (i % 120)
        const deckel = truppe + (i % 50)
        const start = getTorStartwert(i / 500, truppe)
        const stand = getTorStand(start, i % 37, truppe, deckel)
        expect(stand).toBeGreaterThanOrEqual(start)
        expect(stand).toBeLessThanOrEqual(getTorPlusDeckel(truppe, deckel))
      }
    })

    it('ist mit genau so vielen Treffern auf Null, wie draufsteht', () => {
      // Die Zusage der neuen Kopplung: Was auf dem Tor steht, ist zugleich die Zahl der
      // Kugeln bis zur Null - keine verborgene Umrechnung dazwischen.
      const truppe = BALANCE.testground.truppe
      const deckel = truppe * 2
      for (const zufall of [0, 0.4, 0.9999]) {
        const start = getTorStartwert(zufall, truppe)
        expect(getTorStand(start, Math.abs(start) - 1, truppe, deckel)).toBe(-1)
        expect(getTorStand(start, Math.abs(start), truppe, deckel)).toBe(0)
        expect(getTorStand(start, Math.abs(start) + 1, truppe, deckel)).toBe(1)
      }
    })

    it('misst den Ertrag am RESTWEG zum Deckel, nicht an der Truppe selbst', () => {
      // DER BEFUND, DER DAS AUSLOESTE (2026-09-05): Ein Anteil der Truppe ist ein
      // Zinseszins und war nach zwei Toren am Statdeckel - ab da gab die Bahn nichts
      // mehr, waehrend die Strafe voll bestehen blieb.
      const deckel = 100
      // Je naeher an den Deckel, desto weniger gibt ein Tor.
      expect(getTorPlusDeckel(20, deckel)).toBeGreaterThan(getTorPlusDeckel(60, deckel))
      expect(getTorPlusDeckel(60, deckel)).toBeGreaterThan(getTorPlusDeckel(90, deckel))
      // Und der Deckel wird nie ueberschritten: Wiederholtes Volltanken naehert sich ihm
      // an, statt hineinzulaufen und dort zu verpuffen.
      let truppe = 20
      for (let i = 0; i < 40; i += 1) truppe = Math.min(deckel, truppe + getTorPlusDeckel(truppe, deckel))
      expect(truppe).toBeLessThanOrEqual(deckel)
      expect(truppe).toBeGreaterThan(90)
      // Steht die Truppe schon am Deckel, bleibt nur noch die Mindestgabe.
      expect(getTorPlusDeckel(deckel, deckel)).toBe(BALANCE.versuch.tor.plusMindest)
    })

    it('kommt selten genug, dass dazwischen Zeit fuer die andere Bahn bleibt', () => {
      // Gemessen kamen bei 560 px Abstand 15,5 Tore je Minute - alle 3,9 s eines, also
      // Dauerbeschuss statt Entscheidung. Bezugstempo ist das des Testgelaendes.
      const tempo = 145
      const sekundenJeTor = BALANCE.versuch.tor.abstandPx / tempo
      expect(sekundenJeTor).toBeGreaterThan(6)
      expect(sekundenJeTor).toBeLessThan(12)
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
      const truppe = BALANCE.testground.truppe
      const rate = BALANCE.stats.shotsPerSec.base
      const trefferJeSekunde = 3.3
      const treffer = getFassTreffer(truppe, rate)
      expect(treffer / trefferJeSekunde).toBeGreaterThan(3)
      expect(treffer / trefferJeSekunde).toBeLessThan(12)
      // Und die Standzeit bleibt gleich, wenn die Truppe waechst - die Trefferzahl zieht
      // mit, statt das Fass bei grosser Truppe zu einem Streifschuss zu machen.
      expect(getFassTreffer(100, rate)).toBeGreaterThan(getFassTreffer(30, rate) * 2)
    })

    it('liefert die Inhalte in fester Reihenfolge, die Waffen aufsteigend nach Staerke', () => {
      const inhalte = Array.from({ length: 12 }, (_, i) => getFassInhalt(i))
      expect(inhalte).toEqual([
        'weapon', 'damage', 'rate',
        'weapon', 'damage', 'rate',
        'weapon', 'damage', 'rate',
        'weapon', 'damage', 'rate',
      ])
      // DIE REIHE STEIGT NACH FEUERKRAFT, nicht nach Freischaltlevel (Befund
      // 2026-09-05: nach minLevel sortiert fiel sie hinter der Minigun von 23,8 auf 6,0).
      const waffen = Array.from({ length: VERSUCH_WAFFENREIHE.length }, (_, i) => getFassWaffe(i))
      expect(waffen).toEqual([...VERSUCH_WAFFENREIHE])
      expect(new Set(waffen).size).toBe(waffen.length)
      const staerken = waffen.map(getWaffenStaerke)
      for (let i = 1; i < staerken.length; i += 1) expect(staerken[i]).toBeGreaterThanOrEqual(staerken[i - 1])
      // UND SIE BLEIBT OBEN STEHEN, statt zur Pistole zurueckzurotieren: Ein Fass darf
      // nie eine Verschlechterung ausgeben.
      const letzte = VERSUCH_WAFFENREIHE[VERSUCH_WAFFENREIHE.length - 1]
      expect(getFassWaffe(VERSUCH_WAFFENREIHE.length)).toBe(letzte)
      expect(getFassWaffe(999)).toBe(letzte)
    })

    it('bleibt bis zum Levelende wertvoll, statt in den Deckel zu laufen', () => {
      // DER BEFUND (2026-09-05): Mit festen zwoelf Torschritten war die Feuerkraft nach
      // 12 Faessern (Level 1) bzw. 27 (Level 5) ausgereizt - bei bis zu 60 Faessern je
      // Minute nach 12 bis 27 Sekunden. Danach warf die linke Bahn nur noch Muenzen ab.
      const wachstum = getGateGrowth('damage')
      let wert = BALANCE.stats.damage.base
      const deckel = getStatCap('damage', 5)
      const ertraege: number[] = []
      for (let fass = 0; fass < 60; fass += 1) {
        const schritte = getFassGateSchritte('damage', wert, deckel)
        const neu = Math.min(deckel, wert * wachstum ** schritte)
        ertraege.push(neu - wert)
        wert = neu
      }
      // GEGENPROBE STATT FESTER SCHWELLE: verglichen wird mit der alten Rechnung, die
      // je Fass zwoelf feste Torschritte gab und den Deckel auf Level 5 nach 27 Faessern
      // erreichte. Die Restwegrechnung muss deutlich laenger tragen.
      const faesserBisDeckel = (schritteJeFass: (wert: number) => number) => {
        let w = BALANCE.stats.damage.base
        for (let i = 0; i < 500; i += 1) {
          const neu = Math.min(deckel, w * wachstum ** schritteJeFass(w))
          if (neu <= w) return i
          w = neu
        }
        return 500
      }
      const neu = faesserBisDeckel((w) => getFassGateSchritte('damage', w, deckel))
      const altFest = faesserBisDeckel(() => 12)
      expect(neu).toBeGreaterThan(altFest * 1.5)
      // Die Ertraege werden dabei kleiner, nicht groesser: das ist der Sinn der
      // Restwegrechnung.
      expect(ertraege[0]).toBeGreaterThan(ertraege[20])
    })

    it('kommt mit Pause, statt als Fliessband zu laufen', () => {
      // Gemessen waren bis zu 60 Faesser je Minute moeglich - ein Fliessband. Feuerzeit
      // plus Pause muessen zusammen deutlich darunter bleiben.
      const tempo = 145
      const truppe = BALANCE.testground.truppe
      const rate = BALANCE.stats.shotsPerSec.base
      // Beim Hinfahren gemessen: 20 Treffer in 1,0 s bei Truppe 30 und Rate 3.
      const trefferProSekBeimHinfahren = 20
      const feuerSek = getFassTreffer(truppe, rate) / trefferProSekBeimHinfahren
      const pauseSek = BALANCE.versuch.fass.pausePx / tempo
      const faesserProMinute = 60 / (feuerSek + pauseSek)
      expect(faesserProMinute).toBeLessThan(20)
      expect(faesserProMinute).toBeGreaterThan(6)
    })

    it('gibt am Anfang mehr als ein einzelnes Wandtor des echten Runs', () => {
      // Thomas: "die upgrades muessen entsprechend gut sein". Ein Wandtor im echten Run
      // ist ein Sechzehntel Levelsprung (walls.gatesPerLevelStep); ein frisches Fass
      // muss deutlich darueber liegen, sonst faellt der Fund unter die
      // Wahrnehmungsschwelle - im Browser gemessen waren vier Schritte nur vier Prozent
      // Schaden in einer halben Minute.
      const schritte = getFassGateSchritte('damage', BALANCE.stats.damage.base, getStatCap('damage', 5))
      expect(schritte).toBeGreaterThan(BALANCE.walls.gatesPerLevelStep / 2)
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
