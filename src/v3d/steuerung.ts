import * as THREE from 'three'
import { STEUERUNG } from './balance3d'

export function fingerWeltX(clientX: number, clientY: number, rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>, camera: THREE.PerspectiveCamera): number {
  const links = rect.left + STEUERUNG.RANDRESERVE_PT
  const rechts = rect.left + rect.width - STEUERUNG.RANDRESERVE_PT
  const x = Math.max(links, Math.min(rechts, clientX))
  const ndc = new THREE.Vector2(2 * (x - rect.left) / rect.width - 1, 1 - 2 * (clientY - rect.top) / rect.height)
  camera.updateMatrixWorld()
  const ray = new THREE.Raycaster()
  ray.setFromCamera(ndc, camera)
  const hit = new THREE.Vector3()
  if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return 0
  // Der Strahl trifft die Bodenebene; für die Aussendelinie z=0 wird dieselbe
  // horizontale Sichtachse auf die Linienhöhe projiziert.
  const line = new THREE.Vector3(0, 0, 0).project(camera)
  ray.setFromCamera(new THREE.Vector2(ndc.x, line.y), camera)
  ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)
  const welt = Math.max(STEUERUNG.MIN_X, Math.min(STEUERUNG.MAX_X, hit.x))
  if (clientX <= links) return STEUERUNG.MIN_X
  if (clientX >= rechts) return STEUERUNG.MAX_X
  return welt
}

export function glaetteX(aktuell: number, ziel: number, dt: number): number {
  if (!Number.isFinite(dt) || dt <= 0) return aktuell
  const delta = Math.max(-STEUERUNG.MAX_M_PRO_S * dt, Math.min(STEUERUNG.MAX_M_PRO_S * dt, ziel - aktuell))
  return Math.max(STEUERUNG.MIN_X, Math.min(STEUERUNG.MAX_X, aktuell + delta))
}
export const kernX = (weltX: number): number => Math.max(-1, Math.min(1, weltX / 3))

export class FingerSteuerung {
  private id: number | null = null
  ziel: number | null = null
  private canvas: HTMLCanvasElement
  private camera: THREE.PerspectiveCamera
  constructor(canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera) {
    this.canvas=canvas; this.camera=camera
    canvas.addEventListener('pointerdown', this.down)
    canvas.addEventListener('pointermove', this.move)
    canvas.addEventListener('pointerup', this.weg)
    canvas.addEventListener('pointercancel', this.weg)
    canvas.addEventListener('lostpointercapture', this.weg)
    window.addEventListener('blur', this.verwerfe)
    document.addEventListener('visibilitychange', this.sichtbar)
  }
  get aktiv(): boolean { return this.id !== null }
  private down = (e: PointerEvent) => { if (this.id !== null) return; this.id = e.pointerId; this.canvas.setPointerCapture(e.pointerId); this.move(e) }
  private move = (e: PointerEvent) => { if (e.pointerId === this.id) this.ziel = fingerWeltX(e.clientX, e.clientY, this.canvas.getBoundingClientRect(), this.camera) }
  private weg = (e: PointerEvent) => { if (e.pointerId === this.id) this.verwerfe() }
  private sichtbar = () => { if (document.hidden) this.verwerfe() }
  verwerfe = () => { if (this.id !== null && this.canvas.hasPointerCapture(this.id)) this.canvas.releasePointerCapture(this.id); this.id = null; this.ziel = null }
  gibFrei(): void { this.verwerfe(); this.canvas.removeEventListener('pointerdown', this.down); this.canvas.removeEventListener('pointermove', this.move); this.canvas.removeEventListener('pointerup', this.weg); this.canvas.removeEventListener('pointercancel', this.weg); this.canvas.removeEventListener('lostpointercapture', this.weg); window.removeEventListener('blur', this.verwerfe); document.removeEventListener('visibilitychange', this.sichtbar) }
}
