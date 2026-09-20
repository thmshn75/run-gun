import Phaser from 'phaser'
import { bahnKanten, bahnKantenBeiY, bahnKantenPunkte, BALANCE_V2, fahrbahnKantenBeiY, horizontFarbe, tiefenSkala, wasserWellenOffset } from './balanceV2'
import { bewegeStromFigur, figurenProSekunde, stromDarstellungsPosition, type StromFigur } from './strom'
import { haufenHalbeBreite, haufenPlaetze, haufenPositionenX, type HaufenPlatz, truppeGrenzen, truppenAnzeige } from './truppe'
import { frontStartZustand, mitAnkunft, type FrontZustand } from './front'
import { sammeltEin, schildPositionen } from './raender'
import { sammelAuswirkung } from './raender'
import { durchquertTor, torStartZustand, type TorZustand } from './tor'
import { aktualisiereEnde, ausgangEinmal, endeStartZustand, type EndeZustand } from './ende'
import helmBlauUrl from '../assets/v2-helm-blau.png'
import helmRotUrl from '../assets/v2-helm-rot.png'
import bossEliteMove1Url from '../assets/boss-elite-move-1.png'
import bossEliteMove2Url from '../assets/boss-elite-move-2.png'
import bossEliteMove3Url from '../assets/boss-elite-move-3.png'
import bossEliteMove4Url from '../assets/boss-elite-move-4.png'
import bossEliteMove5Url from '../assets/boss-elite-move-5.png'
import bossEliteMove6Url from '../assets/boss-elite-move-6.png'
import bossEliteMove7Url from '../assets/boss-elite-move-7.png'
import bossEliteMove8Url from '../assets/boss-elite-move-8.png'
import bossEliteMove9Url from '../assets/boss-elite-move-9.png'
import bossEliteMove10Url from '../assets/boss-elite-move-10.png'
import bossEliteMove11Url from '../assets/boss-elite-move-11.png'
import bossEliteMove12Url from '../assets/boss-elite-move-12.png'

type SchildBild = { kasten: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text, umlauf: number, verbraucht: boolean }

/** Das bewusst zustandslose Geruest fuer den isolierten Run-Gun-V2-Probelauf. */
export class RunGunV2Scene extends Phaser.Scene {
  private truppenFiguren: Phaser.GameObjects.Image[] = []
  private truppenPlaetze: readonly HaufenPlatz[] = []
  private truppenZaehler?: Phaser.GameObjects.Text
  private staerkeZaehler?: Phaser.GameObjects.Text
  private truppenFigurBreite = 0
  private truppeX = 0
  private truppeY = 0
  private ziehtTruppe = false
  private stromFiguren: StromFigur[] = []
  private stromBilder: Phaser.GameObjects.Image[] = []
  private stromRest = 0
  private front: FrontZustand = frontStartZustand()
  private gegnerBilder: Phaser.GameObjects.Image[] = []
  private eigeneFrontBilder: Phaser.GameObjects.Image[] = []
  private gegnerZaehler?: Phaser.GameObjects.Text
  private truppenGroesse: number = BALANCE_V2.truppe.startGroesse
  private staerke: number = BALANCE_V2.staerke.start
  private randZeitMs = 0
  private randSchilder = new Map<string, SchildBild>()
  private tor: TorZustand = torStartZustand()
  private torZaehler?: Phaser.GameObjects.Text
  private ende: EndeZustand = endeStartZustand(frontStartZustand())
  private bossBild?: Phaser.GameObjects.Sprite
  private bossZaehler?: Phaser.GameObjects.Text
  private frontPartikel: Phaser.GameObjects.Arc[] = []
  private wasserWellen: Phaser.GameObjects.Line[] = []
  private wasserGeometrie?: Readonly<{ width: number, height: number, horizonY: number }>
  private endeAusgeloest = false

  public constructor() {
    super('RunGunV2Scene')
  }

  public preload(): void {
    this.load.image('v2-helm-blau', helmBlauUrl)
    this.load.image('v2-helm-rot', helmRotUrl)
    const bossLaufbilder = [
      bossEliteMove1Url, bossEliteMove2Url, bossEliteMove3Url, bossEliteMove4Url,
      bossEliteMove5Url, bossEliteMove6Url, bossEliteMove7Url, bossEliteMove8Url,
      bossEliteMove9Url, bossEliteMove10Url, bossEliteMove11Url, bossEliteMove12Url,
    ]
    bossLaufbilder.forEach((url, index) => this.load.image(`v2-boss-elite-move-${index + 1}`, url))
  }

