import { BALANCE } from '../config/balance'

export interface ScoreEntry {
  coins: number
  level: number
  timeMs: number
  /**
   * Welcher Run diesen Eintrag erzeugt hat (E1, 2026-08-24). OPTIONAL: Eintraege aus der
   * Zeit vor V4 haben ihn nicht, und ein fehlender Wert ist nie ein Fehler.
   *
   * Er existiert, weil "SPEICHERN & BEENDEN" seit V4 einen Eintrag schreibt. Ohne die
   * Kennung wuerde derselbe Run bei jedem Beenden einen WEITEREN Eintrag anlegen - wer
   * ueber mehrere Abende an einem Endlos-Run spielt, haette die Zehnerliste nach fuenf
   * Abenden allein mit seinem laufenden Run gefuellt.
   */
  runId?: number
}

/**
 * Ein angefangener Run, gesichert an der LEVELGRENZE (B3, Thomas 2026-08-23: "die
 * Moeglichkeit aufzuhoeren und spaeter an dieser Stelle weiterspielen").
 *
 * Mitten im Level zu sichern hiesse, Gegner im Anflug, Wandkette, Bossphase und alle
 * Objekt-Pools mitzuschreiben - ein Vielfaches an Aufwand und die haeufigste Quelle
 * kaputter Spielstaende. An der Levelgrenze ist der Zustand klein und vollstaendig.
 */
export interface RunSnapshot {
  level: number
  hp: number
  damage: number
  shotsPerSec: number
  weapon: string
  /** Gekaufte Shop-Stufen je Linie. */
  firepowerSteps: number
  teamSteps: number
  /** Bisher im Run gesammelte Muenzen - fuer die Bestenliste. */
  runCoins: number
  /** Davon schon aufs Konto gebucht. */
  bookedCoins: number
  /** Wie oft in diesem Run schon weitergespielt wurde. */
  continuesUsed: number
  /**
   * Kennung dieses Runs fuer die Bestenliste (E1, 2026-08-24). OPTIONAL, damit ein
   * Spielstand aus V3 nicht verworfen wird - isRunSnapshot prueft ihn deshalb NICHT.
   */
  runId?: number
}

export interface SaveData {
  version: 1
  coins: number
  highestLevel: number
  scores: ScoreEntry[]
  /** Fehlt, wenn kein Run offen ist. */
  run?: RunSnapshot
  /**
   * Marker fuer die einmalige V4-Umstellung (E1, 2026-08-24). FEHLEND HEISST "noch
   * nicht migriert", nie ein Fehler - dieselbe Regel wie beim 'run'- und beim
   * entfernten 'upgrades'-Feld.
   */
  v4Migrated?: true
  /**
   * Dauerhaft gekaufte Meta-Stufen (E4, 2026-08-24). Sie ueberleben jeden Run.
   *
   * FEHLEND HEISST 0, nie ein Fehler - dieselbe Regel wie beim 'run'-Feld, beim
   * entfernten 'upgrades'-Feld und beim v4Migrated-Marker. Diese Falle war dem Projekt
   * schon zweimal fast die ganze Bestenliste eines bespielten Geraets wert.
   */
  metaFirepowerSteps?: number
  metaTeamSteps?: number
}

const SAVE_KEY = 'rungun_save_v1'
const BACKUP_SAVE_KEY = 'rungun_save_v1_backup'
const MAX_SCORES = 10

export function defaultSave(): SaveData {
  // Ein frischer Spielstand ist bereits auf V4-Stand: Es gibt nichts zurueckzustufen und
  // keine Bestenliste zu leeren. Ohne den Marker liefe er beim naechsten Laden durch die
  // Migration, was zwar folgenlos waere, den Marker aber wertlos machen wuerde.
  return {
    version: 1,
    coins: 0,
    highestLevel: 1,
    scores: [],
    v4Migrated: true,
  }
}

/**
 * DIE EINMALIGE V4-UMSTELLUNG (E1, 2026-08-24). Reine Funktion, ohne localStorage.
 *
 * Zwei Eingriffe, beide an DENSELBEN Marker gekoppelt:
 *
 * 1. Ein offener Run oberhalb von level.endless.fromLevel wird auf dieses Level
 *    zurueckgestuft. Werte, Waffe, gekaufte Stufen und Muenzen bleiben. Grund: Bennis
 *    Run stand auf Level 16, was unter V3 die Gegnermischung von Level 4 bedeutete -
 *    nach E1 bedeutet es die haerteste Mischung des Spiels plus vier Level Aufschlag.
 *    Seine Werte liegen als feste Zahlen im RunSnapshot und werden beim Fortsetzen
 *    NICHT neu gerechnet; er saesse also mit einem Level-4-Charakter in einem
 *    Level-16-Endloslevel.
 *
 * 2. Die Bestenliste wird geleert (Thomas 2026-08-24: "leeren"). Bennis Level-16-Eintrag
 *    entstand unter dem Modulo-Fehler: eingefrorene Hoechstwerte gegen Level-1-Gegner,
 *    also eine Farm-Situation. Ein so erzielter Muenzstand stuende ueber allem, was unter
 *    der haerteren V4-Kurve noch erreichbar ist.
 *
 * DIE KOPPLUNG AN DEN MARKER IST NICHT OPTIONAL. Ohne ihn wuerde die Liste bei JEDEM
 * Start geleert - und schlimmer: jeder spaetere, ehrlich erspielte Endlos-Run wuerde bei
 * jedem Laden auf Level 12 zurueckgestuft. Der Fehler waere weit groesser als das
 * Problem, das die Migration loest.
 *
 * DAS KONTO BLEIBT UNANGETASTET - Benni hat es erspielt, und E4 baut darauf auf.
 */
