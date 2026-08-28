import { BALANCE } from '../config/balance'

export type StatKey = 'hp' | 'damage' | 'shotsPerSec' | 'speed'

/** Die zwei Knoepfe im Shop zwischen den Leveln. */
export type ShopLine = 'firepower' | 'team'

export const SHOP_LINES: readonly ShopLine[] = ['firepower', 'team']

export interface ShopSteps {
  readonly firepower: number
  readonly team: number
}

export const KEINE_STUFEN: ShopSteps = { firepower: 0, team: 0 }

/** Wie viele Stufen gibt es je Linie? So viele, wie die Preisliste lang ist. */
export function getMaxShopSteps(): number {
  return BALANCE.shop.prices.length
}

/** Was kostet die naechste Stufe? undefined, wenn die Linie ausgebaut ist. */
export function getShopPrice(steps: number): number | undefined {
  if (steps < 0 || steps >= BALANCE.shop.prices.length) return undefined
  return BALANCE.shop.prices[steps]
}

/**
 * Der gekaufte Bonus auf einen Wert. Er kommt OBENDRAUF auf die Levelkurve - die bleibt
 * unveraendert (Thomas 2026-08-23: "die automatische Erhoehung pro Level ... soll
 * bleiben - das kaufen dazwischen wird zum Bonus").
 *
 * Gegnertempo (speed) ist ausgenommen: Es ist kein Spielerwert.
 */
function getShopBonus(stat: StatKey, steps: ShopSteps): number {
  if (stat === 'hp') return (1 + BALANCE.shop.teamBonusPerStep) ** steps.team
  if (stat === 'damage') return (1 + BALANCE.shop.damageBonusPerStep) ** steps.firepower
  if (stat === 'shotsPerSec') return (1 + BALANCE.shop.rateBonusPerStep) ** steps.firepower
  return 1
}

/**
 * Obergrenze eines Werts.
 *
 * Der dritte Parameter ist ABSICHTLICH voreingestellt: bossPlan und die Wandhaerte rufen
 * diese Funktion mit der reinen Levelnummer auf und sollen das weiter tun. Der Boss zieht
 * mit dem gekauften Bonus NICHT mit - genau darin besteht der Vorteil, den man kauft.
 */
/**
 * Begrenzt den Bonus auf BALANCE.meta.totalBoostCap - aber auf die FEUERKRAFT als
 * Ganzes, nicht auf jeden Wert einzeln.
 *
 * DAS IST DER PUNKT, an dem ein erster Anlauf falsch lag: Feuerkraft ist das PRODUKT
 * aus Schaden und Rate. Ein Deckel, der beide je einzeln auf 1,7 begrenzt, laesst
 * zusammen 1,7 x 1,12 = 1,90 zu - gemessen genau der Wert, mit dem ein bestehender
 * Test angeschlagen hat, nachdem der Shop von elf auf 22 Stufen erweitert wurde.
 *
 * Gedeckelt wird deshalb der Schaden, und zwar gegen den bereits vergebenen
 * Ratenbonus: damage <= cap / rate. Die Rate selbst bleibt frei - ihr Bonus ist mit
 * 1,005 je Stufe der kleinere von beiden, und zwei gegeneinander laufende Deckel waeren
 * nicht mehr nachvollziehbar.
 *
 * hp und speed sind ausgenommen: Aus der Truppengroesse entsteht keine Feuerkraft (ihr
 * Schadensbonus ist bei crowd.max Figuren ausgereizt), sie kauft Ueberlebenszeit.
 */
function begrenzeBonus(stat: StatKey, rohBonus: number, steps: ShopSteps, meta: ShopSteps): number {
  if (stat === 'hp' || stat === 'speed') return rohBonus
  if (stat === 'shotsPerSec') return rohBonus
  const ratenBonus = getShopBonus('shotsPerSec', steps) * getMetaBonus('shotsPerSec', meta)
  return Math.min(BALANCE.meta.totalBoostCap / ratenBonus, rohBonus)
}

/**
 * Dauerhafter Bonus aus den gekauften Meta-Stufen (E4, 2026-08-24).
 *
 * NUR EINE GROESSE JE LINIE, sonst wirkt der Zuwachs multiplikativ - dieselbe Regel wie
 * beim Endloswachstum: SCHLAGKRAFT geht ausschliesslich auf damage, MANNSCHAFT
 * ausschliesslich auf hp. shotsPerSec bleibt in beiden Faellen unberuehrt.
 */
