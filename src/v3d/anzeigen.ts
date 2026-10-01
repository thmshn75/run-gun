import * as THREE from 'three'
import { DARSTELLUNG } from './balance3d'

export class Explosionen {
  readonly objekt: THREE.InstancedMesh
  private textur: THREE.CanvasTexture
  private material: THREE.MeshBasicMaterial
  private dummy = new THREE.Object3D()
  private farbe = new THREE.Color()
  private aktiv: { id: number; pos: THREE.Vector3; durchmesser: number; alter: number }[] = []
  private naechsteId = 0
  constructor() {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const glow = ctx.createRadialGradient(32, 32, 1, 32, 32, 32)
    glow.addColorStop(0, '#ffffff'); glow.addColorStop(.24, '#fff5dc'); glow.addColorStop(.58, '#ff8b2299'); glow.addColorStop(1, '#f55b1600')
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 64)
    this.textur = new THREE.CanvasTexture(canvas)
    this.material = new THREE.MeshBasicMaterial({ map: this.textur, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, side: THREE.DoubleSide })
    this.objekt = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), this.material, DARSTELLUNG.EXPLOSIONEN_MAX)
    this.objekt.frustumCulled = false; this.objekt.count = 0; this.objekt.renderOrder = 12
    this.objekt.setColorAt(0, new THREE.Color(1, 1, 1))
  }
  get anzahl(): number { return this.aktiv.length }
  get grosse(): number { return this.aktiv.filter(e => e.durchmesser > 4).length }
  istAktiv(id: number): boolean { return this.objekt.count > 0 && this.aktiv.some(e => e.id === id) }
  starte(pos: THREE.Vector3, durchmesser: number): number {
    if (durchmesser > 4) {
      if (this.grosse >= 2) this.aktiv.splice(this.aktiv.findIndex(e => e.durchmesser > 4), 1)
      else if (this.aktiv.length >= DARSTELLUNG.EXPLOSIONEN_MAX) this.aktiv.splice(this.aktiv.findIndex(e => e.durchmesser <= 4), 1)
    } else if (this.aktiv.length >= DARSTELLUNG.EXPLOSIONEN_MAX) return -1
    const id = ++this.naechsteId
    this.aktiv.push({ id, pos: pos.clone(), durchmesser, alter: 0 })
    return id
  }
  schritt(dt: number, kamera: THREE.Camera): void {
    for (const e of this.aktiv) e.alter += Math.max(0, dt)
    this.aktiv = this.aktiv.filter(e => e.alter < .6)
    this.objekt.count = this.aktiv.length
    this.aktiv.forEach((e, i) => {
      const anteil = e.alter / .6
      this.dummy.position.copy(e.pos); this.dummy.quaternion.copy(kamera.quaternion)
      this.dummy.scale.setScalar(e.durchmesser * (.5 + .5 * anteil))
      this.dummy.updateMatrix(); this.objekt.setMatrixAt(i, this.dummy.matrix)
      this.objekt.setColorAt(i, this.farbe.setScalar(1 - anteil))
    })
    this.objekt.instanceMatrix.needsUpdate = true
    if (this.objekt.instanceColor) this.objekt.instanceColor.needsUpdate = true
  }
  zuruecksetzen(): void { this.aktiv.length = 0; this.objekt.count = 0 }
  vorwaermen(): void {
    this.dummy.position.set(0, 0, -1e6); this.dummy.scale.setScalar(1); this.dummy.updateMatrix()
    this.objekt.setMatrixAt(0, this.dummy.matrix); this.objekt.count = 1
    this.objekt.instanceMatrix.needsUpdate = true
  }
  gibFrei(): void { this.objekt.removeFromParent(); this.objekt.geometry.dispose(); this.objekt.dispose(); this.material.dispose(); this.textur.dispose() }
}

