import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { WEAPON_DESCRIPTIONS, WEAPON_LABELS, type WeaponKey } from '../systems/weapons'
import { HUD_COLORS, MENU_COLORS } from '../config/colors'
import { getGameAudio } from '../systems/audio'
import { computeMenuLayout } from '../systems/menuLayout'
import { readSafeAreaInsets, type SafeAreaInsets } from '../systems/safeArea'
import { getMetaPrice, getMetaSteps, getOwnedWeapons, getWeaponStepPrice, getWeaponSteps, getWeaponUnlockPrice, kaufeWaffenStufe, kaufeWeiterspielen, loadSave, resetSave, writeSave, type RunSnapshot, type SaveData, type ScoreEntry } from '../systems/save'
import { getContinuePrice } from '../systems/upgrades'
import { getStartWeaponChoices } from '../systems/weaponChoices'
import { getWeaponStarText } from '../systems/weaponStars'
import { enableSharpText } from '../systems/textSharpness'

export class MenuScene extends Phaser.Scene {
  private save!: SaveData
  private insets!: SafeAreaInsets
  private balanceText!: Phaser.GameObjects.Text
  private readonly shopObjects: Phaser.GameObjects.GameObject[] = []
  private readonly confirmationObjects: Phaser.GameObjects.GameObject[] = []
  /** Die Waffen-Detailansicht liegt UEBER dem Laden und wird getrennt aufgeraeumt. */
  private readonly detailObjects: Phaser.GameObjects.GameObject[] = []
  /** Vorwahl im Fenster vor dem FORTSETZEN - erst LOS GEHT'S schreibt sie in den Stand. */
  private startwaffe: WeaponKey | undefined

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
    // DERSELBE KNOPF FUER ZWEI FAELLE (2026-08-25). Ein offener Run ist entweder an der
    // Levelgrenze gesichert - dann geht es kostenlos weiter - oder er ist GESCHEITERT,
    // dann kostet der Wiedereinstieg dasselbe wie im Game-Over-Bildschirm.
    //
    // Vorher stand hier in beiden Faellen FORTSETZEN. Beim gescheiterten Run startete das
    // Spiel mit der Truppengroesse aus dem Todeszeitpunkt, also null Figuren: Der Knopf
    // fuehrte schnurstracks zurueck ins Game Over (Thomas 2026-08-25).
    if (this.save.run !== undefined) {
      const offenerRun = this.save.run
      const gestorben = offenerRun.gestorben === true
      const preis = gestorben ? getContinuePrice(offenerRun.level, offenerRun.continuesUsed) : 0
      const bezahlbar = !gestorben || this.save.coins >= preis
      const beschriftung = !gestorben
        ? `FORTSETZEN — LEVEL ${offenerRun.level}`
        : bezahlbar
          ? `WEITERSPIELEN — LEVEL ${offenerRun.level}  ·  ¢ ${preis}`
          : `WEITERSPIELEN — LEVEL ${offenerRun.level}  ·  NOCH ¢ ${preis - this.save.coins}`
      this.addButton(
        safeLeft + safeWidth / 2,
        layout.continueButton.top + layout.continueButton.height / 2,
        safeWidth - 2 * BALANCE.menu.sidePadding,
        layout.continueButton.height,
        beschriftung,
        bezahlbar,
        () => { this.fortsetzen(offenerRun) },
      )
    }
    this.addButton(
      safeLeft + safeWidth / 2,
      layout.shopButton.top + layout.shopButton.height / 2,
      safeWidth - 2 * BALANCE.menu.sidePadding,
      layout.shopButton.height,
      'SHOP',
      true,
      () => { this.openShop() },
    )
    // TESTGELAENDE (Benni ueber Thomas 2026-08-25: "ob es sowas wie ein testlevel geben
    // kann, wo man alle waffen einzeln ausprobieren kann"). Es zaehlt fuer nichts: kein
    // Spielstand, keine Bestenliste, kein Sterben.
    this.addButton(
      safeLeft + safeWidth / 2,
      layout.testButton.top + layout.testButton.height / 2,
      safeWidth - 2 * BALANCE.menu.sidePadding,
      layout.testButton.height,
      'TESTGELÄNDE — ALLE WAFFEN AUSPROBIEREN',
      true,
      () => { this.scene.start('GameScene', { einstieg: 'test' }) },
      undefined, true,
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

  /**
   * FORTSETZEN MIT WAFFENWAHL (Thomas 2026-08-25: "wenn ich speicher und bevor ich
   * weiterspiele, will ich auch waehlen koennen").
   *
   * Bis dahin ging es nur in der Levelpause. Wer den Lauf beendet, im Laden eine Waffe
   * kauft und dann fortsetzt, startete trotzdem mit der alten - die naechste Gelegenheit
   * kam erst ein Level spaeter.
   *
   * Das Fenster geht nur auf, wenn es mehr als eine Moeglichkeit gibt. Wer noch nichts
   * gekauft hat, hat genau eine; dann waere es ein Extratipp ohne Inhalt.
   */
  private fortsetzen(run: RunSnapshot): void {
    const wahl = getStartWeaponChoices(run.weapon, run.level, getOwnedWeapons(this.save))
    if (wahl.length < 2) {
      // Ohne Wahl trotzdem ueber denselben Weg: Dort haengt die Bezahlung des
      // gescheiterten Runs dran, die hier sonst uebersprungen wuerde.
      this.startwaffe = undefined
      this.starteMitStartwaffe(run)
      return
    }
    this.startwaffe = wahl.find((weapon) => weapon === run.weapon) ?? wahl[0]
    this.zeigeStartwaffenwahl(run, wahl)
  }

  /**
   * Das Wahlfenster. Gebaut wie der Laden und die Ruecksetz-Frage: Wand, Panel, Kacheln.
   *
   * Die Wahl wird NICHT sofort gespeichert, anders als in der Levelpause. Dort laeuft ein
   * Run, hier steht man davor - wer ZURUECK drueckt, soll seinen gesicherten Stand
   * unveraendert vorfinden.
   */
  private zeigeStartwaffenwahl(run: RunSnapshot, wahl: readonly WeaponKey[]): void {
    const width = this.scale.width
    const height = this.scale.height
    const safeWidth = width - this.insets.left - this.insets.right
    const centerX = this.insets.left + safeWidth / 2
    const centerY = (height + this.insets.top - this.insets.bottom) / 2
    const panelWidth = safeWidth - 2 * BALANCE.menu.sidePadding
    const spalten = 3
    const abstand = 8
    const kachelBreite = (panelWidth - 32 - abstand * (spalten - 1)) / spalten
    const kachelHoehe = 66
    const reihen = Math.ceil(wahl.length / spalten)
    // Kopf 76 + Regal + Luft 8 + LOS 44 + Luft 10 + ZURUECK 36 + Rand 18.
    const panelHeight = 76 + reihen * (kachelHoehe + abstand) + 116
    const oben = centerY - panelHeight / 2
    const linkeKante = centerX - (panelWidth - 32) / 2

    const wall = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65).setDepth(10).setInteractive()
    wall.on('pointerdown', () => undefined)
    const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, MENU_COLORS.row, 1).setDepth(11)
      .setStrokeStyle(2, MENU_COLORS.rowStroke, 1)
    const titel = this.add.text(centerX, oben + 26, 'STARTWAFFE', {
      fontFamily: 'system-ui', fontSize: '24px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.title),
    }).setOrigin(0.5).setDepth(12)
    const frage = this.add.text(centerX, oben + 54, `Womit gehst du in Level ${run.level}?`, {
      fontFamily: 'system-ui', fontSize: '14px', color: this.colorFor(MENU_COLORS.text),
    }).setOrigin(0.5).setDepth(12)
    this.confirmationObjects.push(wall, panel, titel, frage)