export function getMetaBonus(stat: StatKey, meta: ShopSteps): number {
  if (stat === 'damage') return (1 + BALANCE.meta.firepowerBonusPerStep) ** meta.firepower
  if (stat === 'hp') return (1 + BALANCE.meta.teamBonusPerStep) ** meta.team
  return 1
}

/**
 * Was ein Tor der rechten Wand am Schaden oder an der Feuerrate aendert - als FAKTOR,
 * nicht als Betrag (Herleitung bei BALANCE.walls.gatesPerLevelStep).
 *
 * Der Deckel waechst je Level um einen festen Faktor; ein Tor bringt den
 * gatesPerLevelStep-ten Teil dieses Sprungs. Damit ist das Verhaeltnis "wie viele Tore
 * brauche ich fuer ein Level" auf jedem Level dasselbe - vorher deckte ein Tor mit
 * festem Betrag ab Level 2 den ganzen Sprung ab.
 */
export function getGateGrowth(stat: 'damage' | 'shotsPerSec'): number {
  const { capAtLevelOne, capAtLevelTwelve } = BALANCE.stats[stat]
  const levelSprung = (capAtLevelTwelve / capAtLevelOne) ** (1 / (BALANCE.level.plans.length - 1))
  return levelSprung ** (1 / BALANCE.walls.gatesPerLevelStep)
}

/** Gegenstueck fuer die roten Kacheln: der Verlust von badCostsGates guten Toren. */
export function getGateLoss(stat: 'damage' | 'shotsPerSec'): number {
  return getGateGrowth(stat) ** -BALANCE.walls.badCostsGates
}

export function getStatCap(
  stat: StatKey,
  level: number,
  steps: ShopSteps = KEINE_STUFEN,
  meta: ShopSteps = KEINE_STUFEN,
): number {
  const { capAtLevelOne, capAtLevelTwelve } = BALANCE.stats[stat]
  // Die 12 ist die LAENGE DER LEVELTABELLE, nicht eine gewaehlte Zahl - bis dorthin
  // interpoliert die Kurve, darueber uebernimmt getEndlessGrowth. Sie muss mit
  // level.endless.fromLevel uebereinstimmen; ein Test in levelPlan.test.ts haelt das
  // fest, weil ein Auseinanderlaufen eine stille Luecke oder Doppelzaehlung erzeugte.
  const letztesTabellenLevel = BALANCE.level.plans.length
  const safeLevel = Math.min(letztesTabellenLevel, Math.max(1, Math.floor(level)))
  const levelWert = capAtLevelOne === capAtLevelTwelve
    ? capAtLevelOne
    : capAtLevelOne * (capAtLevelTwelve / capAtLevelOne) ** ((safeLevel - 1) / (letztesTabellenLevel - 1))
  // Der gemeinsame Deckel begrenzt Run-Shop UND Meta zusammen (BALANCE.meta.totalBoostCap):
  // Beide wirken multiplikativ auf dieselbe Feuerkraft, und bei zwei solchen Quellen
  // potenziert sich jeder spaetere Einzelfehler. Er gilt auf dem BONUS, nicht auf dem
  // Endwert - die Levelkurve selbst bleibt unberuehrt.
  //
  // ER GILT NUR FUER DIE FEUERKRAFT, NICHT FUER DIE TRUPPE. Ein erster Anlauf legte ihn
  // auf alle Werte und wurde von einem bestehenden Test gefangen: Der volle
  // Truppenausbau bringt Faktor 2,33 und DARF das, weil aus der Truppengroesse keine
  // Feuerkraft entsteht - ihr Schadensbonus ist bei crowd.max Figuren ausgereizt. Sie
  // kauft Ueberlebenszeit, und die zu deckeln haette den Run-Shop-Knopf TRUPPE still
  // entwertet.
  const rohBonus = getShopBonus(stat, steps) * getMetaBonus(stat, meta)
  const bonus = begrenzeBonus(stat, rohBonus, steps, meta)
  return levelWert * getEndlessGrowth(stat, level) * bonus
}

