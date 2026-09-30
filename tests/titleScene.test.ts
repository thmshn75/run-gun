import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

vi.mock('phaser', () => ({ default: { Scene: class {} } }))
vi.mock('../src/config/feld', () => ({ FELD: { breite: 390, hoehe: 844 }, passeKameraAn: vi.fn() }))
vi.mock('../src/systems/safeArea', () => ({ readSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }) }))
vi.mock('../src/systems/textSharpness', () => ({ enableSharpText: vi.fn() }))
vi.mock('../src/v3d/einstieg', () => ({ starte3D: vi.fn() }))

import { TitleScene } from '../src/scenes/TitleScene'
import { starte3D } from '../src/v3d/einstieg'

function baueTitel(): {
  actions: Array<() => void>; labels: string[]; menuStart: ReturnType<typeof vi.fn>; scene: TitleScene
  buttons: Array<{ x: number; y: number; width: number; height: number }>
  texts: Array<{ x: number; y: number; label: string; style: { fontSize: string }; depth: number; interactive: boolean; fill: unknown; shadow: boolean }>
  gradientStops: Array<[number, string]>
  images: Array<{ key: string; displayWidth: number; displayHeight: number }>
} {
  const actions: Array<() => void> = []
  const labels: string[] = []
  const buttons: Array<{ x: number; y: number; width: number; height: number }> = []
  const texts: Array<{ x: number; y: number; label: string; style: { fontSize: string }; depth: number; interactive: boolean; fill: unknown; shadow: boolean }> = []
  const gradientStops: Array<[number, string]> = []
  const images: Array<{ key: string; displayWidth: number; displayHeight: number }> = []
  const menuStart = vi.fn()
  const game = { canvas: {} }
  const display = (y = 0) => ({ y, setDisplaySize() { return this }, setOrigin() { return this }, setStrokeStyle() { return this }, setInteractive() { return this }, setDepth() { return this }, destroy() {}, on(_event: string, action: () => void) { actions.push(action); return this } })
  const scene = new TitleScene()
  Object.assign(scene, {
    game,
    input: { setTopOnly: vi.fn() },
    add: {
      image: (_x: number, _y: number, key: string) => {
        const image = { key, displayWidth: 0, displayHeight: 0 }
        images.push(image)
        return {
          width: 600, height: 1200,
          setDisplaySize(width: number, height: number) {
            image.displayWidth = width
            image.displayHeight = height
            return this
          },
        }
      },
      rectangle: (x: number, y: number, width: number, height: number) => {
        buttons.push({ x, y, width, height })
        return display(y)
      },
      text: (x: number, y: number, label: string, style: { fontSize: string }) => {
        labels.push(label)
        const text = { x, y, label, style, depth: 0, interactive: false, fill: undefined as unknown, shadow: false }
        texts.push(text)
        return {
          height: 34,
          context: { createLinearGradient: () => ({ addColorStop: (stop: number, color: string) => gradientStops.push([stop, color]) }) },
          setOrigin() { return this },
          setDepth(depth: number) { text.depth = depth; return this },
          setInteractive() { text.interactive = true; return this },
          setFill(fill: unknown) { text.fill = fill; return this },
          setShadow() { text.shadow = true; return this },
          destroy() {},
        }
      },
    },
    scene: { start: menuStart },
    time: { delayedCall: vi.fn() },
  })
  scene.create()
  return { actions, labels, menuStart, scene, buttons, texts, gradientStops, images }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('sessionStorage', { removeItem: vi.fn(), getItem: vi.fn(), setItem: vi.fn() })
})

describe('Titel mit zwei Spielen', () => {
  it('nutzt das Startbild mit mittiger Cover-Skalierung; das 2D-Menue behaelt title', () => {
    const { images } = baueTitel()
    expect(images).toEqual([{ key: 'start', displayWidth: 422, displayHeight: 844 }])
    expect(images[0].displayWidth / images[0].displayHeight).toBe(600 / 1200)
    const menuSource = readFileSync(new URL('../src/scenes/MenuScene.ts', import.meta.url), 'utf8')
    expect(menuSource).toContain("this.add.image(width / 2, height / 2, 'title')")
  })

  it('zeichnet den 3D-Schriftzug in Ebenen innerhalb der unveraenderten Klickflaeche', () => {
    const { actions, buttons, texts, gradientStops } = baueTitel()
    const threeD = texts.filter(text => text.label === 'RUN GUN 3D')
    expect(buttons[1]).toMatchObject({ x: 195, width: 354, height: 56 })
    expect(actions).toHaveLength(2)
    expect(threeD).toHaveLength(7)
    expect(threeD.every(text => text.style.fontSize === '27px' && !text.interactive)).toBe(true)
    expect(threeD.every(text => text.depth > 0 && Math.abs(text.y - buttons[1].y) + 17 < buttons[1].height / 2)).toBe(true)
    expect(threeD[0].depth).toBeLessThan(threeD.at(-1)!.depth)
    expect(threeD.at(-1)!.fill).toBeDefined()
    expect(threeD.at(-1)!.shadow).toBe(true)
    expect(gradientStops).toEqual([[0, '#ffffff'], [0.45, '#fff7cf'], [1, '#ffac49']])
    expect(texts.filter(text => text.label === 'RUN & GUN').at(-1)?.style.fontSize).toBe('24px')
  })

  it('fuehrt Standardspiel ins Menue und startet 3D trotz Doppeltipp nur einmal', async () => {
    vi.mocked(starte3D).mockResolvedValue(undefined)
    const { actions, labels, menuStart } = baueTitel()
    expect(labels).toContain('RUN & GUN')
    expect(labels).toContain('RUN GUN 3D')
    expect(actions).toHaveLength(2)
    actions[0]()
    expect(menuStart).toHaveBeenCalledWith('MenuScene')
    actions[1]()
    actions[1]()
    await vi.waitFor(() => expect(starte3D).toHaveBeenCalledTimes(1))
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('rg3d_neuladen')
  })

  it('gibt den 3D-Knopf beim Rueckweg mit Hinweis wieder frei', async () => {
    let schliessen: ((hinweis?: string) => void) | undefined
    vi.mocked(starte3D).mockImplementation(async (_game, beimSchliessen) => { schliessen = beimSchliessen })
    const { actions, labels } = baueTitel()
    actions[1]()
    await vi.waitFor(() => expect(starte3D).toHaveBeenCalledTimes(1))
    schliessen?.('Grafik wurde zurückgesetzt')
    expect(labels).toContain('Grafik wurde zurückgesetzt')
    actions[1]()
    await vi.waitFor(() => expect(starte3D).toHaveBeenCalledTimes(2))
  })

  it('gibt die Doppelstart-Sperre nach einem Startfehler frei', async () => {
    vi.mocked(starte3D).mockRejectedValueOnce(new Error('Grafikstart fehlgeschlagen')).mockResolvedValue(undefined)
    const { actions, scene } = baueTitel()
    actions[1]()
    await vi.waitFor(() => expect(starte3D).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(Reflect.get(scene, 'startet3D')).toBe(false))
    actions[1]()
    await vi.waitFor(() => expect(starte3D).toHaveBeenCalledTimes(2))
  })
})