  public create(): void {
    // Phaser verwendet Szeneninstanzen wieder. Jeder Start beginnt deshalb ohne alte
    // Figuren, Zähler oder Ziehzustand.
    this.truppenFiguren = []
    this.truppenPlaetze = []
    this.truppenZaehler = undefined
    this.staerkeZaehler = undefined
    this.truppenFigurBreite = 0
    this.truppeY = 0
    this.ziehtTruppe = false
    this.stromFiguren = []
    this.stromBilder.forEach((bild) => bild.destroy())
    this.stromBilder = []
    this.stromRest = 0
    this.front = frontStartZustand()
    this.gegnerBilder = []
    this.eigeneFrontBilder = []
    this.gegnerZaehler = undefined
    this.truppenGroesse = BALANCE_V2.truppe.startGroesse
    this.staerke = BALANCE_V2.staerke.start
    this.randZeitMs = 0
    this.randSchilder.clear()
    this.tor = torStartZustand()
    this.torZaehler = undefined
    this.ende = endeStartZustand(this.front)
    this.bossBild = undefined
    this.bossZaehler = undefined
    this.frontPartikel = []
    this.wasserWellen = []
    this.wasserGeometrie = undefined
    this.endeAusgeloest = false
    const width = this.scale.width
    const height = this.scale.height
    const centerX = width / 2
    const { horizonY, bottomY } = bahnKanten(width, height)
    // Die 24 Stützpunkte entstehen nur beim Aufbau; Straße, Wasser und Kanten teilen
    // dieselbe Kurve, damit keine sichtbare Geometrie neben ihr wegdriften kann.
    const kantenPunkte = bahnKantenPunkte(width, height, 24)
    const linkeKante = kantenPunkte.flatMap(({ leftX, y }) => [leftX, y])
    const rechteKante = kantenPunkte.flatMap(({ rightX, y }) => [rightX, y])
    const fahrbahnPunkte = kantenPunkte.map(({ y }) => ({ ...fahrbahnKantenBeiY(width, height, y), y }))
    const linkeFahrbahnKante = fahrbahnPunkte.flatMap(({ leftX, y }) => [leftX, y])
    const rechteFahrbahnKante = fahrbahnPunkte.flatMap(({ rightX, y }) => [rightX, y])

    this.add.rectangle(centerX, height / 2, width, height, BALANCE_V2.colors.sky)
    // Feine, exakt anschliessende Baender nehmen dem Wasser-Himmel-Uebergang die Kante.
    const verlaufHoehe = BALANCE_V2.track.horizonVerlaufHoehePx
    const verlaufBaender = BALANCE_V2.track.horizonVerlaufBaender
    for (let index = 0; index < verlaufBaender; index += 1) {
      this.add.rectangle(centerX, horizonY - verlaufHoehe / 2 + (index + 0.5) * verlaufHoehe / verlaufBaender, width, verlaufHoehe / verlaufBaender + 1, horizontFarbe(index, verlaufBaender)).setDepth(BALANCE_V2.ebenen.wasser)
    }
    this.erstelleWasser(width, height, horizonY)
    this.add.polygon(0, 0, [...linkeFahrbahnKante, ...[...rechteFahrbahnKante].reverse()], BALANCE_V2.colors.road).setOrigin(0, 0).setDepth(BALANCE_V2.ebenen.strasse)
    this.add.polygon(0, 0, [...linkeKante, ...[...linkeFahrbahnKante].reverse()], BALANCE_V2.colors.wall).setOrigin(0, 0).setDepth(BALANCE_V2.ebenen.gehsteig)
    this.add.polygon(0, 0, [...rechteFahrbahnKante, ...[...rechteKante].reverse()], BALANCE_V2.colors.wall).setOrigin(0, 0).setDepth(BALANCE_V2.ebenen.gehsteig)
    this.add.polygon(0, 0, [0, horizonY, ...linkeKante, 0, bottomY], BALANCE_V2.colors.water).setOrigin(0, 0).setDepth(BALANCE_V2.ebenen.wasser)
    this.add.polygon(0, 0, [...rechteKante, width, bottomY, width, horizonY], BALANCE_V2.colors.water).setOrigin(0, 0).setDepth(BALANCE_V2.ebenen.wasser)
    this.zeichneKante(linkeKante)
    this.zeichneKante(rechteKante)
    this.erstelleGelaender(width, height)

    const menuButton = this.add.rectangle(52, 34, 84, 36, BALANCE_V2.colors.menuButton)
      .setStrokeStyle(2, BALANCE_V2.colors.menuButtonEdge)
      .setDepth(BALANCE_V2.ebenen.zaehler)
      .setInteractive({ useHandCursor: true })
    this.add.text(52, 34, 'MENÜ', {
      fontFamily: 'system-ui', fontSize: '16px', fontStyle: 'bold', color: BALANCE_V2.colors.menuText,
    }).setOrigin(0.5).setDepth(BALANCE_V2.ebenen.zaehler)
    menuButton.on('pointerdown', () => this.scene.start('MenuScene'))

    this.erstelleTruppe(width, height)
    this.erstelleStromVorrat()
    this.erstelleFlaechen(width, height)
    this.erstelleBoss(width)
    this.erstelleRaender()
    this.erstelleTor(width, height)
    this.aktiviereTruppenSteuerung(width, height)
  }

