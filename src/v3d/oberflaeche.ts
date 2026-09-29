import { baueInfo } from './info'

let container: HTMLDivElement | null = null

function knopf(text: string, position: Partial<CSSStyleDeclaration>): HTMLButtonElement {
  const button = document.createElement('button')
  button.textContent = text
  Object.assign(button.style, { position: 'absolute', minWidth: '44px', minHeight: '44px', padding: '8px 12px', background: '#193a59', color: 'white', border: '2px solid #a8d9ff', borderRadius: '8px', fontWeight: 'bold', touchAction: 'manipulation', userSelect: 'none', webkitTouchCallout: 'none' }, position)
  return button
}

export function zeigeOberflaeche(zurueck: () => void, messen: () => void, level: number, fingerAktiv: () => boolean = () => false, beiInfo?: () => void, beiInfoEnde?: () => void) {
  if (!container) {
    container = document.createElement('div')
    Object.assign(container.style, { position: 'fixed', inset: '0', zIndex: '11', pointerEvents: 'none', color: 'white', fontFamily: 'system-ui' })
    document.body.appendChild(container)
  }
  container.replaceChildren()
  container.style.display = 'block'
  const back = knopf('ZURÜCK', { top: 'calc(env(safe-area-inset-top) + 8px)', left: 'calc(env(safe-area-inset-left) + 8px)' })
  const infoButton = knopf('INFO', { top: 'calc(env(safe-area-inset-top) + 8px)', right: 'calc(env(safe-area-inset-right) + 8px)' })
  const { tafel: info, messen: measure } = baueInfo(beiInfoEnde)
  const levelText = document.createElement('div')
  levelText.textContent = `Level ${level}`
  Object.assign(levelText.style, { position: 'absolute', top: 'calc(env(safe-area-inset-top) + 20px)', left: '50%', transform: 'translateX(-50%)', fontWeight: 'bold' })
  const results = document.createElement('div')
  Object.assign(results.style, { position: 'absolute', top: 'calc(env(safe-area-inset-top) + 64px)', left: '8px', right: '8px', maxHeight: '42vh', overflowY: 'auto', padding: '8px', background: '#122436dd', fontSize: '12px', whiteSpace: 'pre-wrap', display: 'none', touchAction: 'pan-y' })
  const zahlen = document.createElement('div')
  Object.assign(zahlen.style, { position: 'absolute', top: 'calc(env(safe-area-inset-top) + 54px)', left: '8px', fontSize: '12px', textShadow: '0 1px 2px black' })
  const ende = document.createElement('div')
  Object.assign(ende.style, { display: 'none', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', minWidth: '220px', padding: '20px', background: '#122436ee', textAlign: 'center', pointerEvents: 'auto' })
  const nochmal = knopf('NOCHMAL', { position: 'static', margin: '8px' })
  const endeZurueck = knopf('ZURÜCK', { position: 'static', margin: '8px' })
  const endeText = document.createElement('div')
  ende.append(endeText, nochmal, endeZurueck)
  for (const element of [back, infoButton, measure, info, results]) element.style.pointerEvents = 'auto'
  back.addEventListener('click', () => { if (!fingerAktiv()) zurueck() })
  infoButton.addEventListener('click', () => { if (fingerAktiv()) return; info.style.display = 'block'; beiInfo?.() })
  measure.addEventListener('click', () => { info.style.display = 'none'; beiInfoEnde?.(); messen() })
  endeZurueck.addEventListener('click', zurueck)
  container.append(back, infoButton, levelText, zahlen, results, info, ende)
  return { messen: measure, ergebnisse: results, info, zahlen, ende, endeText, nochmal, endeZurueck }
}

export function versteckeOberflaeche(): void { if (container) container.style.display = 'none' }
