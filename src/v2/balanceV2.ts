/**
 * Ausschliesslich fuer Run Gun V2. Diese Zahlen werden absichtlich kopiert statt aus
 * dem bestehenden Spiel importiert: V2 bleibt ein vollstaendig getrennter Probelauf.
 */
export const BALANCE_V2 = {
  track: {
    // 150 px: aus der bestehenden Bahn abgelesene Horizonthoehe bei 844 px Spielhoehe.
    horizonY: 150,
    // 0,52 * 390 px = 202,8 px breite Bahn am Horizont, als eigene V2-Zahl kopiert.
    topWidthRatio: 0.52,
    // 1 * 390 px = volle Bildschirmbreite am unteren Rand, wie die bestehende Bahn.
    bottomWidthRatio: 1,
    // 2 px: sichtbare Kante zwischen Bahn und Mauer.
    wallWidthPx: 2,
  },
  truppe: {
    // 10 Figuren: die im Video sichtbare kleine Starttruppe, bewusst ohne Spielstand.
    startGroesse: 10,
    // 60 Figuren: genug fuer spaetere Zunahme, ohne den Haufen unlesbar zu machen.
    maxSichtbar: 60,
    // 52 px: dichter Haufen, der bei 60 Figuren noch klar als eine Gruppe lesbar bleibt.
    haufenRadiusMaxPx: 52,
    // 0,22: die Player-Textur bleibt deutlich kleiner als die Bahnbreite.
    figurTextureScale: 0.22,
    // 92 px ueber der Unterkante: genug Abstand fuer Figur und Bildschirmrand.
    abstandVonUntenPx: 92,
  },
  strom: {
    // 0,16 Figuren je Truppenfigur und Sekunde, mindestens eine; bei 10 startet
    // der sichtbare Strom daher mit 1,6 Figuren pro Sekunde.
    rateJeTruppenfigur: 0.16,
    mindestRateProSek: 1,
    maximaleRateProSek: 8,
    // 180 px/s: klarer, gleichmässiger Lauf von der Truppe zum Horizont.
    tempoPxProSek: 180,
    // 844 - 92 - 150 = 602 px auf dem verbindlichen iPhone-Hochformat.
    laufstreckePx: 602,
    // floor(8 * (602 / 180)) + 2 = 28. Zwei Reserveplätze verhindern eine
    // Warnung an der Frame-Grenze, ohne dass zur Laufzeit Bilder entstehen.
    vorratGroesse: 28,
    // 18 px: leichte Streuung über die Truppenbreite statt Gänsemarsch.
    startStreuungPx: 18,
    // 0,14: die laufenden Figuren liegen optisch hinter der Starttruppe.
    figurTextureScale: 0.14,
  },
  front: {
    // 858 ist der aus dem Video abgelesene Startvorrat der roten Flaeche.
    gegnerStartVorrat: 858,
    // Die Front beginnt deutlich vor der blauen Starttruppe.
    frontStartY: 610,
    // 0,18 * 10 = 1,8; 0,0021 * 858 = 1,8018. Die Startseiten halten die
    // Grenze damit praktisch, bis der Strom die blaue Flaeche vergroessert.
    abbauProEigenerEinheitProSek: 0.18,
    verlustProVorratProSek: 0.0021,
    // Maximale rote Trapezflaeche (390 x 844): (202,8 px + 326,9 px) / 2 *
    // 460 px = 121.831 px². Ein Zombie bei 0,105 ist 6,72 x 9,24 px; mit 10 %
    // Ueberlappung bleiben 6,048 x 8,316 px = 50,29 px². ceil(121.831 / 50,29)
    // = 2.423, daher 2.560 feste Bilder als kleine Reserve fuer die Randzeilen.
    gegnerFigurenVorrat: 2560,
    // Die eigene Flaeche endet bei 680 px, vor der bei 752 px zentrierten Starttruppe.
    // Ihre maximale Trapezflaeche ist (326,9 px + 350,3 px) / 2 * 70 px = 23.702 px².
    // Ein Player bei 0,105 deckt mit 10 % Ueberlappung 6,426 x 8,694 px = 55,86 px²;
    // ceil(23.702 / 55,86) = 425, daher 512 feste Bilder als Zeilenreserve.
    eigeneFigurenVorrat: 512,
    // Kleine Figuren wie vor N3: 0,105 ergibt mehrere hundert sichtbare Punkte je
    // Flaeche; die Anzahl statt einer vergroesserten Skalierung schliesst den Teppich.
    gegnerFigurTextureScale: 0.105,
    eigeneFigurTextureScale: 0.105,
    // Untere Sichtgrenze der eigenen Flaeche: Die Starttruppe bleibt frei sichtbar.
    eigeneFlaecheMaxUntenY: 680,
    // Eigene Figuren bleiben klar blau. Der Gegner ist dunkles Rot; ein blauer
    // Tint auf der roetlichen Zombie-Textur wuerde sie fast schwarz multiplizieren.
    eigeneFigurTint: 0x75bfff,
    gegnerFigurTint: 0x8f3038,
  },
  colors: {
    // Eigene V2-Farben; keine Farbkonfiguration des bestehenden Spiels wird gelesen.
    sky: 0x80c8ee,
    road: 0x39434d,
    wall: 0x697682,
    wallEdge: 0xb8c4cb,
    menuButton: 0x263d55,
    menuButtonEdge: 0xe8f4ff,
    menuText: '#f4fbff',
  },
} as const

/**
 * Berechnet die vier Bahnecken in Bildschirmkoordinaten. Die Szene und der Test
 * verwenden dieselbe Rechnung, damit keine Polygon-Verschiebung die Bahn teilt.
 */
export function bahnKanten(width: number, height: number) {
  const centerX = width / 2
  const topHalfWidth = width * BALANCE_V2.track.topWidthRatio / 2
  const bottomHalfWidth = width * BALANCE_V2.track.bottomWidthRatio / 2

  return {
    horizonY: BALANCE_V2.track.horizonY,
    bottomY: height,
    topLeftX: centerX - topHalfWidth,
    topRightX: centerX + topHalfWidth,
    bottomLeftX: centerX - bottomHalfWidth,
    bottomRightX: centerX + bottomHalfWidth,
  }
}

/** Ermittelt eine Bahnkante auf einer Höhe aus genau den vier S1-Eckpunkten. */
export function bahnKantenBeiY(width: number, height: number, y: number) {
  const kanten = bahnKanten(width, height)
  const fortschritt = Math.min(1, Math.max(0, (y - kanten.horizonY) / (kanten.bottomY - kanten.horizonY)))
  return {
    leftX: kanten.topLeftX + (kanten.bottomLeftX - kanten.topLeftX) * fortschritt,
    rightX: kanten.topRightX + (kanten.bottomRightX - kanten.topRightX) * fortschritt,
  }
}