/**
 * Wachstum oberhalb von level.endless.fromLevel (E1, 2026-08-24).
 *
 * NUR damage und hp wachsen weiter. shotsPerSec bleibt bewusst auf dem Level-12-Wert:
 * Feuerkraft ist das PRODUKT aus Schuetzenzahl, Truppenbonus, Schaden und Rate - ein
 * Zuwachs auf mehrere dieser Faktoren wirkt multiplikativ. Im ersten Modelllauf zu E1
 * lag er auf dreien gleichzeitig, und das Spiel wurde ab Level 25 wieder LEICHTER
 * (Verhaeltnis aus Feuerkraft und Bedarf: 0,87 bei L20, dann 5,92 bei L25). Herleitung
 * der beiden Faktoren steht bei BALANCE.stats.endless.
 *
 * speed ist Gegnertempo und kein Spielerwert - es waechst ueber level.hardness
 * (systems/speed.ts) und hat hier nichts zu suchen.
 */
function getEndlessGrowth(stat: StatKey, level: number): number {
  const { fromLevel } = BALANCE.level.endless
  const ueber = Math.max(0, Math.floor(level) - fromLevel)
  if (ueber === 0) return 1
  if (stat === 'damage') return BALANCE.stats.endless.damageGrowthPerLevel ** ueber
  if (stat === 'hp') return BALANCE.stats.endless.hpGrowthPerLevel ** ueber
  return 1
}

export function clampStat(
  stat: StatKey,
  value: number,
  level = 1,
  steps: ShopSteps = KEINE_STUFEN,
  meta: ShopSteps = KEINE_STUFEN,
): number {
  // ZWEI NACHKOMMASTELLEN statt einer (2026-08-25). Diese Rundung ist NICHT kosmetisch -
  // sie ist die Stufung, in der Schaden und Feuerrate ueberhaupt existieren. Mit einer
  // Stelle betrug die kleinste moegliche Aenderung 0,05, und alles darunter verschwand
  // spurlos: Ein Tor der rechten Wand hebt um 0,0088 bis 0,06, also blieb der Wert bei
  // jedem zweiten Fund exakt stehen. Der Verdacht lag lange auf der Anzeige - tatsaechlich
  // kam der Zuwachs nie an. Derselbe Effekt hat im Juli den Ausbau des Run-Shops auf 22
  // Stufen scheitern lassen; auch dort war es nicht die Anzeige.
  //
  // hp und speed bleiben ganzzahlig: Figuren gibt es nicht halb, und Gegnertempo in
  // Pixeln je Sekunde braucht keine Nachkommastelle.
  const roundedValue = stat === 'hp' || stat === 'speed'
    ? Math.round(value)
    : Math.round(value * 100) / 100
  const { floor } = BALANCE.stats[stat]
  // Der Deckel wird auf dieselbe Stufe gerundet wie der Wert selbst, sonst klebt der
  // erreichbare Wert eine Stufe unter der echten Grenze.
  const cap = stat === 'hp' || stat === 'speed'
    ? Math.round(getStatCap(stat, level, steps, meta))
    : Math.round(getStatCap(stat, level, steps, meta) * 100) / 100
  return Math.min(cap, Math.max(floor, roundedValue))
}

export class RunStats {
  private values!: Record<StatKey, number>
  private level = 1
  private steps: { firepower: number; team: number } = { firepower: 0, team: 0 }
  /**
   * Dauerhaft gekaufte Meta-Stufen (E4). Sie kommen aus dem Spielstand und aendern sich
   * waehrend eines Runs nicht - gekauft wird nur im Hauptmenue.
   */
  private meta: { firepower: number; team: number } = { firepower: 0, team: 0 }

  public constructor() {
    this.values = {
      hp: BALANCE.stats.hp.base,
      damage: BALANCE.stats.damage.base,
      shotsPerSec: BALANCE.stats.shotsPerSec.base,
      speed: BALANCE.stats.speed.base,
    }
  }

  public get(stat: StatKey): number {
    return this.values[stat]
  }

  /**
   * Levelwechsel. Der Deckel steigt damit; bestehende Werte bleiben unangetastet, weil
   * sie unter dem neuen, hoeheren Deckel liegen. Beim Zurueckspringen auf ein
   * niedrigeres Level (Dev-Werkzeug) werden sie nachgeklemmt.
   */
  public setLevel(level: number): void {
    this.level = Math.max(1, Math.floor(level))
    this.reclamp()
  }

