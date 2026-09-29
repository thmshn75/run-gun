import { describe, expect, it } from 'vitest'
import { baueKamera } from '../src/v3d/kamera'
import { fingerWeltX, glaetteX, kernX } from '../src/v3d/steuerung'

describe('3D-Fingersteuerung', () => {
  it('nutzt das Canvas-Rechteck und erreicht den linken Anschlag vor der Randgeste', () => {
    for (const rect of [{left:0,top:0,width:390,height:659},{left:37,top:90,width:390,height:659}]) {
      const camera=baueKamera(rect.width,rect.height)
      expect(fingerWeltX(rect.left+rect.width/2,rect.top+rect.height/2,rect,camera)).toBeCloseTo(0,5)
      expect(fingerWeltX(rect.left+24,rect.top+rect.height/2,rect,camera)).toBe(-3)
    }
  })
  it('begrenzt Tempo und Kernwert',()=>{
    expect(glaetteX(0,3,.1)).toBeCloseTo(.8)
    expect(glaetteX(0,3,0)).toBe(0)
    expect(kernX(-3)).toBe(-1)
    expect(kernX(3)).toBe(1)
    expect(kernX(100)).toBe(1)
  })
})
