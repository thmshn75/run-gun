import { WERKSTATT, type WerkstattArt } from './balance3d'
import { leereStufen, preis, type Stufen } from './werkstatt'

const WERKSTATT_SCHLUESSEL = 'rg3d.werkstatt.v1'
export interface WerkstattKonto { version: 1; muenzen: number; stufen: Stufen }
const leeresKonto = (): WerkstattKonto => ({ version: 1, muenzen: 0, stufen: leereStufen() })

export function ladeWerkstatt(): WerkstattKonto {
  try {
    const roh: unknown = JSON.parse(localStorage.getItem(WERKSTATT_SCHLUESSEL) ?? 'null')
    if (typeof roh !== 'object' || roh === null || (roh as { version?: unknown }).version !== 1) return leeresKonto()
    const daten = roh as { muenzen?: unknown; stufen?: unknown }
    const stufen = leereStufen()
    const werte = typeof daten.stufen === 'object' && daten.stufen !== null ? daten.stufen as Record<string, unknown> : {}
    for (const art of Object.keys(stufen) as WerkstattArt[]) {
      const wert = werte[art]
      if (Number.isInteger(wert) && (wert as number) >= 0 && (wert as number) <= WERKSTATT[art].maximum) stufen[art] = wert as number
    }
    const n = daten.muenzen
    return { version: 1, muenzen: Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 999999 ? n as number : 0, stufen }
  } catch { return leeresKonto() }
}

export function bucheMuenzen(n: number): number {
  if (!Number.isInteger(n) || n <= 0) return 0
  const konto = ladeWerkstatt()
  const neu = Math.min(999999, konto.muenzen + n)
  try {
    localStorage.setItem(WERKSTATT_SCHLUESSEL, JSON.stringify({ ...konto, muenzen: neu }))
    return Math.max(0, ladeWerkstatt().muenzen - konto.muenzen)
  } catch { return 0 }
}

export function kaufe(art: WerkstattArt): boolean {
  if (!(art in WERKSTATT)) return false
  const konto = ladeWerkstatt()
  const kosten = preis(art, konto.stufen[art])
  if (kosten === null || konto.muenzen < kosten) return false
  const neu: WerkstattKonto = { version: 1, muenzen: konto.muenzen - kosten, stufen: { ...konto.stufen, [art]: konto.stufen[art] + 1 } }
  try {
    localStorage.setItem(WERKSTATT_SCHLUESSEL, JSON.stringify(neu))
    const gelesen = ladeWerkstatt()
    return gelesen.muenzen === neu.muenzen && Object.keys(neu.stufen).every(key => gelesen.stufen[key as WerkstattArt] === neu.stufen[key as WerkstattArt])
  } catch { return false }
}

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
