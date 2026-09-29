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

let aktiv = false
let dauerhaftAngefragt = false

export async function starte3D(game: Phaser.Game, beimSchliessen: (hinweis?: string) => void): Promise<void> {
  if (aktiv) return
  aktiv = true
  let renderer: THREE.WebGLRenderer | undefined
  let scene: THREE.Scene | undefined
  let camera: THREE.PerspectiveCamera | undefined
  let welt: Welt | null = null
  let beendet = false
  let letzterFrame = 0
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
    welt?.wasser.aktualisiere(Math.min(0.1, dt / 1000))
    welt?.zombieMasse.aktualisiere(jetzt / 1000)
    if (welt?.nahaufnahme) welt.zombieMasse.setze([-0.85, 0, 0.85].map((x, i) => ({ x, z: 0, dreh: jetzt / 1000 * Math.PI / 4, variante: i, groesse: 1 })))
    renderer.render(scene, camera)
    messBild(dt, jetzt)
  }
  const verlasse = (hinweis?: string) => {
    if (beendet) return
    beendet = true
    try {
      bricheAb(undefined, false)
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
      beimSchliessen(hinweis)
    }
  }
  try {
    game.input.enabled = false
    game.loop.sleep()
    canvas.style.visibility = 'hidden'
    renderer = holeRenderer()
    const ui = zeigeOberflaeche(() => verlasse(), () => {
      if (welt && renderer) starteMessung(welt, renderer, game, ui.ergebnisse, ui.messen)
    }, ladeFortschritt().hoechstesLevel)
    ui.messen.disabled = true
    ui.ergebnisse.style.display = 'block'
    ui.ergebnisse.textContent = 'Lädt …'
    welt = await baueSzene(renderer, leseWasserStufe(location.search), () => beendet, hinweis => verlasse(hinweis))
    if (beendet || !welt) return
    scene = welt.scene
    camera = welt.camera
    ui.messen.disabled = false
    ui.ergebnisse.style.display = 'none'
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
