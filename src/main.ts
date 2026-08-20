import Phaser from 'phaser'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import { BootScene } from './scenes/BootScene'
import { GameOverScene } from './scenes/GameOverScene'
import { GameScene } from './scenes/GameScene'

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
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 844,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [BootScene, GameScene, GameOverScene],
})

game.canvas.addEventListener('contextmenu', (event) => event.preventDefault())
