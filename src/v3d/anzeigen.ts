import * as THREE from 'three'

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
    this.material = new THREE.MeshBasicMaterial({ map: this.textur, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    this.objekt = new THREE.InstancedMesh(new THREE.PlaneGeometry(.45, .45), this.material, max)
    this.objekt.count = 0
    this.objekt.frustumCulled = false
    this.objekt.renderOrder = 12
  }
  setze(punkte: readonly THREE.Vector3[], kamera: THREE.Camera): void {
    this.objekt.count = Math.min(punkte.length, this.objekt.instanceMatrix.count)
    for (let i = 0; i < this.objekt.count; i++) {
      this.dummy.position.copy(punkte[i]); this.dummy.quaternion.copy(kamera.quaternion)
      this.dummy.updateMatrix(); this.objekt.setMatrixAt(i, this.dummy.matrix)
    }
    this.objekt.instanceMatrix.needsUpdate = true
  }
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
