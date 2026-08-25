import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS, MENU_COLORS } from '../config/colors'
import { computeWeaponRowLayout, type WeaponRowLayout } from './shopWeaponRow'
import { getMaxShopSteps, getShopPrice, type ShopLine } from './upgrades'

export interface ShopZustand {
  readonly level: number
  readonly konto: number
  readonly stufen: { readonly firepower: number; readonly team: number }
  /** In dieser Pause bereits gekauft - hoechstens eine Stufe je Knopf. */
  readonly inDieserPause: { readonly firepower: number; readonly team: number }
  readonly werte: { readonly damage: number; readonly shotsPerSec: number; readonly hp: number }
  /**
   * Waehlbare Startwaffen fuer das kommende Level (Thomas 2026-08-25: "wenn einmal
   * gekauft soll er vor jedem level auswaehlen koennen, mit welcher er startet").
   * Enthaelt die gekauften Waffen, die fuer dieses Level freigeschaltet sind, plus die
   * gerade getragene. Leer heisst: nichts zu waehlen, die Reihe bleibt unsichtbar.
   */
  readonly waffen: readonly { readonly key: string; readonly aktiv: boolean }[]
}

interface Knopf {
  readonly hintergrund: Phaser.GameObjects.Rectangle
  readonly titel: Phaser.GameObjects.Text
  readonly wirkung: Phaser.GameObjects.Text
  readonly preis: Phaser.GameObjects.Text
}

const TITEL: Record<ShopLine, string> = { firepower: 'FEUERKRAFT', team: 'TRUPPE' }

/**
 * Der Shop in der Levelpause (Benni ueber Thomas 2026-08-23: "nach jedem Level die
 * Moeglichkeit seine DMG Rate und das maximale Team gegen Bezahlung upzugraden").
 *
 * Zwei Knoepfe, nicht mehr - der Tester ist 7 Jahre alt. Die Pause wartet auf WEITER
 * statt auf einen Zeitgeber: Wer kaufen will, soll nicht gegen die Uhr lesen muessen.
 */
export class ShopOverlay {
  private readonly scene: Phaser.Scene
  private readonly onKauf: (line: ShopLine) => void
  private readonly onWeiter: () => void
  private readonly onBeenden: () => void
  private readonly hintergrund: Phaser.GameObjects.Rectangle
  private readonly ueberschrift: Phaser.GameObjects.Text
  private readonly konto: Phaser.GameObjects.Text
  private readonly knoepfe: Record<ShopLine, Knopf>
  private readonly weiter: Phaser.GameObjects.Rectangle
  private readonly weiterText: Phaser.GameObjects.Text
  private readonly beenden: Phaser.GameObjects.Rectangle
  private readonly beendenText: Phaser.GameObjects.Text
  private readonly alleObjekte: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text | Phaser.GameObjects.Image>
  private readonly waffenTitel: Phaser.GameObjects.Text
  /** Fester Vorrat an Kacheln - die Zahl der waehlbaren Waffen wechselt je Level. */
  private readonly waffenKacheln: Array<{ rahmen: Phaser.GameObjects.Rectangle; bild: Phaser.GameObjects.Image }>
  private readonly onWaffenwahl: (weapon: string) => void
  /** Gerechnete Masse der Kachelreihe - sie haengen an beiden Safe-Area-Raendern. */
  private readonly reihenLayout: WeaponRowLayout
  private readonly mitte: number
  private sichtbar = false

