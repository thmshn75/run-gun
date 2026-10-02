import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { BossTrefferZahlen, Rauchwolken } from '../src/v3d/anzeigen'
import { baueKamera } from '../src/v3d/kamera'

function canvas(): void {
  const ctx = {
    createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, clearRect() {},
    fillText() {}, strokeText() {}, fillStyle: '', strokeStyle: '', font: '',
    textAlign: '', textBaseline: '', lineWidth: 0,
  }
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) })
}
afterEach(() => vi.unstubAllGlobals())

describe('D8-Anzeigen', () => {
  it('fasst Boss-Treffer in 0,3 s zusammen und zeigt nie mehr als sechs Zahlen', () => {
    canvas()
    const zahlen = new BossTrefferZahlen(), pos = new THREE.Vector3(1, 4, -10)
    zahlen.treffer('miniBoss', 2.2, 0, pos)
    zahlen.treffer('miniBoss', 3.4, .2, pos)
    zahlen.treffer('eliteBoss', 4, .1, pos)
    zahlen.treffer('miniBoss', 0, .25, pos)
    zahlen.schritt(.41)
    expect(zahlen.angezeigteSumme).toBe(Math.round(5.6) + Math.round(4))
    expect(zahlen.sichtbar).toBe(2)
    const kamera=baueKamera(390,844)
    zahlen.treffer('miniBoss', 10, .5, new THREE.Vector3(0, 4, -88))
    zahlen.schritt(.81,kamera)
    const fern=(zahlen.objekt.children as THREE.Sprite[]).find(s=>s.visible&&s.position.z===-88)!
    const pixel=fern.scale.y * 84/128 * 844/(2*kamera.position.distanceTo(fern.position)*Math.tan(THREE.MathUtils.degToRad(kamera.fov/2)))
    expect(pixel).toBeGreaterThanOrEqual(16)
    for (let i = 0; i < 12; i++) { zahlen.treffer('miniBoss', 1, 1 + i * .31, pos); zahlen.schritt(1.31 + i * .31) }
    expect(zahlen.sichtbar).toBeLessThanOrEqual(6)
    zahlen.schritt(6)
    expect(zahlen.sichtbar).toBe(0)
    zahlen.gibFrei()
  })
  it('hält zwei Mecha-Salven samt je sieben Spurwolken im Rauchpool', () => {
    canvas()
    const rauch = new Rauchwolken(), pos = new THREE.Vector3(), kamera = new THREE.PerspectiveCamera()
    for (let i = 0; i < 8; i++) {
      rauch.starte(pos, 1, 2.4, .9, .75)
      for (let j = 0; j < 7; j++) rauch.starte(pos, .45, .9, .7, .6)
    }
    rauch.schritt(0, kamera)
    expect(rauch.anzahl).toBe(64)
    expect(rauch.objekt.count).toBe(64)
    const alpha = rauch.objekt.geometry.getAttribute('instanceOpacity')
    expect(alpha.getX(0)).toBeCloseTo(.75)
    expect(alpha.getX(1)).toBeCloseTo(.6)
    rauch.schritt(.35, kamera)
    expect(alpha.getX(1)).toBeCloseTo(.3)
    rauch.gibFrei()
  })
})
