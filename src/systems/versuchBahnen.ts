import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS } from '../config/colors'
import { advanceAlongRoad, getPlayfieldHalfWidth, getRoadScale, getRoadSegment } from './road'
import { getCurrentScrollSpeed } from './speed'
import {
  VERSUCH_WAFFENREIHE,
  getFassInhalt,
  getFassTreffer,
  getFassWaffe,
  getRollBild,
  getRollUmfang,
  getTorStand,
  getTorStartwert,
  getTruppeNachTor,
  haeltJetzt,
  type FassInhalt,
} from './versuchPlan'
import type { WeaponKey } from './weapons'

// ===========================================================================
// VERSUCH "ZWEI BAHNEN" - LAEUFT AUSSCHLIESSLICH IM TESTGELAENDE.
//
// Thomas 2026-09-05, nach der Genre-Recherche zu Last Z: Survival Shooter:
//
//   RECHTE FAHRBAHNHAELFTE  Gegner UND Tore, die im MINUS starten. Jeder Treffer zaehlt
//                           den Wert hoch, ueber Null hinaus ins Plus. Wer durchfaehrt,
//                           bekommt den STAND als Aenderung der Truppengroesse - bei -3
//                           kostet es drei Figuren, bei +5 bringt es fuenf. Wer daran
//                           vorbeisteuert, bekommt und verliert nichts.
//   LINKE FAHRBAHNHAELFTE   Ein STEHENDES Fass. Es rollt heran, haelt an und bleibt,
//                           bis es freigeschossen ist - es laeuft nicht davon. Erst
//                           danach kommt das naechste. Faesser tragen die Aufruestungen
//                           (DMG, RATE) und die Waffen, letztere aufsteigend nach Staerke.
//
// WARUM EINE EIGENE KLASSE STATT EINES SCHALTERS IN walls.ts: walls.ts traegt die
// abgenommene Mechanik des echten Runs (Sammelbahn links, Feuerkraftwand rechts). Ein
// Versuchsschalter mitten darin waere genau der Weg, auf dem ein Versuch den echten Run
// doch beschaedigt. Beide Klassen erfuellen stattdessen dasselbe Interface, und die
// GameScene entscheidet an EINER Stelle, welche sie baut.
// ===========================================================================

/**
 * Was die GameScene von einer Bahn braucht. `Walls` (echter Run) und `VersuchBahnen`
 * (Testgelaende) erfuellen es beide - dadurch bleibt die gesamte Kollisions- und
 * Trefferanbindung der Szene unveraendert, egal welche Bahn laeuft.
 */
