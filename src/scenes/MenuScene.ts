import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { WEAPON_LABELS, type WeaponKey } from '../systems/weapons'
import { HUD_COLORS, MENU_COLORS } from '../config/colors'
import { getGameAudio } from '../systems/audio'
import { computeMenuLayout } from '../systems/menuLayout'
import { readSafeAreaInsets, type SafeAreaInsets } from '../systems/safeArea'
import { getMetaPrice, getMetaSteps, getOwnedWeapons, getWeaponUnlockPrice, loadSave, resetSave, writeSave, type SaveData, type ScoreEntry } from '../systems/save'
import { enableSharpText } from '../systems/textSharpness'

export class MenuScene extends Phaser.Scene {
  private save!: SaveData
  private insets!: SafeAreaInsets
  private balanceText!: Phaser.GameObjects.Text
  private readonly shopObjects: Phaser.GameObjects.GameObject[] = []
  private readonly confirmationObjects: Phaser.GameObjects.GameObject[] = []

  public constructor() {
    super('MenuScene')
  }

  public create(): void {
    enableSharpText(this)
    this.save = loadSave()
    this.insets = readSafeAreaInsets(this.game.canvas)
    this.input.setTopOnly(true)
    const width = this.scale.width
    const height = this.scale.height
    const safeWidth = width - this.insets.left - this.insets.right
    const safeLeft = this.insets.left
    const layout = this.layout()

    this.add.image(width / 2, height / 2, 'title').setDisplaySize(width, height)
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, BALANCE.menu.overlayAlpha)
    this.add.text(width / 2, layout.title.top + layout.title.height / 2, 'RUN & GUN', {
      fontFamily: 'system-ui',
      fontSize: '38px',
      fontStyle: 'bold',
      color: this.colorFor(MENU_COLORS.title),
      stroke: '#0b0f18',
      strokeThickness: 6,
    }).setOrigin(0.5)
    this.balanceText = this.add.text(width / 2, layout.balance.top + layout.balance.height / 2, '', {
      fontFamily: 'system-ui',
      fontSize: '23px',
      fontStyle: 'bold',
      color: this.colorFor(HUD_COLORS.coins),
      stroke: '#0b0f18',
      strokeThickness: 4,
    }).setOrigin(0.5)

