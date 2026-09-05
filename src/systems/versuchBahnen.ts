import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS } from '../config/colors'
import { advanceAlongRoad, getRoadHalfWidth, getRoadScale, getRoadSegment } from './road'
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
  istImTorFenster,
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
  /** Weg AUF DER STRASSE, nicht auf dem Bildschirm - daraus kommt die Drehung. */
  rollPx: number
  aktiv: boolean
  zerschossen: boolean
  inhalt: FassInhalt
  waffe: WeaponKey
}

export class VersuchBahnen implements BahnSystem {
  private readonly scene: Phaser.Scene
  private readonly getTeamSize: () => number
  private readonly getShotsPerSec: () => number
  private readonly getTruppenDeckel: () => number
  private readonly rng: () => number
  private readonly applyReinforcement: (apply: (current: number) => number) => void
  private readonly applyFassGate: (stat: 'damage' | 'rate', x: number, y: number) => void
  private readonly wallGroup: Phaser.Physics.Arcade.Group
  private readonly rewardGroup: Phaser.Physics.Arcade.Group
  private readonly tore: TorZustand[]
  private readonly torZuObjekt: Map<Phaser.GameObjects.GameObject, TorZustand>
  private readonly faesser: FassZustand[]
  private readonly fassZuObjekt: Map<Phaser.GameObjects.GameObject, FassZustand>
  private torAbstandPx: number
  private fassAbstandPx: number
  private fassIndex: number
  private waffenIndex: number
  private nextSpawnId: number
  private hatRollbilder: boolean

  public constructor(
    scene: Phaser.Scene,
    getTeamSize: () => number,
    getShotsPerSec: () => number,
    getTruppenDeckel: () => number,
    rng: () => number,
    applyReinforcement: (apply: (current: number) => number) => void,
    applyFassGate: (stat: 'damage' | 'rate', x: number, y: number) => void,
  ) {
    this.scene = scene
    this.getTeamSize = getTeamSize
    this.getShotsPerSec = getShotsPerSec
    this.getTruppenDeckel = getTruppenDeckel
    this.rng = rng
    this.applyReinforcement = applyReinforcement
    this.applyFassGate = applyFassGate
    this.wallGroup = scene.physics.add.group()
    this.rewardGroup = scene.physics.add.group()
    // Erstes Tor sofort: der erste update() setzt es an den Horizont.
    this.torAbstandPx = BALANCE.versuch.tor.abstandPx
    this.fassIndex = 0
    this.waffenIndex = 0
    // Das erste Fass kommt sofort, danach je Abstand eines.
    this.fassAbstandPx = BALANCE.versuch.fass.abstandPx
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
    this.faesser = []
    this.fassZuObjekt = new Map()
    // Bei 520 px Abstand, halbem Tempo und rund 700 px Fahrstrecke im Bild sind
    // hoechstens drei gleichzeitig unterwegs; vier lassen Luft fuer eine liegengebliebene
    // Waffe, die noch ausrollt.
    for (let i = 0; i < 4; i += 1) {
      const fass = this.erzeugeFass()
      this.faesser.push(fass)
      this.fassZuObjekt.set(fass.bild, fass)
    }
  }

  public getWalls(): Phaser.Physics.Arcade.Group { return this.wallGroup }

  public getRewards(): Phaser.Physics.Arcade.Group { return this.rewardGroup }