  private erstelleWasser(width: number, height: number, horizonY: number): void {
    this.wasserWellen = Array.from({ length: 22 }, (_, index) => this.add.line(0, 0, 0, 0, 22 + index % 4 * 8, 0, BALANCE_V2.colors.waterWave, 0.72).setOrigin(0, 0).setDepth(BALANCE_V2.ebenen.wasser))
    this.wasserGeometrie = { width, height, horizonY }
  }

  private zeichneKante(punkte: readonly number[]): void {
    const kante = this.add.graphics().lineStyle(BALANCE_V2.track.wallWidthPx, BALANCE_V2.colors.wallEdge, 1)
    kante.beginPath().moveTo(punkte[0], punkte[1])
    for (let index = 2; index < punkte.length; index += 2) kante.lineTo(punkte[index], punkte[index + 1])
    kante.strokePath().setDepth(BALANCE_V2.ebenen.mauer)
  }

  private erstelleGelaender(width: number, height: number): void {
    const linkerHandlauf = this.add.graphics().lineStyle(3, BALANCE_V2.colors.wallEdge, 1)
    const rechterHandlauf = this.add.graphics().lineStyle(3, BALANCE_V2.colors.wallEdge, 1)
    bahnKantenPunkte(width, height, 24).forEach(({ leftX, rightX, y }, index) => {
      const hoehe = BALANCE_V2.track.gelaenderHoehePx * tiefenSkala(height, y)
      if (index === 0) { linkerHandlauf.beginPath().moveTo(leftX, y - hoehe); rechterHandlauf.beginPath().moveTo(rightX, y - hoehe) } else { linkerHandlauf.lineTo(leftX, y - hoehe); rechterHandlauf.lineTo(rightX, y - hoehe) }
    })
    linkerHandlauf.strokePath().setDepth(BALANCE_V2.ebenen.gelaender)
    rechterHandlauf.strokePath().setDepth(BALANCE_V2.ebenen.gelaender)
    for (let y = BALANCE_V2.track.horizonY + 20; y < height; y += BALANCE_V2.track.gelaenderPfostenAbstandPx) {
      const { leftX, rightX } = bahnKantenBeiY(width, height, y)
      const skala = tiefenSkala(height, y)
      const mauerHoehe = BALANCE_V2.track.mauerHoehePx * skala
      // Der helle Kamm sitzt auf der dunkleren Flanke und gibt der Kante Hoehe.
      this.add.rectangle(leftX, y, 6 * skala, mauerHoehe, BALANCE_V2.colors.wall).setDepth(BALANCE_V2.ebenen.mauer)
      this.add.rectangle(rightX, y, 6 * skala, mauerHoehe, BALANCE_V2.colors.wall).setDepth(BALANCE_V2.ebenen.mauer)
      this.add.rectangle(leftX, y - mauerHoehe / 2, 8 * skala, 3 * skala, BALANCE_V2.colors.wallEdge).setDepth(BALANCE_V2.ebenen.gelaender)
      this.add.rectangle(rightX, y - mauerHoehe / 2, 8 * skala, 3 * skala, BALANCE_V2.colors.wallEdge).setDepth(BALANCE_V2.ebenen.gelaender)
      const gelaenderHoehe = BALANCE_V2.track.gelaenderHoehePx * skala
      this.add.rectangle(leftX, y - mauerHoehe - gelaenderHoehe / 2, 3 * skala, gelaenderHoehe, BALANCE_V2.colors.wallEdge).setDepth(BALANCE_V2.ebenen.gelaender)
      this.add.rectangle(rightX, y - mauerHoehe - gelaenderHoehe / 2, 3 * skala, gelaenderHoehe, BALANCE_V2.colors.wallEdge).setDepth(BALANCE_V2.ebenen.gelaender)
    }
  }

