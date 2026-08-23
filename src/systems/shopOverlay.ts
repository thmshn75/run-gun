import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS, MENU_COLORS } from '../config/colors'
import { getMaxShopSteps, getShopPrice, type ShopLine } from './upgrades'

export interface ShopZustand {
  readonly level: number
  readonly konto: number
  readonly stufen: { readonly firepower: number; readonly team: number }
  /** In dieser Pause bereits gekauft - hoechstens eine Stufe je Knopf. */
  readonly inDieserPause: { readonly firepower: number; readonly team: number }
  readonly werte: { readonly damage: number; readonly shotsPerSec: number; readonly hp: number }
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
  private readonly hintergrund: Phaser.GameObjects.Rectangle
  private readonly ueberschrift: Phaser.GameObjects.Text
  private readonly konto: Phaser.GameObjects.Text
  private readonly knoepfe: Record<ShopLine, Knopf>
  private readonly weiter: Phaser.GameObjects.Rectangle
  private readonly weiterText: Phaser.GameObjects.Text
  private readonly alleObjekte: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text>
  private sichtbar = false

  public constructor(
    scene: Phaser.Scene,
    insets: { top: number; bottom: number; left: number; right: number },
    onKauf: (line: ShopLine) => void,
    onWeiter: () => void,
  ) {
    this.scene = scene
    this.onKauf = onKauf
    this.onWeiter = onWeiter
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

    this.alleObjekte = [
      this.hintergrund, this.ueberschrift, this.konto, this.weiter, this.weiterText,
      ...Object.values(this.knoepfe).flatMap((k) => [k.hintergrund, k.titel, k.wirkung, k.preis]),
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
    knopf.preis.setText(`¢ ${preis}`)
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
