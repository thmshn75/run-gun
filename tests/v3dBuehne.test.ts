import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { BUEHNE, DARSTELLUNG, FAHRZEUGE, LEVELS } from '../src/v3d/balance3d'
import { platzhalter } from '../src/v3d/szene'
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
  it('baut vier benannte Säulen mit einem Rahmen-Netz und geteilten Ressourcen', () => {
    const gemalteNamen: {name:string;breite:number}[]=[]
    const ctx={font:'',clearRect:vi.fn(),fillRect:vi.fn(),fillText:vi.fn(function(this:{font:string},name:string){gemalteNamen.push({name,breite:name.length*Number.parseInt(this.font.match(/\d+/)?.[0]??'0')*.64})}),strokeText:vi.fn(),measureText:vi.fn(function(this:{font:string},name:string){return {width:name.length*Number.parseInt(this.font.match(/\d+/)?.[0]??'0')*.64}}),createLinearGradient:()=>({addColorStop:vi.fn()})}
    vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>ctx})})
    vi.stubGlobal('location',{search:''})
    try {
      const vorlage=new THREE.Group(),form=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshStandardMaterial()
      vorlage.add(new THREE.Mesh(form,material))
      const fahrzeuge=Object.fromEntries(LEVELS[0].saeulen.map(n=>[n,{geometrien:[form],material,laenge:4,vorlage,gibFrei(){}}])) as Record<FahrzeugName,FahrzeugBau>
      const scene=new THREE.Scene(),p=platzhalter(scene,fahrzeuge)
      expect(DARSTELLUNG.SAEULEN_VORSCHAU).toBe(3)
      expect(BUEHNE.SAEULEN_ABSTAND).toBe(8)
      expect(p.saeulen.map(s=>s.name)).toEqual(LEVELS[0].saeulen.map(n=>`saeule-${n}`))
      for(const name of LEVELS[0].saeulen)expect(ctx.fillText).toHaveBeenCalledWith(name.toUpperCase(),128,48)
      const saeulenNamen=gemalteNamen.filter(e=>LEVELS[0].saeulen.some(n=>n.toUpperCase()===e.name))
      expect(saeulenNamen.map(e=>e.name)).toEqual(LEVELS[0].saeulen.map(n=>n.toUpperCase()))
      expect(saeulenNamen.every(e=>e.breite<=256-16)).toBe(true)
      expect(ctx.measureText).toHaveBeenCalled()
      expect(p.saeulen.map(s=>s.position.z)).toEqual([-12,-20,-28,-36])
      for (const [i,saeule] of p.saeulen.entries()) {
        expect(saeule.children).toHaveLength(5)
        expect(saeule.children.filter(o=>o.name==='saeule-rahmen')).toHaveLength(1)
        expect(p.saeulenInnen[i].name).toBe(`fahrzeug-${LEVELS[0].saeulen[i]}`)
        expect(new THREE.Box3().setFromObject(p.saeulenInnen[i],true).min.y).toBeCloseTo(FAHRZEUGE.MINI_Y)
        const sockel=saeule.getObjectByName('mini-sockel') as THREE.Mesh
        expect(sockel).toBeInstanceOf(THREE.Mesh)
        const sockelGroesse=new THREE.Box3().setFromObject(sockel,true).getSize(new THREE.Vector3())
        expect(sockelGroesse.x).toBeCloseTo(1.3)
        expect(sockelGroesse.y).toBeCloseTo(.06)
        expect(sockelGroesse.z).toBeCloseTo(1.3)
        const glas=saeule.getObjectByName('saeule') as THREE.Mesh
        expect((glas.material as THREE.MeshStandardMaterial).opacity).toBe(.15)
        expect(saeule.getObjectByName('spezialeinheit-platzhalter')).toBeUndefined()
        expect(saeule.children.find(o=>o.name===`saeule-name-${LEVELS[0].saeulen[i].toUpperCase()}`)).toBeDefined()
        if(i>0)for(let j=1;j<4;j++){
          expect((saeule.children[j] as THREE.Mesh).geometry).toBe((p.saeulen[0].children[j] as THREE.Mesh).geometry)
          expect((saeule.children[j] as THREE.Mesh).material).toBe((p.saeulen[0].children[j] as THREE.Mesh).material)
        }
        if(i>0)expect((saeule.children[4] as THREE.Mesh).geometry).toBe((p.saeulen[0].children[4] as THREE.Mesh).geometry)
      }
      expect(p.saeulen.reduce((n,s)=>n+s.children.filter(o=>o instanceof THREE.Mesh).length,0)).toBeLessThanOrEqual(20)
    } finally {vi.unstubAllGlobals()}
  })
  it('trennt Schilder, Kampffeld und Säule geometrisch', () => {
    const aussen = BUEHNE.BAHN_BREITE / 2
    expect(BUEHNE.MITTE_HALB).toBe(3.4)
    expect(BUEHNE.PLUS_X - BUEHNE.PLUS_BREITE / 2).toBeGreaterThanOrEqual(-aussen)
    expect(BUEHNE.PLUS_X + BUEHNE.PLUS_BREITE / 2).toBeLessThanOrEqual(-BUEHNE.MITTE_HALB)
    expect(BUEHNE.PLUS_BREITE).toBe(2)
    expect(BUEHNE.PLUS_HOEHE).toBe(1.2)
    expect(BUEHNE.SAEULE_X - 1.6 / 2).toBeGreaterThanOrEqual(BUEHNE.MITTE_HALB)
    expect(BUEHNE.SAEULE_X + 1.6 / 2).toBeLessThanOrEqual(aussen)
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
