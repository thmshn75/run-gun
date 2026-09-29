import type Phaser from 'phaser'
import type * as THREE from 'three'
import { holeRenderer, entferneRenderer } from './renderer'
import { baueSzene, gibSzeneFrei } from './szene'
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
  let beendet = false
  let letzterFrame = 0
  const canvas = game.canvas
  const groesse = () => {
    if (!aktiv || !renderer || !camera) return
    renderer.setSize(innerWidth, innerHeight, false)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
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
    renderer.render(scene, camera)
    messBild(dt, jetzt)
  }
  const verlasse = (hinweis?: string) => {
    if (beendet) return
    beendet = true
    try {
      bricheAb()
      renderer?.setAnimationLoop(null)
      if (scene) gibSzeneFrei(scene)
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
    const welt = baueSzene()
    scene = welt.scene
    camera = welt.camera
    const ui = zeigeOberflaeche(() => verlasse(), () => {
      if (scene && camera && renderer) starteMessung(scene, camera, renderer, game, ui.ergebnisse, ui.messen)
    }, ladeFortschritt().hoechstesLevel)
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
    verlasse('3D konnte nicht gestartet werden')
    throw error
  }
}