  public hasActivePair(): boolean { return this.tore.some((tor) => tor.aktiv) || this.faesser.some((fass) => fass.aktiv) }

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
    for (const fass of this.faesser) this.recycleFass(fass)
  }

  /**
   * Liegt gerade ein Tor im Anflug, hinter dem kein Gegner erscheinen darf?
   *
   * Das Fenster liegt um den SPAWN-Zeitpunkt, nicht um die aktuelle Position des Tores:
   * Ein Gegner, der jetzt am Horizont erscheint, laeuft die ganze Strecke gemeinsam mit
   * einem Tor, das jetzt ebenfalls dort steht - genau die Lage, die Thomas beschrieben
   * hat ("dann sind sie so nah, dass ich sie nicht wegbekomme").
   */
  public istTorFenster(): boolean {
    const { abstandPx, gegnerSperreVorPx, gegnerSperreNachPx } = BALANCE.versuch.tor
    return istImTorFenster(this.torAbstandPx, abstandPx, gegnerSperreVorPx, gegnerSperreNachPx)
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
    const stand = getTorStand(tor.startwert, tor.treffer, this.getTeamSize(), this.getTruppenDeckel())
    this.applyReinforcement((current) => getTruppeNachTor(current, stand))
    this.recycleTor(tor)
    return stand
  }

  public isReward(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image {
    return this.faesser.some((fass) => fass.reward === candidate)
  }

  public collect(reward: Phaser.Physics.Arcade.Image): WeaponKey | undefined {
    const fass = this.faesser.find((kandidat) => kandidat.reward === reward)
    if (fass === undefined || !fass.zerschossen || !reward.active) return undefined
    const waffe = fass.waffe
    this.recycleFass(fass)
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
    this.aktualisiereTore(movement)
    this.aktualisiereFaesser(movement)
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
      const geometrie = this.torGeometrie(segment.centerY)
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
    tor.startwert = getTorStartwert(this.rng(), this.getTeamSize())
    tor.treffer = 0
    const segment = getRoadSegment(this.scene.scale.width, this.scene.scale.height, tor.anchorY, BALANCE.versuch.tor.hoehePx)
    const geometrie = this.torGeometrie(segment.centerY)
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
    const stand = getTorStand(tor.startwert, tor.treffer, this.getTeamSize(), this.getTruppenDeckel())
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

  /**
   * DIE FAESSER ROLLEN DURCH, sie halten nicht mehr an (Thomas 2026-09-05: "von oben die
   * strasse runterrollen, langsam und dann auch weiter rollen, damit man nicht jedes mal
   * ein upgrade erwischt, dafuer wieder oefter, aber mit entsprechend abstand").
   *
   * Zwei Bewegungen, die leicht auseinanderlaufen: Das Fass wandert mit `tempoAnteil`
   * der Strassengeschwindigkeit ueber den BILDSCHIRM, es dreht sich aber nach seiner
   * Bewegung relativ zur STRASSE - und die ist der Rest, `1 - tempoAnteil`. Wer die
   * Drehung an die Bildschirmbewegung haengt, laesst das Fass sichtbar rutschen.
   */
  private aktualisiereFaesser(movement: number): void {
    this.fassAbstandPx += movement
    if (this.fassAbstandPx >= BALANCE.versuch.fass.abstandPx) {
      this.fassAbstandPx -= BALANCE.versuch.fass.abstandPx
      this.spawneFass()
    }
    const { tempoAnteil } = BALANCE.versuch.fass
    const eigenerWeg = movement * tempoAnteil
    const wegAufDerStrasse = movement * (1 - tempoAnteil)
    for (const fass of this.faesser) {
      if (!fass.aktiv) continue
      fass.anchorY = advanceAlongRoad(this.scene.scale.width, this.scene.scale.height, fass.anchorY, eigenerWeg)
      fass.rollPx += wegAufDerStrasse
      const segment = getRoadSegment(this.scene.scale.width, this.scene.scale.height, fass.anchorY, BALANCE.versuch.fass.groessePx)
      const groesse = segment.height
      const geometrie = this.fassGeometrie(segment.centerY, groesse)
      const alpha = Math.min(1, Math.max(0, (segment.centerY - groesse / 2 - BALANCE.road.horizonY) / BALANCE.road.entryFadePx))
      const massstab = getRoadScale(this.scene.scale.width, this.scene.scale.height, segment.centerY)
      if (fass.bild.active) {
        fass.bild.setPosition(geometrie.x, segment.centerY).setDisplaySize(groesse, groesse).setAlpha(alpha)
        if (this.hatRollbilder) fass.bild.setTexture(`barrel-roll-${getRollBild(fass.rollPx, getRollUmfang(groesse)) + 1}`)
        ;(fass.bild.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
        fass.label.setPosition(geometrie.x, segment.centerY + groesse / 2 + 10 * massstab).setAlpha(alpha).setScale(massstab)
        fass.inhaltText.setPosition(geometrie.x, segment.centerY).setAlpha(alpha).setScale(massstab)
      }
      if (fass.zerschossen && fass.reward.active) {
        fass.reward.setPosition(geometrie.x, segment.centerY)
        ;(fass.reward.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      }
      // Unten aus dem Bild: verpasst. Genau das ist der Sinn des Durchrollens - "damit
      // man nicht jedes Mal ein Upgrade erwischt".
      if (segment.centerY - groesse / 2 > this.scene.scale.height) this.recycleFass(fass)
    }
  }

  private spawneFass(): void {
    const fass = this.faesser.find((kandidat) => !kandidat.aktiv)
    if (fass === undefined) return
    // NIE ZWEI WAFFEN GLEICHZEITIG IM BILD (Thomas 2026-09-05: "waffen erscheinen immer
    // noch doppelt"). Der Zyklus gibt jedes dritte Fass als Waffe aus, und es sind bis zu
    // drei gleichzeitig unterwegs - rechnerisch koennen also zwei Waffen zusammen im Bild
    // stehen, ein zerschossener Fund eingeschlossen, der noch ausrollt.
    //
    // Ist eine unterwegs, wird daraus ein Schadensfass UND DER ZAEHLER BLEIBT STEHEN:
    // Die Waffe ist damit nicht verloren, sie kommt beim naechsten freien Fass. Wuerde
    // der Zaehler weiterlaufen, faehrt man an einer Waffe der Reihe vorbei, ohne sie je
    // gesehen zu haben.
    const waffeUnterwegs = this.faesser.some((f) => f.aktiv && (f.inhalt === 'weapon' || f.reward.active))
    const geplant = getFassInhalt(this.fassIndex)
    const inhalt: FassInhalt = geplant === 'weapon' && waffeUnterwegs ? 'damage' : geplant
    const hp = getFassTreffer(this.getTeamSize(), this.getShotsPerSec())
    // DER ZAEHLER STELLT BEIM SPAWN WEITER, nicht beim Einloesen. Seit die Faesser
    // durchrollen, wird nicht mehr jedes zerschossen - haette der Zaehler am Einloesen
    // gehangen, bliebe die Reihe stehen, sobald man eines durchlaesst, und dieselbe
    // Waffe kaeme wieder und wieder.
    if (inhalt === geplant) this.fassIndex += 1
    fass.aktiv = true
    fass.zerschossen = false
    fass.inhalt = inhalt
    if (inhalt === 'weapon') {
      fass.waffe = getFassWaffe(this.waffenIndex)
      this.waffenIndex += 1
    }
    fass.anchorY = BALANCE.road.horizonY
    fass.rollPx = 0
    const segment = getRoadSegment(this.scene.scale.width, this.scene.scale.height, fass.anchorY, BALANCE.versuch.fass.groessePx)
    const geometrie = this.fassGeometrie(segment.centerY, segment.height)
    fass.bild.enableBody(true, geometrie.x, segment.centerY, true, true)
    fass.bild.setActive(true).setVisible(true).setAlpha(0)
    const body = fass.bild.body as Phaser.Physics.Arcade.Body
    body.moves = false
    body.updateFromGameObject()
    fass.bild.setData('hp', hp)
    fass.bild.setData('spawnId', this.nextSpawnId)
    this.nextSpawnId -= 1
    fass.label.setText(`${hp}`).setActive(true).setVisible(true).setAlpha(0)
    fass.inhaltText
      .setText(inhalt === 'weapon' ? 'WAFFE' : inhalt === 'damage' ? '+DMG' : '+RATE')
      .setActive(true).setVisible(true).setAlpha(0)
    fass.reward.setActive(false).setVisible(false)
  }

  /**
   * Das Fass ist gefallen. DMG und RATE wirken sofort; eine Waffe rollt als
   * einsammelbares Objekt weiter, bis sie eingesammelt ist oder unten hinausrollt.
   */
  private loeseFassEin(fass: FassZustand): boolean {
    fass.zerschossen = true
    fass.bild.disableBody(true, true)
    fass.bild.setActive(false).setVisible(false)
    fass.label.setActive(false).setVisible(false)
    fass.inhaltText.setActive(false).setVisible(false)
    if (fass.inhalt === 'weapon') {
      fass.reward.setTexture(`weapon-${fass.waffe}-gate`)
      fass.reward.enableBody(true, fass.bild.x, fass.bild.y, true, true)
      fass.reward.setActive(true).setVisible(true).setAlpha(1)
      const quelle = fass.reward.texture.getSourceImage() as { width: number; height: number }
      // Kleiner als das Fass, aus dem er faellt: In voller Fassgroesse liegt eine
      // Schrotflinte quer ueber der halben Fahrbahn und liest sich nicht mehr als Fund,
      // sondern als Hindernis.
      const breite = Math.min(quelle.width, BALANCE.versuch.fass.groessePx * BALANCE.versuch.fass.fundGroesseAnteil)
      fass.reward.setDisplaySize(breite, breite * quelle.height / quelle.width)
      ;(fass.reward.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      return true
    }
    this.applyFassGate(fass.inhalt, fass.bild.x, fass.bild.y)
    this.recycleFass(fass)
    return true
  }

  private recycleFass(fass: FassZustand): void {
    fass.aktiv = false
    fass.zerschossen = false
    fass.bild.disableBody(true, true)
    fass.bild.setActive(false).setVisible(false)
    fass.label.setActive(false).setVisible(false)
    fass.inhaltText.setActive(false).setVisible(false)
    fass.reward.disableBody(true, true)
    fass.reward.setActive(false).setVisible(false)
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
      anchorY: BALANCE.road.horizonY, rollPx: 0, aktiv: false, zerschossen: false,
      inhalt: 'weapon', waffe: VERSUCH_WAFFENREIHE[0],
    }
  }

  // -------------------------------------------------------------------------

  /**
   * Beide Bahnen liegen jetzt AM STRASSENRAND, nicht auf einem Anteil dazwischen
   * (Thomas 2026-09-05: Faesser "am linken rand, nur ein kleiner spalt", Tore "nach
   * rechts breiter").
   *
   * Bezug ist die volle Strassenbreite, nicht die um die Wandzone gekuerzte
   * Spielfeldbreite: Im Versuch gibt es keine Randwaende, die Zone waere hier nur eine
   * geerbte Sperre, die beide Bahnen unnoetig nach innen draengt.
   */
  private fassGeometrie(y: number, groesse: number): { x: number } {
    const strasseHalb = getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, y)
    const massstab = getRoadScale(this.scene.scale.width, this.scene.scale.height, y)
    // Vom Rand her gerechnet: Aussenkante = Rand minus Spalt, daraus die Mitte.
    const spalt = BALANCE.versuch.fass.randSpaltPx * massstab
    return { x: this.scene.scale.width / 2 - (strasseHalb - spalt - groesse / 2) }
  }

  private torGeometrie(y: number): { x: number; breite: number } {
    const strasseHalb = getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, y)
    const massstab = getRoadScale(this.scene.scale.width, this.scene.scale.height, y)
    const spalt = BALANCE.versuch.tor.randSpaltPx * massstab
    const innen = strasseHalb * BALANCE.versuch.tor.innenkanteAnteil
    const aussen = strasseHalb - spalt
    return { x: this.scene.scale.width / 2 + (innen + aussen) / 2, breite: Math.max(8, aussen - innen) }
  }
}