  public getLevel(): number {
    return this.level
  }

  public getSteps(): ShopSteps {
    return { firepower: this.steps.firepower, team: this.steps.team }
  }

  public getMeta(): ShopSteps {
    return { firepower: this.meta.firepower, team: this.meta.team }
  }

  /**
   * Meta-Stufen aus dem Spielstand uebernehmen. Muss VOR dem ersten setLevel stehen,
   * sonst klemmt der erste Wert noch gegen den Deckel ohne Meta-Bonus.
   */
  public setMeta(meta: ShopSteps): void {
    this.meta = { firepower: Math.max(0, Math.floor(meta.firepower)), team: Math.max(0, Math.floor(meta.team)) }
    this.reclamp()
  }

  public getStepCount(line: ShopLine): number {
    return this.steps[line]
  }

  /**
   * Eine Stufe kaufen. Der Kauf hebt den Deckel UND den aktuellen Wert um denselben
   * Faktor: Wer am Deckel klebt - nach rund 40 s der Normalfall - sieht die Zahl sofort
   * springen. Ohne das fuehlt sich der Kauf verzoegert an, weil der Zuwachs erst ueber die
   * Wandbahnen nachkommen muesste.
   */
  public addStep(line: ShopLine): boolean {
    if (this.steps[line] >= getMaxShopSteps()) return false
    const betroffen: StatKey[] = line === 'team' ? ['hp'] : ['damage', 'shotsPerSec']
    // WER AM DECKEL STAND, STEHT DANACH AM NEUEN DECKEL. Nach rund 40 s Sammeln ist das
    // der Normalfall - und nur so springt die HUD-Zahl im Moment des Kaufs. Wer den
    // Deckel noch nicht erreicht hat, bekommt den Faktor auf seinen Istwert; geschenkt
    // wird nichts.
    const amDeckel = new Map(betroffen.map((stat) => [
      stat,
      this.values[stat] >= clampStat(stat, Number.MAX_SAFE_INTEGER, this.level, this.getSteps(), this.getMeta()),
    ]))
    this.steps[line] += 1
    for (const stat of betroffen) {
      const faktor = 1 + (stat === 'hp'
        ? BALANCE.shop.teamBonusPerStep
        : stat === 'damage' ? BALANCE.shop.damageBonusPerStep : BALANCE.shop.rateBonusPerStep)
      this.setRaw(stat, amDeckel.get(stat) === true
        ? clampStat(stat, Number.MAX_SAFE_INTEGER, this.level, this.getSteps(), this.getMeta())
        : this.values[stat] * faktor)
    }
    return true
  }

  public set(stat: StatKey, value: number): void {
    this.setRaw(stat, value)
  }

  private setRaw(stat: StatKey, value: number): void {
    this.values[stat] = clampStat(stat, value, this.level, this.getSteps(), this.getMeta())
  }

  private reclamp(): void {
    for (const stat of Object.keys(this.values) as StatKey[]) {
      this.values[stat] = clampStat(stat, this.values[stat], this.level, this.getSteps(), this.getMeta())
    }
  }
}

/**
 * Preis fuers Weiterspielen nach dem Scheitern (B3).
 *
 * 250 x erreichtes Level, verdoppelt sich mit jedem weiteren Mal im selben Run.
 * Gegenprobe an der gemessenen Einnahme: Ein voller Run bringt 10.454 und kostet 6.800
 * an Stufen - es bleiben rund 3.650, also etwa ein Weiterspielen je Run.
 */
export function getContinuePrice(level: number, bereitsGenutzt: number): number {
  const basis = BALANCE.continueRun.pricePerLevel * Math.max(1, Math.floor(level))
  return Math.round(basis * BALANCE.continueRun.priceDoubling ** Math.max(0, bereitsGenutzt))
}

/** Die beiden Groessen, die ein Tor der rechten Wand hebt. */
export type FirepowerStat = 'damage' | 'shotsPerSec'

export interface GateOutcome {
  /** Wohin der Zuwachs ging. undefined = beide Werte stehen am Deckel (Ueberlauf). */
  readonly stat: FirepowerStat | undefined
  /** true, wenn nicht der gewuerfelte, sondern der andere Wert gewachsen ist. */
  readonly redirected: boolean
  readonly before: number
  readonly after: number
}

