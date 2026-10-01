import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { EIS, FAHRZEUGE, LEVELS, type FahrzeugName } from '../src/v3d/balance3d'
import { saeulenZiele } from '../src/v3d/szene'

// Plätze nach Hüllenlänge, EIS.LUECKE Abstand, vorderste Vorderkante bei z = −9.
describe('Säulen-Ziele nach Fahrzeuglänge', () => {
  const miniaturen = LEVELS[0].saeulen.map(name => {
    const m = new THREE.Group(); m.name = `fahrzeug-${name}`
    const halb = FAHRZEUGE[name as FahrzeugName].LAENGE * EIS.MASSSTAB / 2 + EIS.HUELLE
    m.userData.huelleZ = [-halb, halb]
    return m
  })
  const halb = (name: string) => FAHRZEUGE[name as FahrzeugName].LAENGE * EIS.MASSSTAB / 2 + EIS.HUELLE

  it('hält den Eis-Abstand in jeder der vier Reihenfolgen', () => {
    const level = LEVELS[0], n = level.saeulen.length
    for (let index = 0; index < n; index++) {
      const ziele = saeulenZiele(level, index, miniaturen, 4)
      expect(ziele[0] + halb(level.saeulen[index % n])).toBeCloseTo(-9, 6)
      for (let j = 1; j < 4; j++) {
        const vorne = level.saeulen[(index + j - 1) % n], hinten = level.saeulen[(index + j) % n]
        const luecke = (ziele[j - 1] - halb(vorne)) - (ziele[j] + halb(hinten))
        expect(luecke, `Reihenfolge ${index}, Stelle ${j}`).toBeCloseTo(EIS.LUECKE, 2)
      }
    }
  })
})