export interface BahnSystem {
  getWalls(): Phaser.Physics.Arcade.Group
  getRewards(): Phaser.Physics.Arcade.Group
  hasActivePair(): boolean
  resetForLevel(level: number): void
  deactivateAll(): void
  isWall(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image
  getWallPresence(y: number, halfSpanPx: number): Readonly<{ left: boolean; right: boolean }>
  isPickupSegment(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image
  isDrainSegment(candidate: Phaser.GameObjects.GameObject): boolean
  collectPickup(wall: Phaser.Physics.Arcade.Image): number
  isReward(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image
  collect(reward: Phaser.Physics.Arcade.Image): WeaponKey | undefined
  damage(wall: Phaser.Physics.Arcade.Image, damage: number): boolean
  update(dt: number): void
  getSegmentHeight(side: 'left' | 'right'): number
}

// ---------------------------------------------------------------------------

type TorZustand = {
  bild: Phaser.Physics.Arcade.Image
  label: Phaser.GameObjects.Text
  anchorY: number
  aktiv: boolean
  startwert: number
  treffer: number
}

type FassZustand = {
  bild: Phaser.Physics.Arcade.Image
  label: Phaser.GameObjects.Text
  inhaltText: Phaser.GameObjects.Text
  reward: Phaser.Physics.Arcade.Image
  anchorY: number
  aktiv: boolean
  haelt: boolean
  zerschossen: boolean
  inhalt: FassInhalt
  waffe: WeaponKey
}

export class VersuchBahnen implements BahnSystem {
  private readonly scene: Phaser.Scene
  private readonly rng: () => number
  private readonly applyReinforcement: (apply: (current: number) => number) => void
  private readonly applyFassGate: (stat: 'damage' | 'rate', schritte: number, x: number, y: number) => void
  private readonly wallGroup: Phaser.Physics.Arcade.Group
  private readonly rewardGroup: Phaser.Physics.Arcade.Group
  private readonly tore: TorZustand[]
  private readonly torZuObjekt: Map<Phaser.GameObjects.GameObject, TorZustand>
  private readonly fass: FassZustand
  private readonly fassZuObjekt: Map<Phaser.GameObjects.GameObject, FassZustand>
  private torAbstandPx: number
  private fassIndex: number
  private waffenIndex: number
  private rollStreckePx: number
  private fassEinblendPx: number
  private nextSpawnId: number
  private hatRollbilder: boolean

  public constructor(
    scene: Phaser.Scene,
    rng: () => number,
    applyReinforcement: (apply: (current: number) => number) => void,
    applyFassGate: (stat: 'damage' | 'rate', schritte: number, x: number, y: number) => void,
  ) {
    this.scene = scene
    this.rng = rng
    this.applyReinforcement = applyReinforcement
    this.applyFassGate = applyFassGate
    this.wallGroup = scene.physics.add.group()
    this.rewardGroup = scene.physics.add.group()
    // Erstes Tor sofort: der erste update() setzt es an den Horizont.
    this.torAbstandPx = BALANCE.versuch.tor.abstandPx
    this.fassIndex = 0
    this.waffenIndex = 0
    this.rollStreckePx = 0
    this.fassEinblendPx = 0
    this.nextSpawnId = -1
    // Liegt die Rollbildfolge vor? Fehlt sie (Codex-Lauf noch nicht fertig), laeuft das
    // Fass mit der Wandtextur ohne Drehung - die Mechanik ist dann trotzdem pruefbar.
    this.hatRollbilder = scene.textures.exists('barrel-roll-1')
    this.tore = []
    this.torZuObjekt = new Map()
    // Wie viele Tore gleichzeitig unterwegs sein koennen: Anflugstrecke geteilt durch
    // den Torabstand, aufgerundet, plus eines in Reserve. Bei 564 px Anflug und 560 px
    // Abstand sind das zwei - vier ist reichlich Luft und kostet nichts.
    for (let i = 0; i < 4; i += 1) {
      const tor = this.erzeugeTor()
      this.tore.push(tor)
      this.torZuObjekt.set(tor.bild, tor)
    }
    this.fass = this.erzeugeFass()
    this.fassZuObjekt = new Map()
    this.fassZuObjekt.set(this.fass.bild, this.fass)
  }

  public getWalls(): Phaser.Physics.Arcade.Group { return this.wallGroup }

  public getRewards(): Phaser.Physics.Arcade.Group { return this.rewardGroup }

  public hasActivePair(): boolean { return this.tore.some((tor) => tor.aktiv) || this.fass.aktiv }

  /**
   * Die Levelnummer geht in den Versuch NICHT ein: Tor- und Fasshaerte zaehlen Treffer,
   * nicht Schaden, und die Trefferzahl soll auf jedem Level dieselbe sein - sonst
   * beurteilt Thomas beim Testen zwei Dinge auf einmal.
   */
  public resetForLevel(): void {
    this.deactivateAll()
    this.torAbstandPx = BALANCE.versuch.tor.abstandPx
  }

  public deactivateAll(): void {
    for (const tor of this.tore) this.recycleTor(tor)
    this.recycleFass()
  }

  public isWall(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image {
    return this.torZuObjekt.has(candidate) || this.fassZuObjekt.has(candidate)
  }

  /**
   * Der Fahrbereich bleibt im Versuch UNBEGRENZT. Tore will man durchfahren koennen, und
   * ein Fass, das den Weg sperrt, waere nach Thomas' Bild kein Fass, sondern eine Wand.
   */
  public getWallPresence(): Readonly<{ left: boolean; right: boolean }> {
    return { left: false, right: false }
  }

  /**
   * Tore werden DURCHFAHREN, nicht zerschossen - deshalb melden sie sich der Szene als
   * Sammelsegment. Faesser nicht: durch sie faehrt man wirkungslos hindurch, sie wollen
   * beschossen werden.
   */
  public isPickupSegment(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image {
    const tor = this.torZuObjekt.get(candidate)
    return tor !== undefined && tor.aktiv
  }

  /**
   * Immer false: Ein Tor verlangt dieselbe Eindringtiefe wie ein blaues Sammelplaettchen
   * (walls.pickupOverlapFigures). Die groessere Tiefe der roten Kacheln waere hier falsch -
   * ein Tor ist weder gut noch schlecht, das entscheidet sein Stand.
   */
  public isDrainSegment(): boolean { return false }

  /** Durchfahren: der aktuelle Stand wird auf die Truppe angewandt und das Tor ist weg. */
  public collectPickup(wall: Phaser.Physics.Arcade.Image): number {
    const tor = this.torZuObjekt.get(wall)
    if (tor === undefined || !tor.aktiv) return 0
    const stand = getTorStand(tor.startwert, tor.treffer)
    this.applyReinforcement((current) => getTruppeNachTor(current, stand))
    this.recycleTor(tor)
    return stand
  }

  public isReward(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image {
    return candidate === this.fass.reward
  }

  public collect(reward: Phaser.Physics.Arcade.Image): WeaponKey | undefined {
    if (reward !== this.fass.reward || !this.fass.zerschossen || !reward.active) return undefined
    const waffe = this.fass.waffe
    this.recycleFass()
    return waffe
  }

  /**
   * EIN TREFFER IST EIN PUNKT - auf beiden Bahnen. Der uebergebene Schadenswert wird
   * bewusst nicht gelesen (Thomas 2026-09-05: "zerschiessen jeder treffer ein punkt,
   * genauso die waende - jeder treffer eine punkt +"). Die Signatur bleibt, weil sie
   * zum gemeinsamen Interface mit Walls gehoert.
   */
  public damage(wall: Phaser.Physics.Arcade.Image): boolean {
    const tor = this.torZuObjekt.get(wall)
    if (tor !== undefined) {
      if (!tor.aktiv) return false
      tor.treffer += 1
      this.beschrifteTor(tor)
      return false
    }
    const fass = this.fassZuObjekt.get(wall)
    if (fass === undefined || !fass.aktiv || fass.zerschossen) return false
    const rest = (wall.getData('hp') as number) - 1
    wall.setData('hp', rest)
    fass.label.setText(rest <= 0 ? '' : `${rest}`)
    if (rest > 0) return false
    return this.loeseFassEin(fass)
  }

  public update(dt: number): void {
    const movement = (getCurrentScrollSpeed() * dt) / 1000
    this.rollStreckePx += movement
    this.aktualisiereTore(movement)
    this.aktualisiereFass(movement)
  }

  /** Nur fuer die Schnittstelle - der Versuch hat je Bahn genau eine Objektgroesse. */
  public getSegmentHeight(side: 'left' | 'right'): number {
    return side === 'right' ? BALANCE.versuch.tor.hoehePx : BALANCE.versuch.fass.groessePx
  }

  // -------------------------------------------------------------------------
  // Rechte Bahn
  // -------------------------------------------------------------------------

  private aktualisiereTore(movement: number): void {
    this.torAbstandPx += movement
    if (this.torAbstandPx >= BALANCE.versuch.tor.abstandPx) {
      this.torAbstandPx -= BALANCE.versuch.tor.abstandPx
      this.spawneTor()
    }
    for (const tor of this.tore) {
      if (!tor.aktiv) continue
      tor.anchorY = advanceAlongRoad(this.scene.scale.width, this.scene.scale.height, tor.anchorY, movement)
      const segment = getRoadSegment(this.scene.scale.width, this.scene.scale.height, tor.anchorY, BALANCE.versuch.tor.hoehePx)
      const geometrie = this.bahnGeometrie('right', segment.centerY, BALANCE.versuch.tor.breiteShare)
      tor.bild.setPosition(geometrie.x, segment.centerY).setDisplaySize(geometrie.breite, segment.height)
      ;(tor.bild.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      const alpha = Math.min(1, Math.max(0, (segment.centerY - segment.height / 2 - BALANCE.road.horizonY) / BALANCE.road.entryFadePx))
      tor.bild.setAlpha(alpha)
      const massstab = getRoadScale(this.scene.scale.width, this.scene.scale.height, segment.centerY)
      tor.label.setPosition(geometrie.x, segment.centerY).setAlpha(alpha).setScale(massstab)
      if (segment.centerY - segment.height / 2 > this.scene.scale.height) this.recycleTor(tor)
    }
  }

  private spawneTor(): void {
    const tor = this.tore.find((kandidat) => !kandidat.aktiv)
    if (tor === undefined) return
    tor.aktiv = true
    tor.anchorY = BALANCE.road.horizonY
    tor.startwert = getTorStartwert(this.rng())
    tor.treffer = 0
    const segment = getRoadSegment(this.scene.scale.width, this.scene.scale.height, tor.anchorY, BALANCE.versuch.tor.hoehePx)
    const geometrie = this.bahnGeometrie('right', segment.centerY, BALANCE.versuch.tor.breiteShare)
    tor.bild.enableBody(true, geometrie.x, segment.centerY, true, true)
    tor.bild.setDisplaySize(geometrie.breite, segment.height).setActive(true).setVisible(true).setAlpha(0)
    const body = tor.bild.body as Phaser.Physics.Arcade.Body
    body.moves = false
    body.updateFromGameObject()
    tor.bild.setData('spawnId', this.nextSpawnId)
    this.nextSpawnId -= 1
    tor.label.setActive(true).setVisible(true).setAlpha(0)
    this.beschrifteTor(tor)
  }

  /**
   * Zahl und Farbe folgen dem STAND, nicht dem Startwert: Sobald ein Tor ins Plus
   * gedreht ist, muss man das sehen, sonst faehrt man an der eigenen Arbeit vorbei.
   */
  private beschrifteTor(tor: TorZustand): void {
    const stand = getTorStand(tor.startwert, tor.treffer)
    tor.label.setText(stand > 0 ? `+${stand}` : `${stand}`)
    tor.label.setColor(stand > 0 ? '#3ddc84' : '#ff6b6b')
    tor.bild.setTexture(stand > 0 ? 'wall-segment-right' : 'wall-segment-bad')
  }

  private recycleTor(tor: TorZustand): void {
    tor.aktiv = false
    tor.bild.disableBody(true, true)
    tor.bild.setActive(false).setVisible(false)
    tor.label.setActive(false).setVisible(false)
  }

  private erzeugeTor(): TorZustand {
    const bild = this.scene.physics.add.image(0, 0, 'wall-segment-bad')
      .setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    ;(bild.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
    ;(bild.body as Phaser.Physics.Arcade.Body).setSize(128, BALANCE.versuch.tor.hoehePx, true)
    bild.disableBody(true, true)
    this.wallGroup.add(bild)
    const label = this.scene.add.text(0, 0, '', {
      fontFamily: 'system-ui', fontSize: '30px', color: '#ffffff', stroke: HUD_COLORS.textDark, strokeThickness: 4, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(BALANCE.layers.wallContent).setActive(false).setVisible(false)
    return { bild, label, anchorY: BALANCE.road.horizonY, aktiv: false, startwert: -1, treffer: 0 }
  }

  // -------------------------------------------------------------------------
  // Linke Bahn
  // -------------------------------------------------------------------------

  private aktualisiereFass(movement: number): void {
    if (!this.fass.aktiv) {
      this.spawneFass()
      return
    }
    // DER KERN DES VERSUCHS: Solange das Fass haelt, waechst sein Weltanker NICHT mit.
    // Die Strasse laeuft darunter durch, das Fass bleibt auf derselben Bildschirmhoehe -
    // und rollt optisch dagegen an (getRollBild).
    const halteY = this.scene.scale.height * BALANCE.versuch.fass.haltYShare
    if (!this.fass.haelt) {
      this.fass.anchorY = advanceAlongRoad(this.scene.scale.width, this.scene.scale.height, this.fass.anchorY, movement)
    }
    const segment = getRoadSegment(this.scene.scale.width, this.scene.scale.height, this.fass.anchorY, BALANCE.versuch.fass.groessePx)
    // DIE HALTEREGEL GILT NUR FUER DAS FASS SELBST, nicht fuer das, was von ihm uebrig
    // bleibt. Im Browser gemessen, warum das hier stehen muss: Die freigeschossene Waffe
    // startet UNTERHALB der Halteschwelle - ohne diese Bedingung griff die Regel beim
    // naechsten Bild sofort wieder, die Waffe blieb fuer immer liegen, und weil erst ihr
    // Abgang Platz macht, kam nie wieder ein Fass. Gemessen: ein einziges Fass in 20 s,
    // danach Stillstand der ganzen linken Bahn.
    if (!this.fass.zerschossen) this.fass.haelt = haeltJetzt(segment.centerY, halteY, this.fass.haelt)
    const geometrie = this.bahnGeometrie('left', segment.centerY, 1)
    const groesse = Math.min(segment.height, geometrie.breite)
    // Eingeblendet statt aufgeploppt: Ein Fass, das aus dem Nichts mitten auf der
    // Strasse steht, liest sich als Fehler. Ueber die gefahrene Strecke, nicht ueber
    // eine Zeitkonstante - dieselbe Regel wie bei der Drehung.
    this.fassEinblendPx += movement
    const alpha = Math.min(1, this.fassEinblendPx / BALANCE.versuch.fass.einblendPx)
    const massstab = getRoadScale(this.scene.scale.width, this.scene.scale.height, segment.centerY)
    if (this.fass.bild.active) {
      this.fass.bild.setPosition(geometrie.x, segment.centerY).setDisplaySize(groesse, groesse).setAlpha(alpha)
      if (this.hatRollbilder) this.fass.bild.setTexture(`barrel-roll-${getRollBild(this.rollStreckePx, getRollUmfang(groesse)) + 1}`)
      ;(this.fass.bild.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      this.fass.label.setPosition(geometrie.x, segment.centerY + groesse / 2 + 10 * massstab).setAlpha(alpha).setScale(massstab)
      this.fass.inhaltText.setPosition(geometrie.x, segment.centerY).setAlpha(alpha).setScale(massstab)
    }
    if (this.fass.zerschossen && this.fass.reward.active) {
      this.fass.reward.setPosition(geometrie.x, segment.centerY)
      ;(this.fass.reward.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      // Nicht eingesammelt heisst verpasst, nicht "blockiert bis in alle Ewigkeit":
      // Unten aus dem Bild heraus macht die Waffe Platz fuer das naechste Fass.
      if (segment.centerY - this.fass.reward.displayHeight / 2 > this.scene.scale.height) this.recycleFass()
    }
  }

  private spawneFass(): void {
    const inhalt = getFassInhalt(this.fassIndex)
    const hp = getFassTreffer()
    this.fass.aktiv = true
    this.fass.haelt = false
    this.fass.zerschossen = false
    this.fass.inhalt = inhalt
    this.fass.waffe = inhalt === 'weapon' ? getFassWaffe(this.waffenIndex) : this.fass.waffe
    // DAS FASS ERSCHEINT AN SEINEM PLATZ, es fliegt nicht heran. Im Browser gemessen,
    // warum: Vom Horizont bis zur Halteposition sind es rund fuenf Sekunden, und die
    // Truppe feuert die ganze Zeit - das Fass war jedes Mal zerschossen, BEVOR es
    // ankam. Man bekam nie ein stehendes Fass zu sehen, nur die Waffe, die davon uebrig
    // blieb. Genau das Gegenteil von "stehende Gebilde, die nicht weiterlaufen".
    this.fass.anchorY = this.scene.scale.height * BALANCE.versuch.fass.haltYShare
    this.fassEinblendPx = 0
    const segment = getRoadSegment(this.scene.scale.width, this.scene.scale.height, this.fass.anchorY, BALANCE.versuch.fass.groessePx)
    const geometrie = this.bahnGeometrie('left', segment.centerY, 1)
    this.fass.bild.enableBody(true, geometrie.x, segment.centerY, true, true)
    this.fass.bild.setActive(true).setVisible(true).setAlpha(0)
    const body = this.fass.bild.body as Phaser.Physics.Arcade.Body
    body.moves = false
    body.updateFromGameObject()
    this.fass.bild.setData('hp', hp)
    this.fass.bild.setData('spawnId', this.nextSpawnId)
    this.nextSpawnId -= 1
    this.fass.label.setText(`${hp}`).setActive(true).setVisible(true).setAlpha(0)
    this.fass.inhaltText
      .setText(inhalt === 'weapon' ? 'WAFFE' : inhalt === 'damage' ? '+DMG' : '+RATE')
      .setActive(true).setVisible(true).setAlpha(0)
    this.fass.reward.setActive(false).setVisible(false)
  }

  /**
   * Das Fass ist gefallen. DMG und RATE wirken sofort; eine Waffe bleibt als
   * einsammelbares Objekt an Ort und Stelle liegen - dort, wo das Fass stand.
   */
  private loeseFassEin(fass: FassZustand): boolean {
    fass.zerschossen = true
    // DER HALT ENDET MIT DEM FASS. Gemessen im Browser: Blieb er bestehen, lag die
    // freigeschossene Waffe fuer immer an derselben Stelle - und weil erst das
    // eingesammelte Fass Platz fuer das naechste macht, kam nie wieder eines. Wer die
    // Waffe nicht wollte, hatte die linke Bahn damit dauerhaft verstopft.
    fass.haelt = false
    fass.bild.disableBody(true, true)
    fass.bild.setActive(false).setVisible(false)
    fass.label.setActive(false).setVisible(false)
    fass.inhaltText.setActive(false).setVisible(false)
    this.fassIndex += 1
    if (fass.inhalt === 'weapon') {
      this.waffenIndex += 1
      fass.reward.setTexture(`weapon-${fass.waffe}-gate`)
      fass.reward.enableBody(true, fass.bild.x, fass.bild.y, true, true)
      fass.reward.setActive(true).setVisible(true).setAlpha(1)
      const quelle = fass.reward.texture.getSourceImage() as { width: number; height: number }
      const breite = Math.min(quelle.width, BALANCE.versuch.fass.groessePx)
      fass.reward.setDisplaySize(breite, breite * quelle.height / quelle.width)
      ;(fass.reward.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      return true
    }
    this.applyFassGate(fass.inhalt, BALANCE.versuch.fass.torSchritte, fass.bild.x, fass.bild.y)
    this.recycleFass()
    return true
  }

  private recycleFass(): void {
    this.fass.aktiv = false
    this.fass.haelt = false
    this.fass.zerschossen = false
    this.fass.bild.disableBody(true, true)
    this.fass.bild.setActive(false).setVisible(false)
    this.fass.label.setActive(false).setVisible(false)
    this.fass.inhaltText.setActive(false).setVisible(false)
    this.fass.reward.disableBody(true, true)
    this.fass.reward.setActive(false).setVisible(false)
  }

  private erzeugeFass(): FassZustand {
    const textur = this.hatRollbilder ? 'barrel-roll-1' : 'wall-segment-left'
    const bild = this.scene.physics.add.image(0, 0, textur)
      .setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    ;(bild.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
    bild.disableBody(true, true)
    this.wallGroup.add(bild)
    const label = this.scene.add.text(0, 0, '', {
      fontFamily: 'system-ui', fontSize: '17px', color: '#ffffff', stroke: HUD_COLORS.textDark, strokeThickness: 3, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(BALANCE.layers.gameplay + 1).setActive(false).setVisible(false)
    const inhaltText = this.scene.add.text(0, 0, '', {
      fontFamily: 'system-ui', fontSize: '19px', color: '#ffd166', stroke: HUD_COLORS.textDark, strokeThickness: 3, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(BALANCE.layers.wallContent).setActive(false).setVisible(false)
    const reward = this.scene.physics.add.image(0, 0, 'weapon-normal-gate')
      .setDepth(BALANCE.layers.wallContent).setActive(false).setVisible(false)
    reward.disableBody(true, true)
    this.rewardGroup.add(reward)
    return {
      bild, label, inhaltText, reward,
      anchorY: BALANCE.road.horizonY, aktiv: false, haelt: false, zerschossen: false,
      inhalt: 'weapon', waffe: VERSUCH_WAFFENREIHE[0],
    }
  }

  // -------------------------------------------------------------------------

  /**
   * Mitte und Breite einer FAHRBAHNHAELFTE auf Hoehe y - nicht der Wandzone am Rand.
   * Der Versuch teilt die Strasse in zwei Haelften, statt an ihren Raendern zu bauen.
   */
  private bahnGeometrie(seite: 'left' | 'right', y: number, breiteShare: number): { x: number; breite: number } {
    const spielfeldHalb = getPlayfieldHalfWidth(this.scene.scale.width, this.scene.scale.height, y)
    const anteil = seite === 'left' ? -BALANCE.versuch.fass.bahnAnteil : BALANCE.versuch.tor.bahnAnteil
    return {
      x: this.scene.scale.width / 2 + anteil * spielfeldHalb,
      breite: spielfeldHalb * breiteShare,
    }
  }
}
