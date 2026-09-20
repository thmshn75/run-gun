/**
 * Ausschliesslich fuer Run Gun V2. Diese Zahlen werden absichtlich kopiert statt aus
 * dem bestehenden Spiel importiert: V2 bleibt ein vollstaendig getrennter Probelauf.
 */
export const BALANCE_V2 = {
  track: {
    // 150 px: aus der bestehenden Bahn abgelesene Horizonthoehe bei 844 px Spielhoehe.
    horizonY: 150,
    // 0,62 * 390 px: die Bruecke ist am Horizont sichtbar schmaler.
    topWidthRatio: 0.62,
    // 0,82 * 390 px: links und rechts bleiben bei 390 px je 35,1 px Wasser.
    // Das verhindert, dass die Ufer an der Unterkante zu einem Strich zusammenlaufen.
    bottomWidthRatio: 0.82,
    // Bei f = 0,5 kommen erst 0,5^1,8 = 28,7 % des Breitenueberschusses dazu:
    // die Verjuengung bleibt am Horizont deutlich sichtbar.
    kurvenExponent: 1.8,
    // Ein Objekt am Horizont ist im Referenzvideo knapp halb so gross wie vorn.
    skalaHorizont: 0.45,
    // 26 px im Vordergrund: sichtbare Mauerhoehe statt eines blossen Strichs.
    mauerHoehePx: 26,
    // 4 px: sichtbare Brueckenkante.
    wallWidthPx: 4,
    // 18 px vorn, skaliert mit der Tiefe: ein klares Geländer statt nur einer Kante.
    gelaenderHoehePx: 18,
    // 54 px vorn: gleichmässige Pfosten ohne die gekrümmte Brückenkante zu überladen.
    gelaenderPfostenAbstandPx: 54,
    // 60 px und 1,2 rad/s: etwa elf ruhige, sichtbare Kämme über 694 px Wasserhöhe.
    wasserWellenAbstandPx: 60,
    wasserWellenTempoRadProSek: 1.2,
    horizonVerlaufHoehePx: 60,
    horizonVerlaufBaender: 24,
    // 46 px vorn: Schilder und Mauern erhalten je einen eigenen Gehsteig.
    gehsteigBreitePx: 46,
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
    // Das Tor beginnt bei x1 - es vermehrt zunaechst gar nichts. Jede abgebaute
    // +99-Wand hebt den Faktor um 0,5. Damit ist die rechte Reihe kein zweiter
    // Mengenlieferant, sondern eine dauerhafte Verbesserung des Durchsatzes:
    // Nach zwei Waenden steht x2, nach vier x3.
    startFaktor: 1,
    zuwachsJeWand: 0.5,
    // 620 px: deutlich vor der bei 752 px stehenden Starttruppe, damit der Strom
    // eine sichtbare Strecke bis zum Tor laeuft und das Tor nicht am Haufen klebt.
    y: 620,
    hoehePx: 44,
  },
  raender: {
    // Die Schilder folgen der Bahn konstant von oben nach unten. 48 px Abstand bei
    // 56 px Hoehe ueberlappt leicht und laesst auch zwischen zwei Umlaeufen keine Luecke.
    schildHoehePx: 56,
    schildBreitePx: 38,
    abstandPx: 48,
    // In der Mitte 120 px/s, ganz links +100 px/s: 220 px/s ist deutlich schneller,
    // ohne dass die Reihe bei 60 fps mehr als rund 4 px pro Bild springt.
    grundTempoPxProSek: 120,
    // Ganz links 120 + 280 = 400 px/s, also mehr als das Dreifache des Grundtempos.
    // Bei 48 px Schildabstand faehrt man dort rund 8 Schilder je Sekunde ein statt
    // 2,5 in der Mitte - das Hineinfahren in die Randspur lohnt sich deutlich.
    zuschlagGanzLinksPxProSek: 280,
    // 35 px/s. Der Wert folgt aus der noetigen Kontaktzeit, nicht aus dem Gefuehl:
    // Eine Wand ist 2 * 34 = 68 px lang in Reichweite, bei 35 px/s also 1,94 s.
    // Mit 0,9 Punkten je Truppenfigur und Sekunde schafft eine volle Truppe (60)
    // in dieser Zeit 105 Punkte und bricht die 99er-Wand knapp; eine Truppe von
    // 40 kommt auf 70 und schafft sie nicht. Genau diese Schwelle ist gewollt:
    // Erst links Menge sammeln, dann rechts das Tor verbessern.
    rechtesGrundTempoPxProSek: 35,
    // Der Mittelpunkt bleibt in der Mitte des Gehsteigs, nicht auf der Fahrbahn.
    randEinzugPx: 0,
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
    // 0,3 Begegnungen je vorhandener Einheit und Sekunde. Dieser Wert bestimmt
    // NICHT, wie schnell der Gegner faellt: im Gleichgewicht entspricht der Abbau
    // immer genau dem Zustrom (eigene Einheiten sterben so schnell, wie sie
    // nachkommen). Er bestimmt nur, wie traege An- und Auslauf sind und wie gross
    // die sichtbare eigene Flaeche wird - Gleichgewicht ist Zustrom / 0,3, bei
    // vollem Strom also rund 53 Einheiten. Mit 0,12 lief das Spielende zu zaeh
    // aus: die letzten Gegner brauchten laenger, als der Boss Zeit laesst.
    // Nur links erhoeht die Ankunftsrate, nur rechts macht jeden Austausch beim
    // Gegner wirksamer. Beide Seiten wachsen im Kampf nie.
    austauschProSek: 0.3,
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
    // Zwei Drittel von 0,075; die dichter gesetzten Bilder halten den Teppich geschlossen.
    helmTextureScale: 0.05,
    heavyTextureScale: 0.20,
    // Untere Sichtgrenze der eigenen Flaeche: Die Starttruppe bleibt frei sichtbar.
    eigeneFlaecheMaxUntenY: 560,
  },
  ende: {
    // Der Boss hat den im ersten Video sichtbaren eigenen Vorrat 4.000. Nach der
    // roten Flaeche wird er mit derselben eigenen Druckrate abgebaut.
    bossStartVorrat: 4000,
    // Am Horizont kommt die Tiefenskala 0,45 hinzu: 1,10 * 0,45 = 0,495.
    // Bei 256 px Bildbreite sind das rund 128 px, etwa ein Drittel der Bahn.
    // Am Ende ergibt 1,80 mit der dortigen Tiefenskala ungefaehr 1,2: der Boss
    // fuellt die Bahn sichtbar, ohne die Tiefenskala selbst zu veraendern.
    bossStartScale: 1.10,
    bossEndScale: 1.80,
    // Der Boss folgt der schrumpfenden roten Masse sichtbar nach unten.
    bossMaxAbstiegPx: 92,
    // 92 / 6 = 15,3 s bis zur Front: der Boss erzeugt auch ohne Eingabe Zeitdruck.
    // 1,1 px/s: Der Boss braucht damit rund 84 s fuer seine 92 px. Rechenweg:
    // Der Mengenweg schafft mit vollem Zustrom (8 Figuren/s mal Tor 2 = 16/s)
    // rund 16 Gegner je Sekunde, braucht wegen der Anlaufphase aber laenger als
    // die reinen 858/16 = 54 s - bei 61 s blieben noch 49 Gegner stehen. Passiv
    // bleibt der Zustrom bei 1,6 mal 2 = 3,2/s und damit weit unter 858:
    // ohne Eingabe ist die Niederlage sicher.
    bossTempoPxProSek: 1.1,
    // Die Ergebnisanzeige bleibt kurz lesbar, bevor der reine Probelauf ins Menue geht.
    rueckkehrMs: 1800,
  },
  colors: {
    // Eigene V2-Farben; keine Farbkonfiguration des bestehenden Spiels wird gelesen.
    sky: 0x80c8ee,
    road: 0x6e747a,
    wall: 0x697682,
    wallEdge: 0xb8c4cb,
    water: 0x246981,
    waterWave: 0x74bdd4,
    menuButton: 0x263d55,
    menuButtonEdge: 0xe8f4ff,
    menuText: '#f4fbff',
    // Die RGB-Werte sind bewusst pruefbar und klar voneinander getrennt.
    eigeneSeite: 0x3d9dff,
    gegnerSeite: 0xef4e58,
  },
  // Alle V2-Zeichenebenen, von hinten nach vorn. Szenencode kennt keine Zahlen.
  ebenen: {
    wasser: 0,
    // Eigene Ebene: Lagen die Wellen auf derselben Ebene wie die Wasserflaeche,
    // deckte die spaeter eingefuegte Flaeche sie vollstaendig zu.
    wasserWelle: 5,
    strasse: 10,
    gehsteig: 20,
    mauer: 30,
    gelaender: 40,
    massen: 50,
    truppe: 60,
    schilder: 70,
    zaehler: 80,
    boss: 90,
    bossZaehler: 100,
    ergebnis: 110,
  },
  wand: {
    // Eine +99-Wand hat 99 Punkte. Die Truppe zaehlt sie herunter; jede Figur
    // schafft 0,9 Punkte je Sekunde. Rechenweg: Mit der Starttruppe von 10 sind
    // das 9 Punkte/s, also 11 s fuer eine Wand - viel zu lang im Zeitfenster bis
    // zum Boss. Mit 60 Figuren sind es 54 Punkte/s und damit knapp 2 s. Wer
    // rechts etwas holen will, muss also zuerst links Menge gesammelt haben.
    startRest: 99,
    abbauJeTruppenfigurProSek: 0.9,
    mindestAbbauProSek: 2,
    // Gutschrift ist genau die Zahl auf der Wand: Man bekommt, was draufsteht.
    gutschrift: 99,
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
  const halbeBreite = width * BALANCE_V2.track.topWidthRatio / 2
    + (width * BALANCE_V2.track.bottomWidthRatio / 2 - width * BALANCE_V2.track.topWidthRatio / 2)
      * fortschritt ** kurvenExponent
  return {
    leftX: width / 2 - halbeBreite,
    rightX: width / 2 + halbeBreite,
  }
}

/** Die Fahrbahn liegt zwischen den Gehsteigen; Massen und Truppe bleiben darauf. */
export function fahrbahnKantenBeiY(width: number, height: number, y: number) {
  const aussen = bahnKantenBeiY(width, height, y)
  const einzug = BALANCE_V2.track.gehsteigBreitePx * tiefenSkala(height, y)
  return { leftX: aussen.leftX + einzug, rightX: aussen.rightX - einzug }
}

/** Schilder sitzen mittig auf dem Gehsteig zwischen Mauer und Fahrbahn. */
export function gehsteigMitteBeiY(seite: 'links' | 'rechts', width: number, height: number, y: number): number {
  const aussen = bahnKantenBeiY(width, height, y)
  const fahrbahn = fahrbahnKantenBeiY(width, height, y)
  return seite === 'links' ? (aussen.leftX + fahrbahn.leftX) / 2 : (aussen.rightX + fahrbahn.rightX) / 2
}

/** Eine Darstellungsquelle fuer die ganze Bahn: Horizont klein, Vordergrund echt. */
export function tiefenSkala(height: number, y: number): number {
  const fortschritt = Math.min(1, Math.max(0, (y - BALANCE_V2.track.horizonY) / (height - BALANCE_V2.track.horizonY)))
  return BALANCE_V2.track.skalaHorizont + (1 - BALANCE_V2.track.skalaHorizont) * fortschritt
}

/** Reine, periodische Wellenbewegung: gleiches t bedeutet immer dieselbe Hoehe. */
export function wasserWellenOffset(zeitSekunden: number, index: number): number {
  return Math.sin(zeitSekunden * BALANCE_V2.track.wasserWellenTempoRadProSek + index * 1.71)
}

/** Horizontfarben schliessen exakt an Himmel und Wasser an; dazwischen fein interpoliert. */
export function horizontFarbe(index: number, anzahl = BALANCE_V2.track.horizonVerlaufBaender): number {
  const schritte = Math.max(1, anzahl - 1)
  const fortschritt = Math.min(1, Math.max(0, index / schritte))
  const von = BALANCE_V2.colors.sky
  const nach = BALANCE_V2.colors.water
  const kanal = (verschiebung: number) => Math.round(((von >> verschiebung) & 0xff) + (((nach >> verschiebung) & 0xff) - ((von >> verschiebung) & 0xff)) * fortschritt)
  return (kanal(16) << 16) | (kanal(8) << 8) | kanal(0)
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
