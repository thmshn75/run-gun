import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { advanceAlongRoad, getFigureOverscanFactor, getPerspectiveScale, getPlayfieldHalfWidth, getRoadHalfWidth, getRoadSegment } from '../src/systems/roadGeometry'
import { computeHordeOffsets } from '../src/systems/squads'

const W = 390
const H = 844
const ANCHOR_Y = H - BALANCE.player.anchorBottomOffset

// Perspektivische Groesse (Thomas 2026-08-22: "Mobs wachsen lassen, damit mehr als
// Wand kommen"). Vorher war eine Figur am Horizont genauso gross wie direkt vor der
// Truppe - das kostete die Tiefe und machte breite Horden konstruktiv unmoeglich.
describe('perspektivische Groesse', () => {
  it('ist auf Kampfhoehe genau 1, damit Gegner und Truppe dort zusammenpassen', () => {
    expect(getPerspectiveScale(W, H, ANCHOR_Y)).toBeCloseTo(1, 10)
  })

  it('schrumpft zum Horizont und waechst monoton nach unten', () => {
    const amHorizont = getPerspectiveScale(W, H, BALANCE.road.horizonY)
    // 0,80: klein genug fuer Tiefe, gross genug, um einen Gegner am Horizont zu
    // erkennen (Thomas 2026-08-22, zweimal: "die mobs sind jetzt voll klein", dann
    // "die mobs wirken immer noch zu klein"). Ueber 0,85 wird die Horde am Horizont
    // zu Matsch, weil die Formation weiter mit der Strasse schrumpft.
    expect(amHorizont).toBeLessThanOrEqual(0.85)
    expect(amHorizont).toBeGreaterThan(0.75)
    let vorher = 0
    for (let y = BALANCE.road.horizonY; y <= H; y += 20) {
      const jetzt = getPerspectiveScale(W, H, y)
      expect(jetzt).toBeGreaterThan(vorher)
      vorher = jetzt
    }
  })

  it('waechst frueher als die Strasse, trifft die Kampfhoehe aber exakt', () => {
    // Thomas 2026-08-22 nach dem iPhone-Test: "wachsen bis zu mir zur vollen Groesse -
    // sollte schon frueher passieren". Die Groesse folgt der Strasse deshalb nicht mehr
    // eins zu eins, sondern liegt auf der ganzen Anflugstrecke DARUEBER. Nur zwei
    // Punkte sind gebunden: die Kampfhoehe (exakt 1, dort trifft die Truppe auf die
    // Gegner) und der Horizont (horizonScale).
    expect(getPerspectiveScale(W, H, ANCHOR_Y)).toBeCloseTo(1, 10)
    expect(getPerspectiveScale(W, H, BALANCE.road.horizonY)).toBeCloseTo(BALANCE.road.perspective.horizonScale, 10)
    for (const y of [BALANCE.road.horizonY, 300, 432, 500]) {
      const ausStrasse = getRoadHalfWidth(W, H, y) / getRoadHalfWidth(W, H, ANCHOR_Y)
      expect(getPerspectiveScale(W, H, y)).toBeGreaterThan(ausStrasse)
    }
    // Auf halber Anflugstrecke (y = 432) 95 % statt 79 % der vollen Groesse.
    expect(getPerspectiveScale(W, H, 432)).toBeCloseTo(0.946, 2)
  })

  it('haelt Gegner trotz der groesseren Ferndarstellung aus der Wandzone', () => {
    // Preis der frueheren Groesse: Die Figur schrumpft nach oben langsamer als der
    // Korridor. Ohne Aufschlag stuende sie am Horizont in der Wand - deshalb rechnet
    // die Spurwahl den Randabstand mit getFigureOverscanFactor.
    const faktor = getFigureOverscanFactor(W, H)
    // Die Spitze sitzt NICHT am Horizont, sondern kurz darunter - die Groesse waechst
    // gekruemmt, der Korridor linear. Am Horizont selbst waeren es nur 1,26.
    const amHorizont = BALANCE.road.perspective.horizonScale
      / (getRoadHalfWidth(W, H, BALANCE.road.horizonY) / getRoadHalfWidth(W, H, ANCHOR_Y))
    expect(amHorizont).toBeCloseTo(1.40, 2)
    expect(faktor).toBeCloseTo(1.44, 2)
    expect(faktor).toBeGreaterThan(amHorizont)
    // Der Aufschlag deckt jede Hoehe ab, nicht nur den Horizont.
    for (let y = BALANCE.road.horizonY; y <= ANCHOR_Y; y += 10) {
      const anteilKorridor = getPlayfieldHalfWidth(W, H, y) / getPlayfieldHalfWidth(W, H, ANCHOR_Y)
      expect(getPerspectiveScale(W, H, y)).toBeLessThanOrEqual(anteilKorridor * faktor + 1e-6)
    }
  })

  it('laesst am Horizont fast doppelt so viele Gegner nebeneinander zu wie zuvor', () => {
    const schwer = Math.max(...BALANCE.enemy.types.map((type) => type.bodyWidth))
    const spacing = BALANCE.level.squads.spacingPx
    const anchorKorridor = getPlayfieldHalfWidth(W, H, ANCHOR_Y) * 2
    const budget = Math.min(anchorKorridor, BALANCE.walls.hordeMaxWidthPx)
    const proReihe = Math.floor((budget - schwer) / spacing) + 1
    expect(proReihe).toBeGreaterThanOrEqual(5)
    // Zum Vergleich die alte Rechnung: Budget am Horizont gegen volle Figurenbreite.
    const alt = Math.min(
      getPlayfieldHalfWidth(W, H, BALANCE.road.horizonY) * 2,
      BALANCE.walls.hordeMaxWidthPx * (getPlayfieldHalfWidth(W, H, BALANCE.road.horizonY) / getPlayfieldHalfWidth(W, H, H)),
    )
    expect(Math.floor((alt - schwer) / spacing) + 1).toBeLessThanOrEqual(2)
  })

  it('stellt die groesste Horde als Block auf, nicht als Kolonne', () => {
    const schwer = Math.max(...BALANCE.enemy.types.map((type) => type.bodyWidth))
    const budget = Math.min(getPlayfieldHalfWidth(W, H, ANCHOR_Y) * 2, BALANCE.walls.hordeMaxWidthPx)
    const layout = computeHordeOffsets(
      'cluster', BALANCE.level.squads.maxSize,
      BALANCE.level.squads.spacingPx, BALANCE.level.squads.rowSpacingPx, schwer, budget,
    )
    expect(layout.size).toBe(BALANCE.level.squads.maxSize)
    const reihen = new Set(layout.offsets.map((offset) => offset.yOffset)).size
    // 14 Gegner in hoechstens drei Reihen - vorher waren es sechs bis sieben.
    expect(reihen).toBeLessThanOrEqual(3)
  })

  it('zieht Kollisionskoerper, Schatten und Spurabstand mit der Groesse mit', () => {
    const spawner = readFileSync(new URL('../src/systems/spawner.ts', import.meta.url), 'utf8')
    const boss = readFileSync(new URL('../src/systems/boss.ts', import.meta.url), 'utf8')
    // Body in Texturpixeln: Arcade skaliert ihn mit, sonst ginge der Faktor doppelt ein.
    expect(spawner).toContain('body.setSize(type.bodyWidth, type.bodyHeight, true)')
    expect(spawner).toContain('enemy.setScale(faktor)')
    // Der Schatten liegt im BILDSCHIRM-System und braucht die skalierte Breite ...
    expect(spawner).toContain("(enemy.getData('scaledWidth') as number) * BALANCE.shadow.widthOfFigure")
    // ... die Spurwahl dagegen rechnet im KAMPFHOEHEN-System, wo die Skalierung 1 ist,
    // und braucht die Rohbreite. Beides zu vermischen legte den Spawner still lahm:
    // Breiten in Bildschirmpixeln gegen ein Kampfhoehen-Budget - keine Horde fand mehr
    // eine Spur, 1970 Spawn-Versuche in Folge scheiterten mit 'no-lane'.
    expect(spawner).toContain("bodyWidth: enemy.getData('bodyWidth') as number")
    expect(spawner).toContain('anchorHalfWidth,')
    // Der Boss waechst beim Vorruecken mit.
    expect(boss).toContain('this.applyPerspectiveScale()')
    expect(boss).toContain('BALANCE.boss.bodyWidth * this.enemy.scaleX')
  })
})

