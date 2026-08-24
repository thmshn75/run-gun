import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { AudioScheduler } from '../src/systems/audioPlan'

describe('Ton-Drosselung', () => {
  it('deckelt den Schusston auf die schnellste erreichbare Feuerrate', () => {
    // Herleitung: shotsPerSec.cap ist der schnellste Takt, den der Spieler sich
    // erarbeiten kann. Die Drossel muss genau dort liegen - enger waere ein Teppich,
    // weiter wuerde die Ausbau-Spanne 3/s -> 8/s nicht mehr hoerbar.
    expect(BALANCE.audio.events.shot.minGapMs).toBeCloseTo(1000 / BALANCE.stats.shotsPerSec.capAtLevelTwelve)

    const countTones = (salvosPerSec: number): number => {
      const scheduler = new AudioScheduler()
      const salvoIntervalMs = 1000 / salvosPerSec
      let played = 0
      for (let ms = 0; ms < 4000; ms += salvoIntervalMs) {
        if (scheduler.request('shot', ms)) played += 1
      }
      return played / 4
    }

    // Standardwaffe im Vollausbau liegt genau auf dem Deckel: jede Salve klingt.
    expect(countTones(BALANCE.stats.shotsPerSec.capAtLevelTwelve * BALANCE.weapon.normal.rateFactor)).toBeCloseTo(8, 0)
    // Und die schnellste Waffe darf nicht LANGSAMER klingen als die langsamste - genau
    // das passierte mit einer festen Mindestpause (gemessen 5,9/s statt 8/s), weil ihr
    // Takt nicht auf das Drosselraster fiel.
    const miniGunSalvosPerSec = BALANCE.stats.shotsPerSec.capAtLevelTwelve * BALANCE.weapon.minigun.rateFactor
    expect(countTones(miniGunSalvosPerSec)).toBeCloseTo(8, 0)
    // Ungedrosselt waere es das Dreifache - die Bremse wirkt also wirklich.
    expect(miniGunSalvosPerSec).toBeGreaterThan(2 * BALANCE.stats.shotsPerSec.capAtLevelTwelve)
  })

  it('laesst langsames Feuer ungebremst durch', () => {
    // Startwert 3 Salven/s liegt unter dem Deckel: Da darf nichts verschluckt werden,
    // sonst hoerte sich der Anfang des Laufs stockend an.
    const scheduler = new AudioScheduler()
    const salvoIntervalMs = 1000 / BALANCE.stats.shotsPerSec.base
    let played = 0
    for (let ms = 0; ms < 3000; ms += salvoIntervalMs) {
      if (scheduler.request('shot', ms)) played += 1
    }
    expect(played).toBe(Math.ceil(3000 / salvoIntervalMs))
  })

  it('macht aus acht gleichzeitigen Toten eine Kette statt eines Knalls', () => {
    const scheduler = new AudioScheduler()
    // Splash-Explosion: acht Gegner sterben im selben Bild.
    let sameFrame = 0
    for (let index = 0; index < 8; index += 1) {
      if (scheduler.request('enemyDown', 1000)) sameFrame += 1
    }
    expect(sameFrame).toBe(1)
    // Nach der Drosselzeit darf der naechste kommen.
    expect(scheduler.request('enemyDown', 1000 + BALANCE.audio.events.enemyDown.minGapMs)).toBe(true)
  })

  it('haelt die haeufigen Toene unter dem Stimmen-Deckel', () => {
    const scheduler = new AudioScheduler()
    // Schuss und Sterbeton wechseln sich in dichtester Folge ab.
    let active = 0
    for (let ms = 0; ms <= 2000; ms += 10) {
      scheduler.request('shot', ms)
      scheduler.request('enemyDown', ms)
      active = Math.max(active, scheduler.getActiveCasualVoices(ms))
    }
    expect(active).toBeLessThanOrEqual(BALANCE.audio.maxCasualVoices)
  })

  it('laesst die seltenen, wichtigen Toene nie am Stimmen-Deckel scheitern', () => {
    const scheduler = new AudioScheduler()
    // Dauerfeuer laeuft, der Deckel ist voll.
    for (let ms = 0; ms <= 2000; ms += 10) {
      scheduler.request('shot', ms)
      scheduler.request('enemyDown', ms)
    }
    // Genau in diesem Moment bricht eine Wand und der Trupp wird getroffen.
    expect(scheduler.request('wallBreak', 2000)).toBe(true)
    expect(scheduler.request('playerHit', 2000)).toBe(true)
    expect(scheduler.request('crowdUp', 2000)).toBe(true)
    expect(scheduler.request('weaponSwap', 2000)).toBe(true)
  })

  it('nimmt den Drosselzustand nicht in den naechsten Lauf mit', () => {
    const scheduler = new AudioScheduler()
    expect(scheduler.request('playerHit', 5000)).toBe(true)
    expect(scheduler.request('playerHit', 5010)).toBe(false)
    scheduler.reset()
    // Neuer Lauf, Zeit laeuft beim AudioContext weiter - der Ton muss trotzdem kommen.
    expect(scheduler.request('playerHit', 5010)).toBe(true)
  })

  it('drosselt den Schadenston enger als die Unverwundbarkeit dauert', () => {
    // Sonst wuerde die Drossel Treffer verschlucken, die das Spiel wirklich zaehlt.
    expect(BALANCE.audio.events.playerHit.minGapMs).toBeLessThan(BALANCE.player.iframesMs)
  })
})

