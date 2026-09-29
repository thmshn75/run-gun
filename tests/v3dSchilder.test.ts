import * as THREE from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BUEHNE } from '../src/v3d/balance3d'
import { baueSchild, gibSchilderFrei } from '../src/v3d/schilder'

const bildMasse: { width: number; height: number }[] = []
vi.stubGlobal('document', {
  createElement: () => {
    const canvas = { width: 0, height: 0, getContext: () => ({
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {}, measureText: (text: string) => ({ width: text.length * 100 }),
      strokeText: () => {}, fillText: () => {},
    }) }
    bildMasse.push(canvas)
    return canvas
  },
})

afterEach(() => { gibSchilderFrei(); bildMasse.length = 0 })

describe('3D-Schilder', () => {
  it('teilt die +1-Bemalung und lässt die Schilder ohne Pfosten schweben', () => {
    const daten = { breite: BUEHNE.PLUS_BREITE, hoehe: BUEHNE.PLUS_HOEHE, text: '+1', farbe: '#168bd2', unterkante: 0.5, neigungGrad: -10, pfosten: false }
    const erstes = baueSchild(daten)
    const zweites = baueSchild(daten)
    expect(bildMasse).toHaveLength(1)
    expect(bildMasse[0].width / bildMasse[0].height).toBeCloseTo(daten.breite / daten.hoehe, 2)
    const front = erstes.getObjectByName('schild-vorderseite') as THREE.Mesh
    const zweiteFront = zweites.getObjectByName('schild-vorderseite') as THREE.Mesh
    const textur = (front.material as THREE.MeshBasicMaterial).map
    expect((zweiteFront.material as THREE.MeshBasicMaterial).map).toBe(textur)
    expect((front.parent as THREE.Group).rotation.x).toBeCloseTo(THREE.MathUtils.degToRad(-10))
    const pfosten = erstes.children.filter(obj => obj.name === 'schild-pfosten') as THREE.Mesh[]
    expect(pfosten).toHaveLength(0)
    expect(BUEHNE.PLUS_ABSTAND).toBe(4)
    expect(BUEHNE.PLUS_X - daten.breite / 2).toBeGreaterThanOrEqual(-BUEHNE.BAHN_BREITE / 2)
    expect(BUEHNE.PLUS_X + daten.breite / 2).toBeLessThanOrEqual(-BUEHNE.MITTE_HALB)
    let freigaben = 0
    textur!.addEventListener('dispose', () => { freigaben++ })
    gibSchilderFrei()
    expect(freigaben).toBe(1)
  })

  it('zeichnet ×2 ohne gestreckte Schrift über die ganze Mitte', () => {
    const breite = 2 * BUEHNE.MITTE_HALB
    const wand = baueSchild({ breite, hoehe: 1.2, text: '×2', farbe: '#1f6fd6' })
    expect(bildMasse).toHaveLength(1)
    expect(Math.abs(bildMasse[0].width / bildMasse[0].height - breite / 1.2)).toBeLessThan(0.02)
    const platte = wand.getObjectByName('schild-platte') as THREE.Mesh
    expect((platte.geometry as THREE.BoxGeometry).parameters).toMatchObject({ width: 6.8, height: 1.2, depth: 0.2 })
    expect(wand.children.filter(obj => obj.name === 'schild-pfosten')).toHaveLength(2)
    expect(breite / 2).toBe(BUEHNE.MITTE_HALB)
  })
})
