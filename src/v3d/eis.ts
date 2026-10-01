import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { EIS } from './balance3d'

export async function ladeEisBemalung(lade: () => Promise<THREE.Texture>, abgebrochen: () => boolean, timeout = 3000): Promise<THREE.Texture | null> {
  let abgeschlossen = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const laden = lade().then(textur => {
    if (abgeschlossen || abgebrochen()) { textur.dispose(); return null }
    return textur
  }).catch(() => null)
  const bild = await Promise.race([laden, new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), timeout) })])
  abgeschlossen = true
  if (timer) clearTimeout(timer)
  return bild
}

export function eisZahl(wert: number): string {
  const n = Math.ceil(wert)
  if (n < 10000) return String(n)
  const einheit = n >= 1e6 ? 1e6 : 1000
  return `${(n / einheit).toFixed(1).replace('.', ',')}${einheit === 1e6 ? 'M' : 'k'}`
}

export class EisEffekte {
  readonly basis: THREE.MeshStandardMaterial
  readonly treffer: THREE.MeshStandardMaterial
  readonly blockGeometrie = new THREE.BoxGeometry(EIS.BREITE, EIS.HOEHE, EIS.LAENGE)
  readonly auflage: THREE.Mesh
  readonly splitter: THREE.InstancedMesh
  readonly splitterMaterial: THREE.MeshStandardMaterial
  readonly blitz: THREE.Sprite
  readonly textur: THREE.CanvasTexture
  readonly grundfarbe = new THREE.Color('#b4dce9')
  readonly blitzfarbe = new THREE.Color('#ffffff')
  readonly stuecke: { alter: number; geboren: number; pos: THREE.Vector3; tempo: THREE.Vector3; groesse: number; gross: boolean; drehung: THREE.Vector3; drehTempo: THREE.Vector3 }[] = []
  private stufe = 0
  private index = 0
  private upload = 0
  private matrix = new THREE.Matrix4()
  private skalierung = new THREE.Vector3()
  private quaternion = new THREE.Quaternion()
  private euler = new THREE.Euler()
  private blitzGeboren = -1
  private blitzAlter = 0
  constructor(scene: THREE.Scene, map: THREE.Texture | null) {
    const material = () => new THREE.MeshStandardMaterial({ color: this.grundfarbe, map, transparent: true, opacity: .52, depthWrite: false, side: THREE.FrontSide, roughness: .92 })
    this.basis = material(); this.treffer = material()
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512
    this.textur = new THREE.CanvasTexture(canvas)
    this.textur.generateMipmaps = false; this.textur.minFilter = THREE.LinearFilter; this.textur.magFilter = THREE.LinearFilter
    const flaechen = [
      new THREE.PlaneGeometry(EIS.BREITE, EIS.HOEHE).translate(0, 0, EIS.LAENGE / 2 + .012),
      new THREE.PlaneGeometry(EIS.BREITE, EIS.LAENGE).rotateX(-Math.PI / 2).translate(0, EIS.HOEHE / 2 + .012, 0),
      new THREE.PlaneGeometry(EIS.LAENGE, EIS.HOEHE).rotateY(-Math.PI / 2).translate(-EIS.BREITE / 2 - .012, 0, 0),
    ]
    const rissGeometrie = mergeGeometries(flaechen)
    flaechen.forEach(g => g.dispose())
    if (!rissGeometrie) throw new Error('Eis-Rissflächen nicht zusammenführbar')
    const rissMaterial = new THREE.MeshBasicMaterial({ map: this.textur, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })
    this.auflage = new THREE.Mesh(rissGeometrie, rissMaterial)
    this.auflage.renderOrder = 3; this.auflage.visible = false; this.auflage.frustumCulled = false
    scene.add(this.auflage)
    const g = new THREE.TetrahedronGeometry(1, 0)
    this.splitterMaterial = new THREE.MeshStandardMaterial({ color: '#dff4ff', transparent: true, opacity: .9, depthWrite: false, emissive: '#9fd6ef', emissiveIntensity: .4 })
    this.splitter = new THREE.InstancedMesh(g, this.splitterMaterial, EIS.SPLITTER_POOL)
    this.splitter.name = 'eis-splitter'; this.splitter.renderOrder = 4; this.splitter.count = 0
    this.splitter.frustumCulled = false; scene.add(this.splitter)
    const blitzCanvas = document.createElement('canvas'); blitzCanvas.width = blitzCanvas.height = 64
    const blitzCtx = blitzCanvas.getContext('2d')!
    const verlauf = blitzCtx.createRadialGradient(32, 32, 0, 32, 32, 32)
    verlauf.addColorStop(0, 'rgba(255,255,255,1)')
    verlauf.addColorStop(1, 'rgba(255,255,255,0)')
    blitzCtx.fillStyle = verlauf; blitzCtx.fillRect(0, 0, 64, 64)
    this.blitz = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(blitzCanvas), color: '#ffffff', transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }))
    this.blitz.renderOrder = 4; this.blitz.visible = false; scene.add(this.blitz)
  }
  setzeAktiv(block: THREE.Object3D, index: number): void {
    this.index = index; this.stufe = 0; this.upload = 0
    this.leereCanvas(false)
    block.add(this.auflage); this.auflage.visible = false
    this.treffer.color.copy(this.grundfarbe)
  }
  private leereCanvas(upload: boolean): CanvasRenderingContext2D {
    const c = this.textur.image as HTMLCanvasElement, ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, 512, 512)
    if (upload) { this.textur.needsUpdate = true; this.upload++ }
    return ctx
  }
  risse(p: number, start: number): void {
    const neu = start > 0 ? Math.min(7, Math.floor(Math.max(0, 1 - p / start) * 8)) : 0
    if (neu === this.stufe) return
    this.stufe = neu
    const ctx = this.leereCanvas(false)
    let seed = (this.index + 1) * 2654435761 >>> 0
    const zufall = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
    ctx.globalAlpha = 1
    for (let s = 1; s <= neu; s++) for (let linie = 0; linie < 6; linie++) {
      let x = zufall() * 512, y = zufall() * 512
      ctx.beginPath(); ctx.moveTo(x, y)
      for (let k = 0; k < 7; k++) { x += (zufall() - .5) * 180; y += (zufall() - .5) * 180; ctx.lineTo(x, y) }
      ctx.strokeStyle = '#e9f9ff'; ctx.lineWidth = 3.5; ctx.stroke()
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1
      ctx.stroke()
    }
    this.auflage.visible = neu > 0
    this.textur.needsUpdate = true; this.upload++
  }
  trefferSplitter(ort: THREE.Vector3, bild: number): void { this.erzeuge(ort, 3, false, bild) }
  zerspringe(ort: THREE.Vector3, bild: number): void {
    this.erzeuge(ort, 32, true, bild)
    this.blitz.position.copy(ort); this.blitz.scale.set(3, 3, 1); this.blitz.visible = true
    this.blitz.material.opacity = 1
    this.blitzGeboren = bild; this.blitzAlter = 0
  }
  private erzeuge(ort: THREE.Vector3, anzahl: number, gross: boolean, bild: number): void {
    let seed = (Math.imul(this.index + 1, 2654435761) ^ Math.imul(bild + 1, 1664525) ^ this.stuecke.length) >>> 0
    const zufall = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
    for (let i = 0; i < anzahl; i++) {
      if (this.stuecke.length >= EIS.SPLITTER_POOL) {
        const alt = this.stuecke.findIndex(s => !s.gross)
        if (alt < 0 && !gross) break
        this.stuecke.splice(alt < 0 ? 0 : alt, 1)
      }
      const winkel = 2 * Math.PI * i / anzahl
      this.stuecke.push({ alter: 0, geboren: bild, pos: ort.clone().add(new THREE.Vector3(Math.cos(winkel) * .5, 1, Math.sin(winkel) * .5)), tempo: new THREE.Vector3(Math.cos(winkel) * (gross ? 3 : 1), gross ? 3 + i % 4 : 1, Math.sin(winkel) * (gross ? 3 : 1)), groesse: .35 + zufall() * .25, gross, drehung: new THREE.Vector3(zufall() * Math.PI * 2, zufall() * Math.PI * 2, zufall() * Math.PI * 2), drehTempo: new THREE.Vector3((zufall() - .5) * 8, (zufall() - .5) * 8, (zufall() - .5) * 8) })
    }
    this.aktualisiere(0, bild)
  }
  aktualisiere(dt: number, bild: number): void {
    if (this.blitz.visible && bild > this.blitzGeboren) {
      this.blitzAlter += Math.min(.05, Math.max(0, dt))
      this.blitz.material.opacity = Math.max(0, 1 - this.blitzAlter / .15)
    }
    if (this.blitz.visible && this.blitzAlter >= .15 - 1e-9 && bild - this.blitzGeboren >= 3) this.blitz.visible = false
    for (const s of this.stuecke) if (bild > s.geboren) {
      const zeit = Math.min(.1, Math.max(0, dt))
      s.alter += zeit; s.pos.addScaledVector(s.tempo, zeit); s.tempo.y -= 9.8 * zeit; s.drehung.addScaledVector(s.drehTempo, zeit)
    }
    for (let i = this.stuecke.length - 1; i >= 0; i--) if (this.stuecke[i].alter >= .9 && bild - this.stuecke[i].geboren >= 3) this.stuecke.splice(i, 1)
    this.splitter.count = this.stuecke.length
    for (let i = 0; i < this.stuecke.length; i++) {
      const s = this.stuecke[i], mass = s.groesse / Math.sqrt(8 / 3) * Math.max(.001, 1 - s.alter / .9)
      this.quaternion.setFromEuler(this.euler.set(s.drehung.x, s.drehung.y, s.drehung.z))
      this.matrix.compose(s.pos, this.quaternion, this.skalierung.set(mass, mass, mass))
      this.splitter.setMatrixAt(i, this.matrix)
    }
    this.splitter.instanceMatrix.needsUpdate = true
  }
  zuruecksetzen(): void { this.stuecke.length = 0; this.splitter.count = 0; this.stufe = 0; this.auflage.visible = false; this.blitz.visible = false; this.leereCanvas(false); this.treffer.color.copy(this.grundfarbe) }
  vorwaermen(): void { this.splitter.count = 1; this.matrix.makeTranslation(10000, 0, 0); this.splitter.setMatrixAt(0, this.matrix); this.splitter.instanceMatrix.needsUpdate = true; this.auflage.visible = true; this.auflage.position.x = 10000; this.blitz.position.set(10000,0,0); this.blitz.visible = true }
  nachVorwaermen(): void { this.splitter.count = 0; this.auflage.visible = false; this.auflage.position.x = 0; this.blitz.visible = false }
  get diagnose() { return { stufe: this.stufe, uploads: this.upload, splitter: this.splitter.count } }
}
