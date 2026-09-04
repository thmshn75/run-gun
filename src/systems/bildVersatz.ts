import type Phaser from 'phaser'

/**
 * Seitlicher Versatz eines Bewegungsbildes (2026-09-04).
 *
 * DAS PROBLEM: In einem gezeichneten Bewegungssatz steht die Figur nicht in jedem Bild
 * exakt an derselben Stelle der Leinwand. Gemessen an den fertigen Saetzen wandert die
 * Standflaeche beim Grundboss um bis zu 30 px von 240, beim Elite um 20,5 - auf dem
 * Bildschirm sind das 14 bzw. 10 px. Im Spiel rutscht die Figur dadurch beim Stapfen
 * seitlich hin und her, obwohl ihre Position unveraendert bleibt.
 *
 * DIE LOESUNG: Fuer jedes Bild wird gemessen, wie weit seine Standflaeche von der
 * Bildmitte abweicht, und die Figur beim Anzeigen um genau diesen Betrag gegengerueckt.
 *
 * GEMESSEN STATT GETRAGEN: Der Versatz koennte auch als Zahlenliste in balance.ts stehen.
 * Er wird stattdessen aus der Textur selbst gelesen, weil eine Liste beim naechsten
 * Bildsatz stillschweigend falsch wuerde - und genau solche stillen Fehler haben an
 * diesem Tag schon zweimal Zeit gekostet (zu kleine Figuren, halbtransparentes Bild).
 *
 * KOSTEN: Einmal je Textur beim ersten Gebrauch, danach aus dem Zwischenspeicher. Gelesen
 * werden nur die unteren Bildzeilen, und zwar in einem Zug ueber getImageData - nicht
 * Pixel fuer Pixel ueber Phasers getPixelAlpha, das bei 24 Bildern hunderttausende
 * Einzelzugriffe waeren.
 */
const zwischenspeicher = new Map<string, number>()

/** Ab dieser Deckkraft zaehlt ein Pixel als Teil der Figur - wie bei allen Messungen. */
const ALPHA_SCHWELLE = 8

export function getBildVersatzPx(
  scene: Phaser.Scene,
  texturName: string,
  standflaecheAbAnteil: number,
): number {
  const schluessel = `${texturName}@${standflaecheAbAnteil}`
  const gespeichert = zwischenspeicher.get(schluessel)
  if (gespeichert !== undefined) return gespeichert
  const versatz = messeVersatz(scene, texturName, standflaecheAbAnteil)
  zwischenspeicher.set(schluessel, versatz)
  return versatz
}

function messeVersatz(scene: Phaser.Scene, texturName: string, abAnteil: number): number {
  if (!scene.textures.exists(texturName)) return 0
  const quelle = scene.textures.get(texturName).getSourceImage() as HTMLImageElement | HTMLCanvasElement
  const breite = quelle.width
  const hoehe = quelle.height
  if (breite === 0 || hoehe === 0) return 0

  const vonY = Math.floor(hoehe * abAnteil)
  const leinwand = document.createElement('canvas')
  leinwand.width = breite
  leinwand.height = hoehe - vonY
  const stift = leinwand.getContext('2d', { willReadFrequently: true })
  if (stift === null) return 0
  stift.drawImage(quelle as CanvasImageSource, 0, -vonY)
  const daten = stift.getImageData(0, 0, leinwand.width, leinwand.height).data

  let links = -1
  let rechts = -1
  for (let x = 0; x < breite; x += 1) {
    for (let y = 0; y < leinwand.height; y += 1) {
      if (daten[(y * breite + x) * 4 + 3] > ALPHA_SCHWELLE) {
        if (links === -1) links = x
        rechts = x
        break
      }
    }
  }
  // Kein Pixel im Standflaechen-Bereich: nichts auszugleichen.
  if (links === -1) return 0
  // Positiv heisst "Figur steht rechts der Bildmitte" - der Aufrufer zieht den Wert ab.
  return (links + rechts) / 2 - breite / 2
}
