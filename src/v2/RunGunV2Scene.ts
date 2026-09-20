import Phaser from 'phaser'
import { bahnKanten, BALANCE_V2 } from './balanceV2'
import { bewegeStromFigur, figurenProSekunde, stromDarstellungsPosition, type StromFigur } from './strom'
import { haufenHalbeBreite, haufenPlaetze, haufenPositionenX, type HaufenPlatz, truppeGrenzen, truppenAnzeige } from './truppe'

/** Das bewusst zustandslose Geruest fuer den isolierten Run-Gun-V2-Probelauf. */
export class RunGunV2Scene extends Phaser.Scene {
  private truppenFiguren: Phaser.GameObjects.Image[] = []
  private truppenPlaetze: readonly HaufenPlatz[] = []
  private truppenZaehler?: Phaser.GameObjects.Text
  private truppenFigurBreite = 0
  private truppeX = 0
  private truppeY = 0
  private ziehtTruppe = false
  private stromFiguren: StromFigur[] = []
  private stromBilder: Phaser.GameObjects.Image[] = []
  private stromRest = 0

  public constructor() {
    super('RunGunV2Scene')
  }

  public create(): void {
    // Phaser verwendet Szeneninstanzen wieder. Jeder Start beginnt deshalb ohne alte
    // Figuren, Zähler oder Ziehzustand.
    this.truppenFiguren = []
    this.truppenPlaetze = []
    this.truppenZaehler = undefined
    this.truppenFigurBreite = 0
    this.truppeY = 0
    this.ziehtTruppe = false
    this.stromFiguren = []
    this.stromBilder.forEach((bild) => bild.destroy())
    this.stromBilder = []
    this.stromRest = 0
    const width = this.scale.width
    const height = this.scale.height
    const centerX = width / 2
    const { horizonY, bottomY, topLeftX, topRightX, bottomLeftX, bottomRightX } = bahnKanten(width, height)

    this.add.rectangle(centerX, height / 2, width, height, BALANCE_V2.colors.sky)
    this.add.polygon(0, 0, [
      topLeftX, horizonY,
      topRightX, horizonY,
      bottomRightX, bottomY,
      bottomLeftX, bottomY,
    ], BALANCE_V2.colors.road).setOrigin(0, 0)

    this.add.polygon(0, 0, [0, horizonY, topLeftX, horizonY, bottomLeftX, bottomY, 0, bottomY], BALANCE_V2.colors.wall).setOrigin(0, 0)
    this.add.polygon(0, 0, [topRightX, horizonY, width, horizonY, width, bottomY, bottomRightX, bottomY], BALANCE_V2.colors.wall).setOrigin(0, 0)
    this.add.line(0, 0, topLeftX, horizonY, bottomLeftX, bottomY, BALANCE_V2.colors.wallEdge, 1)
      .setOrigin(0, 0)
      .setLineWidth(BALANCE_V2.track.wallWidthPx)
    this.add.line(0, 0, topRightX, horizonY, bottomRightX, bottomY, BALANCE_V2.colors.wallEdge, 1)
      .setOrigin(0, 0)
      .setLineWidth(BALANCE_V2.track.wallWidthPx)

    const menuButton = this.add.rectangle(52, 34, 84, 36, BALANCE_V2.colors.menuButton)
      .setStrokeStyle(2, BALANCE_V2.colors.menuButtonEdge)
      .setInteractive({ useHandCursor: true })
    this.add.text(52, 34, 'MENÜ', {
      fontFamily: 'system-ui', fontSize: '16px', fontStyle: 'bold', color: BALANCE_V2.colors.menuText,
    }).setOrigin(0.5)
    menuButton.on('pointerdown', () => this.scene.start('MenuScene'))

    this.erstelleTruppe(width, height)
    this.erstelleStromVorrat()
    this.aktiviereTruppenSteuerung(width, height)
  }

