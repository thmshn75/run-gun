/**
 * Ausschliesslich fuer Run Gun V2. Diese Zahlen werden absichtlich kopiert statt aus
 * dem bestehenden Spiel importiert: V2 bleibt ein vollstaendig getrennter Probelauf.
 */
export const BALANCE_V2 = {
  track: {
    // 150 px: aus der bestehenden Bahn abgelesene Horizonthoehe bei 844 px Spielhoehe.
    horizonY: 150,
    // 1,0 * 390 px: am Horizont nutzt die Bruecke die volle Bildschirmbreite.
    topWidthRatio: 1.0,
    // 0,58 * 390 px: vorne bleibt die Bruecke deutlich schmaler als der Bildschirm.
    bottomWidthRatio: 0.58,
    // Bei f = 0,5 bleiben (1 - 0,5)^1,8 = 28,7 % des Breitenueberschusses:
    // die Auffaecherung sitzt oben, das untere bespielte Drittel ist fast parallel.
    kurvenExponent: 1.8,
    // 4 px: sichtbares Brueckengelaender statt einer blossen Mauerkante.
    wallWidthPx: 4,
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
    // ceil(8 * 2 * (602 / 180)) + 2 = 56. Der Vorrat deckt den schlimmsten
    // Fall ab: maximale Rate, jeder Stromlaeufer hinter dem Tor mal 2 und die
    // ganze Laufdauer. Zwei Reserveplaetze fangen die Frame-Grenze ab.
    vorratGroesse: 2651,
    // 18 px: leichte Streuung über die Truppenbreite statt Gänsemarsch.
    startStreuungPx: 18,
    // 0,14: die laufenden Figuren liegen optisch hinter der Starttruppe.
    figurTextureScale: 0.14,
  },
  tor: {
    // ×2 braucht 2 Treffer: Faktor und Freischaltzähler bleiben proportional
    // (99 / 99 = 1 Treffer je Faktorpunkt), daher gleiche gefuehlte Freischaltdauer.
    faktor: 2,
    freischaltTreffer: 2,
    // Das Tor steht unmittelbar vor der bei 752 px liegenden Starttruppe.
    y: 700,
    hoehePx: 44,
  },
  raender: {
    // Die Schilder folgen der Bahn konstant von oben nach unten. 48 px Abstand bei
    // 56 px Hoehe ueberlappt leicht und laesst auch zwischen zwei Umlaeufen keine Luecke.
    schildHoehePx: 56,
    schildBreitePx: 54,
    abstandPx: 48,
    // In der Mitte 120 px/s, ganz links +100 px/s: 220 px/s ist deutlich schneller,
    // ohne dass die Reihe bei 60 fps mehr als rund 4 px pro Bild springt.
    grundTempoPxProSek: 120,
    zuschlagGanzLinksPxProSek: 100,
    // Mittelpunkt 42 px innerhalb der Bahnkante: bei 54 px Schildbreite bleiben
    // einschliesslich der Kontur sichtbar 14 px freie Bahn bis zur Aussenkante.
    randEinzugPx: 42,
    // Einsammeln ist reine Bildschirmgeometrie, keine Phaser-Physik.
    sammelSeitlichPx: 42,
    sammelHoehePx: 34,
  },
  front: {
    // 858 ist der aus dem Video abgelesene Startvorrat der roten Flaeche.
    gegnerStartVorrat: 858,
    // Bei 390 x 844 endet die volle rote Masse bei y=380: 230 px nach dem
    // Horizont und damit im oberen Drittel der 694 px hohen Bahn. Bis zum Tor
    // bei y=700 bleiben 320 px sichtbare freie Bahn fuer den Strom.
    frontStartY: 380,
    // Bilanz pro Sekunde, die auch N5 festhaelt (jeweils ohne Phaser):
    // ohne Eingabe: 10 * 0,05 + 1,6 Strom = 2,10 blauer Druck gegen
    // 858 * 0,00285 = 2,445 roten Druck. Nach dem Aufreiben der Flaeche verliert
    // die Truppe damit und der rechnerische Lauf endet nach rund 30 s. Nur links: die +1-Reihe erhoeht
    // die Truppe um 2,5/s; ihr Strom dreht die anfaengliche Luecke knapp um.
    // Rechts: Start-Staerke 100, jedes +99 verdoppelt fast den Druck. Bei sechs
    // Schildern in 15 s: 10 * (1 + 6*0,99) * 0,05 = 3,47 > 2,45. Links liefert
    // in derselben Zeit 10 + 15*2,5 = 47,5 und 2,38 Druck; mit Stromankuenften
    // ueber 2,45. Beide Wege gewinnen rechnerisch, ohne Mengenbonus rechts.
    abbauProEigenerEinheitProSek: 0.05,
    verlustProVorratProSek: 0.00285,
    // Maximale rote Trapezflaeche (390 x 844): (202,8 px + 284,9 px) / 2 *
    // 230 px = 56.315 px². Der bestehende feste Bildvorrat bleibt absichtlich
    // unveraendert; er deckt den nun kleineren, kompakten Block mit Reserve ab.
    gegnerFigurenVorrat: 2560,
    // Die eigene Flaeche endet bei 560 px. So ist sie als blaues Band unter der
    // Front sichtbar und laesst bis zum Tor bei y=700 freie Laufbahn.
    // 1.152 Bilder fuellen bei 50 Spalten bis zu 23 Reihen und decken damit das
    // sichtbare Wachstum vom Startband bis zur unteren Sichtgrenze ab.
    eigeneFigurenVorrat: 1152,
    // Kleine Figuren wie vor N3: 0,105 ergibt mehrere hundert sichtbare Punkte je
    // Flaeche; die Anzahl statt einer vergroesserten Skalierung schliesst den Teppich.
    gegnerFigurTextureScale: 0.105,
    eigeneFigurTextureScale: 0.105,
    helmTextureScale: 0.075,
    heavyTextureScale: 0.20,
    // Untere Sichtgrenze der eigenen Flaeche: Die Starttruppe bleibt frei sichtbar.
    eigeneFlaecheMaxUntenY: 560,
  },
  ende: {
    // Der Boss hat den im ersten Video sichtbaren eigenen Vorrat 4.000. Nach der
    // roten Flaeche wird er mit derselben eigenen Druckrate abgebaut.
    bossStartVorrat: 4000,
    bossStartScale: 0.48,
    bossEndScale: 0.78,
    // Der Boss folgt der schrumpfenden roten Masse sichtbar nach unten.
    bossMaxAbstiegPx: 92,
    // Die Ergebnisanzeige bleibt kurz lesbar, bevor der reine Probelauf ins Menue geht.
    rueckkehrMs: 1800,
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
    // Die Texturen haben bereits eigene Farben. setTintFill setzt daher die klare
    // Seitenfarbe, statt Blau mit einer roten Vorlage zu Schwarz zu multiplizieren.
    // Die RGB-Werte sind bewusst pruefbar und klar voneinander getrennt.
    eigeneSeite: 0x3d9dff,
    gegnerSeite: 0xef4e58,
  },
  staerke: {
    // 100 Punkte entsprechen dem Grundfaktor 1. +99 ist absichtlich fast ein
    // weiterer Grundfaktor: sichtbar stark, aber nicht ein sofortiger Autowin.
    start: 100,
    plus99: 99,
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
export function bahnKantenBeiY(width: number, height: number, y: number, kurvenExponent = BALANCE_V2.track.kurvenExponent) {
  const kanten = bahnKanten(width, height)
  const fortschritt = Math.min(1, Math.max(0, (y - kanten.horizonY) / (kanten.bottomY - kanten.horizonY)))
  const halbeBreite = width * BALANCE_V2.track.bottomWidthRatio / 2
    + (width * BALANCE_V2.track.topWidthRatio / 2 - width * BALANCE_V2.track.bottomWidthRatio / 2)
      * (1 - fortschritt) ** kurvenExponent
  return {
    leftX: width / 2 - halbeBreite,
    rightX: width / 2 + halbeBreite,
  }
}

/** Einziger Aufbaupfad fuer alle gekruemmten Brueckenflaechen und -kanten. */
export function bahnKantenPunkte(width: number, height: number, schritte: number) {
  const kanten = bahnKanten(width, height)
  const anzahl = Math.max(1, Math.floor(schritte))
  return Array.from({ length: anzahl + 1 }, (_, index) => {
    const y = kanten.horizonY + (kanten.bottomY - kanten.horizonY) * index / anzahl
    const { leftX, rightX } = bahnKantenBeiY(width, height, y)
    return { leftX, rightX, y }
  })
}
