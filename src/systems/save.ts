export interface ScoreEntry {
  coins: number
  level: number
  timeMs: number
}

export interface SaveData {
  version: 1
  coins: number
  upgrades: {
    team: number
    damage: number
    rate: number
  }
  highestLevel: number
  scores: ScoreEntry[]
  runsSinceExport: number
}

const SAVE_KEY = 'rungun_save_v1'
const BACKUP_SAVE_KEY = 'rungun_save_v1_backup'
const MAX_UPGRADE_LEVEL = 5
const MAX_SCORES = 10

export function defaultSave(): SaveData {
  return {
    version: 1,
    coins: 0,
    upgrades: { team: 0, damage: 0, rate: 0 },
    highestLevel: 1,
    scores: [],
    runsSinceExport: 0,
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
    // This only repairs one damaged local entry. Both keys are in the same localStorage; deleting website data or the Home Screen app removes both copies, and SICHERN is the only recovery for that.
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
  if (!isNonNegativeNumber(value.coins) || !isFiniteNumberAtLeast(value.highestLevel, 1) || (value.runsSinceExport !== undefined && !isNonNegativeNumber(value.runsSinceExport))) {
    return { ok: false, reason: 'Spielstand enthält ungültige Zahlen.' }
  }
  if (!isRecord(value.upgrades) || !isUpgradeLevel(value.upgrades.team) || !isUpgradeLevel(value.upgrades.damage) || !isUpgradeLevel(value.upgrades.rate)) {
    return { ok: false, reason: 'Spielstand enthält ungültige Stufen.' }
  }
  if (!Array.isArray(value.scores) || value.scores.length > MAX_SCORES || !value.scores.every(isScoreEntry)) {
    return { ok: false, reason: 'Bestenliste ist ungültig.' }
  }

  return {
    ok: true,
    data: {
      version: 1,
      coins: clampNonNegative(value.coins),
      upgrades: {
        team: clampUpgradeLevel(value.upgrades.team),
        damage: clampUpgradeLevel(value.upgrades.damage),
        rate: clampUpgradeLevel(value.upgrades.rate),
      },
      highestLevel: Math.max(1, value.highestLevel),
      scores: value.scores.map((entry) => ({
        coins: clampNonNegative(entry.coins),
        level: clampNonNegative(entry.level),
        timeMs: clampNonNegative(entry.timeMs),
      })),
      runsSinceExport: value.runsSinceExport === undefined ? 0 : clampNonNegative(value.runsSinceExport),
    },
  }
}

export function serializeSave(data: SaveData): string {
  return JSON.stringify(data)
}

export function addScore(data: SaveData, entry: ScoreEntry): SaveData {
  const scores = [...data.scores.map(copyScore), copyScore(entry)]
    .sort((left, right) => right.coins - left.coins)
    .slice(0, MAX_SCORES)
  return { ...data, upgrades: { ...data.upgrades }, scores }
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

function isUpgradeLevel(value: unknown): value is number {
  return isNonNegativeNumber(value) && value <= MAX_UPGRADE_LEVEL
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

function clampUpgradeLevel(value: number): number {
  return Math.min(MAX_UPGRADE_LEVEL, clampNonNegative(value))
}

function copyScore(entry: ScoreEntry): ScoreEntry {
  return { coins: entry.coins, level: entry.level, timeMs: entry.timeMs }
}
