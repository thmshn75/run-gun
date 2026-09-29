import * as THREE from 'three'

let renderer: THREE.WebGLRenderer | null = null

export function holeRenderer(): THREE.WebGLRenderer {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true })
    Object.assign(renderer.domElement.style, { position: 'fixed', inset: '0', zIndex: '10', touchAction: 'none', width: '100%', height: '100%', display: 'none' })
    document.body.appendChild(renderer.domElement)
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  renderer.domElement.style.display = 'block'
  return renderer
}

export function entferneRenderer(): void {
  if (!renderer) return
  renderer.setAnimationLoop(null)
  renderer.dispose()
  renderer.domElement.remove()
  renderer = null
}
