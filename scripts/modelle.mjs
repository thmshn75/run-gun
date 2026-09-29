import { mkdir, stat } from 'node:fs/promises'
import { NodeIO } from '@gltf-transform/core'
import { KHRMaterialsSpecular, KHRMaterialsIOR, EXTTextureWebP } from '@gltf-transform/extensions'
import { dedup, prune } from '@gltf-transform/functions'
import sharp from 'sharp'

if (process.argv[2] !== 'zombie') throw new Error('Aufruf: node scripts/modelle.mjs zombie')
const eingabe = 'modelle-quelle/zombie-vereinfacht.glb'
const ausgabe = 'src/v3d/modelle/v3d-zombie.glb'
const io = new NodeIO().registerExtensions([KHRMaterialsSpecular, KHRMaterialsIOR, EXTTextureWebP])
const doc = await io.read(eingabe)
const root = doc.getRoot()
for (const mat of root.listMaterials()) {
  for (const ext of mat.listExtensions()) mat.setExtension(ext.extensionName, null)
  mat.setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setEmissiveTexture(null)
  mat.setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(0.85)
}
for (const ext of root.listExtensionsUsed()) if (ext.extensionName !== 'EXT_texture_webp') ext.dispose()
await doc.transform(prune())
const material = root.listMaterials()[0]
const bild = material.getBaseColorTexture()
if (!bild) throw new Error('Farbbild fehlt')
if (!bild.getImage()) throw new Error('Farbbild hat keine Bilddaten')
const uvs = root.listMeshes().flatMap(mesh => mesh.listPrimitives().map(p => p.getAttribute('TEXCOORD_0')).filter(Boolean))
let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity
for (const uv of uvs) for (let i = 0; i < uv.getCount(); i++) {
  const [u, v] = uv.getElement(i, [0, 0]); minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v)
}
const meta = await sharp(bild.getImage()).metadata()
const links = Math.max(0, Math.floor(minU * meta.width - 8))
const rechts = Math.min(meta.width, Math.ceil(maxU * meta.width + 8))
const oben = Math.max(0, Math.floor(minV * meta.height - 8))
const unten = Math.min(meta.height, Math.ceil(maxV * meta.height + 8))
for (const uv of uvs) for (let i = 0; i < uv.getCount(); i++) {
  const [u, v] = uv.getElement(i, [0, 0]); uv.setElement(i, [(u * meta.width - links) / (rechts - links), (v * meta.height - oben) / (unten - oben)])
}
bild.setImage(await sharp(bild.getImage()).extract({left: links, top: oben, width: rechts - links, height: unten - oben}).resize(512, 512, {fit: 'fill'}).webp({quality: 90}).toBuffer())
bild.setMimeType('image/webp').setURI('v3d-zombie.webp')
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) p.setAttribute('TANGENT', null)
const dreiecke = d => d.getRoot().listMeshes().flatMap(m => m.listPrimitives()).reduce((n,p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0)
const anzahl = dreiecke(doc)
await doc.transform(prune(), dedup())
await mkdir('src/v3d/modelle', {recursive: true})
await io.write(ausgabe, doc)
const kontrolle = await io.read(ausgabe)
const kroot = kontrolle.getRoot(), kmat = kroot.listMaterials()[0], bilder = kroot.listTextures()
const kuvs = kroot.listMeshes().flatMap(m => m.listPrimitives().map(p=>p.getAttribute('TEXCOORD_0')).filter(Boolean))
let us = [Infinity, -Infinity], vs = [Infinity, -Infinity]
for (const uv of kuvs) for (let i=0;i<uv.getCount();i++) { const [u,v]=uv.getElement(i,[0,0]); us=[Math.min(us[0],u),Math.max(us[1],u)]; vs=[Math.min(vs[0],v),Math.max(vs[1],v)] }
const bildMeta = await sharp(bilder[0].getImage()).metadata(), bytes = (await stat(ausgabe)).size
const slots = [kmat.getNormalTexture(),kmat.getMetallicRoughnessTexture(),kmat.getOcclusionTexture(),kmat.getEmissiveTexture()]
if (anzahl < 900 || anzahl > 1100 || dreiecke(kontrolle) !== anzahl || bilder.length !== 1 || bildMeta.width !== 512 || bildMeta.height !== 512 || slots.some(Boolean) || kmat.getMetallicFactor() !== 0 || kmat.getRoughnessFactor() !== 0.85 || JSON.stringify(kmat.getBaseColorFactor()) !== '[1,1,1,1]' || kroot.listAnimations().length < 1 || bytes > 1048576 || us[1]-us[0] < .9 || vs[1]-vs[0] < .9) throw new Error('Ausgabe verletzt Qualitätsgrenze')
console.log(JSON.stringify({dreiecke: anzahl, bytes, bild: [bildMeta.width,bildMeta.height], uv:[us,vs], animationen:kroot.listAnimations().length}))
