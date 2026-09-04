import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getWeltThema } from '../src/systems/weltThema'

describe('Weltthema Stadt und Bruecke', () => {
  it('haelt Level 1 bei der abgenommenen Stadt', () => {
    // Der erste Eindruck bleibt der Stand, den Thomas und Benni am iPhone abgenommen
    // haben. Erst danach kommt die neue Optik dazu.
    expect(getWeltThema(1)).toBe('stadt')
  })

  it('wechselt ab dem ersten Brueckenlevel in festen Abschnitten', () => {
    const { wechselAlleLevel, ersteBruecke } = BALANCE.welt
    expect(BALANCE.welt.thema).toBe('wechsel')
    for (let level = 1; level < ersteBruecke; level += 1) {
      expect(getWeltThema(level)).toBe('stadt')
    }
    // Nach dem Einsatzpunkt loesen sich Abschnitte gleicher Laenge ab.
    for (let abschnitt = 0; abschnitt < 6; abschnitt += 1) {
      const erwartet = abschnitt % 2 === 0 ? 'bruecke' : 'stadt'
      for (let i = 0; i < wechselAlleLevel; i += 1) {
        expect(getWeltThema(ersteBruecke + abschnitt * wechselAlleLevel + i)).toBe(erwartet)
      }
    }
  })

  it('liefert dasselbe Level immer dieselbe Kulisse', () => {
    // Ohne das laesst sich nicht beurteilen, ob der Wechsel gefaellt - ein Level saehe
    // bei jedem Anlauf anders aus.
    for (const level of [1, 2, 3, 7, 12, 30, 99]) {
      const erste = getWeltThema(level)
      for (let wiederholung = 0; wiederholung < 5; wiederholung += 1) {
        expect(getWeltThema(level)).toBe(erste)
      }
    }
  })

  it('bleibt auch bei unsinnigen Levelnummern gueltig', () => {
    for (const level of [0, -3, 1.7, Number.NaN]) {
      expect(['stadt', 'bruecke']).toContain(getWeltThema(level))
    }
  })

  it('aendert nur die Kulisse, nie den Spielablauf', () => {
    // Die Wahl darf keine Balance-Frage werden: Thomas entscheidet ueber die Optik.
    // Deshalb darf getWeltThema nirgends in Gegner-, Waffen- oder Wandlogik landen.
    const verboten = ['spawner.ts', 'walls.ts', 'weapons.ts', 'levelPlan.ts', 'bossPlan.ts', 'enemyTypes.ts']
    for (const datei of verboten) {
      const source = readFileSync(new URL(`../src/systems/${datei}`, import.meta.url), 'utf8')
      expect(source).not.toContain('getWeltThema')
      expect(source).not.toContain('BALANCE.welt')
      expect(source).not.toContain('BALANCE.bruecke')
    }
  })

  it('raeumt die Stadt weg, statt sie nur zu verstecken', () => {
    // Sonst haengen beim Themenwechsel Haeuser im Wasser: Die Kulissenobjekte laufen
    // ueber den Scroll-Fortschritt und wuerden erst unten aus dem Bild wandern.
    const source = readFileSync(new URL('../src/systems/scenery.ts', import.meta.url), 'utf8')
    const setAktiv = source.slice(source.indexOf('public setAktiv('), source.indexOf('public update('))
    expect(setAktiv).toContain('this.recycle(object)')
    expect(setAktiv).toContain("this.lastBuilding.left = null")
  })

  it('setzt die Kulisse auch beim frischen Run, nicht nur beim Levelwechsel', () => {
    // startLevel() laeuft beim Einstieg 'neu' bewusst nicht. Ohne einen zweiten Aufruf
    // saehe Level 1 nur deshalb richtig aus, weil die Stadt der Ausgangszustand ist -
    // bei thema: 'bruecke' waere es falsch.
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
    const aufrufe = [...source.matchAll(/this\.setzeWeltThema\(\)/g)]
    expect(aufrufe.length).toBeGreaterThanOrEqual(2)
    expect(source.indexOf('this.setzeWeltThema()')).toBeGreaterThan(source.indexOf('this.stelleEinstiegHer()'))
  })

  it('baut das Gelaender als durchgehenden Zug statt aus Segmenten', () => {
    // Die Lueckenlosigkeit soll konstruktiv sein und keine Messfrage wie beim
    // Haeusertakt - deshalb ein gezeichneter Zug ohne Spawn-Intervall.
    const source = readFileSync(new URL('../src/systems/bruecke.ts', import.meta.url), 'utf8')
    expect(source).toContain('fillPoints')
    // Kein Planer, kein Takt, keine Kette: nichts, was eine Luecke lassen koennte.
    expect(source).not.toContain('CityPlanner')
    expect(source).not.toContain('pickSceneryKind')
  })

  it('erzeugt keine Objekte im laufenden Bild', () => {
    // Dieselbe Regel wie ueberall im Hot Path: Pools statt create/destroy.
    const source = readFileSync(new URL('../src/systems/bruecke.ts', import.meta.url), 'utf8')
    const update = source.slice(source.indexOf('public update('))
    expect(update).not.toContain('scene.add')
    expect(update).not.toContain('destroy')
  })
})

