import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { Document, NodeIO } from '@gltf-transform/core'
import { KHRMaterialsSpecular, KHRMaterialsIOR, EXTTextureWebP, KHRMeshQuantization } from '@gltf-transform/extensions'
import { dedup, prune, quantize, resample, simplifyPrimitive } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'
import { Matrix3, Matrix4, Vector3, Quaternion } from 'three'

// 1024² ersetzt zehn Einzelbilder à 512² und spart gegenüber ihnen GPU-Speicher.
const ATLAS = 1024, KACHEL = 256, RAND = 8, WEBP_QUALITAET = 85
const QUELLE_BEWEGUNG = 'tmp/UAL1_Standard.glb'
// Die Quell-Skin-Bindung hat eigene Einheiten; 5,4 ergibt nach dem Backen etwa 1,26 m M4-Länge.
const M4_SKALIERUNG = 5.4
const REIHENFOLGE = ['Mark_HeadMasked','Mark_Helmet1','Mark_Plate_1','Mark_Gloves_1','Mark_Pouches_1','Mark_SunGlusses_Glus','Mark_Boots_2','Mark_Kitel_1','Mark_Pants_1','Mark_Eye','M4']
const COYOTE_FARBEN = new Map([
  ['Mark_Kitel_1','#b39a74'], ['Mark_Pants_1','#8a7456'],
  ['Mark_Plate_1','#7a6549'], ['Mark_Pouches_1','#7a6549'],
  ['Mark_Helmet1','#a58a64'], ['Mark_Boots_2','#6e5a42'],
  ['Mark_Gloves_1','#141414'],
])
const CLIPS = ['Jog_Fwd_Loop','Pistol_Aim_Neutral','Pistol_Idle_Loop','Pistol_Shoot','Death01']
// Aus der Handdrehung in Pistol_Aim_Neutral Form 0: lokale M4-Achse nach -z.
const M4_AUSRICHTUNG = new Quaternion().setFromUnitVectors(new Vector3(0,0,-1),new Vector3(-0.1142726665,-0.9932726705,-0.0187393550))
const io = new NodeIO().registerExtensions([KHRMaterialsSpecular, KHRMaterialsIOR, EXTTextureWebP, KHRMeshQuantization])
const dreiecke = p => (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3
function rgb(hex) { return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)) }
function farbe(tile, col) { for(let i=0;i<tile.length;i+=4){tile[i]=col[0];tile[i+1]=col[1];tile[i+2]=col[2];tile[i+3]=255} }
function maske(p, size) {
  const uv=p.getAttribute('TEXCOORD_0'), idx=p.getIndices(), count=idx?.getCount()??uv.getCount(), out=new Uint8Array(size*size), a=[0,0],b=[0,0],c=[0,0]
  for(let t=0;t<count;t+=3){uv.getElement(idx?idx.getScalar(t):t,a);uv.getElement(idx?idx.getScalar(t+1):t+1,b);uv.getElement(idx?idx.getScalar(t+2):t+2,c)
    const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0])*size)),x1=Math.min(size-1,Math.ceil(Math.max(a[0],b[0],c[0])*size)),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1])*size)),y1=Math.min(size-1,Math.ceil(Math.max(a[1],b[1],c[1])*size))
    const edge=(u,v,w)=> (u[0]-w[0])*(v[1]-w[1])-(u[1]-w[1])*(v[0]-w[0]);const area=edge(a,b,c);if(!area)continue
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const q=[(x+.5)/size,(y+.5)/size];if(edge(b,c,q)/area>=-1e-6&&edge(c,a,q)/area>=-1e-6&&edge(a,b,q)/area>=-1e-6)out[y*size+x]=1}
  }
  return out
}
function accessor(doc, name, array, type) {return doc.createAccessor(name).setType(type).setArray(array)}
function addPrimitive(doc, mesh, arrays, material) {
  const p=doc.createPrimitive().setMaterial(material)
  for(const [semantic,array,type] of arrays.attrs)p.setAttribute(semantic,accessor(doc,semantic,array,type))
  p.setIndices(accessor(doc,'indices',new Uint32Array(arrays.indices),'SCALAR'));mesh.addPrimitive(p);return p
}
function entferneVerwaisteAccessoren(root) {
  const benutzt=new Set()
  for(const s of root.listSkins())if(s.getInverseBindMatrices())benutzt.add(s.getInverseBindMatrices())
  for(const m of root.listMeshes())for(const p of m.listPrimitives()){if(p.getIndices())benutzt.add(p.getIndices());for(const a of p.listAttributes())benutzt.add(a)}
  for(const a of root.listAnimations())for(const s of a.listSamplers()){benutzt.add(s.getInput());benutzt.add(s.getOutput())}
  for(const a of root.listAccessors())if(!benutzt.has(a))a.dispose()
}
async function bewegung() {
  try {await stat(QUELLE_BEWEGUNG)} catch {throw new Error(`Bewegungsquelle fehlt: ${QUELLE_BEWEGUNG} (nur UAL1_Standard.glb)`)}
  const doc=await io.read(QUELLE_BEWEGUNG), root=doc.getRoot()
  for(const a of root.listAnimations())if(!CLIPS.includes(a.getName()))a.dispose()
  for(const a of root.listAnimations())for(const channel of a.listChannels()){
    const s=channel.getSampler(),input=s.getInput(),output=s.getOutput(),array=output.getArray(),width=output.getElementSize()
    let constant=true;for(let i=width;i<array.length;i++)if(Math.abs(array[i]-array[i%width])>1e-5){constant=false;break}
    const count=input.getCount(),target=constant?1:Math.min(count,12),times=[],values=[]
    for(let i=0;i<target;i++){const at=target===1?0:Math.round(i*(count-1)/(target-1));times.push(input.getScalar(at));for(let c=0;c<width;c++)values.push(array[at*width+c])}
    s.setInput(doc.createAccessor().setType('SCALAR').setArray(new Float32Array(times)))
    s.setOutput(doc.createAccessor().setType(output.getType()).setArray(new Float32Array(values)))
  }
  for(const node of root.listNodes())node.setMesh(null)
  for(const mesh of root.listMeshes())mesh.dispose()
  await doc.transform(prune())
  entferneVerwaisteAccessoren(root)
  await mkdir('src/v3d/modelle',{recursive:true})
  const out='src/v3d/modelle/v3d-bewegung.glb';await io.write(out,doc)
  const check=(await io.read(out)).getRoot(), names=check.listAnimations().map(a=>a.getName()), bytes=(await stat(out)).size
  if(CLIPS.some(n=>!names.includes(n))||check.listMeshes().length||check.listTextures().length||bytes>1048576)throw new Error('Bewegung verletzt Qualitätsgrenze')
  console.log(JSON.stringify({clips:names,bytes}))
}
async function soldat() {
  const doc=await io.read('modelle-quelle/soldat-vereinfacht.glb'),root=doc.getRoot(),mats=root.listMaterials(),skin=root.listSkins()[0]
  const nodes=root.listNodes().filter(n=>n.getMesh()),teile=nodes.flatMap(n=>n.getMesh().listPrimitives().map(p=>({p,n})))
  if(teile.length!==23||!skin)throw new Error('Soldatenquelle unerwartet')
  const tileSize=KACHEL-2*RAND,atlas=Buffer.alloc(ATLAS*ATLAS*4), kacheln=new Map()
  for(let k=0;k<REIHENFOLGE.length;k++){
    const name=REIHENFOLGE[k],tile=Buffer.alloc(tileSize*tileSize*4),material=mats.find(m=>m.getName()===name)
    if(name==='M4') {for(let y=0;y<tileSize;y++)for(let x=0;x<tileSize;x++){let c=rgb('#111214'),i=(y*tileSize+x)*4,delta=Math.round((1-y/tileSize)*12);for(let z=0;z<3;z++)tile[i+z]=c[z]+delta;tile[i+3]=255}}
    else if(!material?.getBaseColorTexture())farbe(tile,rgb('#111111'))
    else {
      const src=await sharp(material.getBaseColorTexture().getImage()).ensureAlpha().resize(tileSize,tileSize).raw().toBuffer()
      src.copy(tile)
      if(COYOTE_FARBEN.has(name)){
        const marks=new Uint8Array(tileSize*tileSize)
        for(const {p} of teile.filter(t=>t.p.getMaterial()===material)){const m=maske(p,tileSize);for(let i=0;i<m.length;i++)marks[i]|=m[i]}
        let sum=0,count=0;for(let i=0;i<marks.length;i++)if(marks[i]){let o=i*4;sum+=(tile[o]+tile[o+1]+tile[o+2])/3;count++}
        const mean=sum/Math.max(1,count),col=rgb(COYOTE_FARBEN.get(name))
        for(let i=0;i<marks.length;i++)if(marks[i]){let o=i*4,lum=(tile[o]+tile[o+1]+tile[o+2])/3,shade=lum/Math.max(1,mean);for(let c=0;c<3;c++)tile[o+c]=Math.min(255,Math.round(col[c]*shade))}
      }
    }
    const ox=(k%4)*KACHEL,oy=Math.floor(k/4)*KACHEL
    for(let y=0;y<KACHEL;y++)for(let x=0;x<KACHEL;x++){let sx=Math.max(0,Math.min(tileSize-1,x-RAND)),sy=Math.max(0,Math.min(tileSize-1,y-RAND)),a=(sy*tileSize+sx)*4,b=((oy+y)*ATLAS+ox+x)*4;tile.copy(atlas,b,a,a+4)}
    kacheln.set(name,k)
  }
  await mkdir('tmp',{recursive:true});await sharp(atlas,{raw:{width:ATLAS,height:ATLAS,channels:4}}).png().toFile('tmp/soldat-atlas.png')
  const webp=await sharp(atlas,{raw:{width:ATLAS,height:ATLAS,channels:4}}).webp({quality:WEBP_QUALITAET}).toBuffer(),texture=doc.createTexture('soldat-atlas').setImage(webp).setMimeType('image/webp').setURI('v3d-soldat.webp')
  const mat=doc.createMaterial('Soldat_Atlas').setBaseColorTexture(texture).setBaseColorFactor([1,1,1,1]).setMetallicFactor(0).setRoughnessFactor(.85)
  const pos=[],norm=[],uvs=[],joints=[],weights=[],indices=[];let offset=0
  await MeshoptSimplifier.ready
  for(const {p} of teile){simplifyPrimitive(p,{simplifier:MeshoptSimplifier,ratio:.88,error:.03,lockBorder:false});const n=p.getAttribute('POSITION').getCount(),k=kacheln.get(p.getMaterial().getName());if(k===undefined)throw new Error('Material ohne Kachel')
    for(let i=0;i<n;i++){pos.push(...p.getAttribute('POSITION').getElement(i,[0,0,0]));norm.push(...p.getAttribute('NORMAL').getElement(i,[0,0,0]));const uv=p.getAttribute('TEXCOORD_0').getElement(i,[0,0]);uvs.push(((k%4)*KACHEL+RAND+uv[0]*tileSize)/ATLAS,(Math.floor(k/4)*KACHEL+RAND+uv[1]*tileSize)/ATLAS);joints.push(...p.getAttribute('JOINTS_0').getElement(i,[0,0,0,0]));weights.push(...p.getAttribute('WEIGHTS_0').getElement(i,[0,0,0,0]))}
    const ind=p.getIndices();for(let i=0;i<(ind?.getCount()??n);i++)indices.push(offset+(ind?ind.getScalar(i):i));offset+=n
  }
  const soldierWorld=new Matrix4().fromArray(nodes[0].getWorldMatrix()),hand=root.listNodes().find(n=>n.getName()==='CC_Base_R_Hand_081'),handIndex=skin.listJoints().indexOf(hand)
  if(handIndex<0)throw new Error('Handknochen fehlt')
  // Gewehrpunkte müssen im Bindraum des Handknochens liegen; die Szenen-Weltmatrix reicht hier nicht.
  const bindHand=new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(handIndex,new Array(16))).invert()
  const m4=(await io.read('modelle-quelle/m4/scene.gltf')).getRoot();let gunPos=[],gunInd=[],gunOffset=0
  for(const n of m4.listNodes().filter(n=>n.getMesh()))for(const p of n.getMesh().listPrimitives()){
    const m=new Matrix4().fromArray(n.getWorldMatrix()),a=p.getAttribute('POSITION'),count=a.getCount();for(let i=0;i<count;i++){let v=new Vector3(...a.getElement(i,[0,0,0])).applyMatrix4(m);gunPos.push(v.x,v.y,v.z)}
    const idx=p.getIndices();for(let i=0;i<(idx?.getCount()??count);i++)gunInd.push(gunOffset+(idx?idx.getScalar(i):i));gunOffset+=count
  }
  // Originalteile verschweißen; vereinfachen mit Fehlerschranke ohne harte Randsperre.
  const remap=new Map(),packed=[],mapped=new Uint32Array(gunPos.length/3);for(let i=0;i<mapped.length;i++){let key=gunPos.slice(i*3,i*3+3).map(x=>Math.round(x*10000)).join(',');let j=remap.get(key);if(j===undefined){j=packed.length/3;remap.set(key,j);packed.push(...gunPos.slice(i*3,i*3+3))}mapped[i]=j}
  const srcInd=new Uint32Array(gunInd.map(i=>mapped[i]));await MeshoptSimplifier.ready
  let simplified;for(let error of [.001,.01,.05,.2,1]){simplified=MeshoptSimplifier.simplify(srcInd,new Float32Array(packed),3,1500,error,[])[0];if(simplified.length<=1800)break}
  if(simplified.length>1800){simplified=MeshoptSimplifier.simplifySloppy(srcInd,new Float32Array(packed),3,null,1500,1)[0]}
  const xs=[],ys=[],zs=[];for(let i=0;i<packed.length;i+=3){xs.push(packed[i]);ys.push(packed[i+1]);zs.push(packed[i+2])}
  const mins=[Math.min(...xs),Math.min(...ys),Math.min(...zs)],maxs=[Math.max(...xs),Math.max(...ys),Math.max(...zs)],axis=[0,1,2].sort((a,b)=>(maxs[b]-mins[b])-(maxs[a]-mins[a]))[0]
  const side=[0,1,2].filter(a=>a!==axis),soldierBox=[Infinity,-Infinity]
  for(let i=0;i<pos.length;i+=3){let v=new Vector3(pos[i],pos[i+1],pos[i+2]).applyMatrix4(soldierWorld);soldierBox[0]=Math.min(soldierBox[0],v.y);soldierBox[1]=Math.max(soldierBox[1],v.y)}
  const zielLaenge=(soldierBox[1]-soldierBox[0])*.84/2,scale=M4_SKALIERUNG*zielLaenge/(maxs[axis]-mins[axis]),center=mins.map((v,i)=>(v+maxs[i])/2)
  let muzzleIndex=0
  for(let i=0;i<packed.length;i+=3){if(packed[i+axis]>packed[muzzleIndex*3+axis])muzzleIndex=i/3
    let v=new Vector3((packed[i+side[0]]-center[side[0]])*scale, (packed[i+side[1]]-center[side[1]])*scale, -(packed[i+axis]-mins[axis]) *scale+zielLaenge*.28).applyQuaternion(M4_AUSRICHTUNG).applyMatrix4(bindHand);pos.push(v.x,v.y,v.z);norm.push(0,1,0);uvs.push((2*KACHEL+KACHEL/2)/ATLAS,(2*KACHEL+KACHEL/2)/ATLAS);joints.push(handIndex,0,0,0);weights.push(1,0,0,0)}
  const gripIndex=offset+packed.length/3,gripLocal=new Vector3().applyMatrix4(bindHand)
  pos.push(gripLocal.x,gripLocal.y,gripLocal.z);norm.push(0,1,0);uvs.push((2*KACHEL+KACHEL/2)/ATLAS,(2*KACHEL+KACHEL/2)/ATLAS);joints.push(handIndex,0,0,0);weights.push(1,0,0,0)
  for(const i of simplified)indices.push(offset+i)
  const triangles=indices.length/3
  const mesh=doc.createMesh('Soldat_M4_vereint')
  mesh.setExtras({m4VertexStart:offset,m4VertexCount:packed.length/3+1,m4GripVertex:gripIndex,m4MuzzleVertex:offset+muzzleIndex})
  addPrimitive(doc,mesh,{attrs:[['POSITION',new Float32Array(pos),'VEC3'],['NORMAL',new Float32Array(norm),'VEC3'],['TEXCOORD_0',new Float32Array(uvs),'VEC2'],['JOINTS_0',new Uint16Array(joints),'VEC4'],['WEIGHTS_0',new Float32Array(weights),'VEC4']],indices},mat)
  nodes[0].setMesh(mesh);for(const n of nodes.slice(1))n.setMesh(null)
  for(const a of root.listAnimations())a.dispose()
  for(const old of mats)old.dispose()
  await doc.transform(prune(),quantize({quantizePosition:16,quantizeNormal:8,quantizeTexcoord:14,quantizeWeight:8}))
  const benutzteSkins=new Set(root.listNodes().filter(n=>n.getMesh()).map(n=>n.getSkin()).filter(Boolean))
  for(const n of root.listNodes())if(!n.getMesh())n.setSkin(null)
  for(const skin of root.listSkins())if(!benutzteSkins.has(skin))skin.dispose()
  entferneVerwaisteAccessoren(root)
  const out='src/v3d/modelle/v3d-soldat.glb';await mkdir('src/v3d/modelle',{recursive:true});await io.write(out,doc)
  const check=(await io.read(out)).getRoot(),pics=check.listTextures(),prims=check.listMeshes().flatMap(m=>m.listPrimitives()),bytes=(await stat(out)).size,meta=await sharp(pics[0].getImage()).metadata()
  if(prims.length!==1||check.listMaterials().length!==1||pics.length!==1||meta.width!==ATLAS||meta.height!==ATLAS||triangles<4900||triangles>5400||!check.listSkins().length||bytes>2097152)throw new Error(`Soldat verletzt Qualitätsgrenze: ${JSON.stringify({prims:prims.length,materialien:check.listMaterials().length,bilder:pics.length,triangles,bytes,m4Dreiecke:simplified.length/3})}`)
  console.log(JSON.stringify({triangles,m4Dreiecke:simplified.length/3,bytes,atlas:[meta.width,meta.height],handIndex}))
}
async function zombie() {
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
}

