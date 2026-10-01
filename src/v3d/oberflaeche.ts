import { baueInfo } from './info'

let container: HTMLDivElement | null = null

export function statusZeile(level: number, zeit: number, T: number, F: number, welle: number, wellen: number): string {
  return `Level ${level} · ${zeit.toFixed(1)} s · T ${Math.floor(T)} · F ${Math.floor(F)} · Welle ${welle}/${wellen}`
}

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
  Object.assign(results.style, { position: 'absolute', top: 'calc(env(safe-area-inset-top) + 64px)', bottom: 'calc(env(safe-area-inset-bottom) + 8px)', left: '8px', right: '8px', overflowY: 'auto', overscrollBehavior: 'contain', padding: '8px', background: '#122436dd', fontSize: '12px', whiteSpace: 'pre-wrap', display: 'none', touchAction: 'pan-y' })
  const zahlen = document.createElement('div')
  Object.assign(zahlen.style, { position: 'absolute', top: 'calc(env(safe-area-inset-top) + 54px)', left: '8px', fontSize: '12px', textShadow: '0 1px 2px black' })
  const ende = document.createElement('div')
  Object.assign(ende.style, { display: 'none', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', minWidth: '220px', padding: '20px', background: '#122436ee', textAlign: 'center', pointerEvents: 'auto' })
  const nochmal = knopf('NOCHMAL', { position: 'static', margin: '8px' })
  const weiter = knopf('WEITER', { position: 'static', margin: '8px' })
  const endeZurueck = knopf('LOBBY', { position: 'static', margin: '8px' })
  const endeText = document.createElement('div')
  ende.append(endeText, nochmal, weiter, endeZurueck)
  const lobby = document.createElement('div')
  Object.assign(lobby.style, { display: 'none', position: 'absolute', top: 'calc(env(safe-area-inset-top) + 60px)', bottom: 'calc(env(safe-area-inset-bottom) + 12px)', left: '12px', right: '12px', overflowY: 'auto', overscrollBehavior: 'contain', padding: '14px', background: '#0f1e2ef0', borderRadius: '12px', pointerEvents: 'auto', touchAction: 'pan-y', textAlign: 'center' })
  for (const element of [back, infoButton, measure, info, results]) element.style.pointerEvents = 'auto'
  levelText.style.pointerEvents = 'none'
  back.addEventListener('click', () => { if (!fingerAktiv()) zurueck() })
  infoButton.addEventListener('click', () => { if (fingerAktiv()) return; info.style.display = 'block'; beiInfo?.() })
  measure.addEventListener('click', () => { info.style.display = 'none'; beiInfoEnde?.(); messen() })
  container.append(back, infoButton, levelText, zahlen, results, info, ende, lobby)
  return { messen: measure, ergebnisse: results, info, zahlen, ende, endeText, nochmal, weiter, endeZurueck, lobby, levelText }
}

export function versteckeOberflaeche(): void { if (container) container.style.display = 'none' }

export interface LobbyStand { hoechstes: number; levelAnzahl: number; beste: Record<number, { zeit: number; besiegt: number }>; fahrzeuge: readonly string[] }
export function lobbyZeit(s: number): string { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` }
/** Füllt die 3D-Lobby: Level-Karte (gesperrte grau), Testgelände je Fahrzeug, beste Läufe. */
export function fuelleLobby(lobby: HTMLDivElement, stand: LobbyStand, spiele: (level: number) => void, teste: (fahrzeug: string) => void): void {
  const ueberschrift = (text: string) => { const h = document.createElement('div'); h.textContent = text; Object.assign(h.style, { fontWeight: '900', fontSize: '15px', letterSpacing: '1px', margin: '14px 0 8px', color: '#a8d9ff' }); return h }
  const titel = document.createElement('div'); titel.textContent = 'RUN GUN 3D'
  Object.assign(titel.style, { fontWeight: '900', fontSize: '28px', letterSpacing: '2px', textShadow: '0 2px 6px black' })
  const karte = document.createElement('div')
  Object.assign(karte.style, { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' })
  for (let n = 1; n <= stand.levelAnzahl; n++) {
    const frei = n <= stand.hoechstes
    const b = knopf(frei ? String(n) : '🔒', { position: 'static', padding: '10px 0', fontSize: '18px' })
    b.dataset.level = String(n)
    if (stand.beste[n]) { b.style.borderColor = '#ffd34d'; b.title = 'geschafft' }
    if (n === stand.hoechstes) b.style.background = '#2a6aa3'
    b.disabled = !frei
    if (!frei) { b.style.opacity = '.45' }
    b.addEventListener('click', () => { if (frei) spiele(n) })
    karte.append(b)
  }
  const start = knopf(`SPIELEN · LEVEL ${stand.hoechstes}`, { position: 'static', width: '100%', marginTop: '12px', fontSize: '17px', background: '#2a6aa3' })
  start.addEventListener('click', () => spiele(stand.hoechstes))
  const test = document.createElement('div')
  Object.assign(test.style, { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' })
  for (const name of stand.fahrzeuge) {
    const b = knopf(name.toLocaleUpperCase('de-DE'), { position: 'static', fontSize: '13px' })
    b.dataset.fahrzeug = name
    b.addEventListener('click', () => teste(name))
    test.append(b)
  }
  const liste = document.createElement('div')
  Object.assign(liste.style, { fontSize: '14px', lineHeight: '1.6' })
  const geschafft = Object.keys(stand.beste).map(Number).sort((a, b) => a - b)
  liste.textContent = geschafft.length ? '' : 'Noch kein Level geschafft.'
  for (const n of geschafft) { const z = document.createElement('div'); z.textContent = `Level ${n} · ${lobbyZeit(stand.beste[n].zeit)} · ${Math.round(stand.beste[n].besiegt)} Zombies`; liste.append(z) }
  lobby.replaceChildren(titel, ueberschrift('LEVEL'), karte, start, ueberschrift('TESTGELÄNDE'), test, ueberschrift('BESTE LÄUFE'), liste)
}