    this.addButton(safeLeft + safeWidth / 2, layout.playButton.top + layout.playButton.height / 2, safeWidth - 2 * BALANCE.menu.sidePadding, layout.playButton.height, 'SPIELEN', true, () => {
      this.scene.start('GameScene', { einstieg: 'neu' })
    })
    // FORTSETZEN (B3): Nur, wenn ein Run an einer Levelgrenze gesichert ist. Er wird beim
    // Game Over durch den Weiterspiel-Punkt ersetzt - wer stirbt, kommt hier nicht mehr
    // kostenlos hinein, sondern zahlt im Game-Over-Bildschirm.
    if (this.save.run !== undefined) {
      const offenerRun = this.save.run
      this.addButton(
        safeLeft + safeWidth / 2,
        layout.continueButton.top + layout.continueButton.height / 2,
        safeWidth - 2 * BALANCE.menu.sidePadding,
        layout.continueButton.height,
        `FORTSETZEN — LEVEL ${offenerRun.level}`,
        true,
        () => { this.scene.start('GameScene', { einstieg: 'fortsetzen' }) },
      )
    }
    this.addButton(
      safeLeft + safeWidth / 2,
      layout.shopButton.top + layout.shopButton.height / 2,
      safeWidth - 2 * BALANCE.menu.sidePadding,
      layout.shopButton.height,
      'DAUERHAFTE AUFWERTUNG',
      true,
      () => { this.openMetaShop() },
    )
    this.addButton(safeLeft + safeWidth / 2, layout.resetButton.top + layout.resetButton.height / 2, safeWidth - 2 * BALANCE.menu.sidePadding, layout.resetButton.height, 'ZURÜCKSETZEN', true, () => {
      this.openResetConfirmation()
    }, undefined, true)
    this.renderAudioToggle(layout)
    this.renderShop()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.closeResetConfirmation()
    })
  }

  /**
   * Ton-Schalter rechts neben dem Kontostand. Bewusst im Menue und nicht im HUD: Die
   * gesamte Spielflaeche ist Drag-Steuerung, ein Tippziel darin wuerde die Truppe
   * verreissen. Zusaetzlich ist der erste Tipp hier die Nutzergeste, mit der iOS
   * Web Audio ueberhaupt erst freigibt.
   */
  private renderAudioToggle(layout: ReturnType<MenuScene['layout']>): void {
    const audio = getGameAudio(this)
    const width = 78
    const height = 30
    const centerX = this.scale.width - this.insets.right - BALANCE.menu.sidePadding - width / 2
    const centerY = layout.balance.top + layout.balance.height / 2
    const box = this.add.rectangle(centerX, centerY, width, height, MENU_COLORS.button).setOrigin(0.5)
    const label = this.add.text(centerX, centerY, '', {
      fontFamily: 'system-ui', fontSize: '12px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.title),
    }).setOrigin(0.5)
    const paint = (): void => {
      const muted = audio.isMuted()
      label.setText(muted ? 'TON AUS' : 'TON AN')
      box.setFillStyle(muted ? MENU_COLORS.disabledButton : MENU_COLORS.button)
      box.setStrokeStyle(2, muted ? MENU_COLORS.disabledStroke : MENU_COLORS.buttonStroke)
      label.setColor(this.colorFor(muted ? MENU_COLORS.mutedText : MENU_COLORS.title))
    }
    paint()
    box.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      audio.toggleMuted()
      paint()
      // Wer einschaltet, soll sofort hoeren, dass es geht.
      audio.play('crowdUp')
    })
  }

  private renderShop(): void {
    this.shopObjects.splice(0).forEach((object) => object.destroy())
    this.balanceText.setText(`KONTO  ¢ ${this.save.coins}`)
    const safeLeft = this.insets.left
    const safeWidth = this.scale.width - this.insets.left - this.insets.right
    const rowX = safeLeft + BALANCE.menu.sidePadding
    const rowWidth = safeWidth - 2 * BALANCE.menu.sidePadding
    const layout = this.layout()

    this.renderScores(rowX, rowWidth, layout)
  }

  private renderScores(x: number, width: number, layout: ReturnType<MenuScene['layout']>): void {
    const scores = this.save.scores.slice(0, BALANCE.menu.scoresShown)
    const lines = scores.length === 0
      ? ['Noch kein Lauf gewertet.']
      : scores.map((score, index) => this.scoreText(index + 1, score))

    this.track(this.add.rectangle(x, layout.scoresTitle.top, width, layout.scoresTitle.height, MENU_COLORS.row, 0.9).setOrigin(0, 0))
    this.track(this.add.text(x + 12, layout.scoresTitle.top + 4, 'BESTE LÄUFE', {
      fontFamily: 'system-ui', fontSize: '17px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.text),
    }))
    lines.forEach((line, index) => {
      const bounds = layout.scoreLines[index]
      this.track(this.add.rectangle(x, bounds.top, width, bounds.height, MENU_COLORS.row, 0.9).setOrigin(0, 0))
      this.track(this.add.text(x + 12, bounds.top + 2, line, {
        fontFamily: 'system-ui', fontSize: '15px', color: this.colorFor(scores.length === 0 ? MENU_COLORS.mutedText : MENU_COLORS.text),
      }))
    })
  }

  private openResetConfirmation(): void {
    if (this.confirmationObjects.length > 0) return
    const width = this.scale.width
    const height = this.scale.height
    const safeWidth = width - this.insets.left - this.insets.right
    const centerX = this.insets.left + safeWidth / 2
    const centerY = (height + this.insets.top - this.insets.bottom) / 2
    const panelWidth = safeWidth - 2 * BALANCE.menu.sidePadding
    const wall = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65).setDepth(10).setInteractive()
    wall.on('pointerdown', () => undefined)
    const panel = this.add.rectangle(centerX, centerY, panelWidth, 244, MENU_COLORS.row, 1).setDepth(11)
      .setStrokeStyle(2, MENU_COLORS.rowStroke, 1)
    const question = this.add.text(centerX, centerY - 70, 'Alles zurücksetzen?', {
      fontFamily: 'system-ui', fontSize: '23px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.title),
    }).setOrigin(0.5).setDepth(12)
    const explanation = this.add.text(centerX, centerY - 32, 'Münzen, Aufwertungen und Bestenliste\ngehen verloren.', {
      fontFamily: 'system-ui', fontSize: '16px', align: 'center', color: this.colorFor(MENU_COLORS.text),
    }).setOrigin(0.5).setDepth(12)
    this.confirmationObjects.push(wall, panel, question, explanation)
    this.confirmationObjects.push(...this.addButton(centerX, centerY + 36, panelWidth - 32, 42, 'JA, LÖSCHEN', true, () => {
      this.save = resetSave()
      this.closeResetConfirmation()
      this.renderShop()
    }, undefined, false, 12))
    this.confirmationObjects.push(...this.addButton(centerX, centerY + 88, panelWidth - 32, 36, 'ABBRECHEN', true, () => {
      this.closeResetConfirmation()
    }, undefined, true, 12))
  }

  /**
   * Eigene Ansicht fuer die dauerhaften Aufwertungen (E4, 2026-08-24).
   *
   * WARUM EINE EIGENE ANSICHT und nicht Knoepfe im Menue: menuLayout kennt sechs
   * Bloecke, an obere und untere Safe Area verankert, ohne Reserve. Zwei Linien a fuenf
   * Stufen passen dort nicht dazwischen. Die Bauform ist dieselbe wie bei der
   * Ruecksetz-Bestaetigung, die es schon gibt.
   *
   * EIGENE BEZEICHNUNGEN, nicht dieselben wie im Run-Shop: Der heisst FEUERKRAFT und
   * TRUPPE. Hiessen die dauerhaften genauso, waere fuer ein Kind nicht unterscheidbar,
   * was es gerade besitzt - das eine verfaellt am Rundenende, das andere kostet mehrere
   * Abende.
   */
  private openMetaShop(): void {
    if (this.confirmationObjects.length > 0) return
    const width = this.scale.width
    const height = this.scale.height
    const safeWidth = width - this.insets.left - this.insets.right
    const centerX = this.insets.left + safeWidth / 2
    const centerY = (height + this.insets.top - this.insets.bottom) / 2
    const panelWidth = safeWidth - 2 * BALANCE.menu.sidePadding

    const wall = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65).setDepth(10).setInteractive()
    wall.on('pointerdown', () => undefined)
    const panel = this.add.rectangle(centerX, centerY, panelWidth, 430, MENU_COLORS.row, 1).setDepth(11)
      .setStrokeStyle(2, MENU_COLORS.rowStroke, 1)
    const titel = this.add.text(centerX, centerY - 193, 'DAUERHAFTE AUFWERTUNG', {
      fontFamily: 'system-ui', fontSize: '20px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.title),
    }).setOrigin(0.5).setDepth(12)
    const konto = this.add.text(centerX, centerY - 165, `KONTO  ¢ ${this.save.coins}`, {
      fontFamily: 'system-ui', fontSize: '16px', color: this.colorFor(MENU_COLORS.text),
    }).setOrigin(0.5).setDepth(12)
    this.confirmationObjects.push(wall, panel, titel, konto)

    this.addMetaLine('firepower', 'SCHLAGKRAFT', centerX, centerY - 120, panelWidth)
    this.addMetaLine('team', 'MANNSCHAFT', centerX, centerY - 24, panelWidth)
    this.addWeaponLine(centerX, centerY + 72, panelWidth)

    this.confirmationObjects.push(...this.addButton(centerX, centerY + 175, panelWidth - 32, 40, 'ZURÜCK', true, () => {
      this.closeMetaShop()
    }, undefined, true, 12))
  }

  /** Eine Kauflinie: Stufenanzeige, Wirkung, Preis oder Grund, warum es nicht geht. */
  private addMetaLine(line: 'firepower' | 'team', titel: string, centerX: number, y: number, panelWidth: number): void {
    const stufen = getMetaSteps(this.save, line)
    const maximum = BALANCE.meta.prices.length
    const preis = getMetaPrice(stufen)
    const bonus = line === 'firepower' ? BALANCE.meta.firepowerBonusPerStep : BALANCE.meta.teamBonusPerStep
    const wirkung = Math.round(((1 + bonus) ** stufen - 1) * 100)

    const kopf = this.add.text(centerX, y - 18, `${titel}   ${stufen}/${maximum}`, {
      fontFamily: 'system-ui', fontSize: '17px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.title),
    }).setOrigin(0.5).setDepth(12)
    const info = this.add.text(centerX, y + 4, wirkung > 0 ? `derzeit +${wirkung} %` : 'noch nichts gekauft', {
      fontFamily: 'system-ui', fontSize: '14px', color: this.colorFor(MENU_COLORS.text),
    }).setOrigin(0.5).setDepth(12)
    this.confirmationObjects.push(kopf, info)

    // AUSGEBAUT, ZU TEUER oder KAUFBAR - in allen drei Faellen sagt der Knopf, woran es
    // liegt. Ein toter Knopf ohne Erklaerung ist fuer ein Kind eine Sackgasse.
    const bezahlbar = preis !== undefined && this.save.coins >= preis
    const beschriftung = preis === undefined
      ? 'AUSGEBAUT'
      : bezahlbar ? `KAUFEN  ¢ ${preis}` : `NOCH ¢ ${preis - this.save.coins}`
    this.confirmationObjects.push(...this.addButton(
      centerX, y + 34, panelWidth - 40, 34, beschriftung, bezahlbar,
      () => { if (bezahlbar && preis !== undefined) this.kaufeMetaStufe(line, preis) },
      undefined, !bezahlbar, 12,
    ))
  }

  /**
   * Waffen-Freischaltung (Benni 2026-08-25: "Waffen kaufen koennen, die er dann IMMER
   * hat, abgeloest von Run oder neuem Spiel").
   *
   * Es wird immer nur die NAECHSTE Waffe angeboten, nicht alle zwoelf: Eine Liste mit
   * zwoelf Zeilen passt weder in die Ansicht noch in den Kopf eines Siebenjaehrigen.
   * Die Reihenfolge ist die der Staffelung, also von guenstig nach teuer - wer die
   * Schockwelle will, muss sich durch alle davor kaufen.
   */
  private addWeaponLine(centerX: number, y: number, panelWidth: number): void {
    const gekauft = getOwnedWeapons(this.save)
    const naechste = (Object.keys(BALANCE.weapon) as WeaponKey[])
      .filter((key) => getWeaponUnlockPrice(key) !== undefined && !gekauft.includes(key))
      .sort((a, b) => (getWeaponUnlockPrice(a) ?? 0) - (getWeaponUnlockPrice(b) ?? 0))[0]

    const kopf = this.add.text(centerX, y - 18, `WAFFEN   ${gekauft.length}/12 freigeschaltet`, {
      fontFamily: 'system-ui', fontSize: '17px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.title),
    }).setOrigin(0.5).setDepth(12)
    this.confirmationObjects.push(kopf)

    if (naechste === undefined) {
      this.confirmationObjects.push(this.add.text(centerX, y + 4, 'alle freigeschaltet', {
        fontFamily: 'system-ui', fontSize: '14px', color: this.colorFor(MENU_COLORS.text),
      }).setOrigin(0.5).setDepth(12))
      return
    }

    const preis = getWeaponUnlockPrice(naechste) ?? 0
    const bezahlbar = this.save.coins >= preis
    const info = this.add.text(centerX, y + 4, `nächste: ${WEAPON_LABELS[naechste]} — ab Level ${BALANCE.weapon[naechste].minLevel}`, {
      fontFamily: 'system-ui', fontSize: '14px', color: this.colorFor(MENU_COLORS.text),
    }).setOrigin(0.5).setDepth(12)
    this.confirmationObjects.push(info)
    this.confirmationObjects.push(...this.addButton(
      centerX, y + 34, panelWidth - 40, 34,
      bezahlbar ? `FREISCHALTEN  ¢ ${preis}` : `NOCH ¢ ${preis - this.save.coins}`,
      bezahlbar,
      () => { if (bezahlbar) this.kaufeWaffe(naechste, preis) },
      undefined, !bezahlbar, 12,
    ))
  }

  private kaufeWaffe(weapon: WeaponKey, preis: number): void {
    if (this.save.coins < preis || getOwnedWeapons(this.save).includes(weapon)) return
    const aktualisiert: SaveData = {
      ...this.save,
      coins: this.save.coins - preis,
      ownedWeapons: [...getOwnedWeapons(this.save), weapon],
    }
    writeSave(aktualisiert)
    this.save = aktualisiert
    this.closeMetaShop()
    this.renderShop()
    this.openMetaShop()
  }

  private kaufeMetaStufe(line: 'firepower' | 'team', preis: number): void {
    const stufen = getMetaSteps(this.save, line)
    if (stufen >= BALANCE.meta.prices.length || this.save.coins < preis) return
    const aktualisiert: SaveData = {
      ...this.save,
      coins: this.save.coins - preis,
      ...(line === 'firepower' ? { metaFirepowerSteps: stufen + 1 } : { metaTeamSteps: stufen + 1 }),
    }
    writeSave(aktualisiert)
    this.save = aktualisiert
    // Ansicht neu aufbauen, damit Konto, Stufenzahl und Preis sofort stimmen.
    this.closeMetaShop()
    this.renderShop()
    this.openMetaShop()
  }

  private closeMetaShop(): void {
    this.confirmationObjects.splice(0).forEach((object) => object.destroy())
  }

  private closeResetConfirmation(): void {
    this.confirmationObjects.splice(0).forEach((object) => object.destroy())
  }

  private scoreText(place: number, score: ScoreEntry): string {
    return `${place}.  ¢ ${score.coins}   LEVEL ${score.level}   ${this.formatTime(score.timeMs)}`
  }

  private formatTime(timeMs: number): string {
    const totalSeconds = Math.floor(timeMs / 1000)
    return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`
  }

  private addButton(
    // centerX and centerY are the button's midpoint, not its upper-left corner.
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    label: string,
    enabled: boolean,
    onClick: () => void,
    trackedObjects?: Phaser.GameObjects.GameObject[],
    muted = false,
    depth = 0,
  ): Phaser.GameObjects.GameObject[] {
    const buttonColor = muted ? MENU_COLORS.disabledButton : MENU_COLORS.button
    const strokeColor = muted ? MENU_COLORS.disabledStroke : MENU_COLORS.buttonStroke
    const target = this.add.rectangle(centerX, centerY, width, height, enabled ? buttonColor : MENU_COLORS.disabledButton)
      .setStrokeStyle(2, enabled ? strokeColor : MENU_COLORS.disabledStroke)
      .setOrigin(0.5)
      .setDepth(depth)
    const text = this.add.text(centerX, centerY, label, {
      fontFamily: 'system-ui', fontSize: label === 'SPIELEN' ? '24px' : '12px', fontStyle: 'bold',
      color: this.colorFor(enabled ? MENU_COLORS.title : MENU_COLORS.mutedText),
    }).setOrigin(0.5).setDepth(depth + 1)
    if (trackedObjects !== undefined) {
      trackedObjects.push(target, text)
    }
    if (enabled) target.setInteractive({ useHandCursor: true }).on('pointerdown', onClick)
    return [target, text]
  }

  private layout(): ReturnType<typeof computeMenuLayout> {
    return computeMenuLayout(
      this.scale.height,
      this.insets,
      Math.min(BALANCE.menu.scoresShown, Math.max(1, this.save.scores.length)),
      this.save.run !== undefined,
    )
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.shopObjects.push(object)
    return object
  }

  private colorFor(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`
  }
}
