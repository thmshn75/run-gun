import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { WORLD_COLORS } from '../config/colors'
import { getPhaseOffset } from './gamefeel'
import { getRoadHalfWidth, getScrollProgressDelta, getScrollY } from './roadGeometry'

type Welle = {
  readonly image: Phaser.GameObjects.Image
  progress: number
  seite: -1 | 1
  abstand: number
  // Eigene Laenge je Welle - gleich lange Wellen lesen sich als Muster statt als Wasser.
  laenge: number
  // Fester Platz im Kraeuseltakt. Ohne ihn schwingt und flackert die ganze Flaeche im
  // Gleichschritt - das liest sich als ein Objekt, nicht als Wasser.
  takt: number
}

/**
 * Kulisse des Weltthemas "bruecke" (2026-09-03): Betongelaender an beiden
 * Fahrbahnraendern und Wellen auf dem Wasser daneben. Ersetzt fuer diese Level die
 * Haeuserzeilen; an der Fahrbahn selbst aendert sich nichts.
 *
 * Das Gelaender wird jedes Bild als durchgehender Zug GEZEICHNET, nicht aus Segmenten
 * zusammengesetzt. Der Grund ist die Erfahrung aus dem Stadtbild: Dort musste der
 * Spawn-Takt so gewaehlt werden, dass sich Haeuser ueberlappen, und die Lueckenfreiheit
 * war eine Messfrage (siehe BALANCE.scenery.spawnIntervalMs). Ein gezeichneter Zug ist
 * lueckenlos, weil er einer ist - dafuer kostet er ein Graphics-Objekt je Seite, das
 * pro Bild neu gefuellt wird (2 x rund 50 Stuetzpunkte, kein create/destroy).
 *
 * Die Wellen dagegen sind ein fester Pool und laufen wie die Mittellinie ueber den
 * Scroll-Fortschritt - sie duerfen unregelmaessig stehen, dort gibt es nichts zu
 * schliessen.
 */
export class Bruecke {
  private readonly scene: Phaser.Scene
  private readonly gelaender: Phaser.GameObjects.Graphics
  private readonly wellen: Welle[]
  private readonly rng: () => number
  private aktiv: boolean
  // Pfosten und Wellen scrollen; der Zaehler laeuft weiter, auch wenn das Thema gerade
  // nicht sichtbar ist, damit ein Wechsel nicht als Sprung erscheint.
  private pfostenProgress: number
  // Laufzeit fuer das Kraeuseln. Getrennt vom Scroll-Fortschritt, weil das Wasser sich
  // auch bewegt, wenn es still an einem vorbeizieht.
  private kraeuselMs: number

  public constructor(scene: Phaser.Scene, rng: () => number) {
    this.scene = scene
    this.rng = rng
    this.aktiv = false
    this.pfostenProgress = 0
    this.kraeuselMs = 0
    this.gelaender = scene.add.graphics().setDepth(BALANCE.layers.scenery).setVisible(false)
    this.wellen = []
    for (let index = 0; index < BALANCE.bruecke.waves; index += 1) {
      const image = scene.add.image(0, 0, 'water-wave')
        .setOrigin(0.5)
        .setDepth(BALANCE.layers.background)
        .setAlpha(BALANCE.bruecke.waveAlpha)
        .setVisible(false)
      const welle: Welle = { image, progress: index / BALANCE.bruecke.waves, seite: 1, abstand: 0, laenge: 1, takt: getPhaseOffset(index) }
      this.wuerfleWelle(welle)
      // Der Startfortschritt bleibt gleichmaessig verteilt, damit beim ersten Bild
      // nicht die halbe Flaeche leer ist; gewuerfelt wird nur die Lage zur Seite.
      welle.progress = index / BALANCE.bruecke.waves
      this.wellen.push(welle)
    }
  }

  public setAktiv(aktiv: boolean): void {
    if (this.aktiv === aktiv) return
    this.aktiv = aktiv
    this.gelaender.setVisible(aktiv)
    for (const welle of this.wellen) welle.image.setVisible(aktiv)
    if (aktiv) this.update(0)
  }