export class Muendungsblitze {
  readonly objekt: THREE.InstancedMesh
  private textur: THREE.CanvasTexture
  private material: THREE.MeshBasicMaterial
  private dummy = new THREE.Object3D()
  constructor(max: number) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const glow = ctx.createRadialGradient(32, 32, 1, 32, 32, 32)
    glow.addColorStop(0, '#fff'); glow.addColorStop(.18, '#fff8c7'); glow.addColorStop(.45, '#ffb434aa'); glow.addColorStop(1, '#ff980000')
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 64)
    this.textur = new THREE.CanvasTexture(canvas)
    this.material = new THREE.MeshBasicMaterial({ map: this.textur, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, side: THREE.DoubleSide })
    this.objekt = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), this.material, max)
    this.objekt.count = 0
    this.objekt.frustumCulled = false
    this.objekt.renderOrder = 12
    this.objekt.setColorAt(0, new THREE.Color(1, 1, 1))
  }
  setze(punkte: readonly THREE.Vector3[], kamera: THREE.Camera, anzahl = punkte.length, groessen?: readonly number[], helligkeiten?: readonly number[]): void {
    this.objekt.count = Math.min(anzahl, this.objekt.instanceMatrix.count)
    for (let i = 0; i < this.objekt.count; i++) {
      this.dummy.position.copy(punkte[i]); this.dummy.quaternion.copy(kamera.quaternion)
      this.dummy.scale.setScalar(groessen?.[i] ?? .45)
      this.dummy.updateMatrix(); this.objekt.setMatrixAt(i, this.dummy.matrix)
      this.objekt.setColorAt(i, new THREE.Color().setScalar(helligkeiten?.[i] ?? 1))
    }
    this.objekt.instanceMatrix.needsUpdate = true
    if (this.objekt.instanceColor) this.objekt.instanceColor.needsUpdate = true
  }
  vorwaermen(): void {
    this.dummy.position.set(0, 0, -1e6); this.dummy.scale.setScalar(.45); this.dummy.updateMatrix()
    this.objekt.setMatrixAt(0, this.dummy.matrix); this.objekt.count = 1
    this.objekt.instanceMatrix.needsUpdate = true
  }
  gibFrei(): void { this.objekt.removeFromParent(); this.objekt.geometry.dispose(); this.objekt.dispose(); this.material.dispose(); this.textur.dispose() }
}

export class Rauchwolken {
  readonly objekt: THREE.InstancedMesh
  private textur: THREE.CanvasTexture
  private material: THREE.MeshBasicMaterial
  private dummy = new THREE.Object3D()
  private farbe = new THREE.Color()
  private aktiv: { pos: THREE.Vector3; start: number; ende: number; dauer: number; alter: number; bilder: number }[] = []
  constructor() {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const weich = ctx.createRadialGradient(32, 32, 2, 32, 32, 32)
    weich.addColorStop(0, '#b0b0b0aa'); weich.addColorStop(.55, '#99999977'); weich.addColorStop(1, '#88888800')
    ctx.fillStyle = weich; ctx.fillRect(0, 0, 64, 64)
    this.textur = new THREE.CanvasTexture(canvas)
    this.material = new THREE.MeshBasicMaterial({ map: this.textur, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    this.objekt = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), this.material, 48)
    this.objekt.frustumCulled = false; this.objekt.count = 0; this.objekt.renderOrder = 11
    this.objekt.setColorAt(0, new THREE.Color(1, 1, 1))
  }
  get anzahl(): number { return this.aktiv.length }
  starte(pos: THREE.Vector3, start: number, ende: number, dauer: number): void {
    if (this.aktiv.length < this.objekt.instanceMatrix.count) this.aktiv.push({ pos: pos.clone(), start, ende, dauer, alter: 0, bilder: 0 })
  }
  schritt(dt: number, kamera: THREE.Camera): void {
    for (const wolke of this.aktiv) {
      if (wolke.bilder > 0) wolke.alter += Math.max(0, dt)
      wolke.bilder++
    }
    this.aktiv = this.aktiv.filter(w => w.alter < w.dauer || w.bilder < 3)
    this.objekt.count = this.aktiv.length
    this.aktiv.forEach((w, i) => {
      const anteil = Math.min(1, w.alter / w.dauer)
      this.dummy.position.copy(w.pos); this.dummy.quaternion.copy(kamera.quaternion)
      this.dummy.scale.setScalar(w.start + (w.ende - w.start) * anteil)
      this.dummy.updateMatrix(); this.objekt.setMatrixAt(i, this.dummy.matrix)
      this.objekt.setColorAt(i, this.farbe.setScalar(Math.max(.05, 1 - anteil)))
    })
    this.objekt.instanceMatrix.needsUpdate = true
    if (this.objekt.instanceColor) this.objekt.instanceColor.needsUpdate = true
  }
  vorwaermen(): void {
    this.dummy.position.set(0, 0, -1e6); this.dummy.scale.setScalar(1); this.dummy.updateMatrix()
    this.objekt.setMatrixAt(0, this.dummy.matrix); this.objekt.count = 1
    this.objekt.instanceMatrix.needsUpdate = true
  }
  zuruecksetzen(): void { this.aktiv.length = 0; this.objekt.count = 0 }
  gibFrei(): void { this.objekt.removeFromParent(); this.objekt.geometry.dispose(); this.objekt.dispose(); this.material.dispose(); this.textur.dispose() }
}

