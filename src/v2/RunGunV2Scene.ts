import Phaser from 'phaser'
import { bahnKanten, bahnKantenBeiY, BALANCE_V2 } from './balanceV2'
import { bewegeStromFigur, figurenProSekunde, stromDarstellungsPosition, type StromFigur } from './strom'
import { haufenHalbeBreite, haufenPlaetze, haufenPositionenX, type HaufenPlatz, truppeGrenzen, truppenAnzeige } from './truppe'
import { aktualisiereFront, frontStartZustand, mitAnkunft, type FrontZustand } from './front'
import { sammeltEin, schildPositionen, truppenGroesseNachSammeln } from './raender'
import { durchquertTor, torStartZustand, type TorZustand } from './tor'

type SchildBild = { kasten: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text, umlauf: number, verbraucht: boolean }

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
  private front: FrontZustand = frontStartZustand()
  private gegnerBilder: Phaser.GameObjects.Image[] = []
  private eigeneFrontBilder: Phaser.GameObjects.Image[] = []
  private gegnerZaehler?: Phaser.GameObjects.Text
  private truppenGroesse: number = BALANCE_V2.truppe.startGroesse
  private randZeitMs = 0
  private randSchilder = new Map<string, SchildBild>()
  private tor: TorZustand = torStartZustand()
  private torZaehler?: Phaser.GameObjects.Text

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
    this.front = frontStartZustand()
    this.gegnerBilder = []
    this.eigeneFrontBilder = []
    this.gegnerZaehler = undefined
    this.truppenGroesse = BALANCE_V2.truppe.startGroesse
    this.randZeitMs = 0
    this.randSchilder.clear()
    this.tor = torStartZustand()
    this.torZaehler = undefined
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
    this.erstelleFlaechen(width, height)
    this.erstelleRaender()
    this.erstelleTor(width, height)
    this.aktiviereTruppenSteuerung(width, height)
  }

  private erstelleTruppe(width: number, height: number): void {
    const groesse = this.truppenGroesse
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

  private erstelleRaender(): void {
    schildPositionen(this.scale.width, this.scale.height, 0).forEach((schild) => {
      const kasten = this.add.rectangle(0, 0, BALANCE_V2.raender.schildBreitePx, BALANCE_V2.raender.schildHoehePx,
        schild.seite === 'links' ? 0x277bc0 : 0xe1b72f).setStrokeStyle(2, 0xf6fbff).setDepth(4)
      const text = this.add.text(0, 0, '', { fontFamily: 'system-ui', fontSize: '20px', fontStyle: 'bold', color: '#ffffff', stroke: '#17212a', strokeThickness: 3 })
        .setOrigin(0.5).setDepth(5)
      this.randSchilder.set(schild.id, { kasten, text, umlauf: schild.umlauf, verbraucht: false })
    })
    this.aktualisiereRaender()
  }

  private aktualisiereRaender(): void {
    schildPositionen(this.scale.width, this.scale.height, this.randZeitMs).forEach((schild) => {
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
        this.erhoeheTruppe(schild.wert)
      }
      const sichtbar = !bild.verbraucht
      bild.kasten.setVisible(sichtbar).setPosition(schild.x, schild.y)
      bild.text.setVisible(sichtbar).setPosition(schild.x, schild.y).setText(`+${schild.wert}`)
    })
  }

  private erhoeheTruppe(wert: number): void {
    this.truppenGroesse = truppenGroesseNachSammeln(this.truppenGroesse, wert)
    const plaetze = haufenPlaetze(truppenAnzeige(this.truppenGroesse).sichtbareFiguren)
    const grenzen = truppeGrenzen(this.scale.width, this.scale.height, haufenHalbeBreite(plaetze.length, this.truppenFigurBreite))
    this.truppeX = Phaser.Math.Clamp(this.truppeX, grenzen.minX, grenzen.maxX)
    this.truppenFiguren.forEach((figur) => figur.destroy())
    this.truppenPlaetze = plaetze
    this.truppenFiguren = plaetze.map((platz) => this.add.image(this.truppeX + platz.dx, this.truppeY + platz.dy, 'player')
      .setScale(BALANCE_V2.truppe.figurTextureScale).setDepth(2))
    this.truppenZaehler?.setText(truppenAnzeige(this.truppenGroesse).zaehler)
    this.front = mitAnkunft(this.front, wert)
  }

  /** Der feste Vorrat ist aus maximaler Rate mal Laufzeit in balanceV2 hergeleitet. */
  private erstelleStromVorrat(): void {
    this.stromFiguren = Array.from({ length: BALANCE_V2.strom.vorratGroesse }, () => ({ aktiv: false, x: 0, y: 0, torPassiert: false }))
    this.stromBilder = this.stromFiguren.map(() => this.add.image(0, 0, 'player')
      .setScale(BALANCE_V2.strom.figurTextureScale).setDepth(1).setVisible(false))
  }

  private erstelleTor(width: number, height: number): void {
    const kanten = bahnKantenBeiY(width, height, BALANCE_V2.tor.y)
    const breite = kanten.rightX - kanten.leftX
    const mitteX = (kanten.leftX + kanten.rightX) / 2
    this.add.rectangle(mitteX, BALANCE_V2.tor.y, breite, BALANCE_V2.tor.hoehePx, 0xdeb83b)
      .setStrokeStyle(3, 0xfff4bf).setDepth(3)
    this.add.text(mitteX, BALANCE_V2.tor.y - 3, `×${BALANCE_V2.tor.faktor}`, {
      fontFamily: 'system-ui', fontSize: '30px', fontStyle: 'bold', color: '#342500', stroke: '#fff4bf', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(4)
    this.torZaehler = this.add.text(mitteX, BALANCE_V2.tor.y + 22, String(this.tor.restlicheTreffer), {
      fontFamily: 'system-ui', fontSize: '16px', fontStyle: 'bold', color: '#fff4bf', stroke: '#342500', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(4)
  }

  /** Beide Bildvorräte sind fest: Sichtbarkeit und Position kommen nur aus der Front-Bilanz. */
  private erstelleFlaechen(width: number, height: number): void {
    this.gegnerBilder = Array.from({ length: BALANCE_V2.front.gegnerFigurenVorrat }, () => this.add.image(0, 0, 'enemy-standard')
      .setScale(BALANCE_V2.front.gegnerFigurTextureScale).setTint(BALANCE_V2.front.gegnerFigurTint).setDepth(0).setVisible(false))
    this.eigeneFrontBilder = Array.from({ length: BALANCE_V2.front.eigeneFigurenVorrat }, () => this.add.image(0, 0, 'player')
      .setScale(BALANCE_V2.front.eigeneFigurTextureScale).setTint(BALANCE_V2.front.eigeneFigurTint).setDepth(1).setVisible(false))
    this.gegnerZaehler = this.add.text(width / 2, BALANCE_V2.track.horizonY + 24, '', {
      fontFamily: 'system-ui', fontSize: '24px', fontStyle: 'bold', color: '#ffded9', stroke: '#421a1a', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(3)
    this.zeichneFlaechen(width, height)
  }

  private zeichneFlaechen(width: number, height: number): void {
    const sichtbareGegner = Math.round(BALANCE_V2.front.gegnerFigurenVorrat * this.front.vorrat / BALANCE_V2.front.gegnerStartVorrat)
    const gegnerBreite = 64 * BALANCE_V2.front.gegnerFigurTextureScale
    const gegnerHoehe = 88 * BALANCE_V2.front.gegnerFigurTextureScale
    const gegnerSchrittX = gegnerBreite * 0.9
    const gegnerSchrittY = gegnerHoehe * 0.9
    const zeilen = Math.max(1, Math.ceil((this.front.frontY - BALANCE_V2.track.horizonY) / gegnerSchrittY))
    const kanten = bahnKanten(width, height)
    const gegnerPlaetze: Array<{ x: number, y: number }> = []
    for (let zeile = 0; zeile < zeilen; zeile += 1) {
      const y = BALANCE_V2.track.horizonY + (this.front.frontY - BALANCE_V2.track.horizonY) * (zeile + 0.5) / zeilen
      const fortschritt = (y - kanten.horizonY) / (kanten.bottomY - kanten.horizonY)
      const left = kanten.topLeftX + (kanten.bottomLeftX - kanten.topLeftX) * fortschritt
      const right = kanten.topRightX + (kanten.bottomRightX - kanten.topRightX) * fortschritt
      const spalten = Math.max(1, Math.ceil((right - left) / gegnerSchrittX))
      for (let spalte = 0; spalte < spalten; spalte += 1) {
        gegnerPlaetze.push({ x: left + (right - left) * ((spalte + 0.5) / spalten), y })
      }
    }
    this.gegnerBilder.forEach((bild, index) => {
      const platz = gegnerPlaetze[index]
      const sichtbar = index < sichtbareGegner && platz !== undefined
      bild.setVisible(sichtbar)
      if (platz) bild.setPosition(platz.x, platz.y)
    })
    const sichtbareEigene = Math.min(BALANCE_V2.front.eigeneFigurenVorrat, Math.floor(this.front.eigenerWert))
    const eigeneBreite = 68 * BALANCE_V2.front.eigeneFigurTextureScale
    const eigeneSchrittX = eigeneBreite * 0.9
    const eigeneStartY = this.front.frontY + eigeneBreite * 0.7
    const eigeneKanten = bahnKantenBeiY(width, height, eigeneStartY)
    const eigeneSpalten = Math.max(1, Math.ceil((eigeneKanten.rightX - eigeneKanten.leftX) / eigeneSchrittX))
    this.eigeneFrontBilder.forEach((bild, index) => {
      const sichtbar = index < sichtbareEigene
      if (!sichtbar) {
        bild.setVisible(false)
        return
      }
      const zeile = Math.floor(index / eigeneSpalten)
      const y = eigeneStartY + zeile * (92 * BALANCE_V2.front.eigeneFigurTextureScale * 0.9)
      if (y > BALANCE_V2.front.eigeneFlaecheMaxUntenY) {
        bild.setVisible(false)
        return
      }
      const { leftX, rightX } = bahnKantenBeiY(width, height, y)
      const spalten = Math.max(1, Math.ceil((rightX - leftX) / eigeneSchrittX))
      bild.setVisible(true).setPosition(leftX + (rightX - leftX) * (((index % eigeneSpalten) % spalten + 0.5) / spalten), y)
    })
    this.gegnerZaehler?.setText(String(Math.round(this.front.vorrat)))
  }

  public update(_time: number, delta: number): void {
    this.randZeitMs += Math.max(0, delta)
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
        bild.setPosition(position.x, position.y)
      }
    })
    this.front = aktualisiereFront(this.front, delta)
    this.zeichneFlaechen(this.scale.width, this.scale.height)
    this.aktualisiereRaender()
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
