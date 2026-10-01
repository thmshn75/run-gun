import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { EisEffekte, eisZahl, ladeEisBemalung } from '../src/v3d/eis'
import { EIS, LEVELS } from '../src/v3d/balance3d'
import { eisPruefLevel, pruefEisansicht } from '../src/v3d/einstieg'
import { EIS_SPEICHER_MB } from '../src/v3d/messung'

function effekte(): EisEffekte {
  const ctx = { clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })), fillRect: vi.fn() }
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) })
  return new EisEffekte(new THREE.Scene(), null)
}

describe('D5e Eis', () => {
  it('zeichnet je Rissstufe sechs breite Linien mit sieben Abschnitten und weißem Lichtsaum', () => {
    const striche: [number,string,number][] = []
    const ctx = {clearRect:vi.fn(),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),createRadialGradient:vi.fn(()=>({addColorStop:vi.fn()})),fillRect:vi.fn(),lineWidth:0,strokeStyle:'',globalAlpha:0,
      stroke:vi.fn(function(this:{lineWidth:number;strokeStyle:string;globalAlpha:number}) { striche.push([this.lineWidth,this.strokeStyle,this.globalAlpha]) })}
    vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>ctx})})
    try {
      const eis=new EisEffekte(new THREE.Scene(),null)
      eis.setzeAktiv(new THREE.Group(),0)
      eis.risse(87,100)
      expect(ctx.lineTo).toHaveBeenCalledTimes(6*7)
      expect(striche).toEqual(Array.from({length:6},()=>[[3.5,'#e9f9ff',1],[1,'#ffffff',1]]).flat())
      expect(eis.diagnose.uploads).toBe(1)
    } finally {vi.unstubAllGlobals()}
  })
  it('startet nach spätestens drei Sekunden ohne Eisbild und entsorgt ein spätes Bild', async () => {
    vi.useFakeTimers()
    try {
      let liefere!: (bild: THREE.Texture) => void
      const verspaetet = new Promise<THREE.Texture>(resolve => { liefere = resolve })
      const geladen = ladeEisBemalung(() => verspaetet, () => false)
      await vi.advanceTimersByTimeAsync(3000)
      expect(await geladen).toBeNull()
      const bild = new THREE.Texture(), freigabe = vi.spyOn(bild, 'dispose')
      liefere(bild); await Promise.resolve()
      expect(freigabe).toHaveBeenCalledOnce()
    } finally { vi.useRealTimers() }
  })
  it('wächst in acht monotonen Rissstufen mit höchstens sieben Uploads', () => {
    const eis = effekte()
    try {
      eis.setzeAktiv(new THREE.Group(), 4)
      eis.risse(100, 100)
      expect(eis.diagnose).toMatchObject({ stufe: 0, uploads: 0 })
      for (let stufe = 1; stufe <= 7; stufe++) {
        eis.risse(100 * (1 - stufe / 8) - .01, 100)
        expect(eis.diagnose.stufe).toBe(stufe)
      }
      expect(eis.diagnose.uploads).toBe(7)
      eis.risse(.01, 100)
      expect(eis.diagnose.uploads).toBe(7)
      eis.zuruecksetzen()
      expect(eis.diagnose).toMatchObject({ stufe: 0, splitter: 0 })
    } finally { vi.unstubAllGlobals() }
  })
  it.each([.1, 1 / 60])('zerspringt mit 32 Splittern und mindestens drei Bildern bei dt %s', dt => {
    const eis = effekte()
    try {
      eis.zerspringe(new THREE.Vector3(), 0)
      expect(eis.diagnose.splitter).toBe(32)
      let bilder = 1
      for (let bild = 1; bild <= 70; bild++) {
        eis.aktualisiere(dt, bild)
        if (eis.diagnose.splitter) bilder++
      }
      expect(bilder).toBeGreaterThanOrEqual(3)
      expect(eis.diagnose.splitter).toBe(0)
    } finally { vi.unstubAllGlobals() }
  })
  it('zeichnet einen runden Blitz und große, eigene, rotierende Splitter', () => {
    const eis = effekte()
    try {
      const material = eis.blitz.material as THREE.SpriteMaterial
      expect(material.map).toBeInstanceOf(THREE.CanvasTexture)
      expect((material.map!.image as HTMLCanvasElement).width).toBe(64)
      expect(material.blending).toBe(THREE.AdditiveBlending)
      expect(eis.splitter.material).toBe(eis.splitterMaterial)
      expect(eis.splitterMaterial).not.toBe(eis.basis)
      expect(eis.splitterMaterial.color.getHexString()).toBe('dff4ff')
      expect(eis.splitterMaterial.opacity).toBe(.9)
      expect(eis.splitterMaterial.emissiveIntensity).toBe(.4)
      eis.zerspringe(new THREE.Vector3(), 0)
      expect(eis.blitz.scale.x).toBe(3)
      expect(eis.stuecke).toHaveLength(32)
      for (const stueck of eis.stuecke) expect(stueck.groesse).toBeGreaterThanOrEqual(.35)
      for (const stueck of eis.stuecke) expect(stueck.groesse).toBeLessThanOrEqual(.6)
      const vorher = new THREE.Matrix4(); eis.splitter.getMatrixAt(0, vorher)
      const skalierung = new THREE.Vector3()
      vorher.decompose(new THREE.Vector3(), new THREE.Quaternion(), skalierung)
      expect(skalierung.y / skalierung.x).toBeCloseTo(1)
      expect(skalierung.x * Math.sqrt(8 / 3)).toBeGreaterThanOrEqual(.35)
      expect(skalierung.x * Math.sqrt(8 / 3)).toBeLessThanOrEqual(.6)
      eis.aktualisiere(1 / 60, 1)
      const nachher = new THREE.Matrix4(); eis.splitter.getMatrixAt(0, nachher)
      const drehungVorher = new THREE.Quaternion(), drehungNachher = new THREE.Quaternion()
      vorher.decompose(new THREE.Vector3(), drehungVorher, new THREE.Vector3())
      nachher.decompose(new THREE.Vector3(), drehungNachher, new THREE.Vector3())
      expect(drehungVorher.angleTo(drehungNachher)).toBeGreaterThan(0)
      expect(material.opacity).toBeLessThan(1)
      expect(eis.blitz.visible).toBe(true)
      eis.aktualisiere(.1, 2)
      expect(eis.blitz.visible).toBe(true)
      eis.aktualisiere(.1, 3)
      expect(eis.blitz.visible).toBe(true)
      eis.aktualisiere(.1, 4)
      expect(eis.blitz.visible).toBe(false)
    } finally { vi.unstubAllGlobals() }
  })
  it('begrenzt dt und lässt Treffer-Splitter kein Zerspringen verdrängen', () => {
    const eis = effekte()
    try {
      eis.zerspringe(new THREE.Vector3(), 0)
      eis.aktualisiere(2, 1)
      expect(eis.diagnose.splitter).toBe(32)
      for (let i = 0; i < 50; i++) eis.trefferSplitter(new THREE.Vector3(), 1)
      expect(eis.stuecke.filter(s => s.gross)).toHaveLength(32)
      expect(eis.diagnose.splitter).toBeLessThanOrEqual(EIS.SPLITTER_POOL)
    } finally { vi.unstubAllGlobals() }
  })
  it('nimmt nur gültige Prüfwerte als Level-Kopie und begrenzt den Speicherplan', () => {
    for (const wert of ['0', '-1', '100001', '1.5', 'abc', '01']) expect(eisPruefLevel(`?pruefung=1&eis=${wert}`)).toBe(LEVELS[0])
    expect(eisPruefLevel('?eis=10')).toBe(LEVELS[0])
    for (const wert of ['1', '10', '100000']) {
      const kopie = eisPruefLevel(`?pruefung=1&eis=${wert}`)
      expect(kopie).not.toBe(LEVELS[0]); expect(kopie.P).toBe(Number(wert))
    }
    expect(LEVELS[0].P).toBe(150)
    expect(pruefEisansicht('?eisansicht=maske')).toBe('normal')
    expect(pruefEisansicht('?pruefung=1&eisansicht=maske')).toBe('maske')
    expect(EIS_SPEICHER_MB).toBeLessThanOrEqual(3)
    expect(eisZahl(12500)).toBe('12,5k')
    expect(eisZahl(3400000)).toBe('3,4M')
  })
})
