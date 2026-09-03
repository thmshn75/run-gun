import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { approachAngle, getBobOffsetPx, getLeanRadians, getPhaseOffset, getPopScale, getStepCycleHz, getStepSquash, getStepSwayRadians } from '../src/systems/gamefeel'

const FIGURE_H = 46 // player.png

describe('Lebendigkeit', () => {
  it('leitet die Schrittfrequenz aus dem Tempo ab statt sie zu setzen', () => {
    // Herleitung: Schrittlaenge = strideOfHeight x Figurenhoehe, Schritte/s =
    // scrollSpeed / Schrittlaenge, ein Wippzyklus sind zwei Schritte.
    const strideLengthPx = FIGURE_H * BALANCE.gamefeel.strideOfHeight
    expect(getStepCycleHz(FIGURE_H)).toBeCloseTo(BALANCE.scrollSpeed / strideLengthPx / 2)
    // Und es haengt wirklich am Tempo: langsamere Welt, gemaechlicherer Schritt.
    expect(getStepCycleHz(FIGURE_H * 2)).toBeLessThan(getStepCycleHz(FIGURE_H))
  })

  it('wippt nach unten weg und nie nach oben ueber die Ruhelage', () => {
    // Ein Laeufer faellt und stoesst sich ab; ein symmetrischer Sinus saehe aus wie
    // Schweben. Der Versatz muss deshalb immer <= 0 sein.
    const cycleHz = getStepCycleHz(FIGURE_H)
    let sawDeep = false
    for (let ms = 0; ms <= 2000; ms += 7) {
      const offset = getBobOffsetPx(ms, cycleHz, 0, BALANCE.gamefeel.bobAmplitudePx)
      expect(offset).toBeLessThanOrEqual(1e-9)
      expect(offset).toBeGreaterThanOrEqual(-BALANCE.gamefeel.bobAmplitudePx - 1e-9)
      if (offset < -BALANCE.gamefeel.bobAmplitudePx * 0.9) sawDeep = true
    }
    expect(sawDeep).toBe(true)
  })

  it('streut den Takt ueber die Formation, damit die Truppe kein Block ist', () => {
    const offsets = Array.from({ length: 8 }, (_v, index) => getPhaseOffset(index))
    for (const offset of offsets) {
      expect(offset).toBeGreaterThanOrEqual(0)
      expect(offset).toBeLessThan(1)
    }
    // Keine zwei Nachbarn im Gleichschritt.
    for (let index = 1; index < offsets.length; index += 1) {
      expect(Math.abs(offsets[index] - offsets[index - 1])).toBeGreaterThan(0.1)
    }
    // Und ueber acht Figuren gut verteilt statt geklumpt.
    const sortiert = [...offsets].sort((a, b) => a - b)
    const groessteLuecke = sortiert.reduce((max, value, index) => (index === 0 ? max : Math.max(max, value - sortiert[index - 1])), 0)
    expect(groessteLuecke).toBeLessThan(0.35)
  })

  it('neigt die Truppe in Fahrtrichtung und deckelt den Ausschlag', () => {
    const maxRad = (BALANCE.gamefeel.leanMaxDeg * Math.PI) / 180
    expect(getLeanRadians(0)).toBe(0)
    expect(getLeanRadians(BALANCE.gamefeel.leanFullSpeedPxPerSec)).toBeCloseTo(maxRad)
    expect(getLeanRadians(-BALANCE.gamefeel.leanFullSpeedPxPerSec)).toBeCloseTo(-maxRad)
    // Auch ein sehr schneller Wisch kippt die Figuren nicht um.
    expect(getLeanRadians(99_999)).toBeCloseTo(maxRad)
    expect(getLeanRadians(-99_999)).toBeCloseTo(-maxRad)
  })

  it('glaettet die Neigung frameratenunabhaengig', () => {
    // Gleiche Zeitspanne, unterschiedliche Bildrate: dasselbe Ergebnis. Ohne das
    // haengt das Spielgefuehl an der Bildwiederholrate des Geraets.
    const halfLife = BALANCE.gamefeel.leanHalfLifeMs
    let grob = 0
    for (let step = 0; step < 6; step += 1) grob = approachAngle(grob, 1, 100 / 6, halfLife)
    let fein = 0
    for (let step = 0; step < 60; step += 1) fein = approachAngle(fein, 1, 100 / 60, halfLife)
    expect(Math.abs(grob - fein)).toBeLessThan(0.01)
    // Eine Halbwertszeit bringt genau die halbe Strecke.
    expect(approachAngle(0, 1, halfLife, halfLife)).toBeCloseTo(0.5)
  })

  it('ploppt beim Einsammeln ueber die Zielgroesse und kehrt zurueck', () => {
    expect(getPopScale(0, BALANCE.gamefeel.popOvershoot)).toBeCloseTo(1)
    expect(getPopScale(0.5, BALANCE.gamefeel.popOvershoot)).toBeCloseTo(1 + BALANCE.gamefeel.popOvershoot)
    expect(getPopScale(1, BALANCE.gamefeel.popOvershoot)).toBeCloseTo(1)
    // Ausserhalb 0..1 bleibt es stabil statt zu kippen.
    expect(getPopScale(-5, 0.4)).toBeCloseTo(1)
    expect(getPopScale(5, 0.4)).toBeCloseTo(1)
  })

  it('haelt die Kollisionshuelle aus dem Wippen heraus', () => {
    // Sonst haengt Schaden am Zufall des Laufzyklus statt an der Position.
    const source = readFileSync(new URL('../src/systems/crowd.ts', import.meta.url), 'utf8')
    expect(source).toContain('this.hull.setPosition(this.anchorX, this.anchorY)')
    expect(source).not.toContain('this.hull.setPosition(this.anchorX, this.anchorY + bob')
  })

  it('zieht den Wippanteil bei Gegnern wieder ab, statt ihn aufzuaddieren', () => {
    // Ohne das Abziehen wandert die logische Laufstrecke mit jedem Frame davon.
    const source = readFileSync(new URL('../src/systems/spawner.ts', import.meta.url), 'utf8')
    expect(source).toContain('const previousBob')
    expect(source).toContain('enemy.y - previousBob')
  })

  it('haelt die Popups in einem festen Pool ohne create im Hot Path', () => {
    const source = readFileSync(new URL('../src/systems/popups.ts', import.meta.url), 'utf8')
    expect(source).toContain('BALANCE.gamefeel.popupPool')
    // spawn() darf nur wiederverwenden, nie neu erzeugen.
    const spawnBody = source.slice(source.indexOf('public spawn('), source.indexOf('public update('))
    expect(spawnBody).not.toContain('scene.add')
    expect(spawnBody).not.toContain('destroy')
  })
})

