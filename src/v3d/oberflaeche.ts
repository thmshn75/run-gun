import { baueInfo } from './info'
import { WERKSTATT, type WerkstattArt } from './balance3d'
import { kaufe, ladeWerkstatt } from './speicher'
import { preis } from './werkstatt'

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
  const werkstatt = document.createElement('div')
  Object.assign(werkstatt.style, { display: 'none', position: 'absolute', top: 'calc(env(safe-area-inset-top) + 60px)', bottom: 'calc(env(safe-area-inset-bottom) + 12px)', left: '12px', right: '12px', overflowY: 'auto', overscrollBehavior: 'contain', padding: '14px', background: '#0f1e2ef0', borderRadius: '12px', pointerEvents: 'auto', touchAction: 'pan-y', textAlign: 'center', fontSize: '16px' })
  for (const element of [back, infoButton, measure, info, results]) element.style.pointerEvents = 'auto'
  levelText.style.pointerEvents = 'none'
  back.addEventListener('click', () => { if (!fingerAktiv()) zurueck() })
  infoButton.addEventListener('click', () => { if (fingerAktiv()) return; info.style.display = 'block'; beiInfo?.() })
  measure.addEventListener('click', () => { info.style.display = 'none'; beiInfoEnde?.(); messen() })
  container.append(back, infoButton, levelText, zahlen, results, info, ende, lobby, werkstatt)
  return { messen: measure, ergebnisse: results, info, zahlen, ende, endeText, nochmal, weiter, endeZurueck, lobby, werkstatt, levelText }
}

export function versteckeOberflaeche(): void { if (container) container.style.display = 'none' }

export interface LobbyStand { hoechstes: number; levelAnzahl: number; beste: Record<number, { zeit: number; besiegt: number }>; fahrzeuge: readonly string[]; muenzen?: number }
export function lobbyZeit(s: number): string { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` }
/** Füllt die 3D-Lobby: Level-Karte (gesperrte grau), Testgelände je Fahrzeug, beste Läufe. */
export function fuelleLobby(lobby: HTMLDivElement, stand: LobbyStand, spiele: (level: number) => void, teste: (fahrzeug: string) => void, oeffneWerkstatt?: () => void): void {
  const ueberschrift = (text: string) => { const h = document.createElement('div'); h.textContent = text; Object.assign(h.style, { fontWeight: '900', fontSize: '15px', letterSpacing: '1px', margin: '14px 0 8px', color: '#a8d9ff' }); return h }
  const titel = document.createElement('div'); titel.textContent = `RUN GUN 3D · ¢ ${stand.muenzen ?? 0}`
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
  const startBlock = document.createElement('div')
  startBlock.append(start)
  if (oeffneWerkstatt) {
    const werkstattKnopf = knopf('WERKSTATT', { position: 'static', width: '100%', marginTop: '8px', fontSize: '17px' })
    werkstattKnopf.addEventListener('click', oeffneWerkstatt)
    startBlock.append(werkstattKnopf)
  }
  const test = document.createElement('div')
  Object.assign(test.style, { display: 'none', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' })
  const testSchalter = knopf('▸ TESTGELÄNDE', { position: 'static', width: '100%', margin: '14px 0 8px', textAlign: 'left' })
  testSchalter.setAttribute('aria-expanded', 'false')
  testSchalter.addEventListener('click', () => {
    const offen = test.style.display === 'none'
    test.style.display = offen ? 'grid' : 'none'
    testSchalter.textContent = `${offen ? '▾' : '▸'} TESTGELÄNDE`
    testSchalter.setAttribute('aria-expanded', String(offen))
  })
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
  lobby.replaceChildren(titel, ueberschrift('LEVEL'), karte, startBlock, testSchalter, test, ueberschrift('BESTE LÄUFE'), liste)
}

const TEXTE: Record<WerkstattArt, [string, string]> = {
  truppe: ['Startsoldaten', '+5 Startsoldaten je Stufe'],
  feuer: ['Truppenfeuer', '+10 % Schaden je Stufe'],
  eis: ['Dünneres Eis', '10 % weniger Eis je Stufe'],
  panzer: ['Panzer', 'Ein Schuss mehr vor der Fahrt'],
  haubitze: ['Haubitze', 'Ein Einschlag mehr'],
  humvee: ['Humvee', 'Fährt 4 Sekunden länger'],
  hubschrauber: ['Hubschrauber', 'Bleibt 4 Sekunden länger'],
  mecha: ['Mecha', 'Eine Raketensalve mehr'],
}

export function fuelleWerkstatt(element: HTMLDivElement, zurueck: () => void, fehler = false): void {
  const konto = ladeWerkstatt()
  const back = () => { const b = knopf('ZURÜCK', { position: 'static', fontSize: '16px' }); b.addEventListener('click', zurueck); return b }
  const oben = document.createElement('div')
  Object.assign(oben.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' })
  const titel = document.createElement('strong'); titel.textContent = `WERKSTATT · ¢ ${konto.muenzen}`
  oben.append(back(), titel)
  const meldung = document.createElement('div')
  meldung.textContent = fehler ? 'Speichern nicht möglich' : ''
  Object.assign(meldung.style, { color: '#ff9c8f', minHeight: '24px' })
  const liste = document.createElement('div')
  Object.assign(liste.style, { display: 'grid', gap: '8px', textAlign: 'left' })
  for (const art of Object.keys(WERKSTATT) as WerkstattArt[]) {
    const stufe = konto.stufen[art], max = WERKSTATT[art].maximum, kosten = preis(art, stufe)
    const zeile = document.createElement('div')
    Object.assign(zeile.style, { minHeight: '56px', padding: '8px', background: '#193a59', borderRadius: '8px', fontSize: '16px' })
    const name = document.createElement('strong'); name.textContent = `${TEXTE[art][0]} · ${stufe}/${max}${stufe === max ? ' ✓' : ''}`
    const wirkung = document.createElement('div'); wirkung.textContent = TEXTE[art][1]
    const kaufen = knopf(kosten === null ? '✓' : `KAUFEN · ¢ ${kosten}`, { position: 'static', width: '100%', marginTop: '6px', fontSize: '16px' })
    kaufen.style.boxSizing = 'border-box'
    kaufen.disabled = kosten === null || konto.muenzen < kosten
    if (kaufen.disabled) kaufen.style.opacity = '.45'
    kaufen.addEventListener('click', () => fuelleWerkstatt(element, zurueck, !kaufe(art)))
    zeile.append(name, wirkung, kaufen); liste.append(zeile)
  }
  element.replaceChildren(oben, meldung, liste, back())
}
