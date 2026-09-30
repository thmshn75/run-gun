import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('phaser', () => ({ default: { Scene: class {} } }))
vi.mock('../src/config/feld', () => ({ FELD: { breite: 390, hoehe: 844 }, passeKameraAn: vi.fn() }))
vi.mock('../src/systems/safeArea', () => ({ readSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }) }))
vi.mock('../src/systems/textSharpness', () => ({ enableSharpText: vi.fn() }))
vi.mock('../src/v3d/einstieg', () => ({ starte3D: vi.fn() }))

import { TitleScene } from '../src/scenes/TitleScene'
import { starte3D } from '../src/v3d/einstieg'

function baueTitel(): { actions: Array<() => void>; labels: string[]; menuStart: ReturnType<typeof vi.fn>; scene: TitleScene } {
  const actions: Array<() => void> = []
  const labels: string[] = []
  const menuStart = vi.fn()
  const game = { canvas: {} }
  const display = (y = 0) => ({ y, setDisplaySize() { return this }, setOrigin() { return this }, setStrokeStyle() { return this }, setInteractive() { return this }, setDepth() { return this }, destroy() {}, on(_event: string, action: () => void) { actions.push(action); return this } })
  const scene = new TitleScene()
  Object.assign(scene, {
    game,
    input: { setTopOnly: vi.fn() },
    add: {
      image: () => display(),
      rectangle: (_x: number, y: number) => display(y),
      text: (_x: number, y: number, label: string) => { labels.push(label); return display(y) },
    },
    scene: { start: menuStart },
    time: { delayedCall: vi.fn() },
  })
  scene.create()
  return { actions, labels, menuStart, scene }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('sessionStorage', { removeItem: vi.fn(), getItem: vi.fn(), setItem: vi.fn() })
})

describe('Titel mit zwei Spielen', () => {
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
