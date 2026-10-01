import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { BUEHNE, DARSTELLUNG, EIS, LEVELS } from '../src/v3d/balance3d'
import { platzhalter, saeulenZiele } from '../src/v3d/szene'
import type { FahrzeugBau } from '../src/v3d/fahrzeuge'
import type { FahrzeugName } from '../src/v3d/balance3d'
import { baueKamera, passeKameraAn } from '../src/v3d/kamera'
import { leseWasserStufe } from '../src/v3d/wasser'
import { pmremPufferBytes, spiegelPufferBytes } from '../src/v3d/rechnen'

function projekt(camera: THREE.PerspectiveCamera, x: number, z: number) {
  return new THREE.Vector3(x, 0, z).project(camera)
}
function zBeiBildhoehe(camera: THREE.PerspectiveCamera, anteil: number): number {
  let nah = -220, fern = 100
  for (let i = 0; i < 80; i++) {
    const mitte = (nah + fern) / 2
    if (projekt(camera, 0, mitte).y > 1 - 2 * anteil) nah = mitte
    else fern = mitte
  }
  return (nah + fern) / 2
}
function breite(camera: THREE.PerspectiveCamera, z: number) {
  return (projekt(camera, 6, z).x - projekt(camera, -6, z).x) / 2
}

describe('3D-Bühne', () => {
  it('baut vier Eisplätze mit Fahrzeughüllen und Zahltafeln', () => {
    const ctx={font:'',clearRect:vi.fn(),fillRect:vi.fn(),fillText:vi.fn(),strokeText:vi.fn(),measureText:vi.fn(()=>({width:30})),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),stroke:vi.fn(),createLinearGradient:()=>({addColorStop:vi.fn()}),createRadialGradient:()=>({addColorStop:vi.fn()})}
    vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>ctx})})
    vi.stubGlobal('location',{search:''})
    try {
      const vorlage=new THREE.Group(),form=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshStandardMaterial()
      vorlage.add(new THREE.Mesh(form,material))
      const fahrzeuge=Object.fromEntries(LEVELS[0].saeulen.map(n=>[n,{geometrien:[form],material,laenge:4,vorlage,gibFrei(){}}])) as Record<FahrzeugName,FahrzeugBau>
      const scene=new THREE.Scene(),p=platzhalter(scene,fahrzeuge)
      expect(p.saeulen).toHaveLength(4)
      expect(p.saeulen.map(s=>s.position.z)).toEqual(saeulenZiele(LEVELS[0],0,p.miniaturen,4))
      expect(p.miniaturen).toHaveLength(4)
      for (const [i, block] of p.saeulenBloecke.entries()) {
        const mini = block.children.find(o => o.name.startsWith('fahrzeug-'))!
        const huelle = mini.userData.huelle as THREE.Group
        expect(huelle.children.length).toBeGreaterThan(0)
        expect(huelle.children.every(o => o instanceof THREE.Mesh && o.material === (i === 0 ? p.eis.treffer : p.eis.basis))).toBe(true)
        const box = new THREE.Box3().setFromObject(huelle)
        box.min.x += BUEHNE.SAEULE_X; box.max.x += BUEHNE.SAEULE_X
        expect(box.min.x).toBeGreaterThanOrEqual(EIS.INNEN_X - 1e-6)
        expect(box.max.x).toBeGreaterThan(box.min.x)
        expect(box.max.z - box.min.z).toBeGreaterThan(1)
        expect(p.saeulenSchilder[i].name).toBe('eis-zahl')
        expect(p.saeulenSchilder[i].position.y - (mini.userData.hoehe as number) - .5).toBeCloseTo(.35)
        expect((p.saeulenSchilder[i].material as THREE.MeshBasicMaterial).depthTest).toBe(true)
        expect(p.saeulen[i].getObjectByName('mini-sockel')).toBeUndefined()
        expect(p.saeulen[i].getObjectByName('saeule-rahmen')).toBeUndefined()
      }
      expect(EIS.INNEN_X).toBeGreaterThan(BUEHNE.MITTE_HALB + BUEHNE.KANTE_BREITE / 2)
      expect(p.saeulen.reduce((n,s)=>n+s.children.filter(o=>o instanceof THREE.Mesh).length,0)).toBeLessThanOrEqual(12)
      for(let index=0;index<4;index++) {
        const ziele=saeulenZiele(LEVELS[0],index,p.miniaturen,4)
        const grenzen=Array.from({length:4},(_,j)=>{
          const name=LEVELS[0].saeulen[(index+j)%4]
          return p.miniaturen.find(m=>m.name===`fahrzeug-${name}`)!.userData.huelleZ as [number,number]
        })
        expect(ziele[0]+grenzen[0][1]).toBeCloseTo(-9,2)
        for(let j=1;j<4;j++) expect(ziele[j-1]+grenzen[j-1][0]-(ziele[j]+grenzen[j][1])).toBeCloseTo(1.5,2)
      }
    } finally {vi.unstubAllGlobals()}
  })
  it('trennt Schilder, Kampffeld und Säule geometrisch', () => {
    const aussen = BUEHNE.BAHN_BREITE / 2
    expect(BUEHNE.MITTE_HALB).toBe(3.4)
    expect(BUEHNE.PLUS_X - BUEHNE.PLUS_BREITE / 2).toBeGreaterThanOrEqual(-aussen)
    expect(BUEHNE.PLUS_X + BUEHNE.PLUS_BREITE / 2).toBeLessThanOrEqual(-BUEHNE.MITTE_HALB)
    expect(BUEHNE.PLUS_BREITE).toBe(2)
    expect(BUEHNE.PLUS_HOEHE).toBe(1.2)
    expect(EIS.INNEN_X).toBeGreaterThanOrEqual(BUEHNE.MITTE_HALB)
    expect(EIS.INNEN_X).toBeLessThanOrEqual(aussen)
    expect(BUEHNE.WAND_HOEHE).toBe(1.2)
    expect(BUEHNE.WAND_FARBE).toBe('#1f6fd6')
    expect(2 * BUEHNE.MITTE_HALB).toBe(6.8)
    expect(BUEHNE.KANTE_BREITE).toBe(.3)
    expect(BUEHNE.KANTE_HOEHE).toBe(.25)
    expect(BUEHNE.KANTE_Z_VORNE).toBe(-5.5)
    expect(BUEHNE.KANTE_Z_HINTEN).toBe(-220)
    expect(BUEHNE.KANTE_Z_VORNE).toBeLessThan(-5)
    expect(BUEHNE.RANDMAUER_FARBE).toBe('#c9cbca')
  })
  it('projiziert die Zahl und begrenzt die Überdeckung des Folgefahrzeugs', () => {
    const camera = baueKamera(390, 844)
    const hoehe = 3.2
    const unten = new THREE.Vector3(BUEHNE.SAEULE_X, hoehe + .35, -12).project(camera)
    const oben = new THREE.Vector3(BUEHNE.SAEULE_X, hoehe + 1.35, -12).project(camera)
    expect(Math.abs(oben.y - unten.y) * 844 / 2 * 96 / 128).toBeGreaterThanOrEqual(18)
    const bildBox = (box: THREE.Box3) => {
      const punkte: THREE.Vector3[] = []
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) punkte.push(new THREE.Vector3(x, y, z).project(camera))
      return {l: Math.min(...punkte.map(p => p.x)), r: Math.max(...punkte.map(p => p.x)), o: Math.min(...punkte.map(p => p.y)), u: Math.max(...punkte.map(p => p.y))}
    }
    const q = camera.quaternion, rechts = new THREE.Vector3(1, 0, 0).applyQuaternion(q), hoch = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
    const mitte = new THREE.Vector3(BUEHNE.SAEULE_X, hoehe + .85, -12)
    const tafelPunkte = [-.6, .6].flatMap(x => [-.234375, .5].map(y => mitte.clone().addScaledVector(rechts, x).addScaledVector(hoch, y).project(camera)))
    const tafel = {l: Math.min(...tafelPunkte.map(p => p.x)), r: Math.max(...tafelPunkte.map(p => p.x)), o: Math.min(...tafelPunkte.map(p => p.y)), u: Math.max(...tafelPunkte.map(p => p.y))}
    const folge = bildBox(new THREE.Box3(new THREE.Vector3(3.7, .12, -22.5), new THREE.Vector3(5.9, hoehe, -17.5)))
    const schnitt = (b: typeof tafel) => Math.max(0, Math.min(tafel.r, b.r) - Math.max(tafel.l, b.l)) * Math.max(0, Math.min(tafel.u, b.u) - Math.max(tafel.o, b.o))
    expect(schnitt(folge) / ((folge.r - folge.l) * (folge.u - folge.o))).toBeLessThanOrEqual(.2)
  })
  it('hält die vorgegebenen Kamerawerte und Bildmaße in drei Formaten', () => {
    for (const [w, h] of [[390, 659], [375, 812], [390, 844]]) {
      const camera = baueKamera(w, h)
      expect(camera.position.toArray()).toEqual([...BUEHNE.KAMERA_POSITION])
      expect(camera.rotation.x).toBeCloseTo(-THREE.MathUtils.degToRad(23.5))
      expect(camera.near).toBe(5); expect(camera.far).toBe(250)
      expect(breite(camera, zBeiBildhoehe(camera, 1))).toBeGreaterThanOrEqual(1)
      const nullLinie = (1 - projekt(camera, 0, 0).y) / 2
      expect(nullLinie).toBeGreaterThanOrEqual(w === 390 && h === 659 ? 0.86 : 0.78)
      expect(nullLinie).toBeLessThanOrEqual(w === 390 && h === 659 ? 0.90 : 0.82)
      expect(projekt(camera, 0, -1e6).y).toBeGreaterThan(1)
      expect(projekt(camera, -6, -220).y).toBeGreaterThan(1)
      expect(projekt(camera, 6, -220).y).toBeGreaterThan(1)
      expect(projekt(camera, 0, -60).y).toBeLessThanOrEqual(0.96)
      expect(projekt(camera, 0, -60).y).toBeGreaterThan(-1)
      if (h === 659) {
        const oben = breite(camera, zBeiBildhoehe(camera, 0.05))
        expect(oben).toBeGreaterThanOrEqual(0.40)
        expect(oben).toBeLessThanOrEqual(0.47)
      }
    }
  })
  it('erweitert das vertikale Sichtfeld nur für schmalere Formate', () => {
    const camera = baueKamera(390, 659)
    expect(camera.fov).toBeCloseTo(22)
    passeKameraAn(camera, 375, 812)
    expect(camera.fov).toBeGreaterThan(22)
    passeKameraAn(camera, 500, 659)
    expect(camera.fov).toBeCloseTo(22)
  })
  it('liest nur gültige Wasserstufen', () => {
    expect(leseWasserStufe('')).toBe(1)
    expect(leseWasserStufe('?wasser=0')).toBe(0)
    expect(leseWasserStufe('?wasser=1')).toBe(1)
    expect(leseWasserStufe('?wasser=2')).toBe(2)
    for (const wert of ['-1', '3', '2.0', 'abc']) expect(leseWasserStufe(`?wasser=${wert}`)).toBe(1)
  })
  it('rechnet PMREM- und Spiegelpuffer mit den vorgegebenen Formeln', () => {
    expect(pmremPufferBytes({ width: 256, height: 128 })).toBeCloseTo(256 * 128 * 4 * 4 / 3)
    expect(spiegelPufferBytes({ width: 390, height: 659 })).toBe(390 * 659 * 12)
  })
})
