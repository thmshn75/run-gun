import * as THREE from 'three'
import { BUEHNE } from './balance3d'

export function passeKameraAn(camera: THREE.PerspectiveCamera, breite: number, hoehe: number): void {
  const aspekt = breite / hoehe
  camera.aspect = aspekt
  camera.fov = aspekt < BUEHNE.REFERENZ_ASPEKT
    ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(BUEHNE.KAMERA_SICHTFELD / 2)) * BUEHNE.REFERENZ_ASPEKT / aspekt))
    : BUEHNE.KAMERA_SICHTFELD
  camera.updateProjectionMatrix()
}

export function baueKamera(breite: number, hoehe: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(BUEHNE.KAMERA_SICHTFELD, BUEHNE.REFERENZ_ASPEKT, BUEHNE.KAMERA_NAH, BUEHNE.KAMERA_FERN)
  camera.position.set(...BUEHNE.KAMERA_POSITION)
  camera.rotation.x = -THREE.MathUtils.degToRad(BUEHNE.KAMERA_NEIGUNG)
  camera.layers.enable(1)
  passeKameraAn(camera, breite, hoehe)
  camera.updateMatrixWorld()
  return camera
}
