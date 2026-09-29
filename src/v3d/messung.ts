import * as THREE from 'three'
import type Phaser from 'phaser'
import { auswerten, pmremPufferBytes, speicherMB, spiegelPufferBytes, urteil, type Bildgroesse } from './rechnen'
import type { Welt } from './szene'
import type { WasserStufe } from './wasser'

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
  vollast: THREE.Group
  verborgenePlatzhalter: THREE.Object3D[]
}
let lauf: Lauf | null = null

function testbemalung(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')!
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    ctx.fillStyle = (x + y) % 2 ? '#f2e1b1' : '#bfdbeb'
    ctx.fillRect(x * 64, y * 64, 64, 64)
  }
  const textur = new THREE.CanvasTexture(canvas)
  textur.colorSpace = THREE.SRGBColorSpace
  return textur
}

function baueVollast(): THREE.Group {
  const gruppe = new THREE.Group()
  gruppe.name = 'vollast'
  const material = new THREE.MeshStandardMaterial({ map: testbemalung() })
  const dummy = new THREE.Object3D()
  for (const [anzahl, breite, hoehe, soldat] of [[1200, 24, 21, 0], [120, 52, 48, 1]]) {
    const geo = new THREE.SphereGeometry(0.25, breite, hoehe)
    geo.scale(1, 1.4, 1)
    const netz = new THREE.InstancedMesh(geo, material, anzahl)
    netz.layers.set(1)
    netz.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    netz.frustumCulled = false
    netz.userData.soldat = !!soldat
    for (let i = 0; i < anzahl; i++) {
      const spalte = soldat ? i % 10 : i % 24
      const reihe = soldat ? Math.floor(i / 10) : Math.floor(i / 24)
      dummy.position.set(soldat ? (spalte - 4.5) * 0.6 : (spalte - 11.5) * 0.45, 0.35, soldat ? reihe * 0.6 : -22 - reihe * 0.55)
      dummy.updateMatrix()
      netz.setMatrixAt(i, dummy.matrix)
    }
    netz.instanceMatrix.needsUpdate = true
    gruppe.add(netz)
  }
  return gruppe
}

function wippe(gruppe: THREE.Group, zeit: number): void {
  const dummy = new THREE.Object3D()
  for (const kind of gruppe.children) {
    const netz = kind as THREE.InstancedMesh
    for (let i = 0; i < netz.count; i++) {
      netz.getMatrixAt(i, dummy.matrix)
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale)
      dummy.position.y = 0.35 + Math.sin(zeit * 0.006 + i * 0.5) * 0.025
      dummy.updateMatrix()
      netz.setMatrixAt(i, dummy.matrix)
    }
    netz.instanceMatrix.needsUpdate = true
  }
}

function schwarzAnteil(l: Lauf): number | null {
  const gl = l.renderer.getContext()
  const p = new THREE.Vector3(0, 0.35, -30).project(l.welt.camera)
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
  const vollast = baueVollast()
  welt.scene.add(vollast)
  const verborgenePlatzhalter: THREE.Object3D[] = []
  welt.scene.traverse(obj => {
    if (obj.name === 'horde' || obj.name === 'truppe') {
      if (obj.visible) verborgenePlatzhalter.push(obj)
      obj.visible = false
    }
  })
  const original = welt.wasser.stufe
  welt.wasser.wechsle(0)
  lauf = { welt, renderer, game, anzeige, knopf, original, stufe: 0, phase: 'warm', zeit: 0, bilder: [], ergebnisse: [], schwarz: null, vollast, verborgenePlatzhalter }
  knopf.disabled = true
  anzeige.style.display = 'block'
  anzeige.textContent = 'Aufwärmen · Wasser 0 · 5 s'
}

export function messBild(dt: number, jetzt: number): void {
  const l = lauf
  if (!l) return
  wippe(l.vollast, jetzt)
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
  l.ergebnisse.push(`Wasser ${l.stufe} · Platzhalter-Vollast: ${a.fps?.toFixed(1) ?? '–'} fps · langsamste 5 % ${a.p95?.toFixed(1) ?? '–'} ms · Schwarz ${l.schwarz === null ? '–' : `${l.schwarz.toFixed(1)} %`} · >250 ms: ${a.verworfen}\nBemalung ${mb.bemalungen.toFixed(2)} MB · Wasserpuffer ${mb.zusatz.toFixed(2)} MB · Renderflächen ${mb.renderflaechen.toFixed(2)} MB · Phaser-Rest ${mb.phaserRest.toFixed(2)} MB · Geometrien ${l.renderer.info.memory.geometries} · Texturen ${l.renderer.info.memory.textures}\n${urteil(a, l.schwarz, mb.gesamt)}`)
  if (l.stufe === 2) {
    l.anzeige.textContent = l.ergebnisse.join('\n\n')
    bricheAb()
    return
  }
  l.stufe = (l.stufe + 1) as WasserStufe
  l.welt.wasser.wechsle(l.stufe)
  l.phase = 'umbau'; l.zeit = 0; l.bilder = []; l.schwarz = null
  l.anzeige.textContent = `${l.ergebnisse.join('\n\n')}\nWasser ${l.stufe} · Umbau · 2 s`
}

export function bricheAb(grund?: string, wiederherstellen = true): void {
  if (!lauf) return
  const l = lauf
  lauf = null
  l.welt.scene.remove(l.vollast)
  const material = (l.vollast.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial
  material.map?.dispose(); material.dispose()
  for (const child of l.vollast.children) {
    const netz = child as THREE.InstancedMesh
    netz.dispose()
    netz.geometry.dispose()
  }
  l.verborgenePlatzhalter.forEach(obj => { obj.visible = true })
  if (wiederherstellen) l.welt.wasser.wechsle(l.original)
  l.knopf.disabled = false
  if (grund) { l.anzeige.style.display = 'block'; l.anzeige.textContent = grund }
}

export function messungLaeuft(): boolean { return lauf !== null }
