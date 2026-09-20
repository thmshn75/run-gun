import Phaser from 'phaser'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import { BALANCE } from './config/balance'
import { BootScene } from './scenes/BootScene'
import { GameOverScene } from './scenes/GameOverScene'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/MenuScene'
import { TitleScene } from './scenes/TitleScene'
import { requestPersistentStorage } from './systems/storagePersistence'
import { RunGunV2Scene } from './v2/RunGunV2Scene'

requestPersistentStorage()

const hadController = navigator.serviceWorker?.controller != null
let pendingReload = false
let reloading = false
let registration: ServiceWorkerRegistration | undefined

const reloadForUpdate = () => {
  reloading = true
  location.reload()
}

navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (!hadController || reloading) return

  if (performance.now() < 5000) {
    reloadForUpdate()
    return
  }

  pendingReload = true
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return

  registration?.update()
  if (pendingReload && !reloading) reloadForUpdate()
})

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registered) {
    registration = registered
  },
})

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 390,
  height: 844,
  backgroundColor: '#10131d',
  // KEIN Ton im Spiel (Thomas 2026-08-30: "nimm den ton, musik usw. komplett raus").
  // noAudio haelt Phaser davon ab, ueberhaupt einen Sound-Manager mit AudioContext
  // anzulegen - sonst faengt sich das Spiel auf iOS weiterhin die Freischaltung per
  // Nutzergeste ein, obwohl nie ein Ton gespielt wird.
  audio: { noAudio: true },
  // pixelArt schaltet die Glaettung beim Skalieren ab. Bis 2026-08-22 stand hier true:
  // Die 34x46-Figuren bekamen dadurch harte Treppenkanten und verloren die Plastik der
  // grossen Vorlagen (assets/probe, 136x184). Mit false sind die Gegner am Horizont als
  // Figuren erkennbar statt als Kloetzchen. Eine Zeile zurueck, falls der harte Look
  // doch gewuenscht ist.
  pixelArt: false,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 844,
    // HINWEIS zur Schaerfe (Thomas 2026-09-20: "die schriften im menuebildschirm
    // wirken sehr unscharf"): Der Zeichenbereich ist 390 x 844 echte Bildpunkte
    // gross und wird auf einem iPhone auf die dreifache Groesse gestreckt. Die
    // Schrift wird zwar ueber enableSharpText in dreifacher Aufloesung gerendert,
    // aber auf diesen 390-Punkte-Puffer gezeichnet - feiner als der Puffer kann
    // sie dort nicht werden.
    //
    // GEPRUEFT und VERWORFEN: scale.zoom aendert bei mode FIT nichts am Puffer
    // (gemessen bei devicePixelRatio 3: Puffer bleibt 390 px). Der wirksame Weg
    // waere, width/height mit dem Geraetefaktor zu multiplizieren und zoom auf
    // den Kehrwert zu setzen - dann rechnen aber alle Szenen in einem anderen
    // Koordinatensystem, und jede feste Position im Spiel muesste mitziehen.
    // Das ist ein eigener Umbau, kein Nebenbei-Fix.
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: BALANCE.debug,
      // KEIN Suchbaum fuer die Kollisionsvorauswahl (2026-08-23, Bennis Meldung
      // "gleich am Anfang wenn man startet, ruckelt es ein paar Sekunden, aber nicht
      // immer"). Arcade legt sonst je Bild einen RTree ueber alle Koerper an. Das lohnt
      // sich, wenn die meisten Koerper stillstehen - hier bewegt sich fast alles, und
      // der Baum wird jedes Bild neu aufgebaut.
      //
      // GEMESSEN (Chrome-Profil, zweifach gedrosselte CPU, aktive Rechenzeit):
      //   Spielstart, je 2 s        1.185 ms -> 541 ms   (-54 %)
      //   Volllast, je 5 s            478 ms -> 318 ms   (-33 %)
      //     (Volllast = Level 12, Truppe 100, Schrotflinte, wie in der W6-Messung)
      // Vor der Umstellung entfielen allein auf die Baumfunktionen (contains, search,
      // toBBox, intersects, _all) rund 48 % der aktiven Rechenzeit; contains war mit
      // 31 % der groesste Einzelposten des ganzen Spiels.
      //
      // WIRKUNG auf das gemeldete Ruckeln, fuenf Spielstarts nacheinander, Bilder ueber
      // 33 ms in den ersten 3 s:
      //   vorher  2 / 1 / 0 / 0 / 0, schlimmstes Bild 65 ms
      //   nachher 0 / 0 / 0 / 0 / 0, schlimmstes Bild 19 ms
      //
      // Die Kollisionsergebnisse aendern sich dadurch NICHT - es ist nur die
      // Vorauswahl, welche Paare ueberhaupt geprueft werden. Falls die Gegnermenge
      // spaeter stark steigt, hier neu messen: Ohne Baum waechst der Aufwand
      // quadratisch mit der Koerperzahl.
      useTree: false,
    },
  },
  scene: [BootScene, TitleScene, MenuScene, GameScene, GameOverScene, RunGunV2Scene],
})

if (import.meta.env.DEV) {
  ;(window as unknown as { __runGun?: Phaser.Game }).__runGun = game
  ;(window as unknown as {
    __runGunMessung?: { bildzeit(dauerMs: number): Promise<{ median: number, p95: number, bilder: number }> }
  }).__runGunMessung = {
    bildzeit(dauerMs: number): Promise<{ median: number, p95: number, bilder: number }> {
      return new Promise((resolve) => {
        const deltas: number[] = []
        let previous: number | undefined
        const start = performance.now()
        const frame = (now: number): void => {
          if (previous !== undefined) deltas.push(now - previous)
          previous = now
          if (now - start < Math.max(0, dauerMs)) {
            requestAnimationFrame(frame)
            return
          }
          const sorted = [...deltas].sort((a, b) => a - b)
          const at = (share: number): number => sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * share) - 1)]
          resolve({ median: at(0.5), p95: at(0.95), bilder: deltas.length })
        }
        requestAnimationFrame(frame)
      })
    },
  }
}

game.canvas.addEventListener('contextmenu', (event) => event.preventDefault())