  private erstelleTruppe(width: number, height: number): void {
    const groesse = BALANCE_V2.truppe.startGroesse
    const anzeige = truppenAnzeige(groesse)
    const plaetze = haufenPlaetze(anzeige.sichtbareFiguren)
    const probe = this.add.image(0, 0, 'player').setScale(BALANCE_V2.truppe.figurTextureScale).setVisible(false)
    this.truppenFigurBreite = probe.displayWidth
    probe.destroy()

    const grenzen = truppeGrenzen(width, height, haufenHalbeBreite(plaetze.length, this.truppenFigurBreite))
    this.truppeX = Phaser.Math.Clamp(width / 2, grenzen.minX, grenzen.maxX)
    const truppeY = height - BALANCE_V2.truppe.abstandVonUntenPx
    this.truppeY = truppeY
    this.truppenPlaetze = plaetze
    this.truppenFiguren = plaetze.map((platz) => this.add.image(
      this.truppeX + platz.dx,
      truppeY + platz.dy,
      'player',
    ).setScale(BALANCE_V2.truppe.figurTextureScale).setDepth(2))
    this.truppenZaehler = this.add.text(this.truppeX, truppeY - BALANCE_V2.truppe.haufenRadiusMaxPx - 20, anzeige.zaehler, {
      fontFamily: 'system-ui', fontSize: '24px', fontStyle: 'bold', color: '#e8f4ff', stroke: '#16202a', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(3)
  }

  /** Der feste Vorrat ist aus maximaler Rate mal Laufzeit in balanceV2 hergeleitet. */
  private erstelleStromVorrat(): void {
    this.stromFiguren = Array.from({ length: BALANCE_V2.strom.vorratGroesse }, () => ({ aktiv: false, x: 0, y: 0 }))
    this.stromBilder = this.stromFiguren.map(() => this.add.image(0, 0, 'player')
      .setScale(BALANCE_V2.strom.figurTextureScale).setDepth(1).setVisible(false))
  }

  public update(_time: number, delta: number): void {
    this.stromRest += figurenProSekunde(BALANCE_V2.truppe.startGroesse) * delta / 1000
    while (this.stromRest >= 1) {
      this.stromRest -= 1
      this.starteStromFigur()
    }
    this.stromFiguren.forEach((figur, index) => {
      if (!figur.aktiv) return
      const bewegt = bewegeStromFigur(figur, delta)
      const aktiv = bewegt.y > BALANCE_V2.track.horizonY
      this.stromFiguren[index] = { ...bewegt, aktiv }
      const bild = this.stromBilder[index]
      bild.setVisible(aktiv)
      if (aktiv) {
        const position = stromDarstellungsPosition(bewegt)
        bild.setPosition(position.x, position.y)
      }
    })
  }

  private starteStromFigur(): void {
    const index = this.stromFiguren.findIndex((figur) => !figur.aktiv)
    if (index < 0) return
    const x = this.truppeX + Phaser.Math.FloatBetween(-BALANCE_V2.strom.startStreuungPx, BALANCE_V2.strom.startStreuungPx)
    const figur = { aktiv: true, x, y: this.truppeY }
    this.stromFiguren[index] = figur
    const bild = this.stromBilder[index]
    bild.setPosition(figur.x, figur.y).setVisible(true)
  }

  private aktiviereTruppenSteuerung(width: number, height: number): void {
    const bewegeTruppe = (pointer: Phaser.Input.Pointer): void => {
      const grenzen = truppeGrenzen(width, height, haufenHalbeBreite(this.truppenPlaetze.length, this.truppenFigurBreite))
      const neueX = Phaser.Math.Clamp(pointer.x, grenzen.minX, grenzen.maxX)
      this.truppeX = neueX
      const positionenX = haufenPositionenX(neueX, this.truppenPlaetze)
      this.truppenFiguren.forEach((figur, index) => { figur.x = positionenX[index] })
      this.truppenZaehler?.setX(neueX)
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
}
