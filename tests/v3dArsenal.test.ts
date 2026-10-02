import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LEVELS } from '../src/v3d/balance3d'
import { ladeArsenal, speichereArsenal, standardArsenal } from '../src/v3d/speicher'
import { laufLevel } from '../src/v3d/einstieg'
import { leereStufen, wendeArsenalAn } from '../src/v3d/werkstatt'
import { fuelleArsenal, fuelleLobby } from '../src/v3d/oberflaeche'

const werte = new Map<string, string>()
beforeEach(() => {
  werte.clear()
  vi.stubGlobal('localStorage', { getItem: (key: string) => werte.get(key) ?? null, setItem: (key: string, wert: string) => { werte.set(key, wert) } })
})

class ElementProbe {
  style: Record<string, string> = {}
  dataset: Record<string, string> = {}
  children: ElementProbe[] = []
  textContent = ''
  disabled = false
  private listeners = new Map<string, () => void>()
  setAttribute() {}
  addEventListener(art: string, fn: () => void) { this.listeners.set(art, fn) }
  click() { if (!this.disabled) this.listeners.get('click')?.() }
  append(...children: ElementProbe[]) { this.children.push(...children) }
  replaceChildren(...children: ElementProbe[]) { this.children = children }
}

describe('Arsenal', () => {
  it('akzeptiert nur die vollständige Permutation und lässt den 2D-Spielstand bytegleich', () => {
    const alt = ' { "roh" : [1,2] } '
    werte.set('rungun_save_v1', alt)
    const standard = standardArsenal()
    expect(ladeArsenal().reihenfolge).toEqual(standard)
    for (const roh of ['{', 'null', '{}', JSON.stringify({ version: 2, reihenfolge: standard }), JSON.stringify({ version: 1, reihenfolge: standard.slice(0, 4) }), JSON.stringify({ version: 1, reihenfolge: [...standard.slice(0, 4), standard[0]] }), JSON.stringify({ version: 1, reihenfolge: [...standard.slice(0, 4), 'fremd'] })]) {
      werte.set('rg3d.arsenal.v1', roh)
      expect(ladeArsenal().reihenfolge).toEqual(standard)
    }
    const neu = [...standard].reverse()
    expect(speichereArsenal(neu)).toBe(true)
    expect(ladeArsenal().reihenfolge).toEqual(neu)
    expect(werte.get('rungun_save_v1')).toBe(alt)
    expect(speichereArsenal(['mecha'])).toBe(false)
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('gesperrt') }, setItem: () => { throw Error('gesperrt') } })
    expect(ladeArsenal().reihenfolge).toEqual(standard)
    expect(speichereArsenal(neu)).toBe(false)
    vi.unstubAllGlobals()
    werte.delete('rg3d.arsenal.v1')
    vi.stubGlobal('localStorage', { getItem: (key: string) => werte.get(key) ?? null, setItem: () => {} })
    expect(speichereArsenal(standard)).toBe(false)
    vi.unstubAllGlobals()
  })

  it('wendet die Reihenfolge rein nach den Werkstatt-Stufen an, außer bei Direktstart', () => {
    const original = structuredClone(LEVELS)
    const basis = structuredClone(LEVELS[0])
    Object.freeze(basis); Object.freeze(basis.saeulen)
    const neu = ['mecha', 'humvee', 'panzer', 'haubitze', 'hubschrauber']
    const angepasst = wendeArsenalAn(basis, neu)
    expect(angepasst).not.toBe(basis)
    expect(angepasst.saeulen).not.toBe(neu)
    expect(angepasst.saeulen).toEqual(neu)
    werte.set('rg3d.werkstatt.v1', JSON.stringify({ version: 1, muenzen: 0, stufen: { ...leereStufen(), truppe: 1, eis: 1 } }))
    expect(speichereArsenal(neu)).toBe(true)
    expect(laufLevel(1, null, false).saeulen).toEqual(neu)
    expect(laufLevel(1, null, false).T0).toBe(basis.T0 + 5)
    expect(laufLevel(1, 'mecha', false).saeulen).toEqual(neu)
    expect(laufLevel(1, 'mecha', false).P).toBe(10)
    expect(laufLevel(1, null, true).saeulen).toEqual(original[0].saeulen)
    expect(laufLevel(1, null, true).T0).toBe(basis.T0)
    expect(LEVELS).toEqual(original)
  })

  it('verschiebt Platz 5 nach 4, speichert sofort und startet aus der Lobby damit', () => {
    vi.stubGlobal('document', { createElement: () => new ElementProbe() })
    try {
      const arsenal = new ElementProbe(), lobby = new ElementProbe()
      let gestartet: string[] = []
      const zeigeLobby = () => fuelleLobby(lobby as unknown as HTMLDivElement,
        { hoechstes: 1, levelAnzahl: 1, beste: {}, fahrzeuge: [] },
        () => { gestartet = laufLevel(1, null, false).saeulen }, () => {},
        () => {}, () => fuelleArsenal(arsenal as unknown as HTMLDivElement, zeigeLobby))
      zeigeLobby()
      expect(lobby.children[3].children[2].textContent).toBe('ARSENAL')
      lobby.children[3].children[2].click()
      expect(arsenal.children[0].children[1].textContent).toBe('ARSENAL')
      expect(arsenal.children[1].textContent).toBe('Reihenfolge der Eis-Säulen — die oberste kommt zuerst')
      expect(arsenal.children[3].children[0].children[1].disabled).toBe(true)
      expect(arsenal.children[3].children[4].children[2].disabled).toBe(true)
      expect(arsenal.children[3].children[4].style.minHeight).toBe('56px')
      expect(arsenal.children[3].children[4].children[1].style.minHeight).toBe('44px')
      arsenal.children[3].children[4].children[1].click()
      expect(ladeArsenal().reihenfolge).toEqual(['humvee', 'haubitze', 'panzer', 'mecha', 'hubschrauber'])
      expect(arsenal.children[3].children[3].children[0].textContent).toBe('4. MECHA')
      arsenal.children[5].click()
      lobby.children[3].children[0].click()
      expect(gestartet).toEqual(ladeArsenal().reihenfolge)
      fuelleArsenal(arsenal as unknown as HTMLDivElement, zeigeLobby)
      arsenal.children[4].click()
      expect(ladeArsenal().reihenfolge).toEqual(standardArsenal())
    } finally { vi.unstubAllGlobals() }
  })

  it('zeigt einen Schreibfehler in der Ansicht', () => {
    vi.stubGlobal('document', { createElement: () => new ElementProbe() })
    vi.stubGlobal('localStorage', { getItem: (key: string) => werte.get(key) ?? null, setItem: () => { throw Error('gesperrt') } })
    try {
      const arsenal = new ElementProbe()
      fuelleArsenal(arsenal as unknown as HTMLDivElement, () => {})
      arsenal.children[3].children[4].children[1].click()
      expect(arsenal.children[2].textContent).toBe('Speichern nicht möglich')
      expect(ladeArsenal().reihenfolge).toEqual(standardArsenal())
    } finally { vi.unstubAllGlobals() }
  })
})
