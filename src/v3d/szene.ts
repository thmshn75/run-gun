import * as THREE from 'three'

export function baueSzene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#87c6ee')
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 120)
  camera.position.set(0, 9, 10)
  camera.lookAt(0, 0, -12)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 2.2))
  const licht = new THREE.DirectionalLight(0xffffff, 2.2)
  licht.position.set(-6, 14, 4)
  scene.add(licht)
  const blau = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#2f6f96' }))
  blau.rotation.x = -Math.PI / 2
  blau.position.set(0, -0.02, -30)
  scene.add(blau)
  const bahn = new THREE.Mesh(new THREE.PlaneGeometry(7, 80), new THREE.MeshStandardMaterial({ color: '#3b4450' }))
  bahn.rotation.x = -Math.PI / 2
  bahn.position.z = -30
  scene.add(bahn)
  return { scene, camera }
}

export function gibSzeneFrei(scene: THREE.Scene): void {
  const geometrien = new Set<THREE.BufferGeometry>()
  const materialien = new Set<THREE.Material>()
  const texturen = new Set<THREE.Texture>()
  scene.traverse(obj => {
    if (!(obj instanceof THREE.Mesh)) return
    geometrien.add(obj.geometry)
    for (const material of Array.isArray(obj.material) ? obj.material : [obj.material]) {
      materialien.add(material)
      for (const wert of Object.values(material)) if (wert instanceof THREE.Texture) texturen.add(wert)
    }
  })
  texturen.forEach(t => t.dispose())
  materialien.forEach(m => m.dispose())
  geometrien.forEach(g => g.dispose())
  scene.clear()
}
