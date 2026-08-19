import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const publicDirectory = new URL('../public/', import.meta.url)

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])))
  return Buffer.concat([length, typeBytes, data, checksum])
}

function fill(pixels, size, x, y, width, height, color) {
  for (let row = Math.max(0, y); row < Math.min(size, y + height); row += 1) {
    for (let column = Math.max(0, x); column < Math.min(size, x + width); column += 1) {
      const offset = (row * size + column) * 4
      pixels.set(color, offset)
    }
  }
}

function makeIcon(size) {
  const pixels = new Uint8Array(size * size * 4)
  pixels.fill(255)
  for (let index = 0; index < pixels.length; index += 4) pixels.set([16, 19, 29, 255], index)
  const unit = Math.max(1, Math.floor(size / 16))
  fill(pixels, size, 2 * unit, 12 * unit, 12 * unit, 2 * unit, [35, 45, 67, 255])
  fill(pixels, size, 6 * unit, 5 * unit, 4 * unit, 8 * unit, [86, 214, 255, 255])
  fill(pixels, size, 5 * unit, 8 * unit, 6 * unit, 4 * unit, [86, 214, 255, 255])
  fill(pixels, size, 6 * unit, 6 * unit, 4 * unit, 2 * unit, [218, 246, 255, 255])
  fill(pixels, size, 10 * unit, 7 * unit, 3 * unit, unit, [255, 200, 87, 255])
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let row = 0; row < size; row += 1) {
    const target = row * (size * 4 + 1)
    raw[target] = 0
    Buffer.from(pixels.buffer, row * size * 4, size * 4).copy(raw, target + 1)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', Buffer.from([size >>> 24, size >>> 16, size >>> 8, size, size >>> 24, size >>> 16, size >>> 8, size, 8, 6, 0, 0, 0])),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(publicDirectory, { recursive: true })
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(new URL(name, publicDirectory), makeIcon(size))
}