  public constructor(
    scene: Phaser.Scene,
    insets: { top: number; bottom: number; left: number; right: number },
    onKauf: (line: ShopLine) => void,
    onWeiter: () => void,
    onBeenden: () => void,
    onWaffenwahl: (weapon: string) => void = () => undefined,
  ) {
    this.scene = scene
    this.onKauf = onKauf
    this.onWeiter = onWeiter
    this.onBeenden = onBeenden
    this.onWaffenwahl = onWaffenwahl
    const breite = scene.scale.width
    const hoehe = scene.scale.height
    const mitte = breite / 2
    const rand = BALANCE.shop.ui.sidePadding
    const knopfBreite = breite - 2 * rand - insets.left - insets.right

    this.hintergrund = scene.add.rectangle(mitte, hoehe / 2, breite, hoehe, HUD_COLORS.panel, BALANCE.shop.ui.overlayAlpha)
      .setDepth(BALANCE.shop.ui.depthPanel)
    this.ueberschrift = scene.add.text(mitte, insets.top + BALANCE.shop.ui.titleY, '', {
      fontFamily: 'system-ui', fontSize: `${BALANCE.shop.ui.titleFontPx}px`, fontStyle: 'bold', color: '#ffffff',
      stroke: '#101320', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(BALANCE.shop.ui.depthText)
    this.konto = scene.add.text(mitte, insets.top + BALANCE.shop.ui.balanceY, '', {
      fontFamily: 'system-ui', fontSize: `${BALANCE.shop.ui.balanceFontPx}px`, fontStyle: 'bold',
      color: this.farbe(HUD_COLORS.coins),
    }).setOrigin(0.5).setDepth(BALANCE.shop.ui.depthText)

    this.knoepfe = {
      firepower: this.baueKnopf('firepower', mitte, insets.top + BALANCE.shop.ui.firstButtonY, knopfBreite),
      team: this.baueKnopf('team', mitte, insets.top + BALANCE.shop.ui.firstButtonY + BALANCE.shop.ui.buttonHeight + BALANCE.shop.ui.buttonGap, knopfBreite),
    }

    const weiterY = hoehe - insets.bottom - BALANCE.shop.ui.continueBottomOffset
    this.weiter = scene.add.rectangle(mitte, weiterY, knopfBreite, BALANCE.shop.ui.continueHeight, MENU_COLORS.button)
      .setDepth(BALANCE.shop.ui.depthPanel).setInteractive({ useHandCursor: true })
    this.weiterText = scene.add.text(mitte, weiterY, 'WEITER', {
      fontFamily: 'system-ui', fontSize: `${BALANCE.shop.ui.continueFontPx}px`, fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(BALANCE.shop.ui.depthText)
    this.weiter.on('pointerdown', () => { if (this.sichtbar) this.onWeiter() })

    // SPEICHERN & BEENDEN: Der Stand liegt hier ohnehin schon im Spielstand - der Knopf
    // fuehrt nur ins Menue zurueck. Er ist trotzdem noetig, weil man sonst die App
    // wegwischen muesste und nie wuesste, ob gespeichert wurde (Thomas 2026-08-23).
    const beendenY = weiterY - BALANCE.shop.ui.continueHeight - BALANCE.shop.ui.quitGap
    this.beenden = scene.add.rectangle(mitte, beendenY, knopfBreite, BALANCE.shop.ui.quitHeight, MENU_COLORS.row)
      .setStrokeStyle(2, MENU_COLORS.rowStroke)
      .setDepth(BALANCE.shop.ui.depthPanel).setInteractive({ useHandCursor: true })
    this.beendenText = scene.add.text(mitte, beendenY, 'SPEICHERN & BEENDEN', {
      fontFamily: 'system-ui', fontSize: `${BALANCE.shop.ui.quitFontPx}px`, fontStyle: 'bold',
      color: this.farbe(MENU_COLORS.text),
    }).setOrigin(0.5).setDepth(BALANCE.shop.ui.depthText)
    this.beenden.on('pointerdown', () => { if (this.sichtbar) this.onBeenden() })

    // WAFFENWAHL: Titel plus ein fester Vorrat an Kacheln. Erzeugt wird alles hier, weil
    // Phaser-Objekte nicht bei jedem Oeffnen neu entstehen sollen; sichtbar wird nur, was
    // das kommende Level hergibt. Die Masse kommen aus computeWeaponRowLayout - sie
    // haengen an BEIDEN Safe-Area-Raendern und duerfen deshalb nicht fest stehen.
    const reihe1 = computeWeaponRowLayout(insets, hoehe)
    this.reihenLayout = reihe1
    this.mitte = mitte
    this.waffenTitel = scene.add.text(mitte, reihe1.titelY, 'STARTWAFFE', {
      fontFamily: 'system-ui', fontSize: '13px', fontStyle: 'bold', color: this.farbe(MENU_COLORS.text),
    }).setOrigin(0.5).setDepth(BALANCE.shop.ui.depthText)
    this.waffenKacheln = []
    const proReihe = reihe1.proReihe
    const kb = reihe1.kachelBreite
    const kh = reihe1.kachelHoehe
    const luecke = reihe1.luecke
    for (let i = 0; i < reihe1.reihen * proReihe; i += 1) {
      const spalte = i % proReihe
      const reihe = Math.floor(i / proReihe)
      const zeilenBreite = proReihe * kb + (proReihe - 1) * luecke
      const x = mitte - zeilenBreite / 2 + kb / 2 + spalte * (kb + luecke)
      const y = reihe1.ersteReiheY + reihe * (kh + luecke)
      const rahmen = scene.add.rectangle(x, y, kb, kh, MENU_COLORS.shelf, 1)
        .setStrokeStyle(2, MENU_COLORS.rowStroke, 1).setDepth(BALANCE.shop.ui.depthPanel)
      const bild = scene.add.image(x, y, 'weapon-pistol-hud').setDepth(BALANCE.shop.ui.depthText)
      this.waffenKacheln.push({ rahmen, bild })
    }

    this.alleObjekte = [
      this.hintergrund, this.ueberschrift, this.konto, this.weiter, this.weiterText,
      this.beenden, this.beendenText, this.waffenTitel,
      ...Object.values(this.knoepfe).flatMap((k) => [k.hintergrund, k.titel, k.wirkung, k.preis]),
      ...this.waffenKacheln.flatMap((k) => [k.rahmen, k.bild]),
    ]
    this.verstecken()
  }

  private baueKnopf(line: ShopLine, mitte: number, y: number, breite: number): Knopf {
    const h = BALANCE.shop.ui.buttonHeight
    const hintergrund = this.scene.add.rectangle(mitte, y + h / 2, breite, h, MENU_COLORS.button)
      .setDepth(BALANCE.shop.ui.depthPanel).setInteractive({ useHandCursor: true })
    hintergrund.on('pointerdown', () => { if (this.sichtbar) this.onKauf(line) })
    const titel = this.scene.add.text(mitte, y + BALANCE.shop.ui.buttonTitleY, TITEL[line], {
      fontFamily: 'system-ui', fontSize: `${BALANCE.shop.ui.buttonTitleFontPx}px`, fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(BALANCE.shop.ui.depthText)
    const wirkung = this.scene.add.text(mitte, y + BALANCE.shop.ui.buttonEffectY, '', {
      fontFamily: 'system-ui', fontSize: `${BALANCE.shop.ui.buttonEffectFontPx}px`, color: '#ffffff',
    }).setOrigin(0.5).setDepth(BALANCE.shop.ui.depthText)
    const preis = this.scene.add.text(mitte, y + BALANCE.shop.ui.buttonPriceY, '', {
      fontFamily: 'system-ui', fontSize: `${BALANCE.shop.ui.buttonPriceFontPx}px`, fontStyle: 'bold',
      color: this.farbe(HUD_COLORS.coins),
    }).setOrigin(0.5).setDepth(BALANCE.shop.ui.depthText)
    return { hintergrund, titel, wirkung, preis }
  }

  public zeigen(zustand: ShopZustand): void {
    this.sichtbar = true
    for (const objekt of this.alleObjekte) objekt.setVisible(true).setActive(true)
    this.aktualisieren(zustand)
  }

  public verstecken(): void {
    this.sichtbar = false
    for (const objekt of this.alleObjekte) objekt.setVisible(false).setActive(false)
  }

  public istSichtbar(): boolean {
    return this.sichtbar
  }

  public aktualisieren(zustand: ShopZustand): void {
    this.ueberschrift.setText(`LEVEL ${zustand.level} GESCHAFFT`)
    this.konto.setText(`¢ ${zustand.konto}`)
    this.aktualisiereKnopf('firepower', zustand)
    this.aktualisiereKnopf('team', zustand)
    this.aktualisiereWaffen(zustand)
  }

  /**
   * Die Kachelreihe der waehlbaren Startwaffen. Mit weniger als zwei Waffen bleibt sie
   * ganz aus: Eine Auswahl mit einem einzigen Eintrag ist keine Auswahl, sondern nur
   * eine Kachel, auf die zu druecken nichts bewirkt.
   */
  private aktualisiereWaffen(zustand: ShopZustand): void {
    const zeigen = zustand.waffen.length > 1
    this.waffenTitel.setVisible(zeigen)
    this.ordneKacheln(zeigen ? zustand.waffen.length : 0)
    this.waffenKacheln.forEach((kachel, index) => {
      const eintrag = zeigen ? zustand.waffen[index] : undefined
      const sichtbar = eintrag !== undefined
      kachel.rahmen.setVisible(sichtbar)
      kachel.bild.setVisible(sichtbar)
      kachel.rahmen.removeAllListeners('pointerdown')
      if (eintrag === undefined) {
        kachel.rahmen.disableInteractive()
        return
      }
      const textur = `weapon-${eintrag.key}-hud`
      if (this.scene.textures.exists(textur)) kachel.bild.setTexture(textur)
      const skala = Math.min(
        (this.reihenLayout.kachelBreite - 8) / kachel.bild.width,
        (this.reihenLayout.kachelHoehe - 8) / kachel.bild.height,
        1,
      )
      kachel.bild.setScale(skala).setAlpha(eintrag.aktiv ? 1 : 0.7)
      kachel.rahmen.setStrokeStyle(eintrag.aktiv ? 3 : 2, eintrag.aktiv ? MENU_COLORS.owned : MENU_COLORS.rowStroke, 1)
      kachel.rahmen.setFillStyle(eintrag.aktiv ? MENU_COLORS.ownedFill : MENU_COLORS.shelf, 1)
      kachel.rahmen.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { if (this.sichtbar) this.onWaffenwahl(eintrag.key) })
    })
  }

  /**
   * Die Kacheln an der TATSAECHLICHEN Zahl ausrichten, nicht am Vorrat.
   *
   * Der Vorrat sind vierzehn Plaetze, gewaehlt werden meist zwei bis sechs Waffen. Fest
   * gesetzte Plaetze liessen die Reihe dann linksbuendig stehen und eine leere zweite
   * Reihe Platz belegen - beides sieht aus wie ein Fehler. Jede Reihe wird deshalb fuer
   * sich zentriert, und eine einzeln belegte Reihe rutscht in die Mitte des reservierten
   * Raums.
   */
  private ordneKacheln(anzahl: number): void {
    const l = this.reihenLayout
    const reihenGefuellt = Math.max(1, Math.ceil(anzahl / l.proReihe))
    const versatzY = ((l.reihen - reihenGefuellt) * (l.kachelHoehe + l.luecke)) / 2
    this.waffenTitel.setY(l.titelY + versatzY)
    this.waffenKacheln.forEach((kachel, index) => {
      const reihe = Math.floor(index / l.proReihe)
      const spalte = index % l.proReihe
      const inDieserReihe = Math.min(l.proReihe, Math.max(1, anzahl - reihe * l.proReihe))
      const zeilenBreite = inDieserReihe * l.kachelBreite + (inDieserReihe - 1) * l.luecke
      const x = this.mitte - zeilenBreite / 2 + l.kachelBreite / 2 + spalte * (l.kachelBreite + l.luecke)
      const y = l.ersteReiheY + versatzY + reihe * (l.kachelHoehe + l.luecke)
      kachel.rahmen.setPosition(x, y)
      kachel.bild.setPosition(x, y)
    })
  }

  private aktualisiereKnopf(line: ShopLine, zustand: ShopZustand): void {
    const knopf = this.knoepfe[line]
    const stufen = zustand.stufen[line]
    const preis = getShopPrice(stufen)
    const schonGekauft = zustand.inDieserPause[line] >= BALANCE.shop.maxStepsPerPause
    const ausgebaut = stufen >= getMaxShopSteps()

    if (line === 'firepower') {
      knopf.wirkung.setText(`DMG ${zustand.werte.damage.toFixed(1)}  ·  RATE ${zustand.werte.shotsPerSec.toFixed(1)}  ·  Stufe ${stufen}/${getMaxShopSteps()}`)
    } else {
      knopf.wirkung.setText(`MAX ${Math.round(zustand.werte.hp)}  ·  Stufe ${stufen}/${getMaxShopSteps()}`)
    }

    if (ausgebaut) {
      knopf.preis.setText('AUSGEBAUT')
      this.setzeZustand(knopf, false)
      return
    }
    if (schonGekauft) {
      knopf.preis.setText('NÄCHSTES LEVEL')
      this.setzeZustand(knopf, false)
      return
    }
    const bezahlbar = preis !== undefined && zustand.konto >= preis
    // "NOCH ¢ X" STATT EINES TOTEN KNOPFES (E2, 2026-08-24): Seit eine Stufe rund zwei
    // Level Einkommen kostet, ist sie in der Mehrzahl der Pausen nicht bezahlbar. Ein
    // Kind saehe sonst wiederholt einen Kaufbildschirm, auf dem nichts geht und nichts
    // erklaert wird - das ist kein Rechenfehler, sondern ein Rhythmusfehler. So wird aus
    // der Blockade ein sichtbarer Fortschritt: Die Zahl schrumpft mit jedem Level.
    knopf.preis.setText(bezahlbar || preis === undefined
      ? `¢ ${preis}`
      : `NOCH ¢ ${preis - zustand.konto}`)
    this.setzeZustand(knopf, bezahlbar)
  }

  private setzeZustand(knopf: Knopf, aktiv: boolean): void {
    knopf.hintergrund.setFillStyle(aktiv ? MENU_COLORS.button : MENU_COLORS.disabledButton)
    const alpha = aktiv ? 1 : BALANCE.shop.ui.disabledAlpha
    knopf.titel.setAlpha(alpha)
    knopf.wirkung.setAlpha(alpha)
    knopf.preis.setAlpha(alpha)
  }

  private farbe(wert: number): string {
    return `#${wert.toString(16).padStart(6, '0')}`
  }
}
