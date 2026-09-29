import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BUEHNE } from '../src/v3d/balance3d'
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
