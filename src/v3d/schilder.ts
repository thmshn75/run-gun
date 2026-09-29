import * as THREE from 'three'

export interface SchildDaten {
  breite: number
  hoehe: number
  text: string
  farbe: string
  unterkante?: number
  neigungGrad?: number
}

const bemalungen = new Map<string, THREE.CanvasTexture>()

function kasten(gruppe: THREE.Group, name: string, groesse: [number, number, number], position: [number, number, number], material: THREE.Material): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...groesse), material)
  mesh.name = name
  mesh.position.set(...position)
  gruppe.add(mesh)
}

function bemalung({ breite, hoehe, text, farbe }: SchildDaten): THREE.CanvasTexture {
  const schluessel = `${text}|${farbe}|${breite}|${hoehe}`
  const vorhanden = bemalungen.get(schluessel)
  if (vorhanden) return vorhanden
  const canvas = document.createElement('canvas')
  canvas.width = breite / hoehe > 4 ? 1024 : 512
  canvas.height = Math.round(canvas.width * hoehe / breite)
  const ctx = canvas.getContext('2d')!
  const oben = new THREE.Color(farbe).lerp(new THREE.Color('#ffffff'), 0.22).getStyle()
  const unten = new THREE.Color(farbe).lerp(new THREE.Color('#000000'), 0.28).getStyle()
  const verlauf = ctx.createLinearGradient(0, 0, 0, canvas.height)
  verlauf.addColorStop(0, oben)
  verlauf.addColorStop(1, unten)
  ctx.fillStyle = verlauf
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  let schrift = Math.round(canvas.height * 0.6)
  ctx.font = `900 ${schrift}px system-ui, sans-serif`
  while (ctx.measureText(text).width > canvas.width * 0.86 && schrift > 1) {
    schrift--
    ctx.font = `900 ${schrift}px system-ui, sans-serif`
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = schrift * 0.08
  ctx.strokeStyle = '#183048'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
  ctx.shadowBlur = schrift * 0.06
  ctx.shadowOffsetY = schrift * 0.025
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  const textur = new THREE.CanvasTexture(canvas)
  textur.colorSpace = THREE.SRGBColorSpace
  bemalungen.set(schluessel, textur)
  return textur
}

export function baueSchild(daten: SchildDaten): THREE.Group {
  const { breite, hoehe, farbe, unterkante = 0, neigungGrad = 0 } = daten
  const gruppe = new THREE.Group()
  const tafel = new THREE.Group()
  tafel.position.y = unterkante + hoehe / 2
  tafel.rotation.x = THREE.MathUtils.degToRad(neigungGrad)
  gruppe.add(tafel)
  const dunkel = new THREE.MeshStandardMaterial({ color: new THREE.Color(farbe).multiplyScalar(0.72), roughness: 0.8 })
  const hell = new THREE.MeshStandardMaterial({ color: new THREE.Color(farbe).lerp(new THREE.Color('#ffffff'), 0.32), roughness: 0.65 })
  kasten(tafel, 'schild-platte', [breite, hoehe, 0.2], [0, 0, 0], dunkel)
  const front = new THREE.Mesh(new THREE.PlaneGeometry(breite - 0.08, hoehe - 0.08), new THREE.MeshBasicMaterial({ map: bemalung(daten) }))
  front.name = 'schild-vorderseite'
  front.position.z = 0.105
  tafel.add(front)
  const rand = 0.08
  const vor = 0.12
  for (const x of [-breite / 2 + rand / 2, breite / 2 - rand / 2])
    kasten(tafel, 'schild-rahmen', [rand, hoehe, rand], [x, 0, vor], hell)
  for (const y of [-hoehe / 2 + rand / 2, hoehe / 2 - rand / 2])
    kasten(tafel, 'schild-rahmen', [breite - 2 * rand, rand, rand], [0, y, vor], hell)
  const pfostenHoehe = unterkante + hoehe + 0.1
  const holz = new THREE.MeshStandardMaterial({ color: '#c9793a', roughness: 0.9 })
  for (const x of [-breite / 2 + 0.07, breite / 2 - 0.07])
    kasten(gruppe, 'schild-pfosten', [0.14, pfostenHoehe, 0.14], [x, pfostenHoehe / 2, -0.11], holz)
  return gruppe
}

export function gibSchilderFrei(): void {
  for (const textur of bemalungen.values()) textur.dispose()
  bemalungen.clear()
}
