export interface ScoreEntry {
  coins: number
  level: number
  timeMs: number
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
}

export interface SaveData {
  version: 1
  coins: number
  highestLevel: number
  scores: ScoreEntry[]
  /** Fehlt, wenn kein Run offen ist. */
  run?: RunSnapshot
}

const SAVE_KEY = 'rungun_save_v1'
const BACKUP_SAVE_KEY = 'rungun_save_v1_backup'
const MAX_SCORES = 10

export function defaultSave(): SaveData {
  return {
    version: 1,
    coins: 0,
    highestLevel: 1,
    scores: [],
  }
}

export function loadSave(): SaveData {
  try {
    const primary = readStoredSave(SAVE_KEY)
    if (primary !== undefined) return primary

    const backup = readStoredSave(BACKUP_SAVE_KEY)
    if (backup === undefined) return defaultSave()
    writeSave(backup)
    return backup
  } catch {
    return defaultSave()
  }
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
      })),
      ...(run === undefined ? {} : { run }),
    },
  }
}

function isRunSnapshot(value: unknown): value is RunSnapshot {
  if (!isRecord(value)) return false
  const zahlen: Array<keyof RunSnapshot> = [
    'level', 'hp', 'damage', 'shotsPerSec', 'firepowerSteps', 'teamSteps',
    'runCoins', 'bookedCoins', 'continuesUsed',
  ]
  return zahlen.every((feld) => isNonNegativeNumber(value[feld]))
    && typeof value.weapon === 'string'
    && (value.level as number) >= 1
}

export function serializeSave(data: SaveData): string {
  return JSON.stringify(data)
}

export function resetSave(): SaveData {
  const reset = defaultSave()
  writeSave(reset)
  return reset
}

export function addScore(data: SaveData, entry: ScoreEntry): SaveData {
  const scores = [...data.scores.map(copyScore), copyScore(entry)]
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
  return { coins: entry.coins, level: entry.level, timeMs: entry.timeMs }
}
