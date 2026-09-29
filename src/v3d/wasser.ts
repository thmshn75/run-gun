import * as THREE from 'three'
import { BUEHNE } from './balance3d'
import { Water } from './wasserSpiegel'

const WASSER_FARBE = '#0b3440'
const WASSER_STUFE_1 = {
  rauheit: 0.2,
  normalenStaerke: 0.9,
  normalenWiederholungen: 40,
  umgebungsStaerke: 0.7,
} as const
const WASSER_STUFE_2 = {
  farbe: 0x0e3a46,
  verzerrung: 2.5,
} as const
const HIMMEL_FARBEN = [
  [0, '#5d9fd6'],
  [0.48, '#bcd9ea'],
  [0.52, '#dfe9ec'],
  [1, '#3a5560'],
] as const

export type WasserStufe = 0 | 1 | 2
export function leseWasserStufe(suche: string): WasserStufe {
  const wert = new URLSearchParams(suche).get('wasser')
  return wert === '0' || wert === '2' ? Number(wert) as WasserStufe : 1
}

export interface WasserHalter {
  stufe: WasserStufe
  wechsle(stufe: WasserStufe): void
  aktualisiere(dtSekunden: number): void
  gibFrei(): void
  pmremZiel: THREE.WebGLRenderTarget | null
  spiegelZiel: THREE.WebGLRenderTarget | null
}

function himmel(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256; canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const verlauf = ctx.createLinearGradient(0, 0, 0, 128)
  for (const [position, farbe] of HIMMEL_FARBEN) verlauf.addColorStop(position, farbe)
  ctx.fillStyle = verlauf
  ctx.fillRect(0, 0, 256, 128)
  const textur = new THREE.CanvasTexture(canvas)
  textur.mapping = THREE.EquirectangularReflectionMapping
  textur.colorSpace = THREE.SRGBColorSpace
  return textur
}

export function baueWasser(scene: THREE.Scene, renderer: THREE.WebGLRenderer, normalen: THREE.Texture, anfang: WasserStufe): WasserHalter {
  let mesh: THREE.Mesh | null = null
  let pmremZiel: THREE.WebGLRenderTarget | null = null
  let spiegelZiel: THREE.WebGLRenderTarget | null = null
  let zeit = 0
  const halter: WasserHalter = {
    stufe: anfang,
    get pmremZiel() { return pmremZiel },
    get spiegelZiel() { return spiegelZiel },
    wechsle(stufe) {
      this.gibFrei()
      this.stufe = stufe
      const geo = new THREE.PlaneGeometry(800, 800)
      if (stufe === 2) {
        const groesse = renderer.getDrawingBufferSize(new THREE.Vector2())
        const spiegel = new Water(geo, {
          textureWidth: Math.max(1, Math.floor(groesse.x / 2)),
          textureHeight: Math.max(1, Math.floor(groesse.y / 2)),
          waterNormals: normalen,
          sunDirection: new THREE.Vector3(...BUEHNE.SONNE).normalize(),
          sunColor: 0xfff3df, waterColor: WASSER_STUFE_2.farbe,
          distortionScale: WASSER_STUFE_2.verzerrung, fog: true,
        })
        mesh = spiegel
        spiegelZiel = spiegel.spiegelZiel
      } else {
        const material = new THREE.MeshStandardMaterial({ color: WASSER_FARBE, metalness: 0, roughness: stufe === 0 ? 0.45 : WASSER_STUFE_1.rauheit })
        if (stufe === 1) {
          normalen.wrapS = normalen.wrapT = THREE.RepeatWrapping
          normalen.repeat.set(WASSER_STUFE_1.normalenWiederholungen, WASSER_STUFE_1.normalenWiederholungen)
          material.normalMap = normalen
          material.normalScale.set(WASSER_STUFE_1.normalenStaerke, WASSER_STUFE_1.normalenStaerke)
          material.envMapIntensity = WASSER_STUFE_1.umgebungsStaerke
          const quelle = himmel()
          const generator = new THREE.PMREMGenerator(renderer)
          try { pmremZiel = generator.fromEquirectangular(quelle); material.envMap = pmremZiel.texture }
          finally { generator.dispose(); quelle.dispose() }
        }
        mesh = new THREE.Mesh(geo, material)
      }
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(0, BUEHNE.WASSER_HOEHE, -150)
      scene.add(mesh)
      zeit = 0
    },
    aktualisiere(dtSekunden) {
      zeit += dtSekunden
      if (this.stufe === 1) normalen.offset.set(zeit * 0.02, zeit * 0.013)
      if (this.stufe === 2 && mesh) (mesh.material as THREE.ShaderMaterial).uniforms.time.value = zeit
    },
    gibFrei() {
      if (mesh) {
        scene.remove(mesh)
        if (mesh instanceof Water) mesh.dispose()
        else { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose() }
        mesh = null
      }
      pmremZiel?.dispose(); pmremZiel = null
      spiegelZiel = null
      normalen.offset.set(0, 0)
    },
  }
  halter.wechsle(anfang)
  return halter
}