async function boss(art) {
  const quelle = `modelle-quelle/${art}-vereinfacht.glb`, ausgabe = `src/v3d/modelle/v3d-${art}.glb`
  const doc = await io.read(quelle), root = doc.getRoot()
  const vorher = root.listMeshes().flatMap(m => m.listPrimitives()).reduce((n,p) => n + dreiecke(p), 0)
  const erwartet = art === 'miniboss' ? ['walk','Run','attack_1','attack_2','roar','hit_1','death_1'].map(n => `Creature_armature|${n}`) : ['Motion']
  for (const clip of root.listAnimations()) if (!erwartet.includes(clip.getName())) clip.dispose()
  for (const mat of root.listMaterials()) {
    for (const ext of mat.listExtensions()) mat.setExtension(ext.extensionName, null)
    mat.setMetallicRoughnessTexture(null).setOcclusionTexture(null).setEmissiveTexture(null)
    mat.setMetallicFactor(0).setRoughnessFactor(.8).setEmissiveFactor([0,0,0])
    if (!mat.getBaseColorTexture() || !mat.getNormalTexture()) throw new Error(`${art}: Farb- oder Reliefbild fehlt`)
  }
  for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) p.setAttribute('TANGENT', null)
  await doc.transform(prune(), dedup(), resample())
  entferneVerwaisteAccessoren(root)
  for (const bild of root.listTextures()) {
    bild.setImage(await sharp(bild.getImage()).resize(512,512).webp({quality:80}).toBuffer()).setMimeType('image/webp').setURI(`${art}-${root.listTextures().indexOf(bild)}.webp`)
  }
  await mkdir('src/v3d/modelle', {recursive:true})
  await io.write(ausgabe, doc)
  let bytes = (await stat(ausgabe)).size
  if (bytes > 2*1048576) {
    // Erst 15 Hz, danach höhere Resample-Toleranz. Keine Geometrie- oder Bildänderung.
    for (const clip of root.listAnimations()) for (const channel of clip.listChannels()) {
      const s=channel.getSampler(), input=s.getInput(), output=s.getOutput(), count=input.getCount(), width=output.getElementSize()
      if (count < 3) continue
      const times=[], values=[]; let last=-Infinity
      for (let i=0;i<count;i++) {const t=input.getScalar(i);if(i!==0&&i!==count-1&&t-last<1/15)continue;times.push(t);for(let j=0;j<width;j++)values.push(output.getArray()[i*width+j]);last=t}
      s.setInput(doc.createAccessor().setType('SCALAR').setArray(new Float32Array(times)))
      s.setOutput(doc.createAccessor().setType(output.getType()).setArray(new Float32Array(values)))
    }
    for (const toleranz of [1e-3,3e-3,1e-2,3e-2]) {
      await doc.transform(resample({tolerance:toleranz}),prune(),dedup())
      entferneVerwaisteAccessoren(root)
      await io.write(ausgabe,doc);bytes=(await stat(ausgabe)).size
      if(bytes<=2*1048576)break
    }
  }
  const check=(await io.read(ausgabe)).getRoot(),nachher=check.listMeshes().flatMap(m=>m.listPrimitives()).reduce((n,p)=>n+dreiecke(p),0)
  const namen=check.listAnimations().map(a=>a.getName())
  const materialOk=check.listMaterials().every(m=>m.getBaseColorTexture()&&m.getNormalTexture()&&!m.getMetallicRoughnessTexture()&&!m.getOcclusionTexture()&&!m.getEmissiveTexture()&&m.getMetallicFactor()===0&&m.getRoughnessFactor()===.8)
  const bildMetas=await Promise.all(check.listTextures().map(t=>sharp(t.getImage()).metadata()))
  const bildOk=bildMetas.every(m=>m.width===512&&m.height===512&&m.format==='webp')
  if(Math.abs(nachher/vorher-1)>.01||!materialOk||!bildOk||namen.length!==erwartet.length||erwartet.some(n=>!namen.includes(n))||bytes>2*1048576){
    const anteile={geometrie:check.listMeshes().flatMap(m=>m.listPrimitives()).reduce((n,p)=>n+p.listAttributes().reduce((sum,a)=>sum+a.getArray().byteLength,0)+(p.getIndices()?.getArray().byteLength??0),0),bilder:check.listTextures().reduce((n,t)=>n+t.getImage().byteLength,0),animation:check.listAnimations().reduce((n,a)=>n+a.listSamplers().reduce((sum,s)=>sum+s.getInput().getArray().byteLength+s.getOutput().getArray().byteLength,0),0)}
    throw new Error(`${art}: Qualitätsgrenze verletzt ${JSON.stringify({vorher,nachher,bytes,anteile,materialOk,bildOk,namen})}`)
  }
  console.log(JSON.stringify({art,dreiecke:nachher,bytes,bilder:bildMetas.length,clips:namen}))
}