describe('Ton-Auslöser im Spiel', () => {
  const gameScene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')

  it('haengt jeden Ton an das Ereignis, das ihn ausloest', () => {
    // Der Schuss haengt am Rueckgabewert von weapons.update (Zahl der Salven), nicht
    // an einem eigenen Takt - sonst laufen Ton und Muendungsfeuer auseinander.
    expect(gameScene).toContain("if (this.weapons.update(dt) > 0) this.audio.play('shot')")
    // Sterben und Wandbruch haengen am true-Rueckgabewert von damage(), also am
    // tatsaechlichen Zerstoeren, nicht am Treffer.
    expect(gameScene).toContain("if (!this.spawner.damage(enemy, damage)) return\n    this.audio.play('enemyDown')")
    expect(gameScene).toContain("if (this.walls.damage(wall, damage)) this.audio.play('wallBreak')")
    expect(gameScene).toContain("this.audio.play(delta > 0 ? 'crowdUp' : 'crowdDown')")
    expect(gameScene).toContain("this.audio.play('weaponSwap')")
    expect(gameScene).toContain("this.audio.play('playerHit')")
  })

  it('gibt Muenzen bewusst keinen Ton', () => {
    // Bei bis zu drei Muenzen je Wandsegment plus Gegner-Muenzen waere das Laerm statt
    // Rueckmeldung - dieselbe Entscheidung wie bei den Popups.
    expect(gameScene).not.toContain("audio.play('coin')")
  })
})

describe('Ton nach Thomas 2026-08-23', () => {
  it('das Dauergeraeusch ist stumm, die seltenen Quittungen bleiben', () => {
    // Thomas: "diese Schiessgeraeusche nerven". Schuss und Sterbeton sind bei 6-13
    // Gegnern je Sekunde dasselbe Dauergeraeusch - beide auf 0.
    expect(BALANCE.audio.events.shot.volume).toBe(0)
    expect(BALANCE.audio.events.enemyDown.volume).toBe(0)
    // Die seltenen, bedeutungstragenden Toene bleiben hoerbar.
    for (const kind of ['wallBreak', 'crowdUp', 'crowdDown', 'weaponSwap'] as const) {
      expect(BALANCE.audio.events[kind].volume, `${kind} darf nicht stumm sein`).toBeGreaterThan(0)
    }
  })

  it('die Hintergrundmusik ist Grundierung, keine Quittung', () => {
    const musik = BALANCE.audio.music
    // Leiser als jede hoerbare Quittung - sonst uebertoent sie das, worauf es ankommt.
    const lauteste = Math.max(...Object.values(BALANCE.audio.events).map((e) => e.volume))
    expect(musik.volume).toBeLessThan(lauteste)
    // Vier Akkorde a drei Toenen: kein Ausreisser nach oben, der auf
    // Handylautsprechern schrill wird, und keiner nach unten, den sie nicht wiedergeben.
    //
    // Obergrenze 400 -> 500 am 2026-08-24. Der Satz ist beim Umbau auf den duesteren
    // Charakter von enger Lage (Quinte, 220-330 Hz) auf Oktavlage gewechselt - ohne
    // Terz, dafuer mit Oktave, das ist der hohle Klang. Der hoechste Ton liegt damit bei
    // 466 Hz. Gesichert gehoert die EIGENSCHAFT "nicht schrill", und die faengt weit
    // hoeher an; 466 Hz ist knapp ueber dem Kammerton. Die alte 400 beschrieb die alte
    // Lage, nicht die Grenze.
    expect(musik.chords).toHaveLength(4)
    for (const akkord of musik.chords) {
      expect(akkord).toHaveLength(3)
      for (const hz of akkord) {
        expect(hz).toBeGreaterThan(100)
        expect(hz).toBeLessThan(500)
      }
    }
    // Die Toene muessen ueberlappen, sonst entsteht zwischen den Akkorden eine Luecke.
    expect(musik.releaseSeconds).toBeGreaterThan(0)
    expect(musik.attackSeconds).toBeLessThan(musik.chordSeconds)
  })
})

