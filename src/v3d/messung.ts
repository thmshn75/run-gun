import * as THREE from 'three'
import type Phaser from 'phaser'
import { auswerten, pmremPufferBytes, speicherMB, spiegelPufferBytes, urteil, type Bildgroesse } from './rechnen'
import { ZombieMasse, zombieAufstellung } from './figuren'
import { SoldatenMasse, type SoldatEintrag } from './soldaten'
import { FIGUREN } from './balance3d'
import type { Welt } from './szene'
import type { WasserStufe } from './wasser'

const MESSSTUFEN: WasserStufe[] = [0, 1]

type Phase = 'warm' | 'messen' | 'umbau'
interface Lauf {
  welt: Welt
  renderer: THREE.WebGLRenderer
  game: Phaser.Game
  anzeige: HTMLElement
  knopf: HTMLButtonElement
  original: WasserStufe
  stufe: WasserStufe
  phase: Phase
  zeit: number
  bilder: number[]
  ergebnisse: string[]
  schwarz: number | null
  messpunktZ: number
  vollast: ZombieMasse
  soldaten: SoldatenMasse
  verborgenePlatzhalter: THREE.Object3D[]
}
let lauf: Lauf | null = null

function schwarzAnteil(l: Lauf): number | null {
  const gl = l.renderer.getContext()
  const p = new THREE.Vector3(0, FIGUREN.ZOMBIE_HOEHE / 2, l.messpunktZ).project(l.welt.camera)
  const x = Math.round((p.x + 1) / 2 * gl.drawingBufferWidth) - 20
  const y = Math.round((p.y + 1) / 2 * gl.drawingBufferHeight) - 20
  if (x < 0 || y < 0 || x + 41 > gl.drawingBufferWidth || y + 41 > gl.drawingBufferHeight) return null
  const pixel = new Uint8Array(41 * 41 * 4)
  gl.readPixels(x, y, 41, 41, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  let dunkel = 0
  for (let i = 0; i < pixel.length; i += 4) if ((pixel[i] + pixel[i + 1] + pixel[i + 2]) / 3 < 30) dunkel++
  return dunkel / (41 * 41) * 100
}

function groessen(l: Lauf) {
  const texturen = new Set<THREE.Texture>(l.welt.bemalungen)
  const add = (wert: unknown) => { if (wert instanceof THREE.Texture) texturen.add(wert) }
  l.welt.scene.traverse(obj => {
    if (!(obj instanceof THREE.Mesh)) return
    for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
      Object.values(mat).forEach(add)
      if (mat instanceof THREE.ShaderMaterial) Object.values(mat.uniforms).forEach(u => add(u.value))
    }
  })
  if (l.welt.wasser.pmremZiel) texturen.delete(l.welt.wasser.pmremZiel.texture)
  if (l.welt.wasser.spiegelZiel) texturen.delete(l.welt.wasser.spiegelZiel.texture)
  const bilder: Bildgroesse[] = [...texturen].map(t => {
    const bild = t.image as { width?: number; height?: number } | undefined
    return { width: bild?.width || 0, height: bild?.height || 0 }
  })
  const renderflaechen = [l.renderer.domElement, l.game.canvas].map(c => ({ width: c.width, height: c.height }))
  const phaserBilder: Bildgroesse[] = []
  if (l.game.textures.list) Object.values(l.game.textures.list).forEach(texture => {
    for (const source of texture.source) phaserBilder.push({ width: source.width, height: source.height })
  })
  const grund = speicherMB(bilder, renderflaechen, phaserBilder)
  const zusatz = ((l.welt.wasser.pmremZiel ? pmremPufferBytes(l.welt.wasser.pmremZiel) : 0)
    + (l.welt.wasser.spiegelZiel ? spiegelPufferBytes(l.welt.wasser.spiegelZiel) : 0)) / 1048576
  return { ...grund, zusatz, gesamt: grund.bemalungen + zusatz }
}

