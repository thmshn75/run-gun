import text from '../../docs/lizenzen.md?raw'

const SCHLUESSEL = 'rg3d-letzte-messung'

export function speichereLetzteMessung(ergebnis: string): void {
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify({ zeit: new Date().toLocaleString('de-AT'), ergebnis })) } catch { /* privater Speicher kann gesperrt sein */ }
}

export function ladeLetzteMessung(): string | null {
  try {
    const roh = localStorage.getItem(SCHLUESSEL)
    if (!roh) return null
    const wert: unknown = JSON.parse(roh)
    if (!wert || typeof wert !== 'object' || !('zeit' in wert) || !('ergebnis' in wert) || typeof wert.zeit !== 'string' || typeof wert.ergebnis !== 'string') return null
    return `${wert.zeit}\n\n${wert.ergebnis}`
  } catch { return null }
}

export function aktualisiereLetzteMessung(tafel: HTMLElement): void {
  if (!ladeLetzteMessung()) return
  const vorhanden = tafel.querySelector<HTMLButtonElement>('[data-letzte-messung]')
  if (vorhanden) return
  const knopf = document.createElement('button')
  knopf.dataset.letzteMessung = '1'
  knopf.textContent = 'Letzte Messung'
  Object.assign(knopf.style, { minWidth: '44px', minHeight: '44px', marginLeft: '12px', touchAction: 'manipulation' })
  knopf.addEventListener('click', () => {
    const ergebnis = ladeLetzteMessung()
    if (!ergebnis) return
    let ausgabe = tafel.querySelector<HTMLElement>('[data-messergebnis]')
    if (!ausgabe) {
      ausgabe = document.createElement('div')
      ausgabe.dataset.messergebnis = '1'
      Object.assign(ausgabe.style, { whiteSpace: 'pre-wrap', overflowY: 'auto', touchAction: 'pan-y', overscrollBehavior: 'contain' })
      tafel.insertBefore(ausgabe, knopf.nextSibling)
    }
    ausgabe.textContent = ergebnis
    tafel.scrollTop = 0
  })
  tafel.insertBefore(knopf, tafel.children[2] ?? null)
}

export function baueInfo(beiSchliessen?: () => void): { tafel: HTMLElement; messen: HTMLButtonElement } {
  const tafel = document.createElement('section')
  Object.assign(tafel.style, { display: 'none', position: 'absolute', inset: 'calc(env(safe-area-inset-top) + 56px) 12px calc(env(safe-area-inset-bottom) + 70px)', padding: '16px', overflowY: 'auto', touchAction: 'pan-y', overscrollBehavior: 'contain', background: '#172231', color: 'white', borderRadius: '12px', whiteSpace: 'pre-wrap' })
  const schliessen = document.createElement('button')
  schliessen.textContent = 'SCHLIESSEN'
  Object.assign(schliessen.style, { minWidth: '44px', minHeight: '44px', touchAction: 'manipulation' })
  schliessen.addEventListener('click', () => { tafel.style.display = 'none'; beiSchliessen?.() })
  tafel.appendChild(schliessen)
  const messen = document.createElement('button')
  messen.textContent = 'Leistung messen'
  Object.assign(messen.style, { minWidth: '44px', minHeight: '44px', marginLeft: '12px', touchAction: 'manipulation' })
  tafel.appendChild(messen)
  aktualisiereLetzteMessung(tafel)
  for (const zeile of text.split(/\r?\n/)) {
    const inhalt = zeile.trim()
    if (!inhalt) continue
    if (inhalt.includes('|')) {
      const teile = inhalt.split('|').map(teil => teil.trim()).filter(Boolean)
      if (teile.every(teil => /^:?-+:?$/.test(teil)) || teile.some(teil => /^(Modell|Quelle|Lizenz|Titel|Urheber)$/i.test(teil))) continue
      const li = document.createElement('li')
      li.textContent = teile.join(' · ')
      tafel.appendChild(li)
    } else {
      const p = document.createElement('p')
      p.textContent = inhalt
      tafel.appendChild(p)
    }
  }
  return { tafel, messen }
}