  public update(dt: number): void {
    if (!this.aktiv) return
    const width = this.scene.scale.width
    const height = this.scene.scale.height
    const progressDelta = getScrollProgressDelta(height, dt)

    this.pfostenProgress = (this.pfostenProgress + progressDelta) % 1
    this.kraeuselMs += dt
    this.zeichneGelaender(width, height)

    // Wasser zieht langsamer vorbei als die Bruecke: Die Wellen gehoeren nicht zum
    // Bauwerk, an dem man entlangfaehrt.
    const wellenDelta = progressDelta * BALANCE.bruecke.waveScrollShare
    for (const welle of this.wellen) {
      welle.progress += wellenDelta
      if (welle.progress >= 1) {
        welle.progress -= 1
        this.wuerfleWelle(welle)
      }
      const y = getScrollY(height, welle.progress)
      const skala = this.bauSkala(width, height, y)
      const kante = width / 2 + welle.seite * getRoadHalfWidth(width, height, y)
      const aussen = width / 2 + welle.seite * (width / 2) * BALANCE.bruecke.waveSpreadShare
      // Kraeuseln: Der Kamm schwingt seitlich und taucht dabei auf und vergeht. Beides
      // haengt am selben Takt, damit eine Welle ihren Scheitel im Schwung erreicht und
      // nicht in der Umkehr - sonst sieht man zwei Bewegungen statt einer.
      const phase = (this.kraeuselMs / 1000) * BALANCE.bruecke.waveShimmerHz * Math.PI * 2 + welle.takt * Math.PI * 2
      const schwung = Math.sin(phase)
      const versatz = schwung * BALANCE.bruecke.waveWidthPx * BALANCE.bruecke.waveSwayShare * skala
      const staerke = 1 - BALANCE.bruecke.waveShimmerDepth * (1 - Math.abs(schwung))
      welle.image
        .setPosition(kante + (aussen - kante) * welle.abstand + versatz, y)
        .setDisplaySize(BALANCE.bruecke.waveWidthPx * welle.laenge * skala, BALANCE.bruecke.waveHeightPx * skala)
        .setAlpha(BALANCE.bruecke.waveAlpha * staerke)
    }
  }

  private wuerfleWelle(welle: Welle): void {
    const { troughShare, waveLengthMin, waveLengthMax } = BALANCE.bruecke
    welle.seite = this.rng() < 0.5 ? -1 : 1
    welle.abstand = this.rng()
    welle.laenge = waveLengthMin + this.rng() * (waveLengthMax - waveLengthMin)
    // Kamm oder Senke. Beides zusammen macht aus einer glatten Flaeche mit Strichen
    // darauf eine bewegte Oberflaeche.
    welle.image.setTexture(this.rng() < troughShare ? 'water-trough' : 'water-wave')
  }

  /**
   * Groesse eines Bauteils an der Stelle y, bezogen auf die Kampfhoehe. Dort stehen die
   * Figuren, und aus deren Hoehe ist die Gelaenderhoehe hergeleitet - ein Bezug auf den
   * Horizont wie bei getSceneryScale wuerde das Gelaender um den Faktor 1,9 zu gross
   * machen.
   */
  private bauSkala(width: number, height: number, y: number): number {
    const kampfY = height - BALANCE.player.anchorBottomOffset
    const bezug = getRoadHalfWidth(width, height, kampfY)
    if (bezug <= 0) return 1
    return (getRoadHalfWidth(width, height, y) / bezug) * this.einblendung(y)
  }

