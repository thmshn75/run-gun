import { NodeIO } from '@gltf-transform/core'
import { EXTTextureWebP } from '@gltf-transform/extensions'
import sharp from 'sharp'
import * as THREE from 'three'
import { MECHA_ACHSEN, mechaPose } from '../src/v3d/mecha.ts'

// Projektion der echten GLB von der Seite; reproduzierbar ohne WebGL.
const root = (await new NodeIO().registerExtensions([EXTTextureWebP]).read('src/v3d/modelle/v3d-mecha.glb')).getRoot()
const figur = new THREE.Group()
function knoten(node) {
  const gruppe = new THREE.Group()
  gruppe.name = node.getName()
  gruppe.position.fromArray(node.getTranslation())
  gruppe.quaternion.fromArray(node.getRotation())
  gruppe.scale.fromArray(node.getScale())
  for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
    const position = primitive.getAttribute('POSITION')
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(position.getArray(), 3))
    geo.setIndex(Array.from(primitive.getIndices().getArray()))
    const mesh = new THREE.Mesh(geo)
    mesh.userData.glied = gruppe.name
    gruppe.add(mesh)
  }
  for (const child of node.listChildren()) gruppe.add(knoten(child))
  return gruppe
}
for (const node of root.listScenes()[0].listChildren()) figur.add(knoten(node))
const farbe = { rumpf: '#69798c', oberschenkel_l: '#44bfd5', unterschenkel_l: '#8464d4', fuss_l: '#52b978', oberschenkel_r: '#369ab5', unterschenkel_r: '#654cb4', fuss_r: '#338d63' }
const achse = werte => new THREE.Vector3(...werte).normalize()
const fmt = wert => wert.toFixed(1)
for (const [bild, zeit] of [0, .15, .3, .45].entries()) {
  const pose = mechaPose(zeit), rumpf = figur.getObjectByName('rumpf')
  rumpf.position.y = pose.rumpfY
  rumpf.rotation.z = THREE.MathUtils.degToRad(pose.rumpfPendel)
  for (const [seite, bein] of [['l', pose.links], ['r', pose.rechts]]) {
    figur.getObjectByName(`oberschenkel_${seite}`).quaternion.setFromAxisAngle(achse(MECHA_ACHSEN.huefte), THREE.MathUtils.degToRad(bein.huefte))
    figur.getObjectByName(`unterschenkel_${seite}`).quaternion.setFromAxisAngle(achse(seite === 'l' ? MECHA_ACHSEN.knieL : MECHA_ACHSEN.knieR), THREE.MathUtils.degToRad(bein.knie))
    figur.getObjectByName(`fuss_${seite}`).quaternion.setFromAxisAngle(achse(MECHA_ACHSEN.knoechel), THREE.MathUtils.degToRad(bein.fuss))
  }
  figur.updateMatrixWorld(true)
  const dreiecke = []
  figur.traverse(objekt => {
    if (!(objekt instanceof THREE.Mesh)) return
    const pos = objekt.geometry.getAttribute('position'), index = objekt.geometry.getIndex()
    for (let i = 0; i < index.count; i += 3) {
      const punkte = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(pos, index.getX(i + j)).applyMatrix4(objekt.matrixWorld))
      dreiecke.push({ tiefe: punkte.reduce((sum, p) => sum + p.x, 0) / 3,
        svg: `<polygon points="${punkte.map(p => `${fmt(360 - p.z * 105)},${fmt(800 - p.y * 105)}`).join(' ')}" fill="${farbe[objekt.userData.glied]}" stroke="#26394c" stroke-width="0.45"/>` })
    }
  })
  dreiecke.sort((a, b) => a.tiefe - b.tiefe)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="900"><rect width="720" height="900" fill="#f2f4f7"/><path d="M0 800H720" stroke="#555" stroke-width="2"/>${dreiecke.map(d => d.svg).join('')}</svg>`
  await sharp(Buffer.from(svg)).png().toFile(`tests/fixtures/mecha-schritt-${bild + 1}.png`)
  console.log(`mecha-schritt-${bild + 1}.png: ${dreiecke.length} Dreiecke, t=${zeit.toFixed(2)} s`)
}