/**
 * Ein GUTES Tor der rechten Wand einloesen (2026-08-28, Thomas: "gibt es bei den dmg und
 * rate waenden irgendwann ein maximum in den hoeheren leveln?").
 *
 * JA, UND ZWAR EIN HARTES: shotsPerSec waechst oberhalb von level.endless.fromLevel gar
 * nicht mehr (getEndlessGrowth gibt nur fuer damage und hp einen Faktor > 1), damage nur
 * um 0,4 % je Level. Ein Level-13-Spieler sammelt also 22 bis 46 Tore je Level ein, von
 * denen praktisch keines mehr etwas bewirkt - der Wert stand nach dem Zerschiessen exakt
 * da wie vorher. Das ist derselbe Effekt wie bei der Rundung (lessons.md 2026-08-25), nur
 * eine Ebene hoeher: Der Zugewinn kam nicht an, und niemand sah es.
 *
 * ZWEI STUFEN STATT LEERLAUF:
 *   1. UMLEITUNG. Steht der gewuerfelte Wert am Deckel, wirkt das Tor auf den anderen -
 *      mit DESSEN Wachstumsfaktor, denn getGateGrowth leitet ihn aus dem Deckelsprung
 *      des jeweiligen Werts ab (damage 1,5 -> 7, rate 3,5 -> 8, das sind verschiedene
 *      Kurven). Wer den Faktor des Ausgangswerts mitnaehme, dosierte falsch.
 *   2. UEBERLAUF. Stehen BEIDE am Deckel, gibt es keinen Statwert mehr - die Szene zahlt
 *      stattdessen Muenzen aus (BALANCE.walls.maxedCoinBonus).
 *
 * WARUM DAS DIE GEMESSENE BALANCE NICHT VERSCHIEBT: Die Deckel selbst bleiben absolut
 * unangetastet - der Endzustand eines Runs ist derselbe wie vorher. Auch die Zeit bis
 * dorthin aendert sich kaum: Beide Werte brauchen je gatesPerLevelStep (16) Tore, sie
 * teilen sich rund 30 je Level, und die Umleitung verschiebt nur, WELCHER Wert ein
 * einzelnes Tor bekommt. Der Gesamtbedarf von rund 32 Toren bleibt; was wegfaellt, ist
 * die Streuung, wenn der Wuerfel eine Seite bevorzugt. Ein Zuwachs auf mehrere Faktoren
 * eines Produkts (lessons.md 2026-08-24) entsteht hier NICHT: Es wird nie mehr als ein
 * Wert je Tor gehoben.
 *
 * ROTE KACHELN LAUFEN NICHT HIERUEBER. Ein Abzug bleibt am eigenen Wert; wuerde er
 * umgeleitet, traefe er den Wert mit Luft nach unten und die Strafe waere haerter als
 * die Belohnung.
 */
export function applyGoodGate(stats: RunStats, gewuerfelt: FirepowerStat): GateOutcome {
  const anderer: FirepowerStat = gewuerfelt === 'damage' ? 'shotsPerSec' : 'damage'
  for (const stat of [gewuerfelt, anderer]) {
    const before = stats.get(stat)
    stats.set(stat, before * getGateGrowth(stat))
    const after = stats.get(stat)
    // GEPRUEFT WIRD DER TATSAECHLICHE ZUWACHS, nicht "steht der Wert am Deckel". Damit
    // faengt dieselbe Abfrage auch den Fall ab, in dem der Zuwachs an der Stufung von
    // clampStat verschwindet - genau der Fehler vom 2026-08-25.
    if (after > before) return { stat, redirected: stat !== gewuerfelt, before, after }
  }
  return { stat: undefined, redirected: false, before: stats.get(gewuerfelt), after: stats.get(gewuerfelt) }
}

/** Stehen beide Feuerkraftwerte am Deckel? Steuert die Beschriftung der Kachel. */
export function isFirepowerMaxed(stats: RunStats): boolean {
  const level = stats.getLevel()
  const steps = stats.getSteps()
  const meta = stats.getMeta()
  return (['damage', 'shotsPerSec'] as const).every(
    (stat) => stats.get(stat) >= clampStat(stat, Number.MAX_SAFE_INTEGER, level, steps, meta),
  )
}
