import type Phaser from 'phaser'
import type * as THREE from 'three'
import * as Drei from 'three'
import { holeRenderer, entferneRenderer } from './renderer'
import { baueSzene, gibSzeneFrei } from './szene'
import { DATEIEN_FEHLER, type Welt } from './szene'
import { passeKameraAn } from './kamera'
import { leseWasserStufe } from './wasser'
import { statusZeile, zeigeOberflaeche, versteckeOberflaeche, fuelleLobby, setzeEinheitenBanner } from './oberflaeche'
import { ladeFortschritt, ladeBestlaeufe, merkeSieg } from './speicher'
import { bricheAb, messBild, messungLaeuft, starteMessung, zeigeMessErgebnis } from './messung'
import { aktualisiereLetzteMessung, speichereLetzteMessung } from './info'
import { FingerSteuerung } from './steuerung'
import { PruefDiagnose, SpielLauf, WeltDarstellung } from './lauf'
import { LEVELS, type Level } from './balance3d'
import { starteEinheit, type Zustand } from './rechnung'
import type { SpezialName } from './balance3d'

export function pruefEinsatz(suche: string): SpezialName[] {
  const p = new URLSearchParams(suche)
  if (p.get('pruefung') !== '1') return []
  const namen: SpezialName[] = []
  for (const name of (p.get('einsatz') ?? '').split(',')) {
    if ((name === 'panzer' || name === 'haubitze' || name === 'humvee' || name === 'hubschrauber' || name === 'mecha') && !namen.includes(name)) namen.push(name)
    if (namen.length === 5) break
  }
  return namen
}

export function eisPruefLevel(suche: string, basis: Level = LEVELS[0]): Level {
  const p = new URLSearchParams(suche)
  if (p.get('pruefung') !== '1') return basis
  let level = basis
  const roh = p.get('eis')
  if (roh && /^(?:[1-9][0-9]{0,4}|100000)$/.test(roh)) level = { ...level, P: Number(roh) }
  // D6: kurzer Lauf zum Ansehen von Sieg und Niederlage (Endboss nach 10 s).
  if (p.get('schnell') === '1') level = { ...level, wellen: [{ t: 0, groesse: 60 }, { t: 5, groesse: 60 }], B_mini: 100, eliteBossZeit: 10, B_elite: 400 }
  return level
}

export interface EndeStatistik { besiegt: number; maxT: number }
export function zaehleEnde(stat: EndeStatistik, ereignisse: readonly { art: string; menge: number }[], T: number): void {
  for (const e of ereignisse) if (e.art === 'zombieGefallen' || e.art === 'spezialTreffer') stat.besiegt += e.menge
  stat.maxT = Math.max(stat.maxT, T)
}
/** D7: Mit Prüf- oder Messparametern startet der Lauf direkt, sonst zuerst die Lobby. */
export function direktStart(suche: string): boolean {
  const p = new URLSearchParams(suche)
  return p.has('pruefung') || p.has('nahaufnahme')
}
export const TEST_FAHRZEUGE: readonly SpezialName[] = ['humvee', 'haubitze', 'panzer', 'hubschrauber', 'mecha']
/** Testgelände: Level 1, Säulen fallen schnell (P 10), das gewählte Fahrzeug startet sofort. */
export function testLevel(): Level { return { ...LEVELS[0], P: 10 } }
export const ENDE_VERZOEGERUNG_MS = { sieg: 2500, niederlage: 2000 } as const
export function endeTafel(ergebnis: 'sieg' | 'niederlage', t: number, saeulen: number, stat: EndeStatistik): { titel: string; zeilen: string[] } {
  return {
    titel: ergebnis === 'sieg' ? 'SIEG' : 'NIEDERLAGE',
    zeilen: [`Zeit ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`, `Zombies besiegt ${Math.round(stat.besiegt)}`, `Säulen gebrochen ${saeulen}`, `Größte Truppe ${Math.floor(stat.maxT)}`],
  }
}

