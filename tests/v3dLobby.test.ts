import { describe, expect, it, vi } from 'vitest'
import { fuelleLobby } from '../src/v3d/oberflaeche'

class ElementProbe {
  style: Record<string, string> = {}
  dataset: Record<string, string> = {}
  children: ElementProbe[] = []
  textContent = ''
  private attribute = new Map<string, string>()
  private listeners = new Map<string, () => void>()
  setAttribute(name: string, value: string) { this.attribute.set(name, value) }
  getAttribute(name: string) { return this.attribute.get(name) }
  addEventListener(name: string, listener: () => void) { this.listeners.set(name, listener) }
  click() { this.listeners.get('click')?.() }
  append(...children: ElementProbe[]) { this.children.push(...children) }
  replaceChildren(...children: ElementProbe[]) { this.children = children }
}

describe('3D-Lobby Testgelände', () => {
  it('zeigt Fahrzeuge erst nach Tippen und klappt bei jedem Öffnen wieder zu', () => {
    vi.stubGlobal('document', { createElement: () => new ElementProbe() })
    try {
      const lobby = new ElementProbe()
      const teste = vi.fn()
      const stand = { hoechstes: 1, levelAnzahl: 1, beste: {}, fahrzeuge: ['humvee', 'mecha'] }
      const fuellen = () => fuelleLobby(lobby as unknown as HTMLDivElement, stand, vi.fn(), teste)
      fuellen()
      const schalter = lobby.children[4], fahrzeuge = lobby.children[5]
      expect(schalter.textContent).toBe('▸ TESTGELÄNDE')
      expect(schalter.getAttribute('aria-expanded')).toBe('false')
      expect(fahrzeuge.style.display).toBe('none')
      expect(fahrzeuge.children.map(b => b.dataset.fahrzeug)).toEqual(['humvee', 'mecha'])
      schalter.click()
      expect(schalter.textContent).toBe('▾ TESTGELÄNDE')
      expect(schalter.getAttribute('aria-expanded')).toBe('true')
      expect(fahrzeuge.style.display).toBe('grid')
      fahrzeuge.children[1].click()
      expect(teste).toHaveBeenCalledWith('mecha')
      schalter.click()
      expect(fahrzeuge.style.display).toBe('none')
      fuellen()
      expect(lobby.children[4].textContent).toBe('▸ TESTGELÄNDE')
      expect(lobby.children[5].style.display).toBe('none')
    } finally { vi.unstubAllGlobals() }
  })
})
