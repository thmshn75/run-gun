import Phaser from 'phaser'
import { bahnKanten, BALANCE_V2 } from './balanceV2'
import { haufenHalbeBreite, haufenPlaetze, haufenPositionenX, type HaufenPlatz, truppeGrenzen, truppenAnzeige } from './truppe'

/** Das bewusst zustandslose Geruest fuer den isolierten Run-Gun-V2-Probelauf. */
export class RunGunV2Scene extends Phaser.Scene {
  private truppenFiguren: Phaser.GameObjects.Image[] = []
  private truppenPlaetze: readonly HaufenPlatz[] = []
  private truppenZaehler?: Phaser.GameObjects.Text
  private truppenFigurBreite = 0
  private truppeX = 0
  private ziehtTruppe = false

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
    this.ziehtTruppe = false
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