describe('Klangeffekte abgeschaltet (Thomas 2026-08-24)', () => {
  it('spielt keine Quittungen mehr, laesst die Musik aber laufen', () => {
    // "das klicken und schiess geeraeusche weg, nur die musik im hintergrund sonst
    // nichts". Der Test haelt die ENTSCHEIDUNG fest, nicht die Umsetzung: Wer den
    // Schalter versehentlich zurueckdreht, faellt hier auf.
    expect(BALANCE.audio.effectsEnabled).toBe(false)
    // Die Musik haengt an eigenen Werten und darf davon nicht beruehrt sein.
    expect(BALANCE.audio.music).toBeDefined()
    expect(BALANCE.audio.masterVolume).toBeGreaterThan(0)
  })
})

describe('Musik: Tempo und Melodie (Thomas 2026-08-24)', () => {
  it('hat zu jedem Akkord eine Melodiezeile gleicher Laenge', () => {
    // "irgendwie zu langsam und mehr Melodie gewuenscht". Fehlte zu einem Akkord die
    // Melodiezeile, liefe die Stimme gegen die Harmonie - und zwar erst nach Sekunden
    // hoerbar, also genau die Art Fehler, die im Spieltest untergeht.
    const musik = BALANCE.audio.music
    expect(musik.melody).toHaveLength(musik.chords.length)
    for (const zeile of musik.melody) expect(zeile.length).toBeGreaterThan(0)
  })

  it('haelt die Melodie in der Lage, die ein Handylautsprecher traegt', () => {
    // Pausen (0) zaehlen hier nicht mit - sie sind gewollt, siehe eigener Test unten.
    // Die Untergrenze ist dieselbe wie bei den Akkorden und aus demselben Grund: Auf
    // einem iPhone-Lautsprecher faellt unterhalb von rund 200 Hz der Pegel weg. Nach
    // oben begrenzt, damit nichts sticht.
    const toene = BALANCE.audio.music.melody.flat().filter((ton) => ton > 0)
    expect(toene.length).toBeGreaterThan(0)
    for (const ton of toene) {
      expect(ton).toBeGreaterThan(200)
      expect(ton).toBeLessThan(1000)
    }
  })

  it('laeuft schneller als die erste Fassung', () => {
    // 6 s je Akkord waren der zweite Grund fuer "zu langsam".
    expect(BALANCE.audio.music.chordSeconds).toBeLessThan(6)
  })
})

describe('Musik: duesterer Charakter (Thomas 2026-08-24)', () => {
  it('laesst die Terz weg und behaelt die kleine Sekunde', () => {
    // Die Terz entscheidet ueber Dur oder Moll; ohne sie bleibt der Klang hohl und
    // offen. Die kleine Sekunde ueber dem Grundton (a -> b, Verhaeltnis ~1,059) ist
    // das Intervall, das die Unruhe traegt - beides zusammen ist der Charakter.
    const musik = BALANCE.audio.music
    // Je Akkord: Abstaende zum eigenen Grundton in Halbtoenen. 3 oder 4 waere die
    // Terz - genau die soll fehlen, damit offen bleibt, ob Dur oder Moll gemeint ist.
    for (const akkord of musik.chords) {
      const stufen = akkord.map((ton) => Math.round(12 * Math.log2(ton / akkord[0])) % 12)
      expect(stufen).not.toContain(3)
      expect(stufen).not.toContain(4)
      // Quinte (7) und Oktave (0) bleiben - das ist der hohle Klang.
      expect(stufen).toContain(7)
    }
    // Der zweite Akkord liegt einen HALBTON ueber dem ersten. Diese kleine Sekunde ist
    // das Intervall, das den bedrohlichen Zug traegt.
    expect(Math.round(12 * Math.log2(musik.chords[1][0] / musik.chords[0][0]))).toBe(1)
  })

  it('haelt Pausen in der Melodie frei', () => {
    // Die Stille ist Teil des Klangbilds. Eine durchlaufende Linie klaenge nach
    // Spieluhr statt nach Bedrohung.
    const pausen = BALANCE.audio.music.melody.flat().filter((ton) => ton === 0).length
    expect(pausen).toBeGreaterThan(0)
    const toene = BALANCE.audio.music.melody.flat().filter((ton) => ton > 0).length
    expect(toene).toBeGreaterThan(pausen)
  })

  it('legt den Drone unter den tiefsten Akkordton', () => {
    const musik = BALANCE.audio.music
    expect(musik.droneHz).toBeLessThan(Math.min(...musik.chords.flat()))
    expect(musik.droneVolume).toBeGreaterThan(0)
  })
})