const FAHRZEUG_QUELLEN = {
  humvee: 'tmp/fahrzeuge/humvee/scene.gltf', panzer: 'tmp/fahrzeuge/panzer/scene.gltf',
  haubitze: 'tmp/fahrzeuge/haubitze/scene.gltf', hubschrauber: 'tmp/fahrzeuge/hubschrauber/scene.gltf',
}
const FAHRZEUG_LAENGEN = {humvee:4.6,panzer:9.8,haubitze:7.3,hubschrauber:17.7}
// Humvee: vordere Aufhängung +z; AMX: Rohr +z; Haubitze: Rohr -z; Apache: Heck -z.
const FAHRZEUG_DREHUNG = {humvee:Math.PI,panzer:Math.PI,haubitze:0,hubschrauber:Math.PI}

async function fahrzeug(name) {
  const quelle=await io.read(FAHRZEUG_QUELLEN[name]), alt=quelle.getRoot()
  const teile=alt.listNodes().filter(n=>n.getMesh()).flatMap(n=>n.getMesh().listPrimitives().map(p=>({n,p})))
  const punkte=[]
  for(const {n,p} of teile){const m=new Matrix4().fromArray(n.getWorldMatrix()),a=p.getAttribute('POSITION')
    for(let i=0;i<a.getCount();i++)punkte.push(new Vector3(...a.getElement(i,[0,0,0])).applyMatrix4(m))
  }
  const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity)
  punkte.forEach(v=>{min.min(v);max.max(v)})
  const laengsAchse=max.z-min.z>=max.x-min.x?'z':'x'
  const faktor=FAHRZEUG_LAENGEN[name]/(max[laengsAchse]-min[laengsAchse])
  const mitte=new Vector3((min.x+max.x)/2,min.y,(min.z+max.z)/2)
  const drehung=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),FAHRZEUG_DREHUNG[name])
  const normiere=v=>v.sub(mitte).applyQuaternion(drehung).multiplyScalar(faktor)
  const doc=new Document(),root=doc.getRoot(),buffer=doc.createBuffer(),scene=doc.createScene(name)
  const material=doc.createMaterial(name).setMetallicFactor(0).setRoughnessFactor(.8).setBaseColorFactor([1,1,1,1])
  const mats=alt.listMaterials(),bilder=mats.map(m=>m.getBaseColorTexture()).filter(Boolean)
  let bild
  if(name==='haubitze'){
    const raw=Buffer.alloc(64*64*4)
    const linearZuSrgb=x=>Math.round(255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055))
    for(let k=0;k<mats.length;k++){const c=mats[k].getBaseColorFactor()
      for(let y=0;y<64;y++)for(let x=k*8;x<(k+1)*8;x++){const o=(y*64+x)*4;for(let j=0;j<3;j++)raw[o+j]=linearZuSrgb(c[j]);raw[o+3]=255}
    }
    bild=await sharp(raw,{raw:{width:64,height:64,channels:4}}).webp({lossless:true}).toBuffer()
  }else if(bilder.length===1) bild=await sharp(bilder[0].getImage()).resize(512,512).webp({quality:85}).toBuffer()
  else if(bilder.length===2){const raw=Buffer.alloc(512*512*4)
    for(let k=0;k<2;k++){const tile=await sharp(bilder[k].getImage()).ensureAlpha().resize(256,512).raw().toBuffer()
      for(let y=0;y<512;y++)tile.copy(raw,(y*512+k*256)*4,y*256*4,(y+1)*256*4)
    }
    bild=await sharp(raw,{raw:{width:512,height:512,channels:4}}).webp({quality:85}).toBuffer()
  }else throw new Error(`${name}: unerwartete Farbbilder ${bilder.length}`)
  const textur=doc.createTexture(`${name}-farbe`).setImage(bild).setMimeType('image/webp').setURI(`v3d-${name}.webp`)
  material.setBaseColorTexture(textur)
  const gruppen=new Map()
  for(const {n,p} of teile){
    const knoten=name==='hubschrauber'?(n.getName().startsWith('Rotor_')?'rotor':n.getName().startsWith('Back_Rotor_')?'heckrotor':'rumpf'):'rumpf'
    if(!gruppen.has(knoten))gruppen.set(knoten,{pos:[],norm:[],uv:[],ind:[],pivot:knoten==='rumpf'?new Vector3():normiere(new Vector3(...n.getWorldTranslation()))})
    const g=gruppen.get(knoten),m=new Matrix4().fromArray(n.getWorldMatrix()),nm=new Matrix3().getNormalMatrix(m),a=p.getAttribute('POSITION'),norm=p.getAttribute('NORMAL'),uv=p.getAttribute('TEXCOORD_0'),offset=g.pos.length/3
    const mat=p.getMaterial(),k=mats.indexOf(mat),tex=mat.getBaseColorTexture(),bildIndex=bilder.indexOf(tex)
    if(k<0||name!=='haubitze'&&(!uv||bildIndex<0))throw new Error(`${name}: Farbe/UV fehlt`)
    for(let i=0;i<a.getCount();i++){
      const v=normiere(new Vector3(...a.getElement(i,[0,0,0])).applyMatrix4(m)).sub(g.pivot)
      g.pos.push(v.x,v.y,v.z)
      const normal=norm?new Vector3(...norm.getElement(i,[0,0,1])).applyMatrix3(nm).applyQuaternion(drehung).normalize():new Vector3(0,1,0)
      g.norm.push(normal.x,normal.y,normal.z)
      if(name==='haubitze')g.uv.push((k+.5)/mats.length,.5)
      else {const [u,vv]=uv.getElement(i,[0,0]);g.uv.push(bilder.length===2?(bildIndex+u)*.5:u,vv)}
    }
    const indices=p.getIndices(),count=indices?.getCount()??a.getCount()
    for(let i=0;i<count;i++)g.ind.push(offset+(indices?indices.getScalar(i):i))
  }
  for(const [k,g] of gruppen){const mesh=doc.createMesh(k),primitive=doc.createPrimitive().setMaterial(material)
    primitive.setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.pos)).setBuffer(buffer))
    primitive.setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.norm)).setBuffer(buffer))
    primitive.setAttribute('TEXCOORD_0',doc.createAccessor().setType('VEC2').setArray(new Float32Array(g.uv)).setBuffer(buffer))
    primitive.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(g.ind)).setBuffer(buffer))
    mesh.addPrimitive(primitive);scene.addChild(doc.createNode(k).setMesh(mesh).setTranslation(g.pivot.toArray()))
  }
  await mkdir('src/v3d/modelle',{recursive:true})
  const out=`src/v3d/modelle/v3d-${name}.glb`;await io.write(out,doc)
  const check=(await io.read(out)).getRoot(),dreiecke=check.listMeshes().flatMap(m=>m.listPrimitives()).reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),bytes=(await stat(out)).size,meta=await sharp(check.listTextures()[0].getImage()).metadata()
  const rotoren=check.listNodes().map(n=>n.getName())
  if(dreiecke>4000||check.listMaterials().length!==1||check.listTextures().length!==1||bytes>1048576||meta.width!==(name==='haubitze'?64:512)||meta.height!==meta.width||meta.format!=='webp'||name==='hubschrauber'&&(!rotoren.includes('rotor')||!rotoren.includes('heckrotor')))throw new Error(`${name}: Qualitätsgrenze verletzt`)
  console.log(JSON.stringify({name,dreiecke,bytes,bild:[meta.width,meta.height],drehung:FAHRZEUG_DREHUNG[name],laenge:FAHRZEUG_LAENGEN[name]}))
}

const ziel=process.argv[2]
if(ziel==='soldat')await soldat();else if(ziel==='bewegung')await bewegung();else if(ziel==='zombie')await zombie();else if(ziel==='miniboss'||ziel==='eliteboss')await boss(ziel);else if(ziel==='fahrzeuge')for(const n of Object.keys(FAHRZEUG_QUELLEN))await fahrzeug(n);else if(ziel in FAHRZEUG_QUELLEN)await fahrzeug(ziel);else throw new Error('Aufruf: node scripts/modelle.mjs soldat|bewegung|zombie|miniboss|eliteboss|fahrzeuge|humvee|panzer|haubitze|hubschrauber')