  /**
   * Das Bauwerk waechst aus der Horizontlinie heraus, statt dort in voller Hoehe zu
   * beginnen (Befund aus der Browser-Pruefung 2026-09-03: Ohne das endete das Gelaender
   * am Horizont als abrupte schraege Strebe im Himmel).
   *
   * Die Strasse laeuft in diesem Spiel nicht auf einen Punkt zu - sie ist am Horizont
   * noch 52 % breit (road.topWidthRatio). Deshalb wird auch das Gelaender dort nie klein
   * genug, um von selbst zu verschwinden. Gegner und Boss loesen dasselbe Problem mit
   * road.entryFadePx; hier wirkt dieselbe Strecke auf die HOEHE statt auf die Deckkraft,
   * weil ein Verlauf pro Bild 288 einzelne Fuellungen gekostet haette statt sechs.
   */
  private einblendung(y: number): number {
    return Math.min(1, Math.max(0, (y - BALANCE.road.horizonY) / BALANCE.road.entryFadePx))
  }

  private zeichneGelaender(width: number, height: number): void {
    const g = this.gelaender
    g.clear()
    const { railHeightPx, railTopShare, deckOverhangPx, deckHeightPx, posts, postWidthPx } = BALANCE.bruecke
    // Stuetzstellen entlang der Fahrbahnkante. Die Kante ist perspektivisch gekruemmt;
    // 48 Punkte ueber die sichtbare Hoehe sind rund 15 px Raster und damit feiner als
    // die duennste gezeichnete Linie.
    const stuetzstellen = 48
    const vonY = BALANCE.road.horizonY
    const bisY = height

    for (const seite of [-1, 1] as const) {
      const kanteX = (y: number): number => width / 2 + seite * getRoadHalfWidth(width, height, y)
      const aussenX = (y: number): number => kanteX(y) + seite * deckOverhangPx * this.bauSkala(width, height, y)

      // 1. Betonkante der Fahrbahn: der Streifen, auf dem das Gelaender steht.
      const deckOben: Phaser.Math.Vector2[] = []
      const deckUnten: Phaser.Math.Vector2[] = []
      for (let index = 0; index <= stuetzstellen; index += 1) {
        const y = vonY + ((bisY - vonY) * index) / stuetzstellen
        deckOben.push(new Phaser.Math.Vector2(kanteX(y), y))
        deckUnten.push(new Phaser.Math.Vector2(aussenX(y), y + deckHeightPx * this.bauSkala(width, height, y)))
      }
      g.fillStyle(WORLD_COLORS.bridgeDeck)
      g.fillPoints([...deckOben, ...deckUnten.reverse()], true)

      // 2. Handlauf: ein durchgehendes Band ueber der Betonkante. Darunter bleibt der
      //    Zwischenraum offen, sonst waere es eine Mauer statt eines Gelaenders.
      const laufOben: Phaser.Math.Vector2[] = []
      const laufUnten: Phaser.Math.Vector2[] = []
      for (let index = 0; index <= stuetzstellen; index += 1) {
        const y = vonY + ((bisY - vonY) * index) / stuetzstellen
        const skala = this.bauSkala(width, height, y)
        const x = aussenX(y)
        const oben = y - railHeightPx * skala
        laufOben.push(new Phaser.Math.Vector2(x, oben))
        laufUnten.push(new Phaser.Math.Vector2(x, oben + railHeightPx * railTopShare * skala))
      }
      g.fillStyle(WORLD_COLORS.bridgeRail)
      g.fillPoints([...laufOben, ...laufUnten.reverse()], true)

      // 3. Pfosten: sie scrollen mit der Bruecke und tragen die Tiefenwirkung. Ohne sie
      //    stuende der Handlauf als flache Linie im Bild.
      g.fillStyle(WORLD_COLORS.bridgePost)
      for (let index = 0; index < posts; index += 1) {
        const progress = (this.pfostenProgress + index / posts) % 1
        const y = getScrollY(height, progress)
        if (y < vonY || y > bisY) continue
        const skala = this.bauSkala(width, height, y)
        const breite = postWidthPx * skala
        const hoehe = railHeightPx * skala
        g.fillRect(aussenX(y) - breite / 2, y - hoehe, breite, hoehe)
      }
    }
  }
}