  private erstelleTruppe(width: number, height: number): void {
    const groesse = this.truppenGroesse
    const anzeige = truppenAnzeige(groesse)
    const plaetze = haufenPlaetze(anzeige.sichtbareFiguren)
    const probe = this.add.image(0, 0, 'v2-helm-blau').setScale(BALANCE_V2.front.helmTextureScale).setVisible(false)
    this.truppenFigurBreite = probe.displayWidth
    probe.destroy()

    const grenzen = truppeGrenzen(width, height, haufenHalbeBreite(plaetze.length, this.truppenFigurBreite))
    this.truppeX = Phaser.Math.Clamp(width / 2, grenzen.minX, grenzen.maxX)
    const truppeY = height - BALANCE_V2.truppe.abstandVonUntenPx
    this.truppeY = truppeY
    this.truppenPlaetze = plaetze
    const truppenSkala = BALANCE_V2.front.helmTextureScale * tiefenSkala(height, truppeY)
    this.truppenFiguren = plaetze.map((platz) => this.add.image(
      this.truppeX + platz.dx,
      truppeY + platz.dy,
      'v2-helm-blau',
    ).setScale(truppenSkala).setDepth(BALANCE_V2.ebenen.truppe))
    this.truppenZaehler = this.add.text(this.truppeX, truppeY - BALANCE_V2.truppe.haufenRadiusMaxPx - 20, anzeige.zaehler, {
      fontFamily: 'system-ui', fontSize: '24px', fontStyle: 'bold', color: '#e8f4ff', stroke: '#16202a', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(BALANCE_V2.ebenen.zaehler)
    this.staerkeZaehler = this.add.text(this.truppeX, truppeY - BALANCE_V2.truppe.haufenRadiusMaxPx - 46, `STÄRKE ${this.staerke}`, {
      fontFamily: 'system-ui', fontSize: '15px', fontStyle: 'bold', color: '#ffe7a5', stroke: '#16202a', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(BALANCE_V2.ebenen.zaehler)
  }

  private erstelleRaender(): void {
    schildPositionen(this.scale.width, this.scale.height, 0, this.truppeX).forEach((schild) => {
      const kasten = this.add.rectangle(0, 0, BALANCE_V2.raender.schildBreitePx, BALANCE_V2.raender.schildHoehePx,
        schild.seite === 'links' ? 0x277bc0 : 0xe1b72f).setStrokeStyle(2, 0xf6fbff).setDepth(BALANCE_V2.ebenen.schilder)
      const text = this.add.text(0, 0, '', { fontFamily: 'system-ui', fontSize: '20px', fontStyle: 'bold', color: '#ffffff', stroke: '#17212a', strokeThickness: 3 })
        .setOrigin(0.5).setDepth(BALANCE_V2.ebenen.zaehler)
      this.randSchilder.set(schild.id, { kasten, text, umlauf: schild.umlauf, verbraucht: false })
    })
    this.aktualisiereRaender()
  }

  private aktualisiereRaender(): void {
    schildPositionen(this.scale.width, this.scale.height, this.randZeitMs, this.truppeX).forEach((schild) => {
      const bild = this.randSchilder.get(schild.id)
      if (!bild) return
      if (bild.umlauf !== schild.umlauf) {
        bild.umlauf = schild.umlauf
        bild.verbraucht = false
      }
      if (!bild.verbraucht && sammeltEin(schild, this.truppeX, this.truppeY, {
        seitlich: BALANCE_V2.raender.sammelSeitlichPx,
        hoehe: BALANCE_V2.raender.sammelHoehePx,
      })) {
        bild.verbraucht = true
        this.wendeSchildAn(schild.seite)
      }
      const sichtbar = !bild.verbraucht
      const skala = tiefenSkala(this.scale.height, schild.y)
      bild.kasten.setVisible(sichtbar).setPosition(schild.x, schild.y)
        .setSize(BALANCE_V2.raender.schildBreitePx * skala, BALANCE_V2.raender.schildHoehePx * skala)
      bild.text.setVisible(sichtbar).setPosition(schild.x, schild.y).setFontSize(`${20 * skala}px`).setText(schild.seite === 'links' ? '+1' : '+99')
    })
  }

  private erhoeheTruppe(wert: number): void {
    this.truppenGroesse = Math.max(0, this.truppenGroesse) + Math.max(0, Math.floor(wert))
    this.ende = { ...this.ende, truppenGroesse: this.truppenGroesse }
    const plaetze = haufenPlaetze(truppenAnzeige(this.truppenGroesse).sichtbareFiguren)
    const grenzen = truppeGrenzen(this.scale.width, this.scale.height, haufenHalbeBreite(plaetze.length, this.truppenFigurBreite))
    this.truppeX = Phaser.Math.Clamp(this.truppeX, grenzen.minX, grenzen.maxX)
    this.truppenFiguren.forEach((figur) => figur.destroy())
    this.truppenPlaetze = plaetze
    this.truppenFiguren = plaetze.map((platz) => this.add.image(this.truppeX + platz.dx, this.truppeY + platz.dy, 'v2-helm-blau')
      .setScale(BALANCE_V2.front.helmTextureScale).setDepth(BALANCE_V2.ebenen.truppe))
    this.truppenZaehler?.setText(truppenAnzeige(this.truppenGroesse).zaehler)
    this.front = mitAnkunft(this.front, wert)
  }

  private wendeSchildAn(seite: 'links' | 'rechts'): void {
    const neu = sammelAuswirkung(seite, this.truppenGroesse, this.staerke)
    this.staerke = neu.staerke
    this.staerkeZaehler?.setText(`STÄRKE ${this.staerke}`)
    this.front = { ...this.front, staerke: this.staerke }
    if (neu.truppenGroesse !== this.truppenGroesse) this.erhoeheTruppe(neu.truppenGroesse - this.truppenGroesse)
  }

  /** Der feste Vorrat ist aus maximaler Rate mal Laufzeit in balanceV2 hergeleitet. */
  private erstelleStromVorrat(): void {
    this.stromFiguren = Array.from({ length: BALANCE_V2.strom.vorratGroesse }, () => ({ aktiv: false, x: 0, y: 0, torPassiert: false }))
    this.stromBilder = this.stromFiguren.map(() => this.add.image(0, 0, 'v2-helm-blau')
      .setScale(BALANCE_V2.front.helmTextureScale * 0.72).setDepth(BALANCE_V2.ebenen.truppe).setVisible(false))
  }

  private erstelleTor(width: number, height: number): void {
    const kanten = fahrbahnKantenBeiY(width, height, BALANCE_V2.tor.y)
    const breite = kanten.rightX - kanten.leftX
    const mitteX = (kanten.leftX + kanten.rightX) / 2
    const skala = tiefenSkala(height, BALANCE_V2.tor.y)
    this.add.rectangle(mitteX, BALANCE_V2.tor.y, breite, BALANCE_V2.tor.hoehePx * skala, 0xdeb83b)
      .setStrokeStyle(3, 0xfff4bf).setDepth(BALANCE_V2.ebenen.schilder)
    this.add.text(mitteX, BALANCE_V2.tor.y - 3, `×${BALANCE_V2.tor.faktor}`, {
      fontFamily: 'system-ui', fontSize: `${30 * skala}px`, fontStyle: 'bold', color: '#342500', stroke: '#fff4bf', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(BALANCE_V2.ebenen.zaehler)
    this.torZaehler = this.add.text(mitteX, BALANCE_V2.tor.y + 22, String(this.tor.restlicheTreffer), {
      fontFamily: 'system-ui', fontSize: `${16 * skala}px`, fontStyle: 'bold', color: '#fff4bf', stroke: '#342500', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(BALANCE_V2.ebenen.zaehler)
  }

  /** Beide Bildvorräte sind fest: Sichtbarkeit und Position kommen nur aus der Front-Bilanz. */
  private erstelleFlaechen(width: number, height: number): void {
    this.gegnerBilder = Array.from({ length: BALANCE_V2.front.gegnerFigurenVorrat }, (_, index) => this.add.image(0, 0, index % 53 === 0 ? 'enemy-heavy' : 'v2-helm-rot')
      .setScale(index % 53 === 0 ? BALANCE_V2.front.heavyTextureScale : BALANCE_V2.front.helmTextureScale).setDepth(BALANCE_V2.ebenen.massen).setVisible(false))
    this.eigeneFrontBilder = Array.from({ length: BALANCE_V2.front.eigeneFigurenVorrat }, () => this.add.image(0, 0, 'v2-helm-blau')
      .setScale(BALANCE_V2.front.helmTextureScale).setDepth(BALANCE_V2.ebenen.massen).setVisible(false))
    this.gegnerZaehler = this.add.text(width / 2, BALANCE_V2.track.horizonY + 24, '', {
      fontFamily: 'system-ui', fontSize: '24px', fontStyle: 'bold', color: '#ffded9', stroke: '#421a1a', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(BALANCE_V2.ebenen.zaehler)
    // Feste Zahl kleiner Kreise: dauerhaft an der Front sichtbar, ohne neue Objekte
    // pro Bild. Dadurch bleibt die Darstellung auch bei 60 Bildern/s sparsam.
    this.frontPartikel = Array.from({ length: 24 }, () => this.add.circle(0, 0, 3, 0xffffff, 0).setDepth(BALANCE_V2.ebenen.massen))
    this.zeichneFlaechen(width, height)
  }

  private erstelleBoss(width: number): void {
    const animationKey = 'v2-boss-elite-lauf'
    if (!this.anims.exists(animationKey)) {
      this.anims.create({
        key: animationKey,
        frames: Array.from({ length: 12 }, (_, index) => ({ key: `v2-boss-elite-move-${index + 1}` })),
        frameRate: 10,
        repeat: -1,
      })
    }
    this.bossBild = this.add.sprite(width / 2, BALANCE_V2.track.horizonY, 'v2-boss-elite-move-1')
      .setDepth(BALANCE_V2.ebenen.boss).play(animationKey)
    this.bossZaehler = this.add.text(width / 2, BALANCE_V2.track.horizonY - 44, '', {
      fontFamily: 'system-ui', fontSize: '24px', fontStyle: 'bold', color: '#ffded9', stroke: '#421a1a', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(BALANCE_V2.ebenen.bossZaehler)
    this.zeichneBoss(width)
  }

  private zeichneBoss(width: number): void {
    const y = BALANCE_V2.track.horizonY + this.ende.bossAbstiegPx
    // Der Boss waechst mit dem eigenen Vorruecken, nicht mehr mit dem Gegnervorrat:
    // am Horizont Startgroesse, am Ende seines Wegs Endgroesse.
    const fortschritt = Math.min(1, Math.max(0, this.ende.bossAbstiegPx / BALANCE_V2.ende.bossMaxAbstiegPx))
    const scale = (BALANCE_V2.ende.bossStartScale + fortschritt * (BALANCE_V2.ende.bossEndScale - BALANCE_V2.ende.bossStartScale)) * tiefenSkala(this.scale.height, y)
    this.bossBild?.setPosition(width / 2, y).setScale(scale)
    this.bossZaehler?.setPosition(width / 2, y - 120 * scale).setText(String(Math.round(this.ende.bossVorrat)))
  }

  private zeichneFlaechen(width: number, height: number): void {
    const sichtbareGegner = Math.round(BALANCE_V2.front.gegnerFigurenVorrat * this.front.vorrat / BALANCE_V2.front.gegnerStartVorrat)
    // Das Raster muss dieselbe Tiefenskala benutzen wie die gezeichneten Helme.
    // Mit festem Abstand und perspektivisch verkleinerten Bildern stehen die
    // Helme weiter auseinander als sie gross sind - die Flaeche wird loechrig,
    // und zwar umso mehr, je weiter hinten sie liegt.
    const helmGrundmass = 256 * BALANCE_V2.front.helmTextureScale
    const rasterSchritt = (y: number) => Math.max(1, helmGrundmass * tiefenSkala(height, y) * 0.9)
    const gegnerPlaetze: Array<{ x: number, y: number }> = []
    for (let y = this.front.frontY; y > BALANCE_V2.track.horizonY; y -= rasterSchritt(y)) {
      const { leftX: left, rightX: right } = fahrbahnKantenBeiY(width, height, y)
      const spalten = Math.max(1, Math.ceil((right - left) / rasterSchritt(y)))
      for (let spalte = 0; spalte < spalten; spalte += 1) {
        gegnerPlaetze.push({ x: left + (right - left) * ((spalte + 0.5) / spalten), y })
      }
    }
    // Von oben nach unten sortiert, damit eine schrumpfende Flaeche wie bisher
    // von der Front her zurueckweicht und nicht am Horizont ausfranst.
    gegnerPlaetze.sort((a, b) => a.y - b.y)
    this.gegnerBilder.forEach((bild, index) => {
      const platz = gegnerPlaetze[index]
      const sichtbar = index < sichtbareGegner && platz !== undefined
      bild.setVisible(sichtbar)
      if (platz) bild.setPosition(platz.x, platz.y).setScale((index % 53 === 0 ? BALANCE_V2.front.heavyTextureScale : BALANCE_V2.front.helmTextureScale) * tiefenSkala(height, platz.y))
    })
    const eigeneBreite = 256 * BALANCE_V2.front.helmTextureScale
    const eigeneSchrittX = rasterSchritt(this.front.frontY)
    const eigeneStartY = this.front.frontY + eigeneBreite * 0.7
    const eigeneKanten = fahrbahnKantenBeiY(width, height, eigeneStartY)
    const eigeneSpalten = Math.max(1, Math.ceil((eigeneKanten.rightX - eigeneKanten.leftX) / eigeneSchrittX))
    // Drei Bilanzpunkte fuellen eine dichte Frontzeile statt als einzelne, kaum
    // sichtbare Pixel zu verschwinden. Die blaue Darstellung beginnt dadurch als
    // breites Band direkt unter der roten Kante und waechst stetig nach unten.
    const sichtbareEigene = Math.min(
      BALANCE_V2.front.eigeneFigurenVorrat,
      Math.ceil(this.front.eigenerWert / 3) * eigeneSpalten,
    )
    this.eigeneFrontBilder.forEach((bild, index) => {
      const sichtbar = index < sichtbareEigene
      if (!sichtbar) {
        bild.setVisible(false)
        return
      }
      const zeile = Math.floor(index / eigeneSpalten)
      // Dieselbe Rasterrechnung wie bei der Gegnerflaeche: Zeilenabstand und
      // Spaltenabstand folgen der Tiefenskala, sonst klafft die Flaeche auf.
      const y = eigeneStartY + zeile * rasterSchritt(eigeneStartY)
      if (y > BALANCE_V2.front.eigeneFlaecheMaxUntenY) {
        bild.setVisible(false)
        return
      }
      const { leftX, rightX } = fahrbahnKantenBeiY(width, height, y)
      const spalten = Math.max(1, Math.ceil((rightX - leftX) / rasterSchritt(y)))
      bild.setVisible(true).setPosition(leftX + (rightX - leftX) * (((index % eigeneSpalten) % spalten + 0.5) / spalten), y)
        .setScale(BALANCE_V2.front.helmTextureScale * tiefenSkala(height, y))
    })
    // Der Massenzähler bleibt innerhalb der roten Fläche und unter dem Bosszähler.
    this.gegnerZaehler?.setPosition(width / 2, Math.min(this.front.frontY - 20, BALANCE_V2.track.horizonY + 104))
      .setText(String(Math.round(this.front.vorrat)))
    this.zeichneFrontPartikel(width, height)
    this.zeichneBoss(width)
  }

  /** Reine Front-Optik: weisse Wolken nur, solange beide Flächen noch kämpfen. */
  private zeichneFrontPartikel(width: number, height: number): void {
    const aktiv = this.front.vorrat > 0 && this.front.eigenerWert > 0
    const { leftX, rightX } = fahrbahnKantenBeiY(width, height, this.front.frontY)
    this.frontPartikel.forEach((partikel, index) => {
      if (!aktiv) {
        partikel.setVisible(false)
        return
      }
      const phase = this.time.now / 260 + index * 1.71
      const x = Phaser.Math.Linear(leftX + 6, rightX - 6, (index + 0.5) / this.frontPartikel.length)
        + Math.sin(phase) * 5
      const y = this.front.frontY + Math.cos(phase * 1.3) * 7
      partikel.setVisible(true).setPosition(x, y).setRadius(2 + (index % 3)).setAlpha(0.38 + (Math.sin(phase) + 1) * 0.24)
    })
  }

  public update(_time: number, delta: number): void {
    if (this.endeAusgeloest) return
    this.randZeitMs += Math.max(0, delta)
    this.zeichneWasser()
    this.stromRest += figurenProSekunde(this.truppenGroesse) * delta / 1000
    while (this.stromRest >= 1) {
      this.stromRest -= 1
      this.starteStromFigur()
    }
    this.stromFiguren.forEach((figur, index) => {
      if (!figur.aktiv) return
      const bewegt = bewegeStromFigur(figur, delta)
      const durchgang = bewegt.y <= BALANCE_V2.tor.y ? durchquertTor(bewegt, this.tor) : undefined
      if (durchgang) {
        this.tor = durchgang.tor
        this.torZaehler?.setText(String(this.tor.restlicheTreffer))
        for (let kopie = 1; kopie < durchgang.anzahl; kopie += 1) this.starteVervielfachteStromFigur(bewegt.x, bewegt.y)
      }
      const nachTor = durchgang ? { ...bewegt, ...durchgang.figur } : bewegt
      const aktiv = nachTor.y > this.front.frontY
      if (!aktiv) this.front = mitAnkunft(this.front)
      this.stromFiguren[index] = { ...nachTor, aktiv }
      const bild = this.stromBilder[index]
      bild.setVisible(aktiv)
      if (aktiv) {
        const position = stromDarstellungsPosition(nachTor)
        bild.setPosition(position.x, position.y).setScale(BALANCE_V2.front.helmTextureScale * 0.72 * tiefenSkala(this.scale.height, position.y))
      }
    })
    this.ende = aktualisiereEnde({ ...this.ende, front: this.front }, delta)
    this.front = this.ende.front
    this.aktualisiereTruppenNachVerlust()
    const ausgang = ausgangEinmal(this.endeAusgeloest, this.ende)
    if (ausgang) this.loeseAusgangAus(ausgang)
    this.zeichneFlaechen(this.scale.width, this.scale.height)
    this.aktualisiereRaender()
  }

  /** Die Anzeige rundet nur; die Ende-Bilanz behaelt die verlorenen Bruchteile. */
  private aktualisiereTruppenNachVerlust(): void {
    const neueGroesse = this.ende.truppenGroesse
    if (Math.floor(neueGroesse) === Math.floor(this.truppenGroesse)) return
    this.truppenGroesse = neueGroesse
    const plaetze = haufenPlaetze(truppenAnzeige(neueGroesse).sichtbareFiguren)
    this.truppenFiguren.forEach((figur) => figur.destroy())
    this.truppenPlaetze = plaetze
    this.truppenFiguren = plaetze.map((platz) => this.add.image(this.truppeX + platz.dx, this.truppeY + platz.dy, 'v2-helm-blau')
      .setScale(BALANCE_V2.front.helmTextureScale).setDepth(BALANCE_V2.ebenen.truppe))
    this.truppenZaehler?.setText(truppenAnzeige(neueGroesse).zaehler)
  }

  private loeseAusgangAus(ausgang: 'sieg' | 'niederlage'): void {
    this.endeAusgeloest = true
    this.add.text(this.scale.width / 2, this.scale.height / 2, ausgang === 'sieg' ? 'GESCHAFFT' : 'VERLOREN', {
      fontFamily: 'system-ui', fontSize: '42px', fontStyle: 'bold', color: '#ffffff', stroke: '#17212a', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(BALANCE_V2.ebenen.ergebnis)
    this.time.delayedCall(BALANCE_V2.ende.rueckkehrMs, () => this.scene.start('MenuScene'))
  }

  private starteStromFigur(): void {
    const index = this.stromFiguren.findIndex((figur) => !figur.aktiv)
    if (index < 0) return
    const x = this.truppeX + Phaser.Math.FloatBetween(-BALANCE_V2.strom.startStreuungPx, BALANCE_V2.strom.startStreuungPx)
    const figur = { aktiv: true, x, y: this.truppeY, torPassiert: false }
    this.stromFiguren[index] = figur
    const bild = this.stromBilder[index]
    bild.setPosition(figur.x, figur.y).setVisible(true)
  }

  private starteVervielfachteStromFigur(x: number, y: number): void {
    const index = this.stromFiguren.findIndex((figur) => !figur.aktiv)
    if (index < 0) return
    this.stromFiguren[index] = { aktiv: true, x, y, torPassiert: true }
    this.stromBilder[index].setPosition(x, y).setVisible(true)
  }

  private aktiviereTruppenSteuerung(width: number, height: number): void {
    const bewegeTruppe = (pointer: Phaser.Input.Pointer): void => {
      const grenzen = truppeGrenzen(width, height, haufenHalbeBreite(this.truppenPlaetze.length, this.truppenFigurBreite))
      const neueX = Phaser.Math.Clamp(pointer.x, grenzen.minX, grenzen.maxX)
      this.truppeX = neueX
      const positionenX = haufenPositionenX(neueX, this.truppenPlaetze)
      this.truppenFiguren.forEach((figur, index) => { figur.x = positionenX[index] })
      this.truppenZaehler?.setX(neueX)
      this.staerkeZaehler?.setX(neueX)
    }
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y >= BALANCE_V2.track.horizonY) {
        this.ziehtTruppe = true
        bewegeTruppe(pointer)
      }
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.ziehtTruppe && pointer.isDown) bewegeTruppe(pointer)
    })
    this.input.on('pointerup', () => { this.ziehtTruppe = false })
  }

  private zeichneWasser(): void {
    const g = this.wasserGeometrie
    if (!g) return
    const zeit = this.time.now / 1000
    this.wasserWellen.forEach((welle, index) => {
      const y = g.horizonY + 18 + (index % 11) * BALANCE_V2.track.wasserWellenAbstandPx
      const { leftX: links, rightX: rechts } = bahnKantenBeiY(g.width, g.height, y)
      const offset = wasserWellenOffset(zeit, index)
      const skala = tiefenSkala(g.height, y)
      const laenge = (24 + index % 4 * 9) * skala
      const x = index < 11 ? Math.max(4, links - 42 * skala + offset * 8) : Math.min(g.width - laenge - 4, rechts + 12 * skala + offset * 8)
      welle.setTo(0, 0, laenge, 0).setPosition(x, y + offset * 4).setLineWidth(Math.max(1, 2 * skala), Math.max(1, 2 * skala))
    })
  }
}
