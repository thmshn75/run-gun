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

  it('schaltet die Laufbilder nur im Testgelaende ein', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
    expect(source).toContain('this.spawner.setLaufbilder(this.istTestgelaende())')
    // Kein zweiter Aufruf mit etwas anderem als dem Testgelaende-Kennzeichen. Geprueft
    // wird zeilenweise, nicht per Klammer-Regex: Das Argument enthaelt selbst Klammern.
    const zeilen = source.split('\n').filter((zeile) => zeile.includes('setLaufbilder('))
    expect(zeilen).toHaveLength(1)
    for (const zeile of zeilen) expect(zeile).toContain('istTestgelaende()')
  })

  it('bleibt aus, solange ein Laufbild fehlt', () => {
    // Sonst erschiene die Versuchsfigur mit fehlender Textur statt mit der gerechneten
    // Bewegung - ein Fehlerbild statt eines Vergleichs.
    const source = readFileSync(new URL('../src/systems/spawner.ts', import.meta.url), 'utf8')
    const setter = source.slice(source.indexOf('public setLaufbilder('), source.indexOf('public resetForLevel('))
    expect(setter).toContain('textures.exists')
    expect(setter).toContain('every(')
  })

  it('gibt der Versuchsfigur keine zweite, gerechnete Bewegung', () => {
    // Die Bewegung steckt in den Bildern. Liefe das Wiegen zusaetzlich, verglichen wir
    // zwei Bewegungen gegen eine statt gezeichnet gegen gerechnet.
    const source = readFileSync(new URL('../src/systems/spawner.ts', import.meta.url), 'utf8')
    expect(source).toContain("const istLaufbild = enemy.getData('laufbild') === true")
    // Der Hub wird fuer die Versuchsfigur uebersprungen ...
    expect(source).toContain('istLaufbild\n        ? 0')
    // ... und Wiegen und Federn liegen im anderen Zweig.
    const zweig = source.slice(source.indexOf('if (istLaufbild) {'))
    const sonst = zweig.slice(zweig.indexOf('} else {'))
    expect(sonst).toContain('getStepSquash')
    expect(sonst).toContain('getStepSwayRadians')
  })

  it('nutzt genau vier Bilder auf einen Doppelschritt', () => {
    // Vier ist das Minimum, das als Gang gelesen wird: zwei Kontakte, zwei Schwuenge.
    expect(BALANCE.testground.laufbilder.texturen).toHaveLength(4)
    expect(new Set(BALANCE.testground.laufbilder.texturen).size).toBe(4)
    // Und die ersetzte Staerke gibt es wirklich.
    expect(BALANCE.enemy.types.map((t) => t.key)).toContain(BALANCE.testground.laufbilder.staerke)
  })
})
