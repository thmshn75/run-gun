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
  const bonus = stat === 'hp' || stat === 'speed'
    ? rohBonus
    : Math.min(BALANCE.meta.totalBoostCap, rohBonus)
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
  const roundedValue = stat === 'hp' || stat === 'speed'
    ? Math.round(value)
    : Math.round(value * 10) / 10
  const { floor } = BALANCE.stats[stat]
  // Der Deckel wird auf dieselbe Stufe gerundet wie der Wert selbst, sonst zeigt die
  // Anzeige einen Wert, der eine Nachkommastelle unter der echten Grenze klebt.
  const cap = stat === 'hp' || stat === 'speed'
    ? Math.round(getStatCap(stat, level, steps, meta))
    : Math.round(getStatCap(stat, level, steps, meta) * 10) / 10
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