describe('Laufbewegung statt gezeichneter Bein- und Armarbeit', () => {
  const cycleHz = getStepCycleHz(FIGURE_H)
  const sway = BALANCE.gamefeel.stepSwayMaxDeg
  const maxRad = (sway * Math.PI) / 180

  it('wiegt halb so oft wie die Figur federt', () => {
    // Das ist der Kern: Je Doppelschritt wiegt der Koerper EINMAL nach links und
    // einmal nach rechts, waehrend die Figur ZWEIMAL federt (einmal je Fuss). Faellt
    // dieser Frequenzunterschied weg, sieht es aus wie Zittern statt wie Gehen.
    //
    // Gemessen werden PERIODENDAUERN, nicht Ereigniszahlen in einem Fenster: Die
    // beiden Bewegungen erreichen ihr erstes Ereignis zu verschiedenen Zeitpunkten,
    // ein Abzaehlen haengt deshalb am Fensterrand statt an der Physik.
    // Vorhersage vor der Messung: Wiegeperiode = 2 x Federperiode.
    const schrittMs = 0.25
    const fensterMs = (1000 / cycleHz) * 4

    const wiegeNulldurchgaenge: number[] = []
    let vorherSway = getStepSwayRadians(0, cycleHz, 0, sway)
    const federScheitel: number[] = []
    let vorherY = getStepSquash(0, cycleHz, 0, BALANCE.gamefeel.stepSquashShare).scaleY
    let steigend = false
    for (let ms = schrittMs; ms <= fensterMs; ms += schrittMs) {
      const jetztSway = getStepSwayRadians(ms, cycleHz, 0, sway)
      if (vorherSway < 0 && jetztSway >= 0) wiegeNulldurchgaenge.push(ms)
      vorherSway = jetztSway
      const jetztY = getStepSquash(ms, cycleHz, 0, BALANCE.gamefeel.stepSquashShare).scaleY
      if (jetztY > vorherY) steigend = true
      else if (steigend && jetztY < vorherY) { federScheitel.push(ms); steigend = false }
      vorherY = jetztY
    }

    expect(wiegeNulldurchgaenge.length).toBeGreaterThanOrEqual(2)
    expect(federScheitel.length).toBeGreaterThanOrEqual(3)
    const wiegePeriodeMs = wiegeNulldurchgaenge[1] - wiegeNulldurchgaenge[0]
    const federPeriodeMs = federScheitel[2] - federScheitel[1]
    expect(wiegePeriodeMs / federPeriodeMs).toBeCloseTo(2, 1)
    // Und die Wiegeperiode ist der Doppelschritt, aus dem getStepCycleHz kommt.
    expect(wiegePeriodeMs).toBeCloseTo(1000 / cycleHz, 0)
  })

  it('haelt das Wiegen im hergeleiteten Ausschlag und ohne Schlagseite', () => {
    let groesster = 0
    let summe = 0
    let proben = 0
    for (let ms = 0; ms <= 4000; ms += 3) {
      const wert = getStepSwayRadians(ms, cycleHz, 0, sway)
      expect(Math.abs(wert)).toBeLessThanOrEqual(maxRad + 1e-9)
      groesster = Math.max(groesster, Math.abs(wert))
      summe += wert
      proben += 1
    }
    // Der volle Ausschlag wird erreicht - der Wert ist wirksam, nicht nur Deckel.
    expect(groesster).toBeGreaterThan(maxRad * 0.99)
    // Und die Figur haengt im Mittel gerade, statt dauerhaft schief zu stehen.
    expect(Math.abs(summe / proben)).toBeLessThan(maxRad * 0.02)
  })

  it('federt volumenerhaltend: was flacher wird, wird breiter', () => {
    const share = BALANCE.gamefeel.stepSquashShare
    for (let ms = 0; ms <= 2000; ms += 7) {
      const { scaleX, scaleY } = getStepSquash(ms, cycleHz, 0, share)
      // Kein Wachsen oder Schrumpfen der Figur als Ganzes: die Flaeche bleibt nahe 1.
      expect(scaleX * scaleY).toBeGreaterThan(1 - share * share - 1e-9)
      expect(scaleX * scaleY).toBeLessThanOrEqual(1 + 1e-9)
      expect(scaleY).toBeGreaterThanOrEqual(1 - share - 1e-9)
      expect(scaleY).toBeLessThanOrEqual(1 + share + 1e-9)
    }
  })

  it('federt am Boden und streckt am Scheitel des Schritts', () => {
    // Gegenprobe gegen den umgekehrten Einbau: Die Stauchung muss dort sitzen, wo der
    // Hub am tiefsten ist. Ein vertauschtes Vorzeichen sieht aus wie Huepfen.
    const share = BALANCE.gamefeel.stepSquashShare
    let tiefsterHub = 0
    let scaleYamTiefpunkt = 1
    let hoechsterHub = -Infinity
    let scaleYamScheitel = 1
    for (let ms = 0; ms <= 2000; ms += 1) {
      const hub = getBobOffsetPx(ms, cycleHz, 0, BALANCE.gamefeel.bobAmplitudePx)
      const { scaleY } = getStepSquash(ms, cycleHz, 0, share)
      if (hub < tiefsterHub) { tiefsterHub = hub; scaleYamScheitel = scaleY }
      if (hub > hoechsterHub) { hoechsterHub = hub; scaleYamTiefpunkt = scaleY }
    }
    // getBobOffsetPx ist negativ nach oben: der kleinste Wert ist der Scheitel.
    expect(scaleYamScheitel).toBeGreaterThan(1)
    expect(scaleYamTiefpunkt).toBeLessThan(1)
  })

  it('laesst jede Figur ihren eigenen Takt behalten', () => {
    // Ohne Versatz wiegt die ganze Horde synchron - das liest sich als ein Objekt,
    // nicht als viele Laeufer.
    const a = getStepSwayRadians(500, cycleHz, getPhaseOffset(0), sway)
    const b = getStepSwayRadians(500, cycleHz, getPhaseOffset(1), sway)
    const c = getStepSwayRadians(500, cycleHz, getPhaseOffset(2), sway)
    expect(Math.abs(a - b)).toBeGreaterThan(maxRad * 0.1)
    expect(Math.abs(b - c)).toBeGreaterThan(maxRad * 0.1)
  })

  it('haengt am Tempo: langsamere Welt, gemaechlicheres Wiegen', () => {
    // Dieselbe Ableitung wie beim Hub - die Bewegung darf keine eigene feste Hz-Zahl
    // bekommen, sonst laufen Figuren und Welt auseinander.
    const langsam = getStepCycleHz(FIGURE_H * 2)
    expect(langsam).toBeLessThan(cycleHz)
    // Gemessen wird die DAUER eines halben Wiegeschwungs, nicht der Momentanwert: Der
    // Sinus ist nicht monoton, ein Punktvergleich sagt je nach Zeitpunkt beides aus.
    // Vorhersage: doppelt so hohe Figur = halbe Frequenz = doppelte Dauer.
    const halbschwungMs = (hz: number): number => {
      let vorher = getStepSwayRadians(0, hz, 0, sway)
      for (let ms = 0.5; ms <= 5000; ms += 0.5) {
        const jetzt = getStepSwayRadians(ms, hz, 0, sway)
        if (vorher > 0 && jetzt <= 0) return ms
        vorher = jetzt
      }
      return Infinity
    }
    expect(halbschwungMs(langsam) / halbschwungMs(cycleHz)).toBeCloseTo(2, 1)
  })

  it('legt Wiegen und Federn erst NACH die Trefferflaeche', () => {
    // Sonst atmet die Trefferflaeche im Schritttakt mit und Schaden haengt am Zufall
    // des Laufzyklus - dieselbe Regel wie bei der ruhigen Truppenhuelle.
    for (const datei of ['../src/systems/spawner.ts', '../src/systems/boss.ts']) {
      const source = readFileSync(new URL(datei, import.meta.url), 'utf8')
      const body = source.indexOf('updateFromGameObject()')
      const gait = source.search(/getStepSquash\(/)
      expect(body).toBeGreaterThan(-1)
      expect(gait).toBeGreaterThan(body)
    }
  })

  it('setzt die Skalierung jedes Bild absolut neu, statt sie aufzuaddieren', () => {
    // Der Federfaktor multipliziert die vorhandene Skalierung. Ohne ein absolutes
    // setScale je Bild waechst oder schrumpft die Figur unbegrenzt.
    const spawner = readFileSync(new URL('../src/systems/spawner.ts', import.meta.url), 'utf8')
    expect(spawner).toContain('enemy.setScale(faktor)')
    const boss = readFileSync(new URL('../src/systems/boss.ts', import.meta.url), 'utf8')
    const gaitStelle = boss.indexOf('private applyGait(')
    expect(boss.slice(0, gaitStelle)).toContain('this.applyPerspectiveScale()')
  })
})
