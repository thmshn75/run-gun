import { describe, expect, it, vi } from 'vitest'
import { baueKamera } from '../src/v3d/kamera'
import { FingerSteuerung, fingerWeltX, glaetteX, kernX } from '../src/v3d/steuerung'

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
  it('übernimmt nach hängender ID den neuen Finger und bleibt nach Captureverlust aktiv',()=>{
    const fenster=new EventTarget()
    const dokument=new EventTarget()
    vi.stubGlobal('window',fenster)
    vi.stubGlobal('document',dokument)
    const captures=new Set<number>()
    const canvas=Object.assign(new EventTarget(),{
      getBoundingClientRect:()=>({left:0,top:0,width:390,height:659}),
      setPointerCapture:(id:number)=>captures.add(id),
      hasPointerCapture:(id:number)=>captures.has(id),
      releasePointerCapture:(id:number)=>captures.delete(id),
    })
    const ereignis=(art:string,id:number,x:number)=>Object.assign(new Event(art),{pointerId:id,clientX:x,clientY:330})
    const steuerung=new FingerSteuerung(canvas as unknown as HTMLCanvasElement,baueKamera(390,659))
    try {
      canvas.dispatchEvent(ereignis('pointerdown',1,24))
      expect(steuerung.ziel).toBe(-3)
      canvas.dispatchEvent(ereignis('pointerdown',2,366))
      expect(steuerung.ziel).toBe(3)
      expect(captures.has(1)).toBe(false)
      captures.delete(2)
      canvas.dispatchEvent(ereignis('lostpointercapture',2,366))
      expect(steuerung.aktiv).toBe(true)
      expect(captures.has(2)).toBe(true)
      fenster.dispatchEvent(ereignis('pointermove',2,24))
      expect(steuerung.ziel).toBe(-3)
      fenster.dispatchEvent(ereignis('pointerup',1,24))
      expect(steuerung.aktiv).toBe(true)
      fenster.dispatchEvent(ereignis('pointerup',2,24))
      expect(steuerung.aktiv).toBe(false)
    } finally { steuerung.gibFrei(); vi.unstubAllGlobals() }
  })
})