export function starteMessung(welt: Welt, renderer: THREE.WebGLRenderer, game: Phaser.Game, anzeige: HTMLElement, knopf: HTMLButtonElement): void {
  if (lauf) return
  const vollast = new ZombieMasse(welt.zombieBau, welt.zombieBau.materialien, FIGUREN.ZOMBIES_SICHTBAR_MAX)
  const aufstellung = zombieAufstellung(FIGUREN.ZOMBIES_SICHTBAR_MAX, -15, 49183)
  vollast.setze(aufstellung)
  const messpunktZ = (Math.min(...aufstellung.map(z => z.z)) + Math.max(...aufstellung.map(z => z.z))) / 2
  const soldaten = new SoldatenMasse(welt.soldatBau)
  const liste:SoldatEintrag[]=Array.from({length:FIGUREN.SOLDATEN_SICHTBAR_MAX},(_,i)=>({x:(i%10-4.5)*.6,z:Math.floor(i/10)*.6,dreh:0,bewegung:'laufen'}))
  soldaten.setze(liste)
  welt.scene.add(vollast.gruppe, soldaten.gruppe)
  const verborgenePlatzhalter: THREE.Object3D[] = []
  welt.scene.traverse(obj => {
    if (obj === welt.zombieMasse.gruppe || obj === welt.truppe.gruppe || obj === welt.laufTrupp.gruppe) {
      if (obj.visible) verborgenePlatzhalter.push(obj)
      obj.visible = false
    }
  })
  const original = welt.wasser.stufe
  welt.wasser.wechsle(0)
  lauf = { welt, renderer, game, anzeige, knopf, original, stufe: 0, phase: 'warm', zeit: 0, bilder: [], ergebnisse: [], schwarz: null, messpunktZ, vollast, soldaten, verborgenePlatzhalter }
  knopf.disabled = true
  anzeige.style.display = 'block'
  anzeige.textContent = 'Aufwärmen · Wasser 0 · 5 s'
}

export function messBild(dt: number, jetzt: number): void {
  const l = lauf
  if (!l) return
  l.soldaten.aktualisiere(jetzt)
  l.vollast.aktualisiere(jetzt)
  // Der Aufrufer zeichnet unmittelbar vor dieser Funktion: Probe am gerenderten Bild bei 15 s.
  if (l.phase === 'messen' && l.schwarz === null && l.zeit >= 15000) l.schwarz = schwarzAnteil(l)
  l.zeit += Math.max(0, dt)
  if (l.phase === 'messen') l.bilder.push(dt)
  const dauer = l.phase === 'warm' ? 5000 : l.phase === 'umbau' ? 2000 : 30000
  if (l.zeit < dauer) return
  if (l.phase === 'warm' || l.phase === 'umbau') {
    l.phase = 'messen'; l.zeit = 0; l.bilder = []; l.schwarz = null
    l.anzeige.textContent = `${l.ergebnisse.join('\n\n')}\nWasser ${l.stufe} · 30 s`
    return
  }
  const a = auswerten(l.bilder)
  const mb = groessen(l)
  l.ergebnisse.push(`Wasser ${l.stufe} · Zombie-/Soldaten-Vollast: ${a.fps?.toFixed(1) ?? '–'} fps · langsamste 5 % ${a.p95?.toFixed(1) ?? '–'} ms · Schwarz ${l.schwarz === null ? '–' : `${l.schwarz.toFixed(1)} %`} · >250 ms: ${a.verworfen}\nBacken Soldat: ${l.welt.soldatBau.backzeitMs.toFixed(1)} ms · Bemalung ${mb.bemalungen.toFixed(2)} MB · Wasserpuffer ${mb.zusatz.toFixed(2)} MB · Renderflächen ${mb.renderflaechen.toFixed(2)} MB · Phaser-Rest ${mb.phaserRest.toFixed(2)} MB · Geometrien ${l.renderer.info.memory.geometries} · Texturen ${l.renderer.info.memory.textures}\n${urteil(a, l.schwarz, mb.gesamt)}`)
  if (l.stufe === MESSSTUFEN[MESSSTUFEN.length - 1]) {
    l.anzeige.textContent = l.ergebnisse.join('\n\n')
    bricheAb()
    return
  }
  l.stufe = MESSSTUFEN[MESSSTUFEN.indexOf(l.stufe) + 1]
  l.welt.wasser.wechsle(l.stufe)
  l.phase = 'umbau'; l.zeit = 0; l.bilder = []; l.schwarz = null
  l.anzeige.textContent = `${l.ergebnisse.join('\n\n')}\nWasser ${l.stufe} · Umbau · 2 s`
}

export function bricheAb(grund?: string, wiederherstellen = true): void {
  if (!lauf) return
  const l = lauf
  lauf = null
  l.welt.scene.remove(l.vollast.gruppe, l.soldaten.gruppe)
  l.vollast.gibNetzeFrei()
  l.soldaten.gibNetzeFrei()
  l.verborgenePlatzhalter.forEach(obj => { obj.visible = true })
  if (wiederherstellen) l.welt.wasser.wechsle(l.original)
  l.knopf.disabled = false
  if (grund) { l.anzeige.style.display = 'block'; l.anzeige.textContent = grund }
}

export function messungLaeuft(): boolean { return lauf !== null }
