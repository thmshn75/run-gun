import { NodeIO } from '@gltf-transform/core'
import { EXTTextureWebP, KHRMaterialsSpecular, KHRMaterialsIOR, KHRMeshQuantization } from '@gltf-transform/extensions'
import { Matrix4, Vector3, Triangle, Quaternion } from 'three'
// Historischer N6/N7-Optimierungslauf aus Nacharbeit 2 (vom Projektverzeichnis aus).
// Die N10-Abnahme der Spalt-Zunahme an sichtbaren GLB-Ecken steht in v3dMecha.test.ts.
const io=new NodeIO().registerExtensions([EXTTextureWebP]),root=(await io.read('src/v3d/modelle/v3d-mecha.glb')).getRoot()
const mesh={}
for(const n of root.listNodes().filter(n=>n.getMesh())){
 const m=new Matrix4().fromArray(n.getWorldMatrix()),p=n.getMesh().listPrimitives()[0],a=p.getAttribute('POSITION'),ind=p.getIndices(),v=[]
 for(let i=0;i<a.getCount();i++)v.push(new Vector3(...a.getElement(i,[0,0,0])).applyMatrix4(m))
 const tris=[];for(let i=0;i<ind.getCount();i+=3)tris.push(new Triangle(v[ind.getScalar(i)],v[ind.getScalar(i+1)],v[ind.getScalar(i+2)]))
 mesh[n.getName()]={v:[...new Map(v.map(x=>[x.toArray().map(y=>y.toFixed(5)).join(','),x])).values()],tris}
}
const joint={l:{h:[-.585812,2.369765,.497992],k:[-1.189096,1.511292,-.036603],a:[-1.38446,.34406,.458299],axisK:[.984680,-.173648,-.015847]},r:{h:[.612591,2.369765,.478704],k:[1.172879,1.509528,-.07462],a:[1.388938,.343156,.41366],axisK:[.984680,.173648,-.015846]}}
// Die Knieachsen gegen die Geometrie der benannten Originalzylinder prüfen.
const raw=(await new NodeIO().registerExtensions([KHRMaterialsSpecular,KHRMaterialsIOR,EXTTextureWebP,KHRMeshQuantization]).read('tmp/fahrzeuge/mecha/project_alpha_mecha.glb')).getRoot()
const rawParts=raw.listNodes().filter(n=>n.getMesh()),rawLo=new Vector3(Infinity,Infinity,Infinity),rawHi=new Vector3(-Infinity,-Infinity,-Infinity)
for(const n of rawParts)for(const p of n.getMesh().listPrimitives()){
 const m=new Matrix4().fromArray(n.getWorldMatrix()),a=p.getAttribute('POSITION')
 for(let i=0;i<a.getCount();i++){const v=new Vector3(...a.getElement(i,[0,0,0])).applyMatrix4(m);rawLo.min(v);rawHi.max(v)}
}
const rawCenter=new Vector3((rawLo.x+rawHi.x)/2,rawLo.y,(rawLo.z+rawHi.z)/2),rawScale=6/(rawHi.y-rawLo.y)
const rawTurn=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),206.565*Math.PI/180)
function cylinderAxis(name){
 const n=rawParts.find(x=>x.getName()===name),p=n.getMesh().listPrimitives()[0],m=new Matrix4().fromArray(n.getWorldMatrix()),a=p.getAttribute('POSITION'),v=[]
 for(let i=0;i<a.getCount();i++)v.push(new Vector3(...a.getElement(i,[0,0,0])).applyMatrix4(m).sub(rawCenter).applyQuaternion(rawTurn).multiplyScalar(rawScale))
 const lo=new Vector3(Infinity,Infinity,Infinity),hi=new Vector3(-Infinity,-Infinity,-Infinity);v.forEach(x=>{lo.min(x);hi.max(x)})
 const mid=lo.add(hi).multiplyScalar(.5),cov=[]
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)cov[i*3+j]=v.reduce((s,x)=>s+(x.getComponent(i)-mid.getComponent(i))*(x.getComponent(j)-mid.getComponent(j)),0)/v.length
 let axis=new Vector3(1,0,0)
 for(let k=0;k<30;k++)axis.set(cov[0]*axis.x+cov[1]*axis.y+cov[2]*axis.z,cov[3]*axis.x+cov[4]*axis.y+cov[5]*axis.z,cov[6]*axis.x+cov[7]*axis.y+cov[8]*axis.z).normalize()
 return axis
}
for(const [side,name] of [['l','Cylinder041__0'],['r','Cylinder038__0']]){
 if(cylinderAxis(name).distanceTo(new Vector3(...joint[side].axisK))>.001)throw new Error(`${name}: Knieachse hat sich geändert`)
}
const axisH=new Vector3(...joint.r.h).sub(new Vector3(...joint.l.h)).normalize().toArray(),axisA=new Vector3(...joint.r.a).sub(new Vector3(...joint.l.a)).normalize().toArray()
const pairs=[];for(const s of ['l','r'])for(const [kind,pa,ch,pt] of [['h','rumpf','oberschenkel','h'],['k','oberschenkel','unterschenkel','k'],['a','unterschenkel','fuss','a']])pairs.push({name:kind+s,parent:mesh[pa+(pa==='rumpf'?'':'_'+s)],child:mesh[ch+'_'+s],pivot:new Vector3(...joint[s][pt]),axis:new Vector3(...(kind==='h'?axisH:kind==='k'?joint[s].axisK:axisA)).normalize()})
const near=(p,t)=>{const q=new Vector3();t.closestPointToPoint(p,q);return p.distanceToSquared(q)}
for(const pair of pairs){
 const {parent,child,pivot,axis}=pair
 const contacts=[]
 for(const v of child.v){let d=Infinity;for(const t of parent.tris)d=Math.min(d,near(v,t));if(d<=.08**2)contacts.push(v)}
 const atRest=Math.max(0,...contacts.map(v=>Math.sqrt(Math.min(...parent.tris.map(t=>near(v,t))))))
 if(!contacts.length)throw new Error(`${pair.name}: Kontaktmenge leer; Zuordnung prüfen`)
 const phaseOffset=pair.name[1]==='r'?Math.PI:0
 const angles=Array.from({length:8},(_,i)=>{
  const phase=i*Math.PI/4+phaseOffset,hip=18*Math.sin(phase),knee=-35*(1-Math.cos(phase))/2
  return pair.name[0]==='h'?hip:pair.name[0]==='k'?knee:-hip-knee
 })
 const qs=angles.map(a=>new Quaternion().setFromAxisAngle(axis,a*Math.PI/180))
 const moving=contacts.map(v=>qs.map(q=>v.clone().sub(pivot).applyQuaternion(q).add(pivot)))
 const shifts=qs.map(q=>new Vector3())
 const exact=(center,hipMax,kneeMax)=>{
  let max=0
  for(let i=0;i<8;i++){
   const phase=i*Math.PI/4+phaseOffset,hip=hipMax*Math.sin(phase),knee=-kneeMax*(1-Math.cos(phase))/2
   const angle=pair.name[0]==='h'?hip:pair.name[0]==='k'?knee:-hip-knee
   const q=new Quaternion().setFromAxisAngle(axis,angle*Math.PI/180)
   for(const v of contacts){const moved=v.clone().sub(center).applyQuaternion(q).add(center);let min=Infinity;for(const t of parent.tris)min=Math.min(min,near(moved,t));max=Math.max(max,Math.sqrt(min))}
  }
  return max
 }
 const before=exact(pivot,18,35)
 // Das Dreiecksfenster enthält garantiert jeden möglichen besseren Treffer:
 // maximale Bewegung bei ±0,25 m Drehpunktverschiebung plus bisheriger Spalt.
 const maxAngle=Math.max(...angles.map(Math.abs))*Math.PI/180
 const candidates=contacts.map(v=>{
  const radius=2*Math.sin(maxAngle/2)*(v.distanceTo(pivot)+Math.sqrt(3)*.25)+before+1e-6
  return parent.tris.filter(t=>near(v,t)<=radius*radius)
 })
 function score(x,y,z,ceiling=Infinity){
  const delta=new Vector3(x,y,z)
  for(let i=0;i<qs.length;i++)shifts[i].copy(delta).sub(delta.clone().applyQuaternion(qs[i]))
  let worst=0
  for(let j=0;j<contacts.length;j++)for(let i=0;i<qs.length;i++){
   const p=moving[j][i].clone().add(shifts[i]);let d=Infinity
   for(const t of candidates[j])d=Math.min(d,near(p,t))
   if(d>worst){worst=d;if(worst>=ceiling)return worst}
  }
  return worst
 }
 let best=before*before,chosen=[0,0,0]
 for(let ix=0;ix<=25;ix++)for(let iy=0;iy<=25;iy++)for(let iz=0;iz<=25;iz++){
  const off=[-.25+ix*.02,-.25+iy*.02,-.25+iz*.02]
  const d=score(...off,best)
  if(d<best){best=d;chosen=off}
 }
 const afterPivot=pivot.clone().add(new Vector3(...chosen))
 const after=exact(afterPivot,18,35),minimumAngles=exact(afterPivot,12,15)
 if(Math.abs(after-Math.sqrt(best))>1e-5)throw new Error(`${pair.name}: Dreiecksfenster zu klein`)
 console.log(JSON.stringify({joint:pair.name,axis:axis.toArray(),contacts:contacts.length,atRest,pivotBefore:pivot.toArray(),gapBefore:before,pivotAfter:afterPivot.toArray(),gapAfter:after,minimumAngles}))
}
