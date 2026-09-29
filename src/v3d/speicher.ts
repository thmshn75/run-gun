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