export function migrateToV4(data: SaveData): { data: SaveData; changed: boolean } {
  if (data.v4Migrated === true) return { data, changed: false }
  const grenze = BALANCE.level.endless.fromLevel
  const run = data.run === undefined || data.run.level <= grenze
    ? data.run
    : { ...data.run, level: grenze }
  return {
    data: { ...data, scores: [], ...(run === undefined ? {} : { run }), v4Migrated: true },
    changed: true,
  }
}

export function loadSave(): SaveData {
  try {
    const primary = readStoredSave(SAVE_KEY)
    if (primary !== undefined) return migrateAndPersist(primary)

    const backup = readStoredSave(BACKUP_SAVE_KEY)
    if (backup === undefined) return defaultSave()
    const migriert = migrateToV4(backup)
    writeSave(migriert.data)
    return migriert.data
  } catch {
    return defaultSave()
  }
}

/**
 * Migriert und schreibt das Ergebnis SOFORT zurueck. Ohne das Zurueckschreiben liefe die
 * Migration bei jedem Laden erneut - der Marker wuerde nie im Speicher landen und die
 * Bestenliste bei jedem Start neu geleert.
 */
function migrateAndPersist(data: SaveData): SaveData {
  const { data: migriert, changed } = migrateToV4(data)
  if (changed) writeSave(migriert)
  return migriert
}

export function writeSave(data: SaveData): void {
  try {
    const text = serializeSave(data)
    localStorage.setItem(SAVE_KEY, text)
    // Thomas hat bewusst keinen Ausleseweg: Werden Websitedaten gelöscht oder die Homescreen-App entfernt, gehen beide lokalen Kopien verloren.
    localStorage.setItem(BACKUP_SAVE_KEY, text)
  } catch {
    if (import.meta.env.DEV) console.warn('Spielstand konnte nicht gespeichert werden.')
  }
}

export function parseSave(text: string): { ok: true; data: SaveData } | { ok: false; reason: string } {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'Text ist kein gültiger Spielstand.' }
  }
  if (!isRecord(value)) return { ok: false, reason: 'Text ist kein gültiger Spielstand.' }
  if (value.version !== 1) return { ok: false, reason: 'Spielstand stammt aus einer anderen Version.' }
  if (!isNonNegativeNumber(value.coins) || !isFiniteNumberAtLeast(value.highestLevel, 1)) {
    return { ok: false, reason: 'Spielstand enthält ungültige Zahlen.' }
  }
  // Der Upgrade-Shop ist am 2026-08-23 entfallen (Thomas: "Den Shop kannst du
  // streichen"). Ein vorhandenes 'upgrades'-Feld aus einem aelteren Spielstand wird
  // ABSICHTLICH nur ignoriert und nicht mehr geprueft: Wuerde hier weiter validiert,
  // verloere ein Geraet mit altem Stand seine Bestenliste - und genau die ist das
  // einzige, was ohne Shop noch dauerhaft zaehlt.
  if (!Array.isArray(value.scores) || value.scores.length > MAX_SCORES || !value.scores.every(isScoreEntry)) {
    return { ok: false, reason: 'Bestenliste ist ungültig.' }
  }

  // Der offene Run wird BEWUSST nur gelesen, wenn er vollstaendig ist, und sonst
  // stillschweigend verworfen - nie als Fehler behandelt. Ein Spielstand aus der Zeit vor
  // B3 hat das Feld nicht, und die Bestenliste eines bespielten Geraets darf daran nicht
  // scheitern (dieselbe Falle wie beim entfernten 'upgrades'-Feld, 2026-08-23).
  const run = isRunSnapshot(value.run) ? { ...value.run } : undefined

  // DEN MARKER DURCHREICHEN, sonst geht er beim naechsten Schreib-/Lesezyklus verloren
  // und die Bestenliste wird bei JEDEM Start geleert. Genau wie beim 'run'-Feld gilt:
  // alles ausser exakt true heisst "noch nicht migriert" - nie ein Fehler, nie ein Grund,
  // den Spielstand abzulehnen.
  const v4Migrated = value.v4Migrated === true ? (true as const) : undefined

  // Meta-Stufen: alles, was keine brauchbare Zahl ist, gilt als 0. Ein Spielstand darf
  // daran NIE scheitern.
  const metaStufe = (wert: unknown): number => (isNonNegativeNumber(wert) ? Math.floor(wert) : 0)

  return {
    ok: true,
    data: {
      version: 1,
      coins: clampNonNegative(value.coins),
      highestLevel: Math.max(1, value.highestLevel),
      scores: value.scores.map((entry) => ({
        coins: clampNonNegative(entry.coins),
        level: clampNonNegative(entry.level),
        timeMs: clampNonNegative(entry.timeMs),
        ...(isNonNegativeNumber(entry.runId) ? { runId: entry.runId } : {}),
      })),
      ...(run === undefined ? {} : { run }),
      ...(v4Migrated === undefined ? {} : { v4Migrated }),
      // Nur aufnehmen, wenn tatsaechlich etwas gekauft wurde - wie beim 'run'-Feld und
      // beim v4Migrated-Marker. Ein Spielstand ohne Meta-Kaeufe sieht damit aus wie
      // vorher, und der gespeicherte Text bleibt klein.
      ...(metaStufe(value.metaFirepowerSteps) > 0 ? { metaFirepowerSteps: metaStufe(value.metaFirepowerSteps) } : {}),
      ...(metaStufe(value.metaTeamSteps) > 0 ? { metaTeamSteps: metaStufe(value.metaTeamSteps) } : {}),
    },
  }
}