export function pruefEisansicht(suche: string): 'normal' | 'ohneeis' | 'ohnefahrzeug' | 'maske' {
  const p = new URLSearchParams(suche)
  const wert = p.get('eisansicht')
  return p.get('pruefung') === '1' && (wert === 'ohneeis' || wert === 'ohnefahrzeug' || wert === 'maske') ? wert : 'normal'
}

export function startePruefEinsatz(zustand: Zustand, suche: string, abdeckungSichtbar: boolean): boolean {
  if (abdeckungSichtbar) return false
  const einsatz = pruefEinsatz(suche)
  if (!einsatz.length) return true
  einsatz.forEach(name => starteEinheit(zustand, name))
  return true
}

let aktiv = false
let dauerhaftAngefragt = false
declare global { interface Window { __rg3dAktiv?: boolean } }

export async function starte3D(game: Phaser.Game, beimSchliessen: (hinweis?: string) => void): Promise<void> {
  if (aktiv) return
  aktiv = true
  window.__rg3dAktiv = true
  let renderer: THREE.WebGLRenderer | undefined
  let scene: THREE.Scene | undefined
  let camera: THREE.PerspectiveCamera | undefined
  let welt: Welt | null = null
  let beendet = false
  let letzterFrame = 0
  let bildZaehler = 0
  const eisansicht = pruefEisansicht(location.search)
  let maskenMaterial: Drei.MeshBasicMaterial | null = null
  let eisTrefferZeit: number | null = null, eisFallZeit: number | null = null
  let eisProgrammeVor = 0, eisProgrammeNach = 0, eisDiagFertig = false
  let eisTrefferMax: number | null = null
  const eisBilder: { zeit: number; ms: number }[] = []
  let spielzeit = 0
  let fallRunde = -1
  let finger: FingerSteuerung | null = null
  let lauf: SpielLauf | null = null
  let darstellung: WeltDarstellung | null = null
  let pruefDiagnose = pruefEinsatz(location.search).some(name => name === 'haubitze' || name === 'panzer')
    ? new PruefDiagnose(new URLSearchParams(location.search).get('vorwaermen') !== '0') : null
  let pruefEnde: number | null = null
  let pruefAngezeigt = false
  let pruefEinsatzAusstehend = false
  let levelNr = 1
  let testFahrzeug: SpezialName | null = null
  let testAusstehend = false
  const direkt = direktStart(location.search)
  let infoOffen = false
  let ergebnisOffen = false
  let endeTimer: ReturnType<typeof setTimeout> | undefined
  let endeStat: EndeStatistik = { besiegt: 0, maxT: 0 }
  let endeAnzeigeUm: number | null = null
  let offlineTimer: ReturnType<typeof setTimeout> | undefined
  let ui: ReturnType<typeof zeigeOberflaeche>
  const canvas = game.canvas
  const groesse = () => {
    if (!aktiv || !renderer || !camera) return
    renderer.setSize(innerWidth, innerHeight, false)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    if (welt?.nahaufnahme) { camera.aspect = innerWidth / innerHeight; camera.fov = 35; camera.position.y = 1.95; camera.position.z = Math.max(3.8, 2.9 / (2 * Math.tan(17.5 * Math.PI / 180) * camera.aspect)); camera.lookAt(0, 0.95, 0); camera.updateProjectionMatrix() }
    else passeKameraAn(camera, innerWidth, innerHeight)
    if (welt?.wasser.stufe === 2) welt.wasser.wechsle(2)
  }
  const vorwaermenEffekte = () => {
    if (!renderer || !scene || !camera || !darstellung || new URLSearchParams(location.search).get('vorwaermen') === '0') return
    const { explosionen, blitze } = darstellung.einsatz
    explosionen.vorwaermen(); blitze.vorwaermen()
    welt?.eis.vorwaermen()
    try { renderer.compile(scene, camera) }
    finally { explosionen.zuruecksetzen(); blitze.setze([], camera); welt?.eis.nachVorwaermen() }
  }
  const sichtbar = () => {
    if (!renderer || beendet) return
    if (document.hidden) {
      if (messungLaeuft()) bricheAb('Abgebrochen – Unterbrechung, bitte neu starten')
      renderer.setAnimationLoop(null)
      letzterFrame = 0
    } else renderer.setAnimationLoop(zeichne)
  }
  const kontextVerloren = (event: Event) => {
    event.preventDefault()
    verlasse('Grafik wurde zurückgesetzt')
    entferneRenderer()
  }
  const zeichne = (jetzt: number) => {
    if (!renderer || !scene || !camera || beendet) return
    const dt = letzterFrame ? Math.max(0, jetzt - letzterFrame) : 0
    letzterFrame = jetzt
    pruefDiagnose?.vorBild(jetzt, renderer.info.programs?.length ?? 0)
    const pausiert = infoOffen || ergebnisOffen || messungLaeuft() || document.hidden
    const sek = Number.isFinite(dt) ? Math.min(.1,dt/1000) : 0
    if (!pausiert && sek > 0) {
      spielzeit += sek
      welt?.wasser.aktualisiere(sek)
      welt?.zombieMasse.aktualisiere(spielzeit)
      welt?.truppe.aktualisiere(spielzeit)
      welt?.laufTrupp.aktualisiere(spielzeit)
      welt?.front.aktualisiere(spielzeit)
      welt?.miniboss.aktualisiere(sek)
      welt?.eliteboss.aktualisiere(sek)
      if (lauf && !welt?.nahaufnahme) {
        darstellung?.setzeBild(bildZaehler)
        const ereignisse = lauf.schritt(sek, finger?.ziel ?? null)
        if (eisansicht === 'normal' && new URLSearchParams(location.search).get('pruefung') === '1') {
          if (eisTrefferZeit === null && ereignisse.some(e => e.art === 'saeuleTreffer')) { eisTrefferZeit = jetzt; eisProgrammeVor = renderer.info.programs?.length ?? 0 }
          if (eisFallZeit === null && ereignisse.some(e => e.art === 'einheitFrei')) eisFallZeit = jetzt
        }
        ui.zahlen.textContent = statusZeile(levelNr, lauf.zustand.t, lauf.zustand.T, lauf.zustand.F, lauf.zustand.gestarteteWellen, lauf.zustand.level.wellen.length)
        zaehleEnde(endeStat, ereignisse, lauf.zustand.T)
        if (ereignisse.some(e=>e.art==='sieg'||e.art==='niederlage')) {
          if (pruefDiagnose) pruefEnde = jetzt
          finger?.gibFrei(); finger=null
          endeAnzeigeUm = jetzt + ENDE_VERZOEGERUNG_MS[lauf.zustand.ergebnis === 'sieg' ? 'sieg' : 'niederlage']
        }
        if (endeAnzeigeUm !== null && jetzt >= endeAnzeigeUm && lauf.zustand.ergebnis !== 'laeuft') {
          endeAnzeigeUm = null
          const tafel = endeTafel(lauf.zustand.ergebnis, lauf.zustand.t, lauf.zustand.saeulenIndex, endeStat)
          const zaehlt = !testFahrzeug && !direkt
          if (lauf.zustand.ergebnis === 'sieg' && zaehlt) {
            const vorher = ladeFortschritt().hoechstesLevel
            if (merkeSieg(levelNr, { zeit: lauf.zustand.t, besiegt: endeStat.besiegt }, LEVELS.length)) tafel.zeilen.push('Neue Bestzeit!')
            if (ladeFortschritt().hoechstesLevel > vorher) tafel.zeilen.push(`Level ${levelNr + 1} freigeschaltet`)
          }
          ui.weiter.style.display = lauf.zustand.ergebnis === 'sieg' && zaehlt && levelNr < LEVELS.length ? 'inline-block' : 'none'
          ui.endeZurueck.style.display = direkt ? 'none' : 'inline-block'
          ui.endeText.replaceChildren()
          const titel = document.createElement('div')
          titel.textContent = tafel.titel
          Object.assign(titel.style, { fontSize: '40px', fontWeight: '900', letterSpacing: '2px', marginBottom: '10px', color: lauf.zustand.ergebnis === 'sieg' ? '#ffd34d' : '#ff5a4d', textShadow: '0 2px 6px black' })
          ui.endeText.append(titel, ...tafel.zeilen.map(z => { const d = document.createElement('div'); d.textContent = z; d.style.fontSize = '16px'; d.style.margin = '3px 0'; return d }))
          ui.ende.style.display='block'
          ui.nochmal.disabled=true;ui.endeZurueck.disabled=true;ui.weiter.disabled=true
          endeTimer=setTimeout(()=>{ui.nochmal.disabled=false;ui.endeZurueck.disabled=false;ui.weiter.disabled=false},700)
        }
      }
    }
    if (welt?.nahaufnahme && !welt.soldatNahaufnahme && !pausiert) welt.zombieMasse.setze([-0.85, 0, 0.85].map((x, i) => ({ x, z: 0, dreh: spielzeit * Math.PI / 4, variante: i, groesse: 1 })))
    if (welt?.soldatNahaufnahme && !pausiert) {
      const runde=Math.floor(spielzeit/3)
      if(runde!==fallRunde){welt.truppe.setze([]);fallRunde=runde}
      welt.truppe.setze([-1.5,-.5,.5,1.5].map((x,i)=>({x,z:0,dreh:spielzeit*Math.PI/4,bewegung:(['laufen','stehen','schiessen','fallen'] as const)[i]})))
    }
    if (welt && eisansicht !== 'normal') {
      if (eisansicht === 'ohneeis') { welt.miniaturen.forEach(m => { (m.userData.huelle as Drei.Group).visible = false }); welt.eis.auflage.visible = false; welt.eis.splitter.visible = false }
      if (eisansicht === 'ohnefahrzeug') welt.miniaturen.forEach(m => m.traverse(o => { if (o instanceof Drei.Mesh && o.name !== 'eishuelle-teil') o.visible = false }))
      if (eisansicht === 'maske') {
        maskenMaterial ??= new Drei.MeshBasicMaterial({ color: '#ffffff', depthWrite: true })
        scene.background = new Drei.Color('#000000')
        scene.traverse(o => {
          if (o instanceof Drei.Mesh || o instanceof Drei.Sprite) {
            if (o.name === 'eishuelle-teil') { o.visible = true; (o as Drei.Mesh).material = maskenMaterial! }
            else o.visible = false
          }
        })
      }
    }
    renderer.render(scene, camera)
    bildZaehler++
    if (new URLSearchParams(location.search).get('pruefung') === '1') {
      eisBilder.push({ zeit: jetzt, ms: dt })
      while (eisBilder.length && jetzt - eisBilder[0].zeit > 1500) eisBilder.shift()
    }
    if (eisTrefferZeit !== null && !eisDiagFertig) {
      const max = (zeit: number) => Math.max(0, ...eisBilder.filter(b => Math.abs(b.zeit - zeit) <= 500).map(b => b.ms))
      if (eisTrefferMax === null && jetzt - eisTrefferZeit >= 500) eisTrefferMax = max(eisTrefferZeit)
      if (eisFallZeit !== null && jetzt - eisFallZeit >= 300) eisProgrammeNach = renderer.info.programs?.length ?? 0
      if (eisFallZeit !== null && jetzt - eisFallZeit >= 500) {
        speichereLetzteMessung(`Eis: erstes Trefferbild ±0,5 s ${(eisTrefferMax ?? max(eisTrefferZeit)).toFixed(1)} ms · erstes Zerspringen ±0,5 s ${max(eisFallZeit).toFixed(1)} ms · Programme ${eisProgrammeVor} vor Treffer / ${eisProgrammeNach} nach Zerspringen · Vorwärmen ${new URLSearchParams(location.search).get('vorwaermen') === '0' ? 'aus' : 'an'}`)
        aktualisiereLetzteMessung(ui.info); eisDiagFertig = true
      }
    }
    if (pruefDiagnose && darstellung) {
      pruefDiagnose.bild(jetzt, dt, renderer.info.programs?.length ?? 0, darstellung.einsatz)
      if (pruefEnde !== null && !pruefAngezeigt && jetzt - pruefEnde >= 1000) {
        pruefAngezeigt = true
        zeigeMessErgebnis(ui.ergebnisse, pruefDiagnose.text(), offen => {
          ergebnisOffen = offen; finger?.verwerfe(); letzterFrame = 0
          if (offen) aktualisiereLetzteMessung(ui.info)
        })
      }
    }
    if (testAusstehend && lauf && testFahrzeug) { starteEinheit(lauf.zustand, testFahrzeug); lauf.protokollNeuBasieren(); testAusstehend = false }
    if (pruefEinsatzAusstehend && lauf && ui.ergebnisse.style.display === 'none') {
      if (startePruefEinsatz(lauf.zustand, location.search, false)) {
        lauf.protokollNeuBasieren()
        pruefEinsatzAusstehend = false
      }
    }
    const warMessung = messungLaeuft()
    messBild(dt, spielzeit)
    if (warMessung && !messungLaeuft()) letzterFrame = 0
  }
  const verlasse = (hinweis?: string) => {
    if (beendet) return
    beendet = true
    try {
      bricheAb(undefined, false)
      if (endeTimer) clearTimeout(endeTimer)
      if (offlineTimer) clearTimeout(offlineTimer)
      finger?.gibFrei(); finger=null
      lauf?.gibLaufFrei(); lauf=null
      renderer?.setAnimationLoop(null)
      if (welt) { gibSzeneFrei(welt); welt = null }
      maskenMaterial?.dispose(); maskenMaterial = null
      if (renderer) renderer.domElement.style.display = 'none'
      versteckeOberflaeche()
      window.removeEventListener('resize', groesse)
      window.removeEventListener('orientationchange', groesse)
      document.removeEventListener('visibilitychange', sichtbar)
      renderer?.domElement.removeEventListener('webglcontextlost', kontextVerloren)
    } finally {
      canvas.style.visibility = 'visible'
      game.loop.wake()
      game.input.enabled = true
      game.input.pointers.forEach(p => p.reset())
      game.input.mousePointer?.reset()
      aktiv = false
      window.__rg3dAktiv = false
      window.dispatchEvent(new Event('rg3dverlassen'))
      beimSchliessen(hinweis)
    }
  }
  try {
    game.input.enabled = false
    game.loop.sleep()
    canvas.style.visibility = 'hidden'
    renderer = holeRenderer()
    ui = zeigeOberflaeche(() => { if (direkt || ui.lobby.style.display === 'block' || !welt || welt.nahaufnahme) verlasse(); else zeigeLobby() }, () => {
      ui.lobby.style.display = 'none'
      if (welt && renderer) {
        ui.ergebnisse.style.bottom = 'calc(env(safe-area-inset-bottom) + 8px)'
        starteMessung(welt, renderer, game, ui.ergebnisse, ui.messen, offen => {
          ergebnisOffen = offen
          finger?.verwerfe()
          letzterFrame = 0
          if (offen) aktualisiereLetzteMessung(ui.info)
        })
      }
    }, ladeFortschritt().hoechstesLevel, () => finger?.aktiv ?? false, () => { infoOffen=true;finger?.verwerfe();letzterFrame=0 }, () => { infoOffen=false;letzterFrame=0 })
    const starteLauf = (n: number, test: SpezialName | null) => {
      if(!welt||!renderer||!camera)return
      lauf?.gibLaufFrei();finger?.gibFrei()
      levelNr=n;testFahrzeug=test;testAusstehend=test!==null
      ui.lobby.style.display='none';ui.ende.style.display='none'
      ui.levelText.textContent=test?`Testgelände · ${test.toLocaleUpperCase('de-DE')}`:`Level ${n}`
      pruefDiagnose=pruefDiagnose?new PruefDiagnose(new URLSearchParams(location.search).get('vorwaermen')!=='0'):null;pruefEnde=null;pruefAngezeigt=false
      darstellung=new WeltDarstellung(welt,12345,pruefDiagnose??undefined)
      lauf=new SpielLauf(test?testLevel():eisPruefLevel(location.search,LEVELS[n-1]),Date.now(),darstellung)
      vorwaermenEffekte();pruefEinsatzAusstehend=pruefEinsatz(location.search).length>0
      finger=new FingerSteuerung(renderer.domElement,camera)
      endeStat={besiegt:0,maxT:0};endeAnzeigeUm=null;letzterFrame=0;bildZaehler=0;eisTrefferZeit=eisFallZeit=eisTrefferMax=null;eisDiagFertig=false;eisBilder.length=0
    }
    const zeigeLobby = () => {
      if(!welt)return
      lauf?.gibLaufFrei();lauf=null;finger?.gibFrei();finger=null;testFahrzeug=null;testAusstehend=false
      ui.ende.style.display='none';endeAnzeigeUm=null;ui.zahlen.textContent='';ui.levelText.textContent='';setzeEinheitenBanner([])
      fuelleLobby(ui.lobby,{hoechstes:Math.min(LEVELS.length,ladeFortschritt().hoechstesLevel),levelAnzahl:LEVELS.length,beste:ladeBestlaeufe(),fahrzeuge:TEST_FAHRZEUGE},n=>starteLauf(n,null),f=>starteLauf(1,f as SpezialName))
      ui.lobby.style.display='block'
    }
    ui.nochmal.addEventListener('click',()=>starteLauf(levelNr,testFahrzeug))
    ui.weiter.addEventListener('click',()=>starteLauf(Math.min(LEVELS.length,levelNr+1),null))
    ui.endeZurueck.addEventListener('click',()=>zeigeLobby())
    ui.messen.disabled = true
    ui.ergebnisse.style.display = 'block'
    ui.ergebnisse.textContent = 'Lädt …'
    welt = await baueSzene(renderer, leseWasserStufe(location.search), () => beendet, hinweis => verlasse(hinweis))
    if (beendet) return
    if (!welt) { verlasse(DATEIEN_FEHLER); return }
    scene = welt.scene
    camera = welt.camera
    if (!welt.nahaufnahme) {
      if (direkt) starteLauf(1, null)
      else zeigeLobby()
    }
    groesse()
    vorwaermenEffekte()
    ui.messen.disabled = false
    ui.ergebnisse.style.display = 'none'
    if(new URLSearchParams(location.search).get('pruefung')==='soldat'){
      ui.ergebnisse.style.display='block'
      const pruefung=welt.soldatBau.pruefung
      const blick=['laufen','stehen','schiessen'].every(name=>Number(pruefung[`${name}MuendungVorBrustM`])>=.3&&Number(pruefung[`${name}GesichtVorKopfM`])>0)
      ui.ergebnisse.textContent=`Backen Soldat: ${welt.soldatBau.backzeitMs.toFixed(1)} ms\nBlick: −z ${blick?'✓':'✗'}\n${Object.entries(pruefung).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):Number(v).toFixed(2)}`).join('\n')}`
    }
    if (!dauerhaftAngefragt && navigator.storage?.persist && !pruefEinsatzAusstehend) {
      dauerhaftAngefragt = true
      void navigator.storage.persist().then(gewahrt => {
        if (!gewahrt && !beendet) {
          ui.ergebnisse.style.display = 'block'
          ui.ergebnisse.style.bottom = 'auto'
          ui.ergebnisse.textContent = 'Offline-Speicher nicht dauerhaft zugesagt'
          offlineTimer = setTimeout(() => {
            if (ui.ergebnisse.textContent === 'Offline-Speicher nicht dauerhaft zugesagt') {
              ui.ergebnisse.style.display = 'none'
              ui.ergebnisse.style.bottom = 'calc(env(safe-area-inset-bottom) + 8px)'
            }
          }, 4000)
        }
      }).catch(() => { /* Offline-Start bleibt auch ohne Zusage möglich. */ })
    }
    renderer.domElement.addEventListener('webglcontextlost', kontextVerloren)
    window.addEventListener('resize', groesse)
    window.addEventListener('orientationchange', groesse)
    document.addEventListener('visibilitychange', sichtbar)
    groesse()
    letzterFrame = 0
    renderer.setAnimationLoop(zeichne)
  } catch (error) {
    verlasse(error instanceof Error && error.message === DATEIEN_FEHLER ? DATEIEN_FEHLER : '3D konnte nicht gestartet werden')
  }
}
