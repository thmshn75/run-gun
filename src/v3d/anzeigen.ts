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
  private aktiv: { pos: THREE.Vector3; start: number; ende: number; dauer: number; alter: number; bilder: number; deckkraft: number }[] = []
  constructor() {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const weich = ctx.createRadialGradient(32, 32, 2, 32, 32, 32)
    weich.addColorStop(0, '#6d6d6dff'); weich.addColorStop(.55, '#6d6d6dcc'); weich.addColorStop(1, '#6d6d6d00')
    ctx.fillStyle = weich; ctx.fillRect(0, 0, 64, 64)
    this.textur = new THREE.CanvasTexture(canvas)
    this.material = new THREE.MeshBasicMaterial({ map: this.textur, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    this.material.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float instanceOpacity;\nvarying float vInstanceOpacity;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInstanceOpacity = instanceOpacity;')
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vInstanceOpacity;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vInstanceOpacity;')
    }
    this.objekt = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), this.material, 80)
    this.objekt.geometry.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(new Float32Array(80), 1))
    this.objekt.frustumCulled = false; this.objekt.count = 0; this.objekt.renderOrder = 11
  }
  get anzahl(): number { return this.aktiv.length }
  starte(pos: THREE.Vector3, start: number, ende: number, dauer: number, deckkraft = .75): void {
    if (this.aktiv.length < this.objekt.instanceMatrix.count) this.aktiv.push({ pos: pos.clone(), start, ende, dauer, alter: 0, bilder: 0, deckkraft })
  }
  schritt(dt: number, kamera: THREE.Camera): void {
    for (const wolke of this.aktiv) {
      if (wolke.bilder > 0) wolke.alter += Math.max(0, dt)
      wolke.bilder++
    }
    this.aktiv = this.aktiv.filter(w => w.alter < w.dauer || w.bilder < 3)
    this.objekt.count = this.aktiv.length
    const deckkraft = this.objekt.geometry.getAttribute('instanceOpacity') as THREE.InstancedBufferAttribute
    this.aktiv.forEach((w, i) => {
      const anteil = Math.min(1, w.alter / w.dauer)
      this.dummy.position.copy(w.pos); this.dummy.quaternion.copy(kamera.quaternion)
      this.dummy.scale.setScalar(w.start + (w.ende - w.start) * anteil)
      this.dummy.updateMatrix(); this.objekt.setMatrixAt(i, this.dummy.matrix)
      deckkraft.setX(i, Math.max(0, w.deckkraft * (1 - anteil)))
    })
    this.objekt.instanceMatrix.needsUpdate = true
    deckkraft.needsUpdate = true
  }
  vorwaermen(): void {
    this.dummy.position.set(0, 0, -1e6); this.dummy.scale.setScalar(1); this.dummy.updateMatrix()
    this.objekt.setMatrixAt(0, this.dummy.matrix); this.objekt.count = 1
    this.objekt.instanceMatrix.needsUpdate = true
  }
  zuruecksetzen(): void { this.aktiv.length = 0; this.objekt.count = 0 }
  gibFrei(): void { this.objekt.removeFromParent(); this.objekt.geometry.dispose(); this.objekt.dispose(); this.material.dispose(); this.textur.dispose() }
}

export class BossTrefferZahlen {
  readonly objekt = new THREE.Group()
  private eintraege: { sprite: THREE.Sprite; canvas: HTMLCanvasElement; textur: THREE.CanvasTexture; start: number; wert: number; basisY: number }[] = []
  private offen = new Map<'miniBoss' | 'eliteBoss', { wert: number; start: number; pos: THREE.Vector3 }>()
  private naechster = 0
  constructor() {
    for (let i = 0; i < 6; i++) {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128
      const textur = new THREE.CanvasTexture(canvas); textur.colorSpace = THREE.SRGBColorSpace
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textur, transparent: true, depthTest: false, depthWrite: false }))
      sprite.scale.set(2.2, 1.1, 1); sprite.renderOrder = 13; sprite.visible = false
      this.objekt.add(sprite); this.eintraege.push({ sprite, canvas, textur, start: -Infinity, wert: 0, basisY: 0 })
    }
  }
  treffer(boss: 'miniBoss' | 'eliteBoss', menge: number, zeit: number, pos: THREE.Vector3): void {
    if (menge <= 0) return
    const alt = this.offen.get(boss)
    if (alt && zeit - alt.start >= .3) this.zeige(boss)
    const aktuell = this.offen.get(boss)
    if (aktuell) { aktuell.wert += menge; aktuell.pos.copy(pos) }
    else this.offen.set(boss, { wert: menge, start: zeit, pos: pos.clone() })
  }
  private zeige(boss: 'miniBoss' | 'eliteBoss'): void {
    const gruppe = this.offen.get(boss); if (!gruppe) return
    this.offen.delete(boss)
    const wert = Math.round(gruppe.wert); if (wert <= 0) return
    const e = this.eintraege[this.naechster++ % this.eintraege.length]
    const ctx = e.canvas.getContext('2d')!
    ctx.clearRect(0, 0, 256, 128)
    ctx.font = 'bold 84px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.lineWidth = 10; ctx.strokeStyle = '#171717'; ctx.strokeText(`−${wert}`, 128, 64)
    ctx.fillStyle = '#ffffff'; ctx.fillText(`−${wert}`, 128, 64)
    e.textur.needsUpdate = true; e.sprite.position.copy(gruppe.pos)
    e.start = gruppe.start + .3; e.wert = wert; e.basisY = gruppe.pos.y; e.sprite.visible = true
  }
  schritt(zeit: number, kamera?: THREE.PerspectiveCamera): void {
    for (const [boss, gruppe] of this.offen) if (zeit - gruppe.start >= .3) this.zeige(boss)
    for (const e of this.eintraege) {
      const alter = zeit - e.start
      e.sprite.visible = alter >= 0 && alter < .8
      if (e.sprite.visible) {
        e.sprite.position.y = e.basisY + 1.2 * alter / .8
        if (kamera) {
          const abstand = kamera.position.distanceTo(e.sprite.position)
          const weltProPixel = 2 * abstand * Math.tan(THREE.MathUtils.degToRad(kamera.fov / 2)) / 844
          const hoehe = Math.max(1.1, 26 * weltProPixel * 128 / 84)
          e.sprite.scale.set(2 * hoehe, hoehe, 1)
        }
        ;(e.sprite.material as THREE.SpriteMaterial).opacity = 1 - alter / .8
      }
    }
  }
  get angezeigteSumme(): number { return this.eintraege.reduce((n, e) => n + e.wert, 0) }
  get sichtbar(): number { return this.eintraege.filter(e => e.sprite.visible).length }
  gibFrei(): void { for (const e of this.eintraege) { (e.sprite.material as THREE.Material).dispose(); e.textur.dispose() } this.objekt.removeFromParent() }
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