export class ZahlAnzeige {
  readonly objekt: THREE.Mesh
  private canvas = document.createElement('canvas')
  private textur: THREE.CanvasTexture
  private wert = NaN
  private letzteZeit = -Infinity
  private runden: 'floor' | 'ceil'
  private hintergrund: string
  get angezeigt(): number { return this.wert }
  constructor(breite = 1.8, runden: 'floor' | 'ceil' = 'floor', hintergrund = '#102437d9') {
    this.runden = runden
    this.hintergrund = hintergrund
    this.canvas.width = 256; this.canvas.height = 96
    this.textur = new THREE.CanvasTexture(this.canvas)
    this.textur.colorSpace = THREE.SRGBColorSpace
    this.objekt = new THREE.Mesh(new THREE.PlaneGeometry(breite, 0.7), new THREE.MeshBasicMaterial({ map: this.textur, transparent: true, depthTest: false, side: THREE.DoubleSide }))
    this.objekt.renderOrder = 10
  }
  setze(wert: number, zeit: number): void {
    const ganz = this.runden === 'ceil' ? Math.ceil(wert) : Math.floor(wert)
    if (ganz === this.wert || zeit - this.letzteZeit < 0.25) return
    this.wert = ganz; this.letzteZeit = zeit
    const ctx = this.canvas.getContext('2d')!
    ctx.clearRect(0, 0, 256, 96)
    ctx.fillStyle = this.hintergrund; ctx.fillRect(0, 0, 256, 96)
    ctx.fillStyle = 'white'; ctx.font = 'bold 64px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(String(ganz), 128, 48)
    this.textur.needsUpdate = true
  }
  gibFrei(): void { this.objekt.geometry.dispose(); (this.objekt.material as THREE.Material).dispose(); this.textur.dispose(); this.objekt.removeFromParent() }
}

export class BossBalken {
  readonly objekt: THREE.Sprite
  private canvas = document.createElement('canvas')
  private textur: THREE.CanvasTexture
  private wert = NaN
  private letzteZeit = -Infinity
  private maximum: number
  get angezeigt(): number { return this.wert }
  constructor(maximum: number) {
    this.maximum = maximum
    this.canvas.width = 256; this.canvas.height = 64
    this.textur = new THREE.CanvasTexture(this.canvas)
    this.textur.colorSpace = THREE.SRGBColorSpace
    this.objekt = new THREE.Sprite(new THREE.SpriteMaterial({map:this.textur,transparent:true,depthTest:false}))
    this.objekt.scale.set(2.5,.625,1)
    this.objekt.renderOrder = 10
  }
  setzeMaximum(maximum: number): void { if (maximum !== this.maximum) { this.maximum = maximum; this.wert = NaN; this.letzteZeit = -Infinity } }
  setze(wert: number, zeit: number): void {
    const ganz = Math.ceil(wert)
    if (ganz === this.wert || zeit - this.letzteZeit < .25) return
    this.wert = ganz; this.letzteZeit = zeit
    const ctx = this.canvas.getContext('2d')!
    ctx.clearRect(0,0,256,64)
    ctx.fillStyle = '#17202c'; ctx.fillRect(0,0,256,64)
    ctx.fillStyle = '#d63b36'; ctx.fillRect(5,5,246*Math.max(0,Math.min(1,wert/this.maximum)),54)
    ctx.fillStyle = 'white'; ctx.font = 'bold 38px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(String(ganz),128,32)
    this.textur.needsUpdate = true
  }
  gibFrei(): void { this.objekt.removeFromParent(); (this.objekt.material as THREE.Material).dispose(); this.textur.dispose() }
}
