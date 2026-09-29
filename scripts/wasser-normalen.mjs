// Reproduzierbare, periodische Höhenfunktion; Ausgabe als PPM für PIL/WebP lossless.
import { writeFileSync } from 'node:fs'
const N = 512
const seed = 31729
const hash = (x, y) => {
  let v = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed) | 0
  v = Math.imul(v ^ (v >>> 13), 1274126177)
  return ((v ^ (v >>> 16)) >>> 0) / 4294967295
}
const smooth = t => t * t * (3 - 2 * t)
function noise(x, y, cells) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy)
  const a = hash(((ix % cells) + cells) % cells, ((iy % cells) + cells) % cells)
  const b = hash((ix + 1) % cells, ((iy % cells) + cells) % cells)
  const c = hash(((ix % cells) + cells) % cells, (iy + 1) % cells)
  const d = hash((ix + 1) % cells, (iy + 1) % cells)
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
}
const height = (x, y) => [8, 16, 32, 64].reduce((v, cells, i) => v + noise(x * cells / N, y * cells / N, cells) / (2 ** i), 0)
const pixels = Buffer.alloc(N * N * 3)
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const dx = (height((x + 1) % N, y) - height((x - 1 + N) % N, y)) * 2.5
  const dy = (height(x, (y + 1) % N) - height(x, (y - 1 + N) % N)) * 2.5
  const z = 1 / Math.sqrt(dx * dx + dy * dy + 1)
  const i = (y * N + x) * 3
  pixels[i] = Math.round((-dx * z * 0.5 + 0.5) * 255)
  pixels[i + 1] = Math.round((-dy * z * 0.5 + 0.5) * 255)
  pixels[i + 2] = Math.round((z * 0.5 + 0.5) * 255)
}
writeFileSync(process.argv[2] || '/private/tmp/v3d-wasser-normalen.ppm', Buffer.concat([Buffer.from(`P6\n${N} ${N}\n255\n`), pixels]))