describe('Testgelaende als Pruefplatz', () => {
  it('spielt immer auf der Bruecke, unabhaengig von seiner Levelnummer', () => {
    // Das Testgelaende laeuft auf Level 5. Welches Thema die Wechselregel dort traefe,
    // ist Zufall - hier soll fest die Bruecke stehen.
    expect(getWeltThema(BALANCE.testground.level, true)).toBe('bruecke')
    for (const level of [1, 2, 5, 12, 30]) {
      expect(getWeltThema(level, true)).toBe(BALANCE.testground.thema)
    }
  })

  it('aendert am normalen Run nichts', () => {
    // Ohne das Kennzeichen gilt weiter die Wechselregel - der eigentliche Run wird vom
    // Pruefplatz nicht angefasst (Thomas 2026-09-04).
    expect(getWeltThema(1, false)).toBe('stadt')
    expect(getWeltThema(2, false)).toBe('bruecke')
    expect(getWeltThema(BALANCE.testground.level)).toBe(getWeltThema(BALANCE.testground.level, false))
  })

  it('gibt jedem Bosstyp seinen eigenen Bildsatz', () => {
    // Der Elite-Boss hat seit E7 bewusst ein eigenes Bild, damit er auf den ersten Blick
    // als anderer Gegner lesbar ist. Ein gemeinsamer Bewegungssatz haette das wieder
    // eingeebnet.
    const { elite, basic } = BALANCE.boss.bilder
    expect(elite).toHaveLength(4)
    expect(basic).toHaveLength(4)
    expect(new Set([...elite, ...basic]).size).toBe(8)
    const source = readFileSync(new URL('../src/systems/boss.ts', import.meta.url), 'utf8')
    expect(source).toContain('this.plan.elite ? BALANCE.boss.bilder.elite : BALANCE.boss.bilder.basic')
  })

  it('faellt auf die gerechnete Bewegung zurueck, wenn ein Bossbild fehlt', () => {
    // Sonst erschiene der Boss mit fehlender Textur - schlimmer als die aeltere Bewegung.
    const source = readFileSync(new URL('../src/systems/boss.ts', import.meta.url), 'utf8')
    const activate = source.slice(source.indexOf('public activate('), source.indexOf('public deactivate('))
    expect(activate).toContain('textures.exists')
    expect(activate).toContain('every(')
    expect(activate).toContain(': undefined')
  })

  it('gibt dem Boss mit Bildbewegung keine zweite GANG-Bewegung', () => {
    // Der Gang steckt in den Bildern. Liefe das Wiegen zusaetzlich, laegen zwei
    // Gangbewegungen uebereinander. Die Neigung beim Pendeln ist etwas anderes: Sie ist
    // die Reaktion auf eine Ortsveraenderung und darf dazukommen.
    const source = readFileSync(new URL('../src/systems/boss.ts', import.meta.url), 'utf8')
    const gait = source.slice(source.indexOf('private applyGait('))
    const bildzweig = gait.slice(gait.indexOf('if (texturen !== undefined) {'), gait.indexOf('    const cycleHz'))
    expect(bildzweig).toContain('setRotation(this.swingLeanRadians)')
    expect(bildzweig).toContain('return')
    expect(bildzweig).not.toContain('getStepSquash')
    expect(bildzweig).not.toContain('getStepSwayRadians')
  })

  it('laesst die Bildbewegung in JEDEM Run laufen, nicht nur im Testgelaende', () => {
    // Thomas 2026-09-04: "bewegungen so uebernehmen fuer die normalen runs". Der alte
    // Testgelaende-Schalter muss weg sein, sonst laeuft die Freigabe ins Leere.
    const boss = readFileSync(new URL('../src/systems/boss.ts', import.meta.url), 'utf8')
    const scene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
    expect(boss).not.toContain('setBossBilder')
    expect(scene).not.toContain('setBossBilder')
    expect(boss).not.toContain('BALANCE.testground.bossBilder')
  })

  it('neigt nur den pendelnden Elite-Boss, und nur solange er pendelt', () => {
    const source = readFileSync(new URL('../src/systems/boss.ts', import.meta.url), 'utf8')
    // Die Neigung entsteht ausschliesslich in swingSideways - und das steigt beim
    // gewoehnlichen Boss sofort aus (`if (!plan.elite) return`).
    const zeilen = source.split('\n').filter((zeile) => zeile.includes('this.swingLeanRadians ='))
    expect(zeilen).toHaveLength(2) // einmal setzen im Pendeln, einmal zuruecksetzen
    const swing = source.slice(source.indexOf('private swingSideways('), source.indexOf('private updateVisuals('))
    expect(swing).toContain('if (!plan.elite) return')
    expect(swing).toContain('this.swingLeanRadians =')
    // Kosinus, nicht Sinus: die Neigung folgt der GESCHWINDIGKEIT, nicht dem Ort.
    expect(swing).toContain('Math.cos(phase)')
  })

  it('steht am Umkehrpunkt aufrecht und liegt in der Bahnmitte am staerksten', () => {
    // Gegenprobe zur Verwechslung Ort/Geschwindigkeit: Wer den Sinus nimmt, neigt den
    // Boss genau falsch herum - am weitesten aussen am staerksten, in der Mitte gar nicht.
    const maxRad = (BALANCE.boss.elite.swingLeanMaxDeg * Math.PI) / 180
    const neigung = (phase: number): number => Math.cos(phase) * maxRad
    // Bahnmitte (phase 0, Sinus 0): volle Neigung, weil dort das Tempo am hoechsten ist.
    expect(Math.abs(neigung(0))).toBeCloseTo(maxRad)
    // Umkehrpunkt (phase PI/2, Sinus 1 = ganz aussen): aufrecht.
    expect(Math.abs(neigung(Math.PI / 2))).toBeCloseTo(0)
    // Und die Richtung dreht mit der Bewegung.
    expect(Math.sign(neigung(0))).toBe(-Math.sign(neigung(Math.PI)))
  })

  it('nutzt genau vier Bilder je Bosstyp', () => {
    expect(BALANCE.boss.bilder.zyklenProSekunde).toBeGreaterThan(0)
    for (const satz of [BALANCE.boss.bilder.elite, BALANCE.boss.bilder.basic]) {
      expect(satz).toHaveLength(4)
      expect(new Set(satz).size).toBe(4)
    }
  })

  it('laesst die normalen Gegner bei der gerechneten Bewegung', () => {
    // Der Zombie-Versuch ist zurueckgebaut (Thomas 2026-09-04: "bei den normalen figuren
    // sollte die gerechnete bewegung besser funktionieren"). Im Spawner darf nichts mehr
    // davon stehen, sonst laeuft ein halber Versuch weiter.
    const source = readFileSync(new URL('../src/systems/spawner.ts', import.meta.url), 'utf8')
    expect(source).not.toContain('laufbild')
    expect(source).not.toContain('setLaufbilder')
    // Und die gerechnete Bewegung liegt wieder ohne Sonderfall im Update.
    expect(source).toContain('getStepSwayRadians(this.elapsedMs, bobCycleHz, phase')
  })
})
