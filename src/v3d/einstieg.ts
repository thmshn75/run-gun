import type Phaser from 'phaser'
import type * as THREE from 'three'
import { holeRenderer, entferneRenderer } from './renderer'
import { baueSzene, gibSzeneFrei } from './szene'
import { DATEIEN_FEHLER, type Welt } from './szene'
import { passeKameraAn } from './kamera'
import { leseWasserStufe } from './wasser'
import { zeigeOberflaeche, versteckeOberflaeche } from './oberflaeche'
import { ladeFortschritt } from './speicher'
import { bricheAb, messBild, messungLaeuft, starteMessung } from './messung'
import { FingerSteuerung } from './steuerung'
import { SpielLauf, WeltDarstellung } from './lauf'
import { LEVELS } from './balance3d'

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
  let spielzeit = 0
  let fallRunde = -1
  let finger: FingerSteuerung | null = null
  let lauf: SpielLauf | null = null
  let infoOffen = false
  let endeTimer: ReturnType<typeof setTimeout> | undefined
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
    const pausiert = infoOffen || messungLaeuft() || document.hidden
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
        const ereignisse = lauf.schritt(sek, finger?.ziel ?? null)
        ui.zahlen.textContent = `Level 1 · ${lauf.zustand.t.toFixed(1)} s · T ${Math.floor(lauf.zustand.T)} · F ${Math.floor(lauf.zustand.F)}`
        if (ereignisse.some(e=>e.art==='sieg'||e.art==='niederlage')) {
          finger?.gibFrei(); finger=null; ui.ende.style.display='block'
          ui.endeText.textContent=`${lauf.zustand.ergebnis==='sieg'?'SIEG':'NIEDERLAGE'} · ${lauf.zustand.t.toFixed(1)} s`
          ui.nochmal.disabled=true;ui.endeZurueck.disabled=true
          endeTimer=setTimeout(()=>{ui.nochmal.disabled=false;ui.endeZurueck.disabled=false},700)
        }
      }
    }
    if (welt?.nahaufnahme && !welt.soldatNahaufnahme && !pausiert) welt.zombieMasse.setze([-0.85, 0, 0.85].map((x, i) => ({ x, z: 0, dreh: spielzeit * Math.PI / 4, variante: i, groesse: 1 })))
    if (welt?.soldatNahaufnahme && !pausiert) {
      const runde=Math.floor(spielzeit/3)
      if(runde!==fallRunde){welt.truppe.setze([]);fallRunde=runde}
      welt.truppe.setze([-1.5,-.5,.5,1.5].map((x,i)=>({x,z:0,dreh:spielzeit*Math.PI/4,bewegung:(['laufen','stehen','schiessen','fallen'] as const)[i]})))
    }
    renderer.render(scene, camera)
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
      finger?.gibFrei(); finger=null
      lauf?.gibLaufFrei(); lauf=null
      renderer?.setAnimationLoop(null)
      if (welt) { gibSzeneFrei(welt); welt = null }
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
    ui = zeigeOberflaeche(() => verlasse(), () => {
      if (welt && renderer) starteMessung(welt, renderer, game, ui.ergebnisse, ui.messen)
    }, ladeFortschritt().hoechstesLevel, () => finger?.aktiv ?? false, () => { infoOffen=true;finger?.verwerfe();letzterFrame=0 }, () => { infoOffen=false;letzterFrame=0 })
    ui.nochmal.addEventListener('click',()=>{if(!welt||!lauf||!renderer||!camera)return;lauf.gibLaufFrei();lauf=new SpielLauf(LEVELS[0],Date.now(),new WeltDarstellung(welt));finger=new FingerSteuerung(renderer.domElement,camera);ui.ende.style.display='none';letzterFrame=0})
    ui.messen.disabled = true
    ui.ergebnisse.style.display = 'block'
    ui.ergebnisse.textContent = 'Lädt …'
    welt = await baueSzene(renderer, leseWasserStufe(location.search), () => beendet, hinweis => verlasse(hinweis))
    if (beendet) return
    if (!welt) { verlasse(DATEIEN_FEHLER); return }
    scene = welt.scene
    camera = welt.camera
    if (!welt.nahaufnahme) { finger=new FingerSteuerung(renderer.domElement,camera);lauf=new SpielLauf(LEVELS[0],Date.now(),new WeltDarstellung(welt)) }
    ui.messen.disabled = false
    ui.ergebnisse.style.display = 'none'
    if(new URLSearchParams(location.search).get('pruefung')==='soldat'){
      ui.ergebnisse.style.display='block'
      const pruefung=welt.soldatBau.pruefung
      const blick=['laufen','stehen','schiessen'].every(name=>Number(pruefung[`${name}MuendungVorBrustM`])>=.3&&Number(pruefung[`${name}GesichtVorKopfM`])>0)
      ui.ergebnisse.textContent=`Backen Soldat: ${welt.soldatBau.backzeitMs.toFixed(1)} ms\nBlick: −z ${blick?'✓':'✗'}\n${Object.entries(pruefung).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):Number(v).toFixed(2)}`).join('\n')}`
    }
    if (!dauerhaftAngefragt && navigator.storage?.persist) {
      dauerhaftAngefragt = true
      void navigator.storage.persist().then(gewahrt => {
        if (!gewahrt && !beendet) {
          ui.ergebnisse.style.display = 'block'
          ui.ergebnisse.textContent = 'Offline-Speicher nicht dauerhaft zugesagt'
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
