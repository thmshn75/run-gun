import * as THREE from 'three'
import type Phaser from 'phaser'
import { auswerten, speicherMB, urteil, type Bildgroesse } from './rechnen'
import { gibSzeneFrei } from './szene'

interface Lauf {
  scene: THREE.Scene
  camera: THREE.Camera
  renderer: THREE.WebGLRenderer
  game: Phaser.Game
  anzeige: HTMLElement
  knopf: HTMLButtonElement
  stufe: number
  zeit: number
  bilder: number[]
  ergebnisse: string[]
  schwarz: number | null
  vollast: THREE.Group | null
  letzterMB: number
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
  const textur = testbemalung()
  const material = new THREE.MeshStandardMaterial({ map: textur })
  const dummy = new THREE.Object3D()
  for (const [anzahl, breite, hoehe, soldat] of [[1500, 24, 21, 0], [150, 52, 48, 1]]) {
    const geo = new THREE.SphereGeometry(0.25, breite, hoehe)
    geo.scale(1, 1.4, 1)
    const netz = new THREE.InstancedMesh(geo, material, anzahl)
    netz.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    netz.frustumCulled = false
    netz.userData.soldat = !!soldat
    for (let i = 0; i < anzahl; i++) {
      const spalte = soldat ? i % 6 : i % 15
      const reihe = soldat ? Math.floor(i / 6) : Math.floor(i / 15)
      dummy.position.set(soldat ? -1.5 + spalte * 0.6 : -3.1 + spalte * 0.42, 0.35, soldat ? 4.5 - reihe * 0.55 : -6 - reihe * 0.42)
      dummy.userData.basisY = 0.35
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
  const p = new THREE.Vector3(0, 0.35, -10).project(l.camera)
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
  const texturen = new Set<THREE.Texture>()
  l.scene.traverse(obj => {
    if (!(obj instanceof THREE.Mesh)) return
    for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
      if (!(mat instanceof THREE.MeshStandardMaterial)) continue
      if (mat.map) texturen.add(mat.map)
      if (mat.normalMap) texturen.add(mat.normalMap)
    }
  })
  const bilder: Bildgroesse[] = [...texturen].map(t => {
    const bild = t.image as { width?: number; height?: number } | undefined
    return { width: bild?.width || 0, height: bild?.height || 0 }
  })
  const threeCanvas = l.renderer.domElement
  const phaserCanvas = l.game.canvas
  const renderflaechen = [{ width: threeCanvas.width, height: threeCanvas.height }, { width: phaserCanvas.width, height: phaserCanvas.height }]
  const phaserBilder: Bildgroesse[] = []
  l.game.textures.list && Object.values(l.game.textures.list).forEach(texture => {
    for (const source of texture.source) phaserBilder.push({ width: source.width, height: source.height })
  })
  return speicherMB(bilder, renderflaechen, phaserBilder)
}

export function starteMessung(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, game: Phaser.Game, anzeige: HTMLElement, knopf: HTMLButtonElement): void {
  if (lauf) return
  lauf = { scene, camera, renderer, game, anzeige, knopf, stufe: 0, zeit: 0, bilder: [], ergebnisse: [], schwarz: null, vollast: null, letzterMB: 0 }
  knopf.disabled = true
  anzeige.style.display = 'block'
  anzeige.textContent = 'Aufwärmen · 5 s'
}

export function messBild(dt: number, jetzt: number): void {
  const l = lauf
  if (!l) return
  if (l.vollast) wippe(l.vollast, jetzt)
  // Der Aufrufer zeichnet unmittelbar vor dieser Funktion. Die Bildpunktprobe gehört zu genau diesem Bild.
  if (l.stufe === 2 && l.schwarz === null && l.zeit >= 3000) l.schwarz = schwarzAnteil(l)
  l.zeit += Math.max(0, dt)
  if (l.stufe > 0) l.bilder.push(dt)
  const dauer = l.stufe === 0 ? 5000 : 30000
  if (l.zeit < dauer) return
  if (l.stufe > 0) {
    const a = auswerten(l.bilder)
    const mb = groessen(l)
    l.letzterMB = mb.bemalungen
    const zeile = `${l.stufe === 1 ? 'Leere Szene' : 'Platzhalter-Vollast'}: ${a.fps?.toFixed(1) ?? '–'} fps · langsamste 5 % ${a.p95?.toFixed(1) ?? '–'} ms · Schwarz ${l.stufe === 1 ? 'entfällt' : l.schwarz === null ? '–' : `${l.schwarz.toFixed(1)} %`} · >250 ms: ${a.verworfen}\nBemalung ${mb.bemalungen.toFixed(2)} MB · Renderflächen ${mb.renderflaechen.toFixed(2)} MB · Phaser-Rest ${mb.phaserRest.toFixed(2)} MB (Schätzung, ohne Tiefen- und Glättungspuffer) · Geometrien ${l.renderer.info.memory.geometries} · Texturen ${l.renderer.info.memory.textures}`
    l.ergebnisse.push(zeile)
    if (l.stufe === 2) {
      l.anzeige.textContent = `${l.ergebnisse.join('\n\n')}\n${urteil(a, l.schwarz, mb.bemalungen)}`
      bricheAb()
      return
    }
  }
  l.stufe++
  l.zeit = 0
  l.bilder = []
  if (l.stufe === 2) { l.vollast = baueVollast(); l.scene.add(l.vollast) }
  l.anzeige.textContent = `${l.ergebnisse.join('\n\n')}\n${l.stufe === 1 ? 'Leere Szene' : 'Platzhalter-Vollast'} · 30 s`
}

export function bricheAb(grund?: string): void {
  if (!lauf) return
  const l = lauf
  lauf = null
  if (l.vollast) { l.scene.remove(l.vollast); gibSzeneFrei(new THREE.Scene().add(l.vollast)) }
  l.knopf.disabled = false
  if (grund) { l.anzeige.style.display = 'block'; l.anzeige.textContent = grund }
}

export function messungLaeuft(): boolean { return lauf !== null }
