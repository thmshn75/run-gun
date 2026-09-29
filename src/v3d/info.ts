import text from '../../docs/lizenzen.md?raw'

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
