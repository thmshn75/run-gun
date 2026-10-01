const SCHLUESSEL = 'rg3d.v1'
export interface Fortschritt { version: 1; hoechstesLevel: number }
const anfang = (): Fortschritt => ({ version: 1, hoechstesLevel: 1 })

export function ladeFortschritt(): Fortschritt {
  try {
    const wert = localStorage.getItem(SCHLUESSEL)
    if (!wert) return anfang()
    const daten: unknown = JSON.parse(wert)
    if (typeof daten !== 'object' || daten === null) return anfang()
    const stand = daten as Record<string, unknown>
    if (stand.version !== 1 || !Number.isInteger(stand.hoechstesLevel) || (stand.hoechstesLevel as number) < 1) return anfang()
    return { version: 1, hoechstesLevel: stand.hoechstesLevel as number }
  } catch { return anfang() }
}

export function speichereFortschritt(level: number): void {
  try {
    if (Number.isInteger(level) && level >= 1) localStorage.setItem(SCHLUESSEL, JSON.stringify({ version: 1, hoechstesLevel: level }))
  } catch { /* Privater Modus kann Schreiben verbieten. */ }
}

// D7: beste Siege je Level (eigener Schlüssel, Vorsatz rg3d.; kaputt/fehlend = leer).
const BESTE = 'rg3d.beste.v1'
export interface Bestlauf { zeit: number; besiegt: number }
export function ladeBestlaeufe(): Record<number, Bestlauf> {
  try {
    const daten: unknown = JSON.parse(localStorage.getItem(BESTE) ?? 'null')
    if (typeof daten !== 'object' || daten === null || (daten as Record<string, unknown>).version !== 1) return {}
    const roh = (daten as { level?: unknown }).level
    if (typeof roh !== 'object' || roh === null) return {}
    const ergebnis: Record<number, Bestlauf> = {}
    for (const [k, v] of Object.entries(roh as Record<string, unknown>)) {
      const n = Number(k), b = v as Partial<Bestlauf>
      if (Number.isInteger(n) && n >= 1 && typeof b?.zeit === 'number' && Number.isFinite(b.zeit) && typeof b.besiegt === 'number' && Number.isFinite(b.besiegt)) ergebnis[n] = { zeit: b.zeit, besiegt: b.besiegt }
    }
    return ergebnis
  } catch { return {} }
}
/** Merkt einen Sieg; gibt true zurück, wenn er schneller war als der bisher beste. */
export function merkeSieg(level: number, lauf: Bestlauf, levelAnzahl: number): boolean {
  const beste = ladeBestlaeufe(), alt = beste[level], neu = !alt || lauf.zeit < alt.zeit
  if (neu) beste[level] = lauf
  try { localStorage.setItem(BESTE, JSON.stringify({ version: 1, level: beste })) } catch { /* Privater Modus */ }
  const frei = Math.min(levelAnzahl, level + 1)
  if (frei > ladeFortschritt().hoechstesLevel) speichereFortschritt(frei)
  return neu
}
