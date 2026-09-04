import type Phaser from 'phaser'

/**
 * Farbvarianten eines Bewegungsbildes (2026-09-04).
 *
 * DAS PROBLEM: Bis zu diesem Tag hatte jede Gegnerstaerke zehn gezeichnete Gestalten
 * (E5) - verschiedene Koerper UND verschiedene Farben. Mit der Taumelbewegung tritt an
 * ihre Stelle EIN bewegter Satz je Staerke; die Farbvielfalt waere damit weg.
 * Thomas 2026-09-04: "natuerlich die farben wieder wie gehabt".
 *
 * WARUM NICHT setTint: Phasers Tint multipliziert die Farbe und kann eine Figur deshalb
 * nur dunkler machen. Gemessen sind sieben bis neun der zehn Originalvarianten je Staerke
 * in mindestens einem Kanal HELLER als ihre Grundvariante - ein Tint waere dort auf
 * Weiss geklemmt und wirkungslos. Reines Einfaerben deckt also nicht einmal die Haelfte
 * der Varianten ab.
 *
 * DIE LOESUNG: Die Farbverschiebung wird aus den vorhandenen Originalvarianten GEMESSEN
 * (Verhaeltnis der mittleren Kanalwerte zur Grundvariante) und auf die Bewegungsbilder
 * gerechnet. Das Ergebnis ist eine neue Textur - kein Tint, also auch nach oben moeglich.
 *
 * WARUM ZUR LAUFZEIT statt als Dateien: 12 Bilder x 9 Varianten x 3 Staerken waeren 324
 * zusaetzliche PNGs im Offline-Paket. Gerechnet kosten sie nichts auf der Platte und
 * entstehen erst beim ersten Gebrauch (lazy), also nur fuer die Varianten, die das
 * erreichte Level ueberhaupt freischaltet.
 */
const erzeugte = new Set<string>()
const faktoren = new Map<string, readonly [number, number, number]>()

/** Ab dieser Deckkraft zaehlt ein Pixel bei der Farbmessung - deckende Flaeche, kein Rand. */
const ALPHA_SCHWELLE = 200

/**
 * Name der eingefaerbten Textur. Variante 0 ist die Grundfarbe und braucht keine eigene
 * Textur - dort kommt der unveraenderte Name zurueck.
 */
export function getFarbvarianteTextur(
  scene: Phaser.Scene,
  bewegungsBild: string,
  grundGestalt: string,
  variantenGestalt: string,
): string {
  if (variantenGestalt === grundGestalt) return bewegungsBild
  const name = `${bewegungsBild}~${variantenGestalt}`
  if (erzeugte.has(name)) return name
  if (scene.textures.exists(name)) {
    erzeugte.add(name)
    return name
  }
  const faktor = getFarbFaktor(scene, grundGestalt, variantenGestalt)
  if (faktor === undefined || !faerbeTextur(scene, bewegungsBild, name, faktor)) {
    // Konnte nicht eingefaerbt werden: lieber das Bild in Grundfarbe als gar keines.
    return bewegungsBild
  }
  erzeugte.add(name)
  return name
}

/**
 * Farbverhaeltnis einer Variante zu ihrer Grundgestalt, je Kanal. Wird einmal je Paar
 * gemessen und behalten.
 */
function getFarbFaktor(
  scene: Phaser.Scene,
  grundGestalt: string,
  variantenGestalt: string,
): readonly [number, number, number] | undefined {
  const schluessel = `${grundGestalt}->${variantenGestalt}`
  const gespeichert = faktoren.get(schluessel)
  if (gespeichert !== undefined) return gespeichert
  const grund = getMittelfarbe(scene, grundGestalt)
  const ziel = getMittelfarbe(scene, variantenGestalt)
  if (grund === undefined || ziel === undefined) return undefined
  const faktor: readonly [number, number, number] = [
    grund[0] > 0 ? ziel[0] / grund[0] : 1,
    grund[1] > 0 ? ziel[1] / grund[1] : 1,
    grund[2] > 0 ? ziel[2] / grund[2] : 1,
  ]
  faktoren.set(schluessel, faktor)
  return faktor
}

function getMittelfarbe(scene: Phaser.Scene, texturName: string): readonly [number, number, number] | undefined {
  const daten = leseTextur(scene, texturName)
  if (daten === undefined) return undefined
  let r = 0
  let g = 0
  let b = 0
  let anzahl = 0
  for (let i = 0; i < daten.pixel.length; i += 4) {
    if (daten.pixel[i + 3] < ALPHA_SCHWELLE) continue
    r += daten.pixel[i]
    g += daten.pixel[i + 1]
    b += daten.pixel[i + 2]
    anzahl += 1
  }
  if (anzahl === 0) return undefined
  return [r / anzahl, g / anzahl, b / anzahl]
}

function faerbeTextur(
  scene: Phaser.Scene,
  quelleName: string,
  zielName: string,
  faktor: readonly [number, number, number],
): boolean {
  const daten = leseTextur(scene, quelleName)
  if (daten === undefined) return false
  const pixel = daten.pixel
  for (let i = 0; i < pixel.length; i += 4) {
    if (pixel[i + 3] === 0) continue
    // Deckeln statt ueberlaufen: Ueber 255 kippt der Kanal sonst auf Schwarz um.
    pixel[i] = Math.min(255, Math.round(pixel[i] * faktor[0]))
    pixel[i + 1] = Math.min(255, Math.round(pixel[i + 1] * faktor[1]))
    pixel[i + 2] = Math.min(255, Math.round(pixel[i + 2] * faktor[2]))
  }
  const leinwand = document.createElement('canvas')
  leinwand.width = daten.breite
  leinwand.height = daten.hoehe
  const stift = leinwand.getContext('2d', { willReadFrequently: true })
  if (stift === null) return false
  // Neues Array statt des gelesenen: getImageData liefert einen Puffer, den TypeScript
  // als moeglicherweise geteilt (SharedArrayBuffer) fuehrt - ImageData nimmt nur einen
  // gewoehnlichen.
  stift.putImageData(new ImageData(new Uint8ClampedArray(pixel), daten.breite, daten.hoehe), 0, 0)
  scene.textures.addCanvas(zielName, leinwand)
  return true
}

function leseTextur(
  scene: Phaser.Scene,
  texturName: string,
): { pixel: Uint8ClampedArray, breite: number, hoehe: number } | undefined {
  if (!scene.textures.exists(texturName)) return undefined
  const quelle = scene.textures.get(texturName).getSourceImage() as HTMLImageElement | HTMLCanvasElement
  const breite = quelle.width
  const hoehe = quelle.height
  if (breite === 0 || hoehe === 0) return undefined
  const leinwand = document.createElement('canvas')
  leinwand.width = breite
  leinwand.height = hoehe
  const stift = leinwand.getContext('2d', { willReadFrequently: true })
  if (stift === null) return undefined
  stift.drawImage(quelle as CanvasImageSource, 0, 0)
  return { pixel: stift.getImageData(0, 0, breite, hoehe).data, breite, hoehe }
}
