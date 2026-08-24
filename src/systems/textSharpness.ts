import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { computeTextResolution } from './textResolution'

/**
 * Scharfe Schrift auf hochaufloesenden Bildschirmen (Thomas 2026-08-24: "die weisse
 * Schrift in den orangen Buttons ist etwas unscharf").
 *
 * URSACHE, gemessen: Das Spiel rechnet in einem festen Feld von 390 x 844 Punkten, und
 * Phaser legt den Zeichenbereich genau so gross an - 390 echte Bildpunkte breit. Ein
 * iPhone zeigt diese 390 Punkte aber auf 1.170 Geraetepunkten an; jeder gezeichnete Punkt
 * wird also auf drei gestreckt. Bilder verkraften das (sie liegen ohnehin in doppelter
 * Aufloesung vor), Schrift nicht: Phaser rendert sie in eine Textur in der Groesse, die
 * sie im Feld hat, und die wird dann mitgestreckt.
 *
 * BEHEBUNG: Die Schrift-Textur in der Aufloesung rendern, in der sie tatsaechlich zu
 * sehen ist. Layout, Schriftgroesse und Position bleiben unveraendert - nur die Textur
 * dahinter wird feiner. Das ist genau der Zweck von Text.setResolution.
 *
 * Der Faktor wird gemessen, nicht geraten, und gedeckelt: Eine Textur mit Faktor 3
 * braucht die neunfache Flaeche im Speicher, und ueber 3 ist auf keinem Geraet ein
 * Unterschied mehr zu sehen.
 */
export function getTextResolution(game: Phaser.Game): number {
  const canvas = game.canvas
  if (canvas === undefined || canvas === null) return 1
  return computeTextResolution(
    canvas.width,
    canvas.getBoundingClientRect().width,
    window.devicePixelRatio,
    BALANCE.render.maxTextResolution,
  )
}

/**
 * Setzt die Aufloesung fuer alle Texte einer Szene - auch fuer die, die erst spaeter
 * entstehen (Popups aus dem Pool, Shop-Overlay, Bestenliste).
 *
 * Der Haken auf ADDED_TO_SCENE ist der Grund, warum das eine Zeile je Szene bleibt statt
 * 36 einzelner Aenderungen an jedem add.text-Aufruf - und er kann keine Stelle vergessen.
 */
export function enableSharpText(scene: Phaser.Scene): void {
  const anwenden = (): void => {
    const aufloesung = getTextResolution(scene.game)
    for (const objekt of scene.children.list) {
      if (objekt instanceof Phaser.GameObjects.Text) objekt.setResolution(aufloesung)
    }
  }

  scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, (objekt: Phaser.GameObjects.GameObject) => {
    if (objekt instanceof Phaser.GameObjects.Text) objekt.setResolution(getTextResolution(scene.game))
  })
  // Drehen oder Fenstergroesse aendern verschiebt die Streckung - dann neu setzen.
  scene.scale.on(Phaser.Scale.Events.RESIZE, anwenden)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, anwenden)
    scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE)
  })
  anwenden()
}