// Wandkette in Weltkoordinaten (Thomas 2026-08-22: "die Waende - naja die muessen wir
// noch anpassen wirken wie Platzhalter - gehoeren auch wie 3d Optik"). Vorher fuhren
// Segmente mit konstanter Bildschirmgeschwindigkeit und behielten ihre volle Hoehe bis
// zum Horizont - eine Kachel war damit das einzige Objekt im Bild ohne Tiefe.
describe('Wandkette laeuft in Weltkoordinaten', () => {
  const SEGMENT = BALANCE.walls.segmentHeightPx

  it('schrumpft die Kachel mit der Entfernung und trifft auf Kampfhoehe die Nennhoehe', () => {
    expect(getRoadSegment(W, H, ANCHOR_Y, SEGMENT).height).toBeCloseTo(SEGMENT, 1)
    const amHorizont = getRoadSegment(W, H, BALANCE.road.horizonY, SEGMENT).height
    expect(amHorizont).toBeLessThan(SEGMENT * 0.65)
    expect(amHorizont).toBeGreaterThan(SEGMENT * 0.5)
    // Monoton: keine Stelle, an der eine fernere Kachel groesser waere als eine nahe.
    let vorher = 0
    for (let y = BALANCE.road.horizonY; y <= H; y += 10) {
      const jetzt = getRoadSegment(W, H, y, SEGMENT).height
      expect(jetzt).toBeGreaterThan(vorher)
      vorher = jetzt
    }
  })

  it('setzt die Kette luecken- und ueberlappungsfrei aneinander', () => {
    // DAS ist der Grund fuer die exakte Rechnung in getRoadSegment - und dafuer, dass
    // sie eine eigene Mitte zurueckgibt: Mit der naheliegenden Naeherung (Nennhoehe x
    // Massstab, gezeichnet um den Weltanker) klaffte zwischen zwei Kacheln eine Fuge.
    let unten = ANCHOR_Y
    for (let glied = 0; glied < 8; glied += 1) {
      const oben = advanceAlongRoad(W, H, unten, -SEGMENT)
      const obenSeg = getRoadSegment(W, H, oben, SEGMENT)
      const untenSeg = getRoadSegment(W, H, unten, SEGMENT)
      expect(obenSeg.centerY + obenSeg.height / 2).toBeCloseTo(untenSeg.centerY - untenSeg.height / 2, 9)
      unten = oben
    }
  })

  it('zeichnet nach der Segmentmitte, fuehrt den Anker aber getrennt weiter', () => {
    // Regressionsschutz: Nimmt der naechste Frame die gezeichnete Mitte wieder als
    // Anker, wandert die Kachel Bild fuer Bild nach unten aus ihrer Kette heraus.
    const quelle = readFileSync(new URL('../src/systems/blockers.ts', import.meta.url), 'utf8')
    expect(quelle).toContain('pair.anchorY = this.advance(pair.anchorY, movement)')
    expect(quelle).toContain('const segment = this.segmentAt(pair.anchorY)')
    expect(quelle).not.toContain('this.advance(pair.blocker.y')
  })

  it('faehrt unabhaengig von der Bildrate', () => {
    // Ein Schritt von 100 ms muss dasselbe ergeben wie zehn Schritte von 10 ms - sonst
    // liefe die Wand auf einem 120-Hz-Geraet anders als auf einem 30-Hz-Geraet.
    const einSchritt = advanceAlongRoad(W, H, 300, 13.5)
    let vieleSchritte = 300
    for (let index = 0; index < 10; index += 1) vieleSchritte = advanceAlongRoad(W, H, vieleSchritte, 1.35)
    expect(vieleSchritte).toBeCloseTo(einSchritt, 9)
  })

  it('haelt den Sammeltakt der linken Bahn unveraendert', () => {
    // Der Spawn-Takt haengt an der WELT-Strecke, nicht am Bildschirm: Pro Sekunde
    // kommen weiter scrollSpeed / segmentHeightPx Plaettchen - die abgenommene
    // Sammelrate aendert sich durch den Umbau also nicht.
    expect(BALANCE.scrollSpeed / SEGMENT).toBeCloseTo(1.875, 3)
  })

  it('laesst genug Segmente im Pool fuer die laengere Lebensdauer', () => {
    // Weltstrecke Horizont -> unterer Bildrand, geteilt durch die Strecke je Segment,
    // ergibt die Zahl gleichzeitig sichtbarer Segmente je Seite.
    let strecke = 0
    let y = BALANCE.road.horizonY
    while (y < H) {
      y = advanceAlongRoad(W, H, y, 10)
      strecke += 10
    }
    const gleichzeitigJeSeite = strecke / SEGMENT
    expect(BALANCE.pools.blockers).toBeGreaterThan(gleichzeitigJeSeite * 2)
  })
})
