import { beforeEach, describe, expect, it, vi } from 'vitest'
import { aktualisiereLetzteMessung, baueInfo, ladeLetzteMessung, speichereLetzteMessung } from '../src/v3d/info'
import { bereiteMessAnzeige, zeigeMessErgebnis } from '../src/v3d/messung'

class ElementAttrappe {
  style: Record<string, string> = {}
  dataset: Record<string, string> = {}
  children: ElementAttrappe[] = []
  textContent = ''
  scrollTop = 12
  events = new Map<string, () => void>()
  appendChild(kind: ElementAttrappe) { this.children.push(kind); return kind }
  insertBefore(kind: ElementAttrappe, vor: ElementAttrappe | null) {
    const index = vor ? this.children.indexOf(vor) : -1
    this.children.splice(index < 0 ? this.children.length : index, 0, kind)
    return kind
  }
  replaceChildren(...kinder: ElementAttrappe[]) { this.children = kinder }
  addEventListener(art: string, fn: () => void) { this.events.set(art, fn) }
  click() { this.events.get('click')?.() }
  querySelector<T>(suche: string): T | null {
    const schluessel = suche === '[data-letzte-messung]' ? 'letzteMessung' : 'messergebnis'
    return (this.children.find(kind => kind.dataset[schluessel]) ?? null) as T | null
  }
}

const werte = new Map<string, string>()
beforeEach(() => {
  werte.clear()
  vi.stubGlobal('localStorage', { getItem: (key: string) => werte.get(key) ?? null, setItem: (key: string, wert: string) => { werte.set(key, wert) } })
  vi.stubGlobal('document', { createElement: () => new ElementAttrappe() })
})

describe('3D-Messergebnis', () => {
  it('ist waehrend der Messung durchlaessig und danach scrollbar und schliessbar', () => {
    const anzeige = new ElementAttrappe()
    const offen = vi.fn()
    bereiteMessAnzeige(anzeige as unknown as HTMLElement)
    expect(anzeige.style.pointerEvents).toBe('none')
    zeigeMessErgebnis(anzeige as unknown as HTMLElement, 'Vollstaendiges Ergebnis', offen)
    expect(anzeige.style).toMatchObject({ pointerEvents: 'auto', touchAction: 'pan-y', overflowY: 'auto', overscrollBehavior: 'contain' })
    expect(anzeige.children[0].textContent).toBe('SCHLIESSEN')
    expect(anzeige.children[0].style).toMatchObject({ minWidth: '44px', minHeight: '44px' })
    expect(anzeige.children[1].textContent).toBe('Vollstaendiges Ergebnis')
    expect(offen).toHaveBeenCalledWith(true)
    anzeige.children[0].click()
    expect(anzeige.style.pointerEvents).toBe('none')
    expect(anzeige.style.display).toBe('none')
    expect(offen).toHaveBeenLastCalledWith(false)
  })

  it('speichert Text und Zeitpunkt; gesperrter Speicher unterbricht nichts', () => {
    speichereLetzteMessung('alle Stufen')
    expect(werte.has('rg3d-letzte-messung')).toBe(true)
    expect(ladeLetzteMessung()).toContain('alle Stufen')
    expect(ladeLetzteMessung()).toMatch(/\d{4}/)
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('gesperrt') }, setItem: () => { throw Error('gesperrt') } })
    expect(() => speichereLetzteMessung('weiter')).not.toThrow()
    expect(ladeLetzteMessung()).toBeNull()
  })

  it('zeigt den INFO-Knopf nur bei gespeichertem Ergebnis und laedt es in die Tafel', () => {
    const tafel = baueInfo().tafel as unknown as ElementAttrappe
    expect(tafel.querySelector('[data-letzte-messung]')).toBeNull()
    speichereLetzteMessung('Dauertest sichtbar')
    aktualisiereLetzteMessung(tafel as unknown as HTMLElement)
    const knopf = tafel.querySelector<ElementAttrappe>('[data-letzte-messung]')
    expect(knopf?.textContent).toBe('Letzte Messung')
    knopf?.click()
    expect(tafel.querySelector<ElementAttrappe>('[data-messergebnis]')?.textContent).toContain('Dauertest sichtbar')
    expect(tafel.style.overflowY).toBe('auto')
  })
})
