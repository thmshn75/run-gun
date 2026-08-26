import Phaser from 'phaser'
import { MENU_COLORS } from '../config/colors'
import { WEAPON_DESCRIPTIONS, WEAPON_LABELS, type WeaponKey } from './weapons'
import type { SafeAreaInsets } from './safeArea'
import { getWeaponStarText } from './weaponStars'

// 390 statt 430: Die Beschreibungen sind ein bis zwei Zeilen lang, darunter stand ein
// leeres Drittel. Der ZURUECK-Knopf endet damit 10 px ueber der Panelkante.
const PANEL_HOEHE = 390

/**
 * Die grosse Waffenansicht im TESTGELAENDE (Thomas 2026-08-26: "bei waffe wechseln sieht
 * man zwar die icons klein, aber man weiss nicht wirklich welche waffe es ist - hier
 * bitte das vergroessern und die beschreibung zur waffe aus dem Shop uebernehmen und
 * dort dann zwei button in der vergroesserung (nur im test) einbauen, waehlen oder
 * zurueck, damit man sich die waffen auch ansehen kann").
 *
 * WARUM EIGEN UND NICHT DIE DES LADENS: Die Ladenansicht im Menue traegt Preis, Besitz,
 * Aufruestungsstufen und zwei Kaufwege. Nichts davon gilt hier - im Testgelaende ist
 * jede Waffe frei waehlbar und kostet nichts. Geteilt wird das, was wirklich dasselbe
 * ist: Bild, Beschreibung und die Sterne-Rechnung (getWeaponStars).
 *
 * SIE LIEGT UEBER DER LEVELPAUSE (Tiefe 130 gegen deren 121), weil sie aus deren
 * Kacheln heraus geoeffnet wird und ZURUECK wieder dorthin fuehrt.
 */
export class WeaponDetailPanel {
  private readonly scene: Phaser.Scene
  private readonly objekte: Phaser.GameObjects.GameObject[] = []
  private offeneWaffe: WeaponKey | undefined

  public constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  public istOffen(): boolean {
    return this.offeneWaffe !== undefined
  }

  public getOffeneWaffe(): WeaponKey | undefined {
    return this.offeneWaffe
  }

  /**
   * Aufbauen und zeigen. `aufwertung` ist der Faktor der dauerhaft gekauften Stufen -
   * er gilt auch im Testgelaende, weil dort die ECHTE Waffe ausprobiert wird.
   */
  public zeigen(
    weapon: WeaponKey,
    insets: SafeAreaInsets,
    aufwertung: number,
    onWaehlen: () => void,
    onZurueck: () => void,
  ): void {
    this.verstecken()
    this.offeneWaffe = weapon
    const breite = this.scene.scale.width
    const hoehe = this.scene.scale.height
    const safeBreite = breite - insets.left - insets.right
    const mitteX = insets.left + safeBreite / 2
    // Zwischen den Safe-Area-Raendern zentriert, nicht auf der Bildmitte: Sonst waendert
    // das Panel auf dem iPhone nach unten, wo der Zurueck-Knopf am engsten sitzt.
    const mitteY = (hoehe + insets.top - insets.bottom) / 2
    const panelBreite = safeBreite - 16

    // Die Wand faengt jeden Tipp daneben ab - ohne sie ginge er an die Kacheln darunter.
    const wand = this.scene.add.rectangle(breite / 2, hoehe / 2, breite, hoehe, 0x000000, 0.86)
      .setDepth(130).setInteractive()
    wand.on('pointerdown', () => onZurueck())
    const panel = this.scene.add.rectangle(mitteX, mitteY, panelBreite, PANEL_HOEHE, MENU_COLORS.row, 1)
      .setDepth(131).setStrokeStyle(2, MENU_COLORS.rowStroke, 1)
    // Der Tipp auf das Panel darf NICHT durchschlagen und die Ansicht schliessen.
    panel.setInteractive().on('pointerdown', () => undefined)
    this.objekte.push(wand, panel)

    this.objekte.push(this.scene.add.text(mitteX, mitteY - 160, WEAPON_LABELS[weapon], {
      fontFamily: 'system-ui', fontSize: '26px', fontStyle: 'bold', color: this.farbe(MENU_COLORS.title),
    }).setOrigin(0.5).setDepth(132))

    // GROSSES BILD: das Wandtor-Bild (150 x 44), auf die Panelbreite gezogen - dasselbe,
    // das man im Spiel im Tor sieht, und rund viermal so gross wie das HUD-Symbol.
    const bild = this.scene.add.image(mitteX, mitteY - 95, `weapon-${weapon}-gate`).setDepth(132)
    bild.setScale(Math.min((panelBreite - 40) / bild.width, 3))
    this.objekte.push(bild)

    this.objekte.push(this.scene.add.text(mitteX, mitteY - 40, `STÄRKE  ${getWeaponStarText(weapon, aufwertung)}`, {
      fontFamily: 'system-ui', fontSize: '17px', fontStyle: 'bold', color: this.farbe(MENU_COLORS.priceText),
    }).setOrigin(0.5).setDepth(132))

    this.objekte.push(this.scene.add.text(mitteX, mitteY - 4, WEAPON_DESCRIPTIONS[weapon], {
      fontFamily: 'system-ui', fontSize: '14px', color: this.farbe(MENU_COLORS.text),
      align: 'center', wordWrap: { width: panelBreite - 48 },
    }).setOrigin(0.5, 0).setDepth(132))

    this.knopf(mitteX, mitteY + 105, panelBreite - 48, 52, 'DAMIT SPIELEN', MENU_COLORS.button, MENU_COLORS.buttonStroke, onWaehlen)
    this.knopf(mitteX, mitteY + 165, panelBreite - 48, 40, 'ZURÜCK', MENU_COLORS.disabledButton, MENU_COLORS.disabledStroke, onZurueck)
  }

  public verstecken(): void {
    this.objekte.splice(0).forEach((objekt) => objekt.destroy())
    this.offeneWaffe = undefined
  }

  private knopf(
    x: number, y: number, breite: number, hoehe: number, text: string,
    fuellung: number, rand: number, onTipp: () => void,
  ): void {
    const flaeche = this.scene.add.rectangle(x, y, breite, hoehe, fuellung)
      .setStrokeStyle(2, rand).setDepth(132).setInteractive({ useHandCursor: true })
    flaeche.on('pointerdown', (
      _zeiger: unknown, _x: number, _y: number, ereignis: Phaser.Types.Input.EventData,
    ) => {
      ereignis.stopPropagation()
      onTipp()
    })
    this.objekte.push(flaeche, this.scene.add.text(x, y, text, {
      fontFamily: 'system-ui', fontSize: '18px', fontStyle: 'bold', color: this.farbe(MENU_COLORS.title),
    }).setOrigin(0.5).setDepth(133))
  }

  private farbe(wert: number): string {
    return `#${wert.toString(16).padStart(6, '0')}`
  }
}