    wahl.forEach((weapon, index) => {
      const spalte = index % spalten
      const reihe = Math.floor(index / spalten)
      this.addStartwaffenKachel(
        weapon, run, wahl,
        linkeKante + kachelBreite / 2 + spalte * (kachelBreite + abstand),
        oben + 76 + kachelHoehe / 2 + reihe * (kachelHoehe + abstand),
        kachelBreite, kachelHoehe,
      )
    })

    this.confirmationObjects.push(...this.addButton(
      centerX, oben + panelHeight - 74, panelWidth - 32, 44, "LOS GEHT'S", true,
      () => { this.starteMitStartwaffe(run) }, undefined, false, 12,
    ))
    this.confirmationObjects.push(...this.addButton(
      centerX, oben + panelHeight - 28, panelWidth - 32, 36, 'ZURÜCK', true,
      () => { this.closeShop() }, undefined, true, 12,
    ))
  }

  /**
   * Eine Kachel im Wahlfenster. Kein Preis - hier ist nichts zu kaufen, alles ist schon
   * bezahlt. Der gruene Rahmen sagt, womit gestartet wird.
   */
  private addStartwaffenKachel(
    weapon: WeaponKey, run: RunSnapshot, wahl: readonly WeaponKey[],
    x: number, y: number, breite: number, hoehe: number,
  ): void {
    const gewaehlt = weapon === this.startwaffe
    const kachel = this.add.rectangle(x, y, breite, hoehe, gewaehlt ? MENU_COLORS.ownedFill : MENU_COLORS.shelf, 1)
      .setStrokeStyle(gewaehlt ? 3 : 2, gewaehlt ? MENU_COLORS.owned : MENU_COLORS.buttonStroke, 1)
      .setOrigin(0.5).setDepth(12)
    const name = this.add.text(x, y - 22, WEAPON_LABELS[weapon], {
      fontFamily: 'system-ui', fontSize: '9px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.text),
    }).setOrigin(0.5).setDepth(13)
    const bild = this.add.image(x, y - 4, `weapon-${weapon}-hud`).setDepth(13)
    bild.setScale(Math.min((breite - 16) / bild.width, 1.1)).setAlpha(gewaehlt ? 1 : 0.75)
    const status = this.add.text(x, y + 20, gewaehlt ? '✓ START' : 'WÄHLEN', {
      fontFamily: 'system-ui', fontSize: '11px', fontStyle: 'bold',
      color: this.colorFor(gewaehlt ? MENU_COLORS.owned : MENU_COLORS.mutedText),
    }).setOrigin(0.5).setDepth(13)
    this.confirmationObjects.push(kachel, name, bild, status)

    kachel.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.startwaffe = weapon
      // Neu zeichnen statt einzelne Kacheln umfaerben: Es haengen vier Objekte je Kachel
      // daran, und der Laden macht es beim Kauf genauso.
      this.closeShop()
      this.zeigeStartwaffenwahl(run, wahl)
    })
  }

  /**
   * Die Wahl in den gesicherten Run schreiben und starten. GameScene liest die Waffe
   * beim Fortsetzen aus genau diesem Feld - es braucht dort keine Sonderbehandlung.
   */
  private starteMitStartwaffe(run: RunSnapshot): void {
    const gestorben = run.gestorben === true
    let stand: SaveData = this.save
    if (this.startwaffe !== undefined && this.startwaffe !== run.weapon) {
      stand = { ...stand, run: { ...run, weapon: this.startwaffe } }
    }
    if (gestorben) {
      // Bezahlen und den Todes-Marker entfernen - dieselbe Funktion wie im
      // Game-Over-Bildschirm. Reicht das Konto nicht, passiert nichts; der Knopf war
      // dann ohnehin nicht antippbar.
      const bezahlt = kaufeWeiterspielen(stand)
      if (bezahlt === undefined) return
      stand = bezahlt
    }
    if (stand !== this.save) {
      writeSave(stand)
      this.save = stand
    }
    this.closeShop()
    this.scene.start('GameScene', { einstieg: gestorben ? 'weiterspielen' : 'fortsetzen' })
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
      resetSave()
      this.closeResetConfirmation()
      // GANZE SZENE NEU statt nur den Kontostand (Fehler vom 2026-08-25, Thomas: "wenn
      // ich auf zuruecksetzen gehe, steht dann darunter immer noch weiter in Level X").
      // Der FORTSETZEN-Knopf entsteht in create() und blieb mit der alten Levelnummer
      // stehen; geklickt startete er korrekt bei Level 1, die Beschriftung log also.
      // Auch das LAYOUT haengt daran - computeMenuLayout rechnet mit einem Knopf weniger,
      // wenn kein Run gesichert ist, also verschieben sich alle anderen mit.
      this.scene.restart()
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
  /**
   * DER LADEN (Thomas 2026-08-25: "es soll auch shop heissen und nicht dauerhafte
   * aufwertung und dann auch wie ein shop seite aussehen, wie ein laden in dem man
   * aussuchen und einkaufen kann - auch fuer die aufwertungen so").
   *
   * Zwei Regale untereinander: oben die beiden Aufwertungen, unten alle zwoelf Waffen als
   * Kacheln mit ihrem eigenen Bild. Vorher stand hier eine einzige Textzeile, die immer
   * nur die naechste Waffe anbot - aussuchen konnte man nichts.
   */
  private openShop(): void {
    if (this.confirmationObjects.length > 0) return
    const width = this.scale.width
    const height = this.scale.height
    const safeWidth = width - this.insets.left - this.insets.right
    const centerX = this.insets.left + safeWidth / 2
    const centerY = (height + this.insets.top - this.insets.bottom) / 2
    const panelWidth = safeWidth - 2 * BALANCE.menu.sidePadding
    const panelHeight = Math.min(700, height - this.insets.top - this.insets.bottom - 24)
    const oben = centerY - panelHeight / 2

    const wall = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65).setDepth(10).setInteractive()
    wall.on('pointerdown', () => undefined)
    const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, MENU_COLORS.row, 1).setDepth(11)
      .setStrokeStyle(2, MENU_COLORS.rowStroke, 1)
    const titel = this.add.text(centerX, oben + 26, 'SHOP', {
      fontFamily: 'system-ui', fontSize: '24px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.title),
    }).setOrigin(0.5).setDepth(12)
    const konto = this.add.text(centerX, oben + 52, `KONTO  ¢ ${this.save.coins}`, {
      fontFamily: 'system-ui', fontSize: '16px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.priceText),
    }).setOrigin(0.5).setDepth(12)
    this.confirmationObjects.push(wall, panel, titel, konto)

    // REGAL 1 - Aufwertungen
    this.addRegalKopf('AUFWERTUNGEN', centerX, oben + 82, panelWidth)
    this.addMetaLine('firepower', 'SCHLAGKRAFT', centerX, oben + 128, panelWidth)
    this.addMetaLine('team', 'MANNSCHAFT', centerX, oben + 208, panelWidth)

    // REGAL 2 - Waffen
    this.addRegalKopf('WAFFEN', centerX, oben + 274, panelWidth)
    this.addWeaponGrid(centerX, oben + 296, panelWidth)

    this.confirmationObjects.push(...this.addButton(centerX, oben + panelHeight - 30, panelWidth - 32, 40, 'ZURÜCK', true, () => {
      this.closeShop()
    }, undefined, true, 12))
  }

  /** Regalbrett mit Beschriftung - trennt die beiden Abteilungen des Ladens. */
  private addRegalKopf(titel: string, centerX: number, y: number, panelWidth: number): void {
    const brett = this.add.rectangle(centerX, y + 12, panelWidth - 24, 2, MENU_COLORS.shelfEdge, 1)
      .setOrigin(0.5).setDepth(12)
    const text = this.add.text(centerX - panelWidth / 2 + 16, y, titel, {
      fontFamily: 'system-ui', fontSize: '13px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.mutedText),
    }).setOrigin(0, 0.5).setDepth(12)
    this.confirmationObjects.push(brett, text)
  }

  /**
   * Ein Regalplatz im Laden: Name, Stufenanzeige als Punktreihe, Wirkung, Kaufknopf.
   * Dieselbe Optik wie die Waffenkacheln, damit beide Abteilungen als EIN Laden lesbar
   * sind (Thomas 2026-08-25: "auch fuer die aufwertungen so").
   */
  private addMetaLine(line: 'firepower' | 'team', titel: string, centerX: number, y: number, panelWidth: number): void {
    const stufen = getMetaSteps(this.save, line)
    const maximum = BALANCE.meta.prices.length
    const preis = getMetaPrice(stufen)
    const bonus = line === 'firepower' ? BALANCE.meta.firepowerBonusPerStep : BALANCE.meta.teamBonusPerStep
    const wirkung = Math.round(((1 + bonus) ** stufen - 1) * 100)
    const bezahlbar = preis !== undefined && this.save.coins >= preis
    const breite = panelWidth - 32
    const linkeKante = centerX - breite / 2

    const kachel = this.add.rectangle(centerX, y, breite, 66, MENU_COLORS.shelf, 1)
      .setStrokeStyle(2, preis === undefined ? MENU_COLORS.owned : bezahlbar ? MENU_COLORS.buttonStroke : MENU_COLORS.disabledStroke, 1)
      .setOrigin(0.5).setDepth(12)
    // Antippen oeffnet die Detailansicht - wie bei den Waffen (Thomas 2026-08-25:
    // "dasselbe fuer schlagkraft und mannschaft").
    kachel.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.zeigeAufwertungDetail(line) })
    const kopf = this.add.text(linkeKante + 12, y - 20, titel, {
      fontFamily: 'system-ui', fontSize: '15px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.title),
    }).setOrigin(0, 0.5).setDepth(13)
    const info = this.add.text(linkeKante + 12, y + 2, wirkung > 0 ? `derzeit +${wirkung} %` : 'noch nichts gekauft', {
      fontFamily: 'system-ui', fontSize: '12px', color: this.colorFor(MENU_COLORS.text),
    }).setOrigin(0, 0.5).setDepth(13)
    this.confirmationObjects.push(kachel, kopf, info)

    // Stufen als Punktreihe statt "0/5": Ein Kind sieht auf einen Blick, wie viel noch
    // fehlt, ohne zu rechnen.
    for (let i = 0; i < maximum; i += 1) {
      this.confirmationObjects.push(this.add.rectangle(
        linkeKante + 14 + i * 14, y + 20, 9, 9,
        i < stufen ? MENU_COLORS.levelFilled : MENU_COLORS.levelEmpty, 1,
      ).setOrigin(0.5).setDepth(13))
    }

    // AUSGEBAUT, ZU TEUER oder KAUFBAR - in allen drei Faellen sagt der Knopf, woran es
    // liegt. Ein toter Knopf ohne Erklaerung ist fuer ein Kind eine Sackgasse.
    const beschriftung = preis === undefined
      ? '✓ AUSGEBAUT'
      : bezahlbar ? `KAUFEN  ¢ ${preis}` : `NOCH ¢ ${preis - this.save.coins}`
    this.confirmationObjects.push(...this.addButton(
      centerX + breite / 2 - 62, y, 112, 34, beschriftung, bezahlbar,
      () => { if (bezahlbar && preis !== undefined) this.kaufeMetaStufe(line, preis) },
      undefined, !bezahlbar, 13,
    ))
  }

  /**
   * DAS WAFFENREGAL - alle zwoelf auf einen Blick, mit Bild und Preis.
   *
   * Vorher stand hier eine Textzeile, die immer nur die naechste Waffe anbot: Wer die
   * Schockwelle wollte, musste sich durch alle davor kaufen und sah nie, was es
   * ueberhaupt gibt. Thomas 2026-08-25: "wo er alle waffen immer kaufen kann".
   *
   * Sortiert nach Preis, nicht nach Freischaltlevel: Die Schrotflinte ist gemessen
   * minimal schwaecher als das Sturmgewehr und deshalb billiger, obwohl sie spaeter
   * erscheint - nach Level sortiert saehe das wie ein Fehler aus.
   */
  private addWeaponGrid(centerX: number, y: number, panelWidth: number): void {
    const gekauft = getOwnedWeapons(this.save)
    const waffen = (Object.keys(BALANCE.weapon) as WeaponKey[])
      .filter((key) => getWeaponUnlockPrice(key) !== undefined)
      .sort((a, b) => (getWeaponUnlockPrice(a) ?? 0) - (getWeaponUnlockPrice(b) ?? 0))

    const spalten = 3
    const abstand = 8
    const breite = (panelWidth - 32 - abstand * (spalten - 1)) / spalten
    const hoehe = 66
    const linkeKante = centerX - (panelWidth - 32) / 2

    waffen.forEach((weapon, index) => {
      const spalte = index % spalten
      const reihe = Math.floor(index / spalten)
      this.addWeaponTile(
        weapon,
        linkeKante + breite / 2 + spalte * (breite + abstand),
        y + hoehe / 2 + reihe * (hoehe + abstand),
        breite, hoehe, gekauft.includes(weapon),
      )
    })
  }

  /**
   * Eine Kachel im Regal. Drei Zustaende, und jeder sagt ohne Text, woran man ist:
   * gekauft (gruener Rahmen, Haken), bezahlbar (heller Rahmen, Preis in Gold),
   * zu teuer (gedimmt, Preis grau). Ein toter Knopf ohne Erklaerung ist fuer ein Kind
   * eine Sackgasse - dieselbe Regel wie bei den Aufwertungen.
   */
  private addWeaponTile(
    weapon: WeaponKey, x: number, y: number, breite: number, hoehe: number, gekauft: boolean,
  ): void {
    const preis = getWeaponUnlockPrice(weapon) ?? 0
    const bezahlbar = !gekauft && this.save.coins >= preis
    const rahmen = gekauft ? MENU_COLORS.owned : bezahlbar ? MENU_COLORS.buttonStroke : MENU_COLORS.disabledStroke
    const fuellung = gekauft ? MENU_COLORS.ownedFill : MENU_COLORS.shelf

    const kachel = this.add.rectangle(x, y, breite, hoehe, fuellung, 1)
      .setStrokeStyle(2, rahmen, 1).setOrigin(0.5).setDepth(12)
    // Das HUD-Bild der Waffe, auf Kachelbreite eingepasst. Es ist 72 x 20 - dieselbe
    // Grafik, die im Spiel oben in der Ecke steht, damit die Wiedererkennung stimmt.
    const name = this.add.text(x, y - 22, WEAPON_LABELS[weapon], {
      fontFamily: 'system-ui', fontSize: '9px', fontStyle: 'bold',
      color: this.colorFor(gekauft || bezahlbar ? MENU_COLORS.text : MENU_COLORS.mutedText),
    }).setOrigin(0.5).setDepth(13)
    const bild = this.add.image(x, y - 4, `weapon-${weapon}-hud`).setDepth(13)
    const skala = Math.min((breite - 16) / bild.width, 1.1)
    bild.setScale(skala).setAlpha(gekauft || bezahlbar ? 1 : 0.45)
    // Die Kachel zeigt bei gekauften Waffen die Ausbaustufe: Ohne sie muesste man jede
    // Waffe einzeln oeffnen, um zu sehen, wo noch etwas fehlt.
    const stufen = getWeaponSteps(this.save, weapon)
    const beschriftung = gekauft
      ? (stufen > 0 ? `✓ STUFE ${stufen}/${BALANCE.meta.weaponSteps}` : '✓ GEKAUFT')
      : `¢ ${preis}`
    const text = this.add.text(x, y + 20, beschriftung, {
      fontFamily: 'system-ui', fontSize: '11px', fontStyle: 'bold',
      color: this.colorFor(gekauft ? MENU_COLORS.owned : bezahlbar ? MENU_COLORS.priceText : MENU_COLORS.mutedText),
    }).setOrigin(0.5).setDepth(13)
    this.confirmationObjects.push(kachel, name, bild, text)

    // JEDE Kachel ist antippbar, auch die zu teure (Thomas 2026-08-25: "auch wenn die
    // waffe noch nicht gekauft ist soll man sie klicken koennen"). Gekauft wird erst in
    // der Detailansicht - so ist ein Fehlkauf durch Danebentippen ausgeschlossen.
    kachel.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.zeigeWaffenDetail(weapon) })
  }

  /**
   * DIE DETAILANSICHT (Thomas 2026-08-25: "in einem groesseren bild (bildschirmbreite)
   * ansehen koennen" und "irgendwo muessen wir klar machen, wann die waffe dann
   * erscheint, wenn man sie gekauft hat").
   *
   * Sie legt sich UEBER den Laden statt ihn zu ersetzen: Zurueck landet man wieder im
   * Regal an derselben Stelle. Das Bild ist das Wandtor-Bild, nicht das kleine aus der
   * HUD-Ecke - es ist gut viermal so gross und zeigt die Waffe so, wie man sie im Spiel
   * im Tor sieht.
   */
  private zeigeWaffenDetail(weapon: WeaponKey): void {
    const width = this.scale.width
    const height = this.scale.height
    const safeWidth = width - this.insets.left - this.insets.right
    const centerX = this.insets.left + safeWidth / 2
    const centerY = (height + this.insets.top - this.insets.bottom) / 2
    const panelWidth = safeWidth - 8
    const preis = getWeaponUnlockPrice(weapon) ?? 0
    const gekauft = getOwnedWeapons(this.save).includes(weapon)
    const bezahlbar = !gekauft && this.save.coins >= preis
    const minLevel = (BALANCE.weapon[weapon] as { minLevel: number }).minLevel
    const abLevel = BALANCE.weapon.ownedFromLevel

    const wall = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.82)
      .setDepth(20).setInteractive()
    wall.on('pointerdown', () => this.schliesseWaffenDetail())
    // Eine gekaufte Waffe traegt zusaetzlich die Aufruestung (Stufenreihe und Knopf) -
    // das Panel waechst dafuer nach unten. Gerechnet, nicht geraten: Der ZURUECK-Knopf
    // sitzt bei +222 und ist 36 hoch, endet also 10 px ueber der Panelkante bei +250.
    const panelHoehe = gekauft ? 500 : 430
    const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHoehe, MENU_COLORS.row, 1)
      .setDepth(21).setStrokeStyle(2, gekauft ? MENU_COLORS.owned : MENU_COLORS.rowStroke, 1)
    // Der Klick auf das Panel darf NICHT durchschlagen und die Ansicht schliessen.
    panel.setInteractive().on('pointerdown', () => undefined)
    const name = this.add.text(centerX, centerY - panelHoehe / 2 + 30, WEAPON_LABELS[weapon], {
      fontFamily: 'system-ui', fontSize: '26px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.title),
    }).setOrigin(0.5).setDepth(22)
    this.detailObjects.push(wall, panel, name)

    // GROSSES BILD: das Wandtor-Bild (150 x 44) auf die Panelbreite gezogen.
    const bild = this.add.image(centerX, centerY - 110, `weapon-${weapon}-gate`).setDepth(22)
    bild.setScale(Math.min((panelWidth - 40) / bild.width, 3))
    this.detailObjects.push(bild)

    // STAERKE als Sterne aus dem gemessenen Wert - fuenf Sterne hat die staerkste Waffe.
    // Die Rechnung steht in weaponDetail.ts, weil die Ansicht im Testgelaende dieselbe
    // Waffe zeigt: zwei Rechnungen waeren zwei Gelegenheiten fuer verschiedene Sterne.
    const stufen = getWeaponSteps(this.save, weapon)
    const aufwertung = (1 + BALANCE.meta.weaponStepFirepowerBonus) ** stufen
    const zusatz = stufen > 0 ? `   +${Math.round((aufwertung - 1) * 100)} %` : ''
    this.detailObjects.push(this.add.text(centerX, centerY - 52, `STÄRKE  ${getWeaponStarText(weapon, aufwertung)}${zusatz}`, {
      fontFamily: 'system-ui', fontSize: '17px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.priceText),
    }).setOrigin(0.5).setDepth(22))

    this.detailObjects.push(this.add.text(centerX, centerY - 8, WEAPON_DESCRIPTIONS[weapon], {
      fontFamily: 'system-ui', fontSize: '14px', color: this.colorFor(MENU_COLORS.text),
      align: 'center', wordWrap: { width: panelWidth - 48 },
    }).setOrigin(0.5, 0).setDepth(22))

    // WANN SIE KOMMT - der Punkt, den Thomas ausdruecklich verlangt hat. Beide Faelle
    // nennen eine Levelnummer, damit man nicht raten muss.
    const hinweis = gekauft
      ? `Gekauft. Du kannst ab Level ${abLevel} damit starten\nund sie erscheint in jedem Level in den Wandtoren.`
      : `Ohne Kauf erscheint sie erst ab Level ${minLevel} in den Wandtoren.\nGekauft gehört sie dir sofort: ab Level ${abLevel} startbar\nund in jedem Level im Wandtor.`
    this.detailObjects.push(this.add.text(centerX, centerY + 62, hinweis, {
      fontFamily: 'system-ui', fontSize: '13px', color: this.colorFor(gekauft ? MENU_COLORS.owned : MENU_COLORS.text),
      align: 'center', lineSpacing: 3,
    }).setOrigin(0.5, 0).setDepth(22))

    // AUFRUESTEN (Thomas 2026-08-25: "die moeglichkeit die Waffen upzugraden - gegen
    // Bezahlung 5 Stufen jeweils die feuerkraft erhoehen"). Es steht nur bei gekauften
    // Waffen: Wer die Waffe nicht hat, kann sie auch nicht verbessern.
    const stufenPreis = gekauft ? getWeaponStepPrice(weapon, stufen) : undefined
    const stufeBezahlbar = stufenPreis !== undefined && this.save.coins >= stufenPreis
    if (gekauft) {
      const maximum = BALANCE.meta.weaponSteps
      const punktBreite = 26
      const start = centerX - ((maximum - 1) * punktBreite) / 2
      for (let i = 0; i < maximum; i += 1) {
        this.detailObjects.push(this.add.rectangle(
          start + i * punktBreite, centerY + 118, 18, 18,
          i < stufen ? MENU_COLORS.levelFilled : MENU_COLORS.levelEmpty, 1,
        ).setOrigin(0.5).setDepth(22))
      }
      // JETZT UND NACHHER in einer Zeile: "+7 %" allein ist eine Zahl ohne Bezug.
      const danach = Math.round(((1 + BALANCE.meta.weaponStepFirepowerBonus) ** (stufen + 1) - 1) * 100)
      const zeile = stufenPreis === undefined
        ? `STUFE ${stufen} VON ${maximum}  ·  voll ausgebaut, +${Math.round((aufwertung - 1) * 100)} %`
        : `STUFE ${stufen} VON ${maximum}  ·  +${Math.round((aufwertung - 1) * 100)} % → +${danach} % Feuerkraft`
      this.detailObjects.push(this.add.text(centerX, centerY + 142, zeile, {
        fontFamily: 'system-ui', fontSize: '13px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.priceText),
      }).setOrigin(0.5).setDepth(22))
    }

    const beschriftung = gekauft
      ? stufenPreis === undefined
        ? 'VOLL AUSGEBAUT'
        : stufeBezahlbar ? `AUFRÜSTEN  ¢ ${stufenPreis}` : `NOCH ¢ ${stufenPreis - this.save.coins}`
      : bezahlbar ? `KAUFEN  ¢ ${preis}` : `NOCH ¢ ${preis - this.save.coins}`
    const knopfAktiv = gekauft ? stufeBezahlbar : bezahlbar
    this.detailObjects.push(...this.addButton(
      centerX, centerY + (gekauft ? 178 : 148), panelWidth - 48, 44, beschriftung, knopfAktiv,
      () => {
        if (!knopfAktiv) return
        if (gekauft) this.ruesteWaffeAuf(weapon)
        else this.kaufeWaffe(weapon, preis)
      }, undefined, !knopfAktiv, 22,
    ))
    this.detailObjects.push(...this.addButton(
      centerX, centerY + (gekauft ? 222 : 196), panelWidth - 48, 36, 'ZURÜCK', true,
      () => { this.schliesseWaffenDetail() }, undefined, true, 22,
    ))
  }

  /**
   * DETAILANSICHT DER AUFWERTUNGEN (Thomas 2026-08-25: "dasselbe fuer schlagkraft und
   * mannschaft - also ein vergroessrungs feld wo drinnen steht, was es ist und was es
   * bewirkt").
   *
   * Sie traegt eine Information, die mit der Umbenennung von "DAUERHAFTE AUFWERTUNG" auf
   * "SHOP" sonst verloren gegangen waere: dass diese Kaeufe in JEDEM Lauf gelten - anders
   * als die Stufen, die man in der Levelpause kauft und die mit dem Lauf enden.
   */
  private zeigeAufwertungDetail(line: 'firepower' | 'team'): void {
    const width = this.scale.width
    const height = this.scale.height
    const safeWidth = width - this.insets.left - this.insets.right
    const centerX = this.insets.left + safeWidth / 2
    const centerY = (height + this.insets.top - this.insets.bottom) / 2
    const panelWidth = safeWidth - 8
    const stufen = getMetaSteps(this.save, line)
    const maximum = BALANCE.meta.prices.length
    const preis = getMetaPrice(stufen)
    const bezahlbar = preis !== undefined && this.save.coins >= preis
    const bonus = line === 'firepower' ? BALANCE.meta.firepowerBonusPerStep : BALANCE.meta.teamBonusPerStep
    const jetzt = Math.round(((1 + bonus) ** stufen - 1) * 100)
    const danach = Math.round(((1 + bonus) ** (stufen + 1) - 1) * 100)
    const titel = line === 'firepower' ? 'SCHLAGKRAFT' : 'MANNSCHAFT'
    const was = line === 'firepower'
      ? 'Deine Truppe richtet mehr Schaden an — jede Stufe\ngibt dauerhaft mehr Feuerkraft.'
      : 'Deine Truppe darf größer werden — jede Stufe hebt\ndauerhaft die Obergrenze.'

    const wall = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.82)
      .setDepth(20).setInteractive()
    wall.on('pointerdown', () => this.schliesseWaffenDetail())
    const panel = this.add.rectangle(centerX, centerY, panelWidth, 430, MENU_COLORS.row, 1)
      .setDepth(21).setStrokeStyle(2, preis === undefined ? MENU_COLORS.owned : MENU_COLORS.rowStroke, 1)
    panel.setInteractive().on('pointerdown', () => undefined)
    const kopf = this.add.text(centerX, centerY - 185, titel, {
      fontFamily: 'system-ui', fontSize: '26px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.title),
    }).setOrigin(0.5).setDepth(22)
    this.detailObjects.push(wall, panel, kopf)

    // Symbol: die Truppenfigur fuer MANNSCHAFT, das Sturmgewehr fuer SCHLAGKRAFT. Beide
    // Bilder gibt es bereits - eigene Symbole waeren ein Bildauftrag fuer einen Nutzen,
    // den diese zwei genauso erfuellen.
    const bild = this.add.image(centerX, centerY - 112, line === 'team' ? 'player' : 'weapon-normal-gate').setDepth(22)
    // BEIDE Richtungen deckeln: Das Gewehr ist quer (150 x 44), die Truppenfigur hochkant.
    // Eine Skalierung nur ueber die Breite liess die Figur in den Titel ragen.
    bild.setScale(Math.min((panelWidth - 120) / bild.width, 92 / bild.height, 2.4))
    this.detailObjects.push(bild)

    // Stufen als grosse Punktreihe - dieselbe Darstellung wie im Regal, nur lesbarer.
    const punktBreite = 26
    const start = centerX - ((maximum - 1) * punktBreite) / 2
    for (let i = 0; i < maximum; i += 1) {
      this.detailObjects.push(this.add.rectangle(
        start + i * punktBreite, centerY - 56, 18, 18,
        i < stufen ? MENU_COLORS.levelFilled : MENU_COLORS.levelEmpty, 1,
      ).setOrigin(0.5).setDepth(22))
    }
    this.detailObjects.push(this.add.text(centerX, centerY - 30, `STUFE ${stufen} VON ${maximum}`, {
      fontFamily: 'system-ui', fontSize: '13px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.mutedText),
    }).setOrigin(0.5).setDepth(22))

    this.detailObjects.push(this.add.text(centerX, centerY + 2, was, {
      fontFamily: 'system-ui', fontSize: '14px', color: this.colorFor(MENU_COLORS.text),
      align: 'center', lineSpacing: 3,
    }).setOrigin(0.5, 0).setDepth(22))

    // WAS ES BEWIRKT, in Zahlen: jetzt gegen nachher. Ohne den Vergleich ist "+4 %" eine
    // Zahl ohne Bezug.
    const wirkung = preis === undefined
      ? `Voll ausgebaut: +${jetzt} % in jedem Lauf.`
      : stufen === 0
        ? `Nach dem Kauf: +${danach} % — in JEDEM Lauf, auch nach einem\nNeustart.`
        : `Jetzt +${jetzt} %, nach dem Kauf +${danach} % — in JEDEM Lauf,\nauch nach einem Neustart.`
    this.detailObjects.push(this.add.text(centerX, centerY + 62, wirkung, {
      fontFamily: 'system-ui', fontSize: '13px', fontStyle: 'bold',
      color: this.colorFor(preis === undefined ? MENU_COLORS.owned : MENU_COLORS.priceText),
      align: 'center', lineSpacing: 3,
    }).setOrigin(0.5, 0).setDepth(22))

    const beschriftung = preis === undefined
      ? '✓ VOLL AUSGEBAUT'
      : bezahlbar ? `KAUFEN  ¢ ${preis}` : `NOCH ¢ ${preis - this.save.coins}`
    this.detailObjects.push(...this.addButton(
      centerX, centerY + 148, panelWidth - 48, 44, beschriftung, bezahlbar,
      () => { if (bezahlbar && preis !== undefined) this.kaufeMetaStufe(line, preis) },
      undefined, !bezahlbar, 22,
    ))
    this.detailObjects.push(...this.addButton(
      centerX, centerY + 196, panelWidth - 48, 36, 'ZURÜCK', true,
      () => { this.schliesseWaffenDetail() }, undefined, true, 22,
    ))
  }

  private schliesseWaffenDetail(): void {
    for (const object of this.detailObjects) object.destroy()
    this.detailObjects.length = 0
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
    // Erst die Detailansicht weg, dann der Laden neu - sonst blieben ihre Objekte liegen
    // und lägen ueber dem frisch gezeichneten Regal.
    this.schliesseWaffenDetail()
    this.closeShop()
    this.renderShop()
    this.openShop()
  }

  /**
   * Eine Aufruestungsstufe kaufen. Danach dasselbe Aufraeumen wie beim Waffenkauf: Erst
   * die Detailansicht weg, dann der Laden neu - sonst liegen ihre Objekte ueber dem
   * frisch gezeichneten Regal.
   *
   * Die Ansicht geht danach WIEDER AUF, anders als beim Waffenkauf: Man kauft hier
   * ueblicherweise mehrere Stufen hintereinander, und jedes Mal neu hineinzutippen waere
   * eine Schikane.
   */
  private ruesteWaffeAuf(weapon: WeaponKey): void {
    const aktualisiert = kaufeWaffenStufe(this.save, weapon)
    if (aktualisiert === undefined) return
    writeSave(aktualisiert)
    this.save = aktualisiert
    this.schliesseWaffenDetail()
    this.closeShop()
    this.renderShop()
    this.openShop()
    this.zeigeWaffenDetail(weapon)
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
    const warOffen = this.detailObjects.length > 0
    this.closeShop()
    this.renderShop()
    this.openShop()
    // Anders als bei den Waffen bleibt die Detailansicht offen: Hier gibt es fuenf
    // Stufen, und wer die zweite kauft, will meist gleich die dritte sehen. Der
    // Punktbalken zeigt den Fortschritt dabei direkt.
    if (warOffen) this.zeigeAufwertungDetail(line)
  }

  private closeShop(): void {
    this.schliesseWaffenDetail()
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