/** Gekaufte Meta-Stufen einer Linie. Fehlend = 0. */
export function getMetaSteps(data: SaveData, line: 'firepower' | 'team'): number {
  const wert = line === 'firepower' ? data.metaFirepowerSteps : data.metaTeamSteps
  return typeof wert === 'number' && Number.isFinite(wert) && wert > 0
    ? Math.min(Math.floor(wert), BALANCE.meta.prices.length)
    : 0
}

/** Preis der naechsten Stufe. undefined, wenn die Linie ausgebaut ist. */
export function getMetaPrice(steps: number): number | undefined {
  if (steps < 0 || steps >= BALANCE.meta.prices.length) return undefined
  return BALANCE.meta.prices[steps]
}

function isRunSnapshot(value: unknown): value is RunSnapshot {
  // runId wird BEWUSST nicht geprueft: Ein V3-Spielstand hat das Feld nicht, und ein
  // fehlendes neues Feld darf einen Spielstand nie verwerfen (die Falle vom 2026-08-23).
  if (!isRecord(value)) return false
  const zahlen: Array<keyof RunSnapshot> = [
    'level', 'hp', 'damage', 'shotsPerSec', 'firepowerSteps', 'teamSteps',
    'runCoins', 'bookedCoins', 'continuesUsed',
  ]
  return zahlen.every((feld) => isNonNegativeNumber(value[feld]))
    && typeof value.weapon === 'string'
    && (value.level as number) >= 1
}

/** Kennung fuer einen neu begonnenen Run. */
export function createRunId(): number {
  return Date.now()
}

export function serializeSave(data: SaveData): string {
  return JSON.stringify(data)
}

export function resetSave(): SaveData {
  const reset = defaultSave()
  writeSave(reset)
  return reset
}

/**
 * Einen Eintrag in die Bestenliste aufnehmen.
 *
 * Traegt der neue Eintrag eine Run-Kennung, ERSETZT er einen vorhandenen Eintrag
 * desselben Runs, statt danebengestellt zu werden. Seit "SPEICHERN & BEENDEN" einen
 * Eintrag schreibt (E1), erzeugt ein ueber mehrere Abende gespielter Run sonst bei jedem
 * Beenden einen weiteren - und weil der Muenzstand innerhalb eines Runs nur waechst,
 * waeren es lauter schlechtere Fassungen desselben Laufs. Eintraege ohne Kennung
 * (aus V3) werden nie ersetzt.
 */
export function addScore(data: SaveData, entry: ScoreEntry): SaveData {
  const ohneSelbenRun = entry.runId === undefined
    ? data.scores
    : data.scores.filter((score) => score.runId !== entry.runId)
  const scores = [...ohneSelbenRun.map(copyScore), copyScore(entry)]
    .sort((left, right) => right.coins - left.coins)
    .slice(0, MAX_SCORES)
  return { ...data, scores }
}

export function qualifiesForScores(data: SaveData, coins: number): boolean {
  if (data.scores.length < MAX_SCORES) return true
  const lowestScore = data.scores.reduce((lowest, entry) => Math.min(lowest, entry.coins), Infinity)
  return coins > lowestScore
}

function readStoredSave(key: string): SaveData | undefined {
  const text = localStorage.getItem(key)
  if (text === null) return undefined
  const parsed = parseSave(text)
  return parsed.ok ? parsed.data : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isFiniteNumberAtLeast(value: unknown, minimum: number): value is number {
  return isNonNegativeNumber(value) && value >= minimum
}


function isScoreEntry(value: unknown): value is ScoreEntry {
  return isRecord(value)
    && isNonNegativeNumber(value.coins)
    && isNonNegativeNumber(value.level)
    && isNonNegativeNumber(value.timeMs)
}

function clampNonNegative(value: number): number {
  return Math.max(0, value)
}


function copyScore(entry: ScoreEntry): ScoreEntry {
  return {
    coins: entry.coins,
    level: entry.level,
    timeMs: entry.timeMs,
    ...(entry.runId === undefined ? {} : { runId: entry.runId }),
  }
}
