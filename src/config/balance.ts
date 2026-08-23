export type SquadKind = 'wedge' | 'row' | 'cluster'

export type LevelSquadAllowance = {
  readonly kind: SquadKind
  readonly weight: number
  readonly size: number
}

export type LevelDefinition = {
  readonly normalPhaseSec: number
  readonly enemyWeights: readonly [number, number, number]
  readonly spawnIntervalMs: number
  readonly spawnIntervalMinMs: number
  readonly squadChance: number
  readonly squads: readonly LevelSquadAllowance[]
  readonly companionLimit: number
}

export const BALANCE = {
  debug: false,
  maxDeltaMs: 100,
  levelSpeed: {
    // Steigerung je Level (Thomas 2026-08-22: "jedes Level ein wenig schneller").
    // Hergeleitet aus zwei bekannten Punkten: 135 px/s ist das Tempo, das Thomas am
    // selben Tag als richtig abgenommen hat (Level 1); 180 px/s war der Wert, den er
    // als "zu schnell" gemeldet hat. Level 12 soll spuerbar schneller sein, aber unter
    // dieser Schmerzgrenze bleiben - Zielwert 175 px/s.
    // 135 x f^11 = 175 -> f = (175/135)^(1/11) = 1,0238.
    perLevelFactor: 1.0238,
    // Harter Deckel, falls die Leveltabelle spaeter ueber 12 hinauswaechst: nie zurueck
    // zu dem Tempo, das schon einmal als zu schnell gemeldet wurde.
    maxPxPerSec: 175,
  },
  // 180 -> 135 (-25 %, Thomas 2026-08-22: "die Waende sind zu schnell - mach die
  // langsamer", Wahl "einfach alles langsamer").
  //
  // BEHOBEN am 2026-08-22: Waende fuhren mit konstanter BILDSCHIRM-Geschwindigkeit,
  // waehrend Strasse und Haeuser perspektivisch liefen - am Horizont war die Wand 5,1x
  // schneller als die Kulisse daneben. Jetzt zaehlt scrollSpeed WELT-Pixel (gemessen auf
  // Kampfhoehe), und blockers.ts bildet sie ueber advanceAlongRoad auf den Bildschirm
  // ab. Der Spawn-Takt der Kette haengt an derselben Weltstrecke, die Sammelrate von
  // 1,875 Plaettchen je Sekunde bleibt also unveraendert; nur die Fahrt vom Horizont bis
  // unten dauert jetzt 6,4 statt 5,1 s, weil die Wand oben langsamer kriecht.
  // Muenzen (coins.ts) fahren weiterhin in Bildschirmpixeln - sie fliegen ohnehin nach
  // wenigen Zehntelsekunden zur Truppe, dort faellt der Unterschied nicht auf.
  // Gegner haengen NICHT an dieser Zahl (eigenes runStats.speed) — das Kampftempo
  // bleibt also unveraendert, nur die Welt wird langsamer.
  scrollSpeed: 135,
  road: {
    horizonY: 150,
    entryFadePx: 40,
    // 0.46 -> 0.52 (Thomas 2026-08-22: "Strasse breiter machen wenn noetig") — mehr
    // Fahr- und Sichtraum oben, die Haeuser bleiben knapp innerhalb des Bildes.
    topWidthRatio: 0.52,
    bottomWidthRatio: 1,
    edgeLineWidth: 2,
    // Wie stark Figuren mit der Entfernung schrumpfen (Thomas 2026-08-22, nach dem
    // iPhone-Test: "die mobs sind jetzt voll klein und wachsen bis zu mir zur vollen
    // Groesse - sollte schon frueher passieren").
    //
    // Bis hierher war die Groesse strikt an die Strassenbreite gekoppelt: am Horizont
    // 0,57, auf Kampfhoehe 1,00, dazwischen linear. Perspektivisch korrekt, im Spiel
    // aber falsch - ueber die halbe Anflugstrecke blieben Gegner Punkte, und erst im
    // letzten Drittel war zu erkennen, was da kommt.
    //
    // Zwei Regler statt der starren Kopplung:
    //   horizonScale   Groesse am Horizont. 0,57 -> 0,72 -> 0,80 -> 0,84 (Thomas hat
    //                  die Groesse dreimal bemaengelt; beim dritten Mal kam der
    //                  eigentliche Hebel dazu, enemy.figureScale).
    //                  Der Preis ist bekannt und bewusst bezahlt: Die FORMATION
    //                  schrumpft weiter mit der Strasse (Faktor 0,57), die FIGUREN nur
    //                  auf 0,80 - zwei schwere Gegner (40 px Koerper, 44 px Abstand)
    //                  ueberlappen am Horizont um rund 7 px. In einer Horde ist das
    //                  kein Fehler, sondern das Zielbild (siehe spawnLanes.canMeet:
    //                  "dichte Massen sind genau das Zielbild"); leichte Gegner (18 px)
    //                  behalten ohnehin Luft. Ueber 0,85 wuerde daraus Matsch.
    //   growthExponent Kruemmung dazwischen. Unter 1 zieht das Wachstum nach VORNE
    //                  ("muessen schneller wachsen"): bei 0,35 sind auf einem Viertel
    //                  der Anflugstrecke schon 93 % der vollen Groesse erreicht, auf
    //                  der Haelfte 97 % (0,45 gab 89 % / 95 %, die starre
    //                  Strassenkopplung 68 % / 79 %).
    // Auf Kampfhoehe bleibt der Faktor exakt 1 - dort treffen Gegner und Truppe
    // aufeinander, und die ganze Hordengeometrie rechnet in diesem Bezugssystem.
    perspective: {
      horizonScale: 0.84,
      growthExponent: 0.35,
      // Stuetzstellen fuer getFigureOverscanFactor. 512 ueber 564 px sind gut 1 px
      // Raster - fein genug, dass die Spitze der Kurve nicht zwischen zwei Punkte
      // faellt, und einmalig je Bildschirmgroesse berechnet.
      overscanSamples: 512,
    },
    centerLine: {
      segments: 12,
      textureSizePx: 1,
      widthOfHalfRoadRatio: 0.035,
      lengthOfHalfRoadRatio: 0.22,
    },
  },
  player: {
    iframesMs: 1200,
    blinkIntervalMs: 100,
    dragClampMargin: 8,
    // Bewegungsrand als Vielfaches der halben Figurenbreite — bewusst NICHT an die
    // Kollisionshuelle gekoppelt (siehe Befund B1).
    dragClampFigures: 0.5,
    // Rueckt ein Wandabschnitt auf Truppenhoehe, wird die Truppe mit dieser
    // Geschwindigkeit sanft in den Korridor geschoben statt hart versetzt.
    wallNudgeSpeedPxPerSec: 500,
    anchorBottomOffset: 130,
  },
  projectile: {
    // Spurtreue Flugbahn (Thomas 2026-08-22: "voll schwer ueberhaupt Waende
    // wegzubekommen"). Ursache war der starre Senkrechtschuss: die Strasse laeuft nach
    // oben spitz zu, also wandert ein Wandsegment nach aussen, waehrend es naeher kommt.
    // Gemessen bei 390 x 844: auf Truppenhoehe (y=714) beginnt die rechte Wand bei
    // x=312,1, der Fahrbereich endet neben einer Wand aber bei x=292,1 — Kugeln flogen
    // innen am Segment direkt neben der Truppe vorbei und trafen erst ueber y=489.
    // Jetzt behaelt jede Kugel ihren Anteil an der halben Strassenbreite (laneRatio)
    // ueber den ganzen Flug: was neben der Truppe steht, wird auch getroffen.
    // 1 = voll spurtreu, 0 = altes Verhalten (senkrecht). Tuning-Regler fuer den
    // iPhone-Test — Zwischenwerte mischen beide Bahnen linear.
    laneFollow: 1,
    // SCHUSSREICHWEITE (Thomas 2026-08-22: "Ja Schuss Weite begrenzen").
    //
    // Der Befund davor: Der Nachschub war auf das Vierfache gestiegen, die Strasse blieb
    // trotzdem leer. Grund ist nicht die Menge, sondern die Reichweite - die Truppe traf
    // bis an den Horizont und raeumte jeden Gegner ab, bevor er ueberhaupt sichtbar
    // gross wurde. Gemessen im schwaechsten Fall (Truppe 2, DMG 1, RATE 3): 6 Toetungen
    // je Sekunde gegen 4,4 Spawns. Mit Thomas' iPhone-Werten (DMG 18,5, RATE 8) ist der
    // Abstand um ein Vielfaches groesser.
    //
    // Jetzt endet jeder Schuss auf einer Linie, die JE WAFFE unterschiedlich weit oben
    // liegt (Thomas 2026-08-22, Nachtrag: "Schussreichweite an Waffen anpassen -
    // Vergleich zur Realitaet"). Der Wert steht bei jeder Waffe als `engageShare`:
    // Anteil der ANFLUGSTRECKE (Kampfhoehe bis Horizont, 564 px bei 390 x 844), nicht
    // eine geratene Pixelzahl - so sitzt die Linie auf jedem Geraet an derselben Stelle
    // des Spielfelds. Die Wandsegmente trifft man entsprechend spaeter; unkritisch, weil
    // eine Wand nach blockers.maxFocusSec ohnehin in hoechstens 0,6 s faellt.
    //
    // IN DER BOSSPHASE GILT KEINE REICHWEITE - weder Linie noch Waffenwert. Der Boss
    // steht auf battleY 300, also 414 px vor der Truppe, und rueckt von dort in 40 s
    // vor. Mit realistischen Kurzreichweiten (Flamme 158 px) waere er den halben Kampf
    // lang unangreifbar. Die Alternative waere gewesen, battleY an die kuerzeste Waffe
    // zu koppeln (545 statt 300) und advanceSpeed nachzurechnen - das haette den Boss
    // dauerhaft nah und gross ins Bild geholt und seine ganze Kampfdramaturgie
    // umgebaut, fuer einen Realismus, den in einem Duell niemand vermisst.
    // Die letzten Pixel vor der Linie blendet die Kugel aus, statt im Nichts zu
    // verschwinden - sonst liest sich die Grenze wie ein Darstellungsfehler.
    engageFadePx: 40,
  },
  // Lebendigkeit (Thomas 2026-08-22: "immer noch nicht so wie im App Store, ich kann
  // dir aber auch nicht sagen woran es liegt"). Befund beim Nachsehen: Im ganzen Spiel
  // bewegte sich nichts ausser Positionen — kein Ton, keine Laufbewegung, kein Federn,
  // keine Kamerareaktion. Die Figuren GLITTEN ueber die Strasse. Ton bleibt bewusst
  // aussen vor (Thomas' Wahl: "Lebendigkeit zuerst, ohne Ton").
  gamefeel: {
    // Schrittlaenge als Anteil der Figurenhoehe — daraus leitet gamefeel.ts die
    // Schrittfrequenz aus scrollSpeed ab, statt eine Hz-Zahl zu raten. 0.45 x 46 px
    // Figur = 20,7 px Schritt; bei 135 px/s sind das 6,5 Schritte/s, also 3,3 Hz
    // Wippzyklus. Wird die Welt langsamer, laufen die Figuren automatisch gemaechlicher.
    strideOfHeight: 0.45,
    // Hubhoehe des Wippens. 3 px bei 46 px Figur = 6,5 % Koerperhoehe; darueber wirkt
    // es wie Huepfen statt Laufen.
    bobAmplitudePx: 3,
    // Gegner wippen flacher: Sie sind Kulisse fuer den Blick auf die eigene Truppe,
    // und bei bis zu 104 gleichzeitig wuerde voller Hub das Bild unruhig machen.
    enemyBobAmplitudePx: 2,
    // Neigung beim Lenken: voller Ausschlag ab dieser Drag-Geschwindigkeit.
    // Der Fahrbereich ist rund 300 px breit, ein zuegiger Wisch quert ihn in ~0,4 s
    // — das sind die 750 px/s, ab denen die Truppe maximal lehnt.
    leanFullSpeedPxPerSec: 750,
    leanMaxDeg: 9,
    // Ohne Glaettung zuckt die Neigung pro Bild. 90 ms Halbwertszeit ist traege genug
    // fuer ein ruhiges Bild und schnell genug, um dem Finger zu folgen.
    leanHalfLifeMs: 90,
    // Aufploppen beim Einsammeln.
    popMs: 180,
    popOvershoot: 0.45,
    // Hochfliegende Zahl beim Einsammeln.
    popupRiseSpeedPxPerSec: 90,
    popupMs: 620,
    // Pool: Bei Muenz-Segmenten (bis 1,1/s je Seite) plus Gegner-Muenzen und Goodies
    // liegen selten mehr als 6 Zahlen gleichzeitig in der Luft; 16 traegt einen
    // Ausreisser-Burst mit Reserve.
    popupPool: 16,
    // Kamerawackeln nur bei wirklich Grossem: Splash-Explosion und eigener Schaden.
    // Haeufigeres Zucken macht ein Hochformat-Spiel unruhig statt wuchtig.
    shakeSplashMs: 90,
    shakeSplashIntensity: 0.004,
    shakeDamageMs: 160,
    shakeDamageIntensity: 0.008,
  },
  shadow: {
    // Bodenschatten. Vor dieser Aenderung warf im ganzen Spiel nichts einen Schatten -
    // Truppe, Gegner und Boss schwebten ueber der Strasse. Das ist der groesste
    // Einzelunterschied zu den 3D-Vorbildern und kostet nur eine Ellipse je Figur.
    //
    // Breite: knapp schmaler als die Figur, sonst wirkt sie wie auf einem Teller.
    widthOfFigure: 0.82,
    // Flache Ellipse: Die Kamera schaut schraeg von oben-hinten auf die Strasse, ein
    // runder Bodenfleck erscheint dabei stark gestaucht. 0.3 entspricht etwa dem
    // Winkel, in dem auch die Strasse perspektivisch zusammenlaeuft.
    heightOfWidth: 0.3,
    // Weicher, nicht schwarzer Fleck: Die Strasse ist bereits dunkel, ein harter
    // Schatten wuerde als Loch gelesen.
    alpha: 0.42,
    // Der Schatten sitzt an den Fuessen, nicht in der Figurenmitte.
    footOffsetOfHeight: 0.44,
    // Beim Laufwippen hebt sich die Figur um bis zu bobAmplitudePx. Der Schatten
    // bleibt am Boden und wird kleiner und schwaecher - erst dadurch liest man die
    // Hebung ueberhaupt als Sprung statt als Zittern. Pro Pixel Hub 3 % kleiner.
    liftShrinkPerPx: 0.03,
    // Ringe der Schattentextur. Ein echter Verlauf ist hier NICHT moeglich:
    // fillGradientStyle wirkt nur im WebGL-Pfad und wird von generateTexture
    // stillschweigend auf die erste Farbe reduziert (Lesson 2026-08-20). Gestaffelte
    // Ellipsen mit fallender Deckkraft erzeugen denselben weichen Rand zuverlaessig.
    textureRings: 6,
    textureWidthPx: 64,
  },
  audio: {
    // Bis 2026-08-22 gab es im Projekt KEIN Audio (kein AudioContext, keine Datei).
    // Der Ton wird synthetisch per Web Audio erzeugt: keine Audiodateien, nichts
    // nachzuladen, offline identisch, keine Kosten. Der AudioContext kommt von Phasers
    // Sound-Manager - der bringt die auf iOS zwingende Freischaltung per Nutzergeste
    // schon mit; ein eigener zweiter Context muesste sie nachbauen.
    // ACHTUNG iPhone: Steht der seitliche Stummschalter auf lautlos, spielt iOS auch
    // Web Audio nicht ab. Das ist Systemverhalten, kein Fehler des Spiels.
    masterVolume: 0.6,
    // Stimmen-Deckel fuer die haeufigen Toene (Schuss, Sterben). Eine Splash-Explosion
    // kann acht Gegner im selben Bild toeten; ohne Deckel wird daraus ein Knall statt
    // acht Quittungen. 6 gleichzeitige Stimmen a 0,22 liegen summiert noch unter dem
    // Master-Pegel, verzerren also nicht. Seltene, wichtige Toene (Wandbruch, Schaden,
    // Aufsammeln, Waffenwechsel) unterliegen dem Deckel bewusst NICHT - sie duerfen
    // nie im Schussgeraeusch untergehen.
    maxCasualVoices: 6,
    events: {
      // Ein Ton je Salve, nicht je Kugel: Die Schrotflinte feuert 7 Kugeln gleichzeitig.
      // Drossel 125 ms = 1000 / shotsPerSec.cap (8/s): So hoert man die volle
      // Ausbau-Spanne 3/s -> 8/s, die sich der Spieler erarbeiten kann. Minigun
      // (17,6 Salven/s) und Flammenwerfer (14,4/s) laufen in den Deckel - dort ist ein
      // Einzelschuss ohnehin nicht mehr trennbar, das Ohr hoert ab ~10/s einen Teppich.
      // Leisester Ton im Spiel, weil mit Abstand der haeufigste.
      shot: { volume: 0.16, durationMs: 60, minGapMs: 125, casual: true },
      // 70 ms Abstand macht aus acht gleichzeitigen Toten eine hoerbare Kette.
      enemyDown: { volume: 0.22, durationMs: 130, minGapMs: 70, casual: true },
      // Wandbruch ist das Ereignis, auf das der Spieler hinarbeitet (0,12-0,50 s Fokus
      // je nach Level) - entsprechend laut und mit Wucht unterlegt.
      wallBreak: { volume: 0.45, durationMs: 220, minGapMs: 40, casual: false },
      // Verstaerkung: Die Wandbelohnung kann die Truppe auch VERKLEINERN (Operator - / :),
      // deshalb zwei Richtungen. Gleiche Lautstaerke, gegenlaeufige Tonfolge.
      crowdUp: { volume: 0.4, durationMs: 220, minGapMs: 0, casual: false },
      crowdDown: { volume: 0.4, durationMs: 220, minGapMs: 0, casual: false },
      weaponSwap: { volume: 0.45, durationMs: 260, minGapMs: 0, casual: false },
      // Eigener Schaden ist der lauteste Ton - er begleitet das Kamerawackeln.
      // 120 ms Drossel als Sicherung, falls mehrere Gegner im selben Bild treffen
      // (die Unverwundbarkeit nach einem Treffer liegt mit 700 ms darueber).
      playerHit: { volume: 0.55, durationMs: 260, minGapMs: 120, casual: false },
    },
  },
  layers: {
    background: -1,
    scenery: -0.5,
    road: 0,
    // Bodenschatten liegen auf der Strasse, aber unter allem, was auf ihr steht.
    shadow: 0.5,
    // Wand-Inhalt (Waffe, Muenze, "+1") liegt VOR der Wand. Bis 2026-08-22 lag er
    // dahinter und schien durch die halbtransparente Wand - seit die Waende deckend
    // sind (Thomas: "beide Waende in deckend blau"), waere er unsichtbar.
    gameplay: 2,
    wallContent: 2.5,
  },
  walls: {
    // Breitenbudget (W2): laneShare reserviert die Wandzone AUF der Strasse (bestimmt
    // Korridor, Tore, Spawns), in Anteilen der halben Strassenbreite. 0.34 verlangt
    // Zweispur-Tore (drei Spuren hielten die 90 px nur bis 0.2667) — die Waffen kommen
    // seit W2 aus den Waenden, deshalb sind Tore dauerhaft zweispurig (W4-Zielbild
    // "Mitte rechnet, Seiten bewaffnen"; Thomas 2026-08-22: Waende nach innen breiter).
    laneShare: 0.34,
    // Die sichtbare Wand ist BREITER als die reservierte Zone: Innenkante bleibt am
    // Korridor, der Rest ragt nach aussen ueber die Strassenkante hinaus (Thomas-
    // Entscheidung 2026-08-22). Unten: 195 x 0.70 = 136,5 px Wandbreite.
    widthShare: 0.7,
    // Der Korridor muss Mindestbreite und maximale Hordenbreite tragen (Budget-Test).
    // hordeMaxWidthPx (seit W3 hergeleitet statt Platzhalter): 200 px unten = 78 % des
    // Korridors (257.4). Auf Spawnhoehe sind das 92 px — dort passen zwei schwere
    // Gegner (2 x 40 px) mit Abstand nebeneinander, und ein 8er-Keil aus leichten
    // staucht auf Spacing 37 statt 44. Eine Horde DARF den Weg versperren (schon die
    // E7-Reihe tat das): Ausweichen heisst dann freischiessen oder Wandzone riskieren.
    // Die Dichteregel in computeHordeOffsets erzwingt den Deckel (unten gemessen).
    minCorridorPx: 240,
    // 200 -> 220 (Thomas 2026-08-22: "Mobs wachsen lassen, damit mehr als Wand kommen").
    // Seit Gegner perspektivisch schrumpfen, wird dieses Budget auf KAMPFHOEHE gemessen
    // statt am Horizont - dort haben Figuren volle Groesse und treffen auf die Truppe.
    // Der Korridor ist auf Kampfhoehe 234,3 px breit. 220 traegt fuenf schwere Gegner
    // nebeneinander (4 x 44 Abstand + 40 Koerper = 216 px), vorher waren es zwei.
    // BEWUSSTE KONSEQUENZ: Bei 216 von 234 px bleiben keine 20 px - die groesste Horde
    // IST eine Wand. Ausweichen heisst dann freischiessen oder in die Wandzone fahren
    // (driveIntoWallFigures). Kleinere Horden der Leveltabelle bleiben schmal, es ist
    // also nicht jede Welle eine Sperre.
    hordeMaxWidthPx: 220,
    // Seit W4 sind die Waende DAUERWAENDE (Genre-Verifikation 2026-08-22), seit der
    // Gamefeel-Korrektur als ABSCHNITTE: wallRunLength Kacheln, dann wallGapSlots
    // leere Slots ("regelmaessige Abstaende", Thomas) — rechts um wallRightOffsetSlots
    // versetzt, damit nie beide Seiten gleichzeitig dicht sind. Kacheln quer
    // (unten 136 x 72), groesser als zuvor gegen das "kommt zu schnell"-Gefuehl.
    segmentHeightPx: 72,
    // Gilt nur noch RECHTS. Links laeuft die Sammelbahn seit 2026-08-22 durchgehend
    // ohne Pausen (Thomas: "die linken Waende durchgehend ohne Pausen") - sie ist kein
    // Hindernis, also braucht es dort keine Ausweichluecke.
    wallRunLength: 3,
    wallGapSlots: 2,
    wallRightOffsetSlots: 2,
    // Waende sind halbtransparent, damit die dahinter sichtbare Belohnung (Waffe,
    // Verstaerkung oder Muenze) durchscheint. Der Inhalt sitzt in der Wandmitte, die
    // HP-Zahl darunter, damit beide gleichzeitig lesbar sind.
    // Deckend statt halbtransparent (Thomas 2026-08-22). Der Wandinhalt ist deshalb
    // vor die Wand gewandert, siehe layers.wallContent.
    fillAlpha: 1,
    // 3D-Optik der Wandkacheln (Thomas 2026-08-22: "die Waende - naja die muessen wir
    // noch anpassen, wirken wie Platzhalter - gehoeren auch wie 3d Optik"). Bis hierher
    // war eine Kachel ein flaches, halbtransparentes Rechteck mit Rahmen - im Bild ein
    // Aufkleber neben lauter plastischen Pixel-Sprites.
    //
    // Aus dem Rechteck wird ein QUADER, aus einer Lichtquelle von oben links:
    // Deckflaeche oben, Verlauf nach unten, Schattensockel, helle linke und dunkle
    // rechte Kante. Alles steckt in der Textur - zur Laufzeit wird nur skaliert, es
    // kostet also kein einziges zusaetzliches Zeichenobjekt.
    block: {
      // Anteil der Kachelhoehe, den die Deckflaeche einnimmt. Mehr als ein Fuenftel
      // laesst die Kachel von oben gesehen wirken statt von vorn.
      topFaceShare: 0.18,
      topFaceLighten: 0.42,
      // Sockel: schmaler und dunkler als die Deckflaeche hell ist - Schatten fallen
      // kuerzer aus als Glanz, sonst wirkt der Block unten abgeschnitten.
      baseShare: 0.09,
      baseDarken: 0.38,
      // Verlauf der Frontflaeche vom Deckel bis zum Sockel.
      bodyDarkenAtBottom: 0.26,
      // Kantenbreite in Texturpixeln. Die Textur ist 128 px breit und wird auf die
      // perspektivische Wandbreite gestaucht - 3 px bleiben dabei sichtbar, 1 px nicht.
      sideEdgePx: 3,
      edgeLighten: 0.28,
      sideDarken: 0.22,
      cornerRadius: 10,
    },
    labelOffsetPx: 18,
    // Belohnung beim Wegschiessen eines Muenz-Segments (coinValue wie schwerer Gegner).
    coinReward: 3,
    // LINKS: Sammelbahn. Jede Kachel ist ein Plaettchen mit diesem Zuwachs, das man
    // durch Beruehrung einloest (Thomas 2026-08-22, nach dem Referenzvorbild).
    // Kadenz gerechnet: 135 px/s / 72 px Kachel = 1,875 Plaettchen/s, seit die Bahn
    // DURCHGEHEND laeuft (vorher 3 von 5 Slots = 1,125/s). Wer die ganze Zeit links
    // faehrt, gewinnt damit 112 Figuren je Minute statt 67 - und holt in derselben
    // Zeit rechts keine Waffe und schiesst kaum Gegner. Genau diese Abwaegung ist der
    // Zweck; ist der Gewinn zu gross, gehoert die Bremse an die Kette (Pausen wieder
    // einfuehren), nicht an den Wert des einzelnen Plaettchens.
    // Der Wert bleibt bei 1: Die KETTE ist der Reiz (viele kleine Quittungen), nicht
    // die Hoehe des einzelnen Treffers. Groessere Betraege waeren dieselbe Zahl mit
    // weniger Rueckmeldung.
    pickupTeamGain: 1,
    // RECHTS: Feuerkraft (Thomas 2026-08-22, als Gegenstueck zur Masse links). JEDES
    // Segment traegt einen Gewinn - Waffe, Schaden oder Feuerrate - statt wie vorher
    // meistens nur Muenzen. Muenzen fallen jetzt bei JEDEM zerschossenen Segment ab,
    // sie sind Nebeneffekt statt Inhalt.
    //
    // Waffen bleiben selten (grosser Sprung): Chance je Segment mit Garantie nach
    // Nieten. Der Wert ist mit scrollSpeed 180 -> 135 um Faktor 1,333 angehoben worden
    // (0,08 -> 0,107, maxDry 16 -> 12), damit die Kadenz PRO SEKUNDE bleibt: Waffe
    // ~alle 8,3 s im Erwartungswert, Garantie nach spaetestens 12 Nieten (~10,7 s).
    weaponChance: 0.107,
    goodieMaxDry: 12,
    // Hoehe der Zugewinne, hergeleitet aus dem Gegenstueck links: Ein "+1"-Plaettchen
    // ist 1 von 30 sichtbaren Figuren, also 3,3 % der Spanne. Dieselben 3,3 % auf die
    // Spannen von Schaden (1 bis 20, also 19) und Feuerrate (3 bis 8, also 5) ergeben
    // 0,63 und 0,17 - gerundet auf gut merkbare Schritte.
    // Der Ausgleich zur muehelosen Sammelbahn steckt nicht im Wert, sondern im Preis:
    // Rechts kostet jedes Segment Feuerzeit, in der keine Gegner getroffen werden.
    damageGain: 0.5,
    rateGain: 0.2,
    // ROTE SEGMENTE (Thomas 2026-08-22, Entscheidung "rote Segmente in beiden Bahnen").
    // Bis hierher kannte das Spiel nur Zuwachs: Schaden und Feuerrate stiegen bis zum
    // Deckel und blieben dort. Ohne Abwaertsbewegung ist Dranbleiben immer richtig, und
    // genau das war der Befund ("ich kann meine leute einfach stehen lassen").
    //
    // Rot mischt sich in BEIDE Bahnen und dreht die Handlung um: Links muss man
    // ausweichen statt durchfahren, rechts das Feuer einstellen statt draufhalten.
    // Das ist die Entscheidung, die dem Spiel fehlte - nicht bloss ein Verlust.
    //
    // Anteil: Ziel ist jede vierte Kachel rot. Die Zahl hier ist ABSICHTLICH hoeher,
    // weil badMaxRun sie verduennt: Nach jeder roten folgt zwingend eine blaue, also
    // ist der tatsaechliche Anteil p / (1 + p), nicht p. Fuer 25 % im Spiel braucht es
    // deshalb 1/3 als Wuerfelwert (0,333 / 1,333 = 0,25). Im Spiel gemessen: 19,5 %
    // links bei 0,25 - genau die Falle, in die die erste Fassung dieser Zahl lief.
    // Ein rechter Abschnitt ist wallRunLength = 3 Kacheln lang und traegt damit mit
    // 1 - 0,75^3 = 58 % mindestens eine rote: mehr als jeder zweite Abschnitt verlangt
    // eine Entscheidung, ohne dass die Bahn unbenutzbar wird.
    badChance: 0.3333,
    // Level 1 bleibt frei von roten Kacheln: Dort lernt man, wofuer die beiden Bahnen da
    // sind, und startet mit crowd.start = 3 Figuren - eine rote Kachel (-5) waere dort
    // ein Spielende nach wenigen Sekunden, bevor die Regel ueberhaupt gelesen wurde.
    // Ab Level 2 hat eine normal gespielte Runde die Truppe laengst zweistellig.
    badMinLevel: 2,
    // Nie zwei rote hintereinander: Sonst steht links eine geschlossene Sperre, an der
    // nichts mehr zu sammeln ist, und rechts ein Abschnitt, den man komplett auslassen
    // muss. Eine rote ist ein Hindernis, zwei sind eine Mauer.
    badMaxRun: 1,
    // Betraege nach der Netto-Null-Regel: Auf vier Kacheln kommen im Erwartungswert drei
    // gute und eine rote (gute je rote = 1 / badChance, siehe Verduennung oben).
    //   Links  3 x (+1) = +3 gegen -5 -> blindes Durchfahren macht netto -2 je vier
    //          Kacheln, sauberes Ausweichen +3. Der Unterschied IST die Belohnung.
    //   Rechts 3 x (+0,5) = +1,5 Schaden gegen -1,5 und 3 x (+0,2) = +0,6 Feuerrate
    //          gegen -0,6 -> wer blind alles wegschiesst, kommt exakt nicht voran.
    // Boden ist der RUN-STARTWERT aus den gekauften Upgrades, nicht der globale floor:
    // Was Thomas fuer bis zu 4.300 Muenzen gekauft hat, darf eine rote Kachel nicht
    // wegfressen - verlieren kann man nur, was man in dieser Runde gefunden hat. Ohne
    // diesen Boden entstuende ausserdem eine Abwaertsspirale, aus der man sich nicht
    // mehr herausschiesst.
    drainTeam: 5,
    weakenDamage: 1.5,
    weakenRate: 0.6,
    // Wie tief die Truppe sich an eine Wand druecken darf, in Figurenbreiten ueber die
    // Wandinnenkante hinaus. 0.5 = die innerste Figur steht zur Haelfte in der Zone,
    // ihr Schussursprung damit sicher drin. Ohne diesen Ueberstand trifft die
    // Startformation gar nichts (beide Figuren stehen in der Mittelspur, halbe
    // Formationsbreite 0, Anker endet exakt auf der Kante — gemessen 0/2 Treffer).
    // Wandkontakt kostet weiterhin nichts; die Strassenkante bleibt harte Grenze.
    driveIntoWallFigures: 0.5,
  },
  scenery: {
    marginPx: 4,
    spreadPx: 6,
    // Fester Block-Takt: Der Nachfolger spawnt, waehrend die Oberkante des Vorgaengers
    // (Turm >= 120 px, braucht ~2 s bis unter den Horizont) noch weit darueber liegt —
    // die Fassade eines Blocks ist damit konstruktiv geschlossen (Test: gapFrames = 0
    // in der Simulation ohne Querstrassen). 400 -> 533 ms mit scrollSpeed 180 -> 135
    // (400 x 180/135): Der Takt ist zeitbasiert, ohne Anpassung ruecken die Haeuser bei
    // langsamerem Scroll enger zusammen. So bleibt die Haeuserdichte pro Strecke — und
    // damit Thomas' abgenommenes Stadtbild — unveraendert.
    spawnIntervalMs: 533,
    // Haeuser pro Block, beidseitig dieselbe Zahl. Lange Bloecke wie in New York
    // (Thomas-Korrektur 2026-08-22: "zu oft unterbrochen" bei 4-8).
    blockBuildingsMin: 10,
    blockBuildingsMax: 16,
    // Querstrassenbreite als Oberkanten-Abstand am Horizont; streckt sich nach unten
    // mit der Perspektive (Faktor bis ~2.17 = bottomWidthRatio/topWidthRatio).
    crossStreetGapPx: 70,
    // Wahrscheinlichkeit je Seite, dass in einer Querstrasse ein Gruenobjekt steht.
    greeneryChance: 0.6,
  },
  stats: {
    // Der Zaehler laeuft ueber die sichtbaren 30 Figuren hinaus weiter (Thomas
    // 2026-08-22): Was darueber liegt, ist RESERVE - sie steht nicht im Bild, rueckt
    // aber nach, wenn eine Figur faellt. Ohne das verpufft jedes +1 ab Truppe 30,
    // und genau dort steht der Spieler nach ein paar Sammelbahnen. Sichtbar bleiben
    // crowd.max Figuren, der Schadensbonus bleibt bei damageMultiplierCap gedeckelt -
    // die Reserve kauft also Ueberlebenszeit, keine Feuerkraft.
    // Deckel 999 -> 60 (Thomas 2026-08-22, nach dem Spieltest: "man erreicht schnell
    // das maximum ueberall und verliert nie etwas ... ab level 3 kann ich meine leute
    // einfach stehen lassen"). Die unbegrenzte Reserve war die Hauptursache: Wer die
    // linke Bahn eine Minute mitnimmt, sammelt 112 Figuren (1,875 Plaettchen/s), ein
    // Gegnertreffer kostet 1-2. Damit ist Beruehrung folgenlos und das Spiel laeuft
    // von selbst durch.
    // 60 = crowd.max 30 sichtbar + 30 Reserve. Herleitung der Reservehaelfte: Ein
    // schlechter Abschnitt kostet groessenordnungsmaessig eine halbe Sichtbarkeitsbreite
    // (rote Plaettchen a -5, dazu Gegnertreffer a 1-2) - 30 Reserve traegt also mehrere
    // Fehler hintereinander, aber keinen ganzen Level unaufmerksames Fahren.
    hp: { base: 2, cap: 60, floor: 0 },
    damage: { base: 1, cap: 20, floor: 1 },
    shotsPerSec: { base: 3, cap: 8, floor: 1 },
    // Gegnertempo. Seit 2026-08-22 KEIN Ausbau mehr, sondern reine Levelgroesse
    // (Thomas: "tempo einfach mit den leveln beschleunigen, kein seltenes tor daraus
    // machen und dann aus dem HUD raus nehmen"). Der Spieler kann es nicht beeinflussen,
    // also gehoert es weder in ein Tor noch in die Anzeige.
    // Hergeleitet ueber die vorhandene Haertekurve des Projekts (level.hardness):
    // 105 x hardness, also 105 bei Level 1 und 105 x 1,495 = 157 bei Level 12, gedeckelt
    // bei hardness.max 1,6 = 168. Die Reaktionszeit vom Horizont bis zur Truppe
    // (564 px) sinkt damit von 5,4 s auf 3,6 s - spuerbar enger, aber weit davon
    // entfernt, eine Horde unbeschiessbar zu machen.
    speed: { base: 105, cap: 305, floor: 70 },
  },
  upgradesShop: {
    team: { label: 'TRUPPE', base: 2, max: 7, effectPerLevel: 1 },
    damage: { label: 'SCHADEN', base: 1, max: 3.5, effectPerLevel: 0.5 },
    rate: { label: 'FEUERRATE', base: 3, max: 4.5, effectPerLevel: 0.3 },
    // Conservative level-table income per run: level 3 ~260, level 5 ~505, level 8 ~1,070,
    // level 12 ~2,180 coins. A full three-row build costs 24,150 coins, or about 23 good
    // level-8 runs. These values follow the level table; adjust them whenever that table changes.
    prices: [200, 450, 1000, 2100, 4300],
  },
  menu: {
    overlayAlpha: 0.20,
    sidePadding: 18,
    topPadding: 18,
    titleY: 48,
    balanceY: 100,
    rowHeight: 76,
    rowGap: 10,
    scoresShown: 5,
  },
  weapon: {
    normal: {
      minLevel: 1,
      rateFactor: 1,
      damageFactor: 1,
      shootersPerSalvo: 8,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 640,
      // Sturmgewehr: die Bezugsgroesse, an der die anderen gemessen sind. Real einige
      // hundert Meter, im Spiel die halbe Anflugstrecke - Kampf beginnt knapp ueber der
      // Bildmitte.
      engageShare: 0.55,
      pierces: false,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    shotgun: {
      minLevel: 1,
      rateFactor: 0.4,
      damageFactor: 1.5,
      shootersPerSalvo: 8,
      bulletsPerShot: 7,
      fanAngleDeg: 34,
      projectileSpeed: 640,
      // Schrot: real wenige Dutzend Meter, danach streut die Ladung wirkungslos.
      // Zweitkuerzeste Waffe im Spiel, dafuer der hoechste Schaden je Schuss.
      engageShare: 0.38,
      pierces: false,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    laser: {
      minLevel: 1,
      rateFactor: 1.4,
      damageFactor: 0.4,
      shootersPerSalvo: 8,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 900,
      // Laser: Licht hat praktisch keine Reichweitengrenze. Bewusst trotzdem gedeckelt -
      // bei 1,0 waere die Kampfzone fuer diese Waffe komplett aufgehoben und Thomas'
      // Anliegen (Gegner sollen ankommen) fiele mit dem ersten Waffenfund wieder um.
      engageShare: 0.85,
      pierces: true,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    rocket: {
      minLevel: 1,
      rateFactor: 0.25,
      damageFactor: 2.5,
      shootersPerSalvo: 3,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 300,
      // Rakete: fliegt weit, ist aber langsam - man schiesst auf Vorhalt.
      engageShare: 0.72,
      pierces: false,
      splashRadiusPx: 70,
      splashDamageFactor: 1.5,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    minigun: {
      minLevel: 3,
      // 17.6 salvos/s x 3 shooters x 1 projectile x 0.80s flight = 42.3; 56 leaves 32% reserve.
      rateFactor: 2.2,
      damageFactor: 0.28,
      shootersPerSalvo: 3,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 900,
      // Minigun: dasselbe Kaliber wie das Sturmgewehr, aber auf Dauerfeuer ausgelegt -
      // etwas weiter, dafuer streut sie.
      engageShare: 0.62,
      pierces: false,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    flamethrower: {
      minLevel: 3,
      // 14.4 salvos/s x 3 shooters x 5 projectiles x 0.694s flight = 149.8; 200 leaves 33% reserve.
      rateFactor: 1.8,
      damageFactor: 0.34,
      shootersPerSalvo: 3,
      bulletsPerShot: 5,
      fanAngleDeg: 52,
      projectileSpeed: 620,
      // Flammenwerfer: real die kuerzeste Reichweite ueberhaupt, der Strahl zerfaellt
      // nach wenigen Dutzend Metern. Kuerzeste Waffe im Spiel - Nahkampf mit hoher Rate.
      engageShare: 0.28,
      pierces: false,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    chainlightning: {
      minLevel: 3,
      // 5.6 salvos/s x 6 shooters x 1 projectile x 0.92s flight = 30.9; 48 leaves 55% reserve.
      rateFactor: 0.7,
      damageFactor: 1.05,
      shootersPerSalvo: 6,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 780,
      // Kettenblitz: der Bogen selbst reicht nicht weit, seine Wirkung kommt aus dem
      // Ueberspringen auf Nachbarn.
      engageShare: 0.45,
      pierces: false,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
      chainCount: 3,
      chainRadiusPx: 118,
      chainDamageFactor: 0.55,
    },
    splashFlashMs: 180,
    chainFlashMs: 120,
  },
  crowd: {
    start: 3,
    max: 30,
    // Maximum number of figures that fire together in one rotating salvo.
    shootersPerSalvo: 8,
    rowSpacingY: 14,
    colSpacing: 24,
    minColSpacing: 11,
    // Formation width is the share of the playfield available to the widest row.
    maxWidthRatio: 0.44,
    bottomMargin: 8,
    // The collision hull stays fixed instead of growing with the formation.
    hullWidthFigures: 2.4,
    hullHeightFigures: 1.6,
    damagePerExtraFigure: 0.14,
    damageMultiplierCap: 4,
  },
  // Haerte der Wandsegmente (Thomas 2026-08-22: "immer noch schwer was zu holen,
  // speziell in weiteren Level, die Zahlen steigen zu schnell an").
  //
  // ALTES MODELL (verworfen): maxHp = Feuerkraft x 2 s x 0.35. Die Wand wuchs damit
  // exakt so schnell wie die Truppe — die Fokusdauer blieb ueber den ganzen Run bei
  // 0,70 s, Aufruesten brachte gegen Waende NICHTS. Schlimmer: die Zahl haing direkt an
  // der Waffe, gemessen bei Truppe 8 zwischen 4 (Minigun) und 71 (Schrot). Wer eine
  // Schrotflinte aufhob, machte die Waende schlagartig 4x haerter; im Vollausbau stand
  // 1482 auf der Kachel.
  //
  // NEUES MODELL: Die Zielhaerte kommt aus der LEVELNUMMER und nur gedaempft aus der
  // Truppengroesse. Die Waffe geht gar nicht mehr ein — eine bessere Waffe laesst die
  // Wand also schneller fallen, statt sie mitwachsen zu lassen. Zwei Schutzgrenzen an
  // der tatsaechlichen Feuerkraft verhindern beide Ausreisser: maxFocusSec deckelt den
  // schwachen Run (Wand nie eine Sackgasse), minFocusSec haelt einen Rest Widerstand.
  blockers: {
    // Level 1 mit Startteam (2 Figuren, normal, dmg 1, rate 3 -> 6 dps): 3 HP = 0,50 s.
    baseHp: 3,
    // Level 12 ist damit 1.2^11 = 7,4x so hart wie Level 1 — spuerbar, aber die Zahl
    // bleibt zweistellig statt vierstellig.
    perLevelGrowth: 1.2,
    // Gedaempfte Truppenkopplung: doppelte Truppenfeuerkraft = 1,41x Wand-HP. Ohne sie
    // waere ein grosser Trupp gegen Waende voellig folgenlos, mit 1.0 waere das alte
    // Problem zurueck.
    teamDampening: 0.5,
    // Harte Obergrenze: ein Segment kostet NIE mehr als 0,6 s Dauerfeuer, ein
    // 3er-Abschnitt damit nie mehr als 1,8 s (bei 5,14 s Bildschirmdurchlauf). Der
    // Deckel ist die eigentliche Antwort auf "immer noch schwer was zu holen": Er gilt
    // unabhaengig von Level, Truppe und Waffe. Gemessen bremst er vor allem die
    // Drei-Schuetzen-Waffen aus (Minigun und Rakete feuern nur mit 3 Figuren und lagen
    // ohne Deckel bei 1,25 s je Segment, also schlechter als die Standardwaffe).
    maxFocusSec: 0.6,
    // Starker Run: ein Segment kostet mindestens 0,12 s — die Wand schmilzt dann
    // sichtbar weg, bleibt aber ein Objekt und kein Nebel.
    minFocusSec: 0.12,
  },
  enemy: {
    // Measured visible-figure dimensions per sprite; coinValue is the number of dropped coins. Remeasure both dimensions whenever the images change.
    // ALLE GEGNER LAUFEN GLEICH SCHNELL (Thomas 2026-08-22: "mache alle Mobs gleich
    // schnell, nur unterschiedlich stark, also mit verschiedenen Trefferpunkten").
    // Der Unterschied steckt jetzt allein in hp und contactDamage.
    //
    // Was das mitloest: Bei ungleichem Tempo zerfaellt jede Horde auf dem Weg nach unten
    // - die Leichten laufen der Formation davon, die Schweren bleiben zurueck, und aus
    // der Wand wird wieder ein Pulk. Mit einheitlichem Tempo bleibt eine Formation bis
    // zur Truppe eine Formation. Ausserdem kann kein Gegner einen anderen mehr einholen,
    // was die Spurwahl entlastet.
    //
    // hp gespreizt statt 1/3/9, damit die Typen ohne Tempo-Unterschied noch klar
    // auseinandergehen: Der Schwere haelt jetzt das Zwoelffache des Leichten aus.
    types: [
      { key: 'light', texture: 'enemy-light', hp: 1, speedFactor: 1, contactDamage: 1, coinValue: 1, bodyWidth: 18, bodyHeight: 38 },
      { key: 'standard', texture: 'enemy-standard', hp: 4, speedFactor: 1, contactDamage: 1, coinValue: 1, bodyWidth: 21, bodyHeight: 42 },
      { key: 'heavy', texture: 'enemy-heavy', hp: 12, speedFactor: 1, contactDamage: 2, coinValue: 3, bodyWidth: 40, bodyHeight: 49 },
    ],
    // Gegner-Lebenspunkte wachsen mit der LEVELNUMMER (Thomas 2026-08-22, nach dem
    // Spieltest: "ich kann die Mannschaft immer noch in der Mitte stehen lassen und
    // feuern"). Bis hierher waren die hp ueber alle zwoelf Level FEST, waehrend die
    // Truppe von 9 auf ueber 5.000 Schaden je Sekunde wuchs. Gemessen bei Level 12:
    // 1.732 dps gegen 12 hp - die Truppe toetete 144 Gegner je Sekunde bei 6 Nachschub.
    // Kein Hordenwert der Welt kann das ausgleichen; Stehenbleiben MUSSTE funktionieren.
    //
    // Bezug ist bewusst die Levelnummer und NICHT die Feuerkraft der Truppe. Dieselbe
    // Entscheidung wie bei der Wandhaerte (siehe blockers): Koppelt man die Haerte an
    // die eigene Staerke, bringt Aufruesten nichts mehr - genau der Fehler, der dort
    // schon einmal gebaut und wieder ausgebaut wurde.
    //
    // 1,2 je Level, also 1,2^11 = 7,4x auf Level 12: Ein schwerer Gegner haelt dort 89
    // statt 12 Punkte aus. Derselbe Wachstumsfaktor wie bei den Waenden, damit beide
    // Widerstaende im Run gleich schnell zunehmen.
    hpPerLevelGrowth: 1.2,
    // GRUNDGROESSE der Gegner auf Kampfhoehe (Thomas 2026-08-22, DRITTE Meldung zur
    // Groesse: "die mobs wirken immer noch zu klein - muessen schneller wachsen").
    //
    // Die beiden Anlaeufe davor haben nur die FERNKURVE angefasst (road.perspective) -
    // und damit am eigentlichen Problem vorbei: Auf Kampfhoehe war ein Gegner exakt so
    // gross wie sein Sprite, also 38 px beim leichten gegen 46 px bei einer eigenen
    // Figur. Selbst direkt vor der Truppe war er der Kleinere; keine Fernkurve der Welt
    // kann das ausgleichen.
    //
    // 1,25 bringt den leichten Gegner auf 47 px und damit auf Augenhoehe mit der
    // eigenen Truppe, den schweren auf 61 px. Der Faktor gilt fuer ALLES, was im
    // Kampfhoehen-System gerechnet wird - Darstellung, Trefferflaeche, Spurabstaende,
    // Formationsbreite und Schatten (siehe enemyTypes.getFigureWidth/-Height). Die
    // Abstaende in level.squads sind mitgewachsen, sonst waeren aus Horden Kloesse
    // geworden.
    figureScale: 1.25,
    // GEGNER SUCHEN DIE TRUPPE (Thomas 2026-08-22: "ich kann die Mannschaft immer noch
    // in der Mitte stehen lassen und feuern"). Das war die Beschwerde, die mehr Mobs
    // allein nicht loesen konnte: Gegner liefen ihre Spur geradeaus herunter und damit
    // links und rechts an der Truppe vorbei. Wer mittig stand, raeumte die Mittelspur
    // und war von allem anderen unbehelligt - Stehenbleiben war nicht nur moeglich,
    // es war die beste Spielweise.
    //
    // Jetzt driften Gegner seitlich auf die Truppe zu. Die Staerke ist NICHT frei
    // gewaehlt, sondern aus der Anflugzeit hergeleitet: Vom Horizont bis zur Truppe
    // (714 - 150 = 564 px bei 105 px/s auf Level 1) sind es 5,4 s. Wer in dieser Zeit
    // die halbe Korridorbreite (117 px) aufholt, braucht 21,7 px/s - dann traefe er
    // aus jeder Startspur und Ausweichen waere sinnlos. Die HAELFTE davon macht daraus
    // ein Spiel: Stehenbleiben wird zuverlaessig bestraft, eine Ausweichbewegung
    // genuegt aber, um wieder frei zu sein.
    seekSpeedPxPerSec: 11,
    // Enemy composition belongs to the level plan, never to elapsed spawn time.
    spawnRampPerSec: 6,
    spawnLaneSafetyGap: 5,
    // Wie lange eine verschobene Spawn-Anforderung hoechstens im Weg liegen darf, bevor
    // der Spawner sie aufgibt (2026-08-23). Vorher gab es keine Grenze: Eine Horde, die
    // keine Spur fand, blockierte den gesamten Takt - auch jeden Einzelgegner. Bei
    // Level 12 lag so ueber 55 s gemessen eine Horde fest und es kam GAR kein Gegner
    // mehr.
    //
    // 2.700 ms ist nicht geraten, sondern die halbe Anflugzeit: Vom Horizont bis zur
    // Truppe sind es 564 px, bei rund 105 px/s also 5,4 s (dieselbe Herleitung wie bei
    // der Zielsuche weiter unten). Nach der Haelfte davon hat sich die Lage am Horizont
    // vollstaendig erneuert - wer bis dahin keine Spur gefunden hat, findet sie nicht
    // durch weiteres Warten, sondern blockiert nur den Nachschub.
    deferredMaxAgeMs: 2700,
    // W3-Mittelband: Spawn-Schwerpunkte als Anteil der halben Spielfeldbreite.
    // Horden landen eng an der Mitte, Einzelgegner im mittleren Bereich — die
    // Korridor-Raender bleiben als Ausweichzone frei ("statt ueber Spuren verteilt").
    spawnBands: {
      // 0,2 -> 0,28 und 0,5 -> 0,62 (Thomas 2026-08-22: "koennen noch ein wenig mehr
      // sein"). Der Takt allein bringt nichts mehr: Gemessen wurden zuletzt 3-5
      // verschobene Spawns je 10 s, weil keine freie Spur zu finden war - und mit
      // figureScale 1,25 braucht jede Figur jetzt mehr Korridor. Breitere Baender
      // schaffen den Platz, den kuerzere Intervalle sonst nur anfordern wuerden.
      // Die Raender bleiben trotzdem frei genug zum Ausweichen.
      hordeLaneShare: 0.28,
      singleLaneShare: 0.62,
    },
  },
  level: {
    warningMs: 1500,
    clearedMs: 1800,
    hardness: {
      perLevel: 0.045,
      max: 1.6,
    },
    squads: {
      minSize: 2,
      // 8 -> 14 (Thomas 2026-08-22, zweimal gemeldet: "die horden sind immer noch sehr
      // klein in der menge", dann "es muessen mehr mobs sein"). Der Deckel ist NICHT
      // frei gewaehlt, sondern die Grenze der Breitenregel: hordeMaxWidthPx 200 px
      // traegt hoechstens vier Gegner nebeneinander (3 x 44 Abstand + 40 schwerer
      // Koerper = 172 px; fuenf waeren 216 px und wuerden unter die Ueberlappungsgrenze
      // gestaucht). Horden wachsen deshalb in die TIEFE: 'cluster' setzt vier je Reihe,
      // 14 ergeben vier gestaffelte Reihen. 'row' bleibt konstruktiv bei vier - eine
      // Reihe kann nicht tief werden, dort ist die Groesse in der Leveltabelle gedeckelt.
      // DECKEL WAECHST MIT DEM LEVEL (Thomas 2026-08-23: "Gegnermenge darf mit Levels
      // noch steigen"). Vorher war 14 eine feste Zahl - und damit ab Level 5 die
      // eigentliche Bremse der Levelkurve: hardness skaliert die Hordengroessen der
      // Leveltabelle zwar mit (bis 1,6), lief aber gegen diesen Deckel und wurde
      // abgeschnitten. Gemessen (Simulation der Spawner-Zeitschleife, tests/_throughput):
      // Level 5 = 12,7 Gegner/s, Level 12 = 14,9 - ueber sieben Level nur +18 %.
      //
      // 14 + 1 je Level, gedeckelt bei 26. Bei Level 12 ergibt der Deckel 25, wirksam
      // wird die Leveltabelle mit ceil(14 x 1,495) = 21. Die Horde waechst dabei in die
      // TIEFE, nicht in die Breite: computeHordeOffsets setzt maxPerRow aus der
      // Korridorbreite, 21 Mitglieder sind also gestaffelte Reihen (Dichteregel W3).
      // Die Breite bleibt durch walls.hordeMaxWidthPx begrenzt, das Ausweichen erhalten.
      //
      // 26 als Kappe ist nicht frei gewaehlt, sondern die Nachlaufpause: Eine Horde
      // kostet pauseBaseMs + n x pausePerMemberMs, der Durchsatz laeuft also gegen
      // 1000 / pausePerMemberMs = 25 Gegner/s. Ueber 26 bringt jede weitere Figur
      // rechnerisch fast nichts mehr, kostet aber Poolplatz und Rechenzeit.
      maxSizeAtLevelOne: 14,
      maxSizePerLevel: 1,
      maxSizeCap: 26,
      // 44 -> 52 und 54 -> 62 mit enemy.figureScale 1,25. Bewusst UNTER dem Faktor
      // gehalten (1,18 statt 1,25): Die Horde soll dichter wirken als vorher, nicht nur
      // groesser - und vier Figuren muessen weiter nebeneinander passen.
      spacingPx: 52,
      rowSpacingPx: 62,
      // Nachlaufpause nach einer Horde. Sie ist die eigentliche Bremse des
      // Gegnernachschubs: Nicht das Spawn-Intervall bestimmt den Druck, sondern diese
      // Pause, weil sie das Intervall ueberschreibt.
      //
      // 650 + 100/Mitglied -> 250 + 40/Mitglied (Thomas 2026-08-22, dritte Meldung "es
      // sind noch immer zu wenig mobs"). Gerechnet fuer eine 14er-Horde:
      //   vorher  650 + 1.400 = 2.050 ms ->  6,8 Gegner/s
      //   jetzt   250 +   560 =   810 ms -> 17,3 Gegner/s
      // Das ist Faktor 2,5 und der groesste verbliebene Hebel. Die beiden vorherigen
      // Anlaeufe (Gruppengroesse, dann Deckel) hatten den Durchsatz nicht angefasst.
      pauseBaseMs: 250,
      pausePerMemberMs: 40,
    },
    // Hordengroessen und Spawntakt 2026-08-22 zum VIERTEN Mal angehoben (Thomas, nach
    // dem iPhone-Test: "es sollen noch immer auch schon ab Level 1 mehr sein"). Die drei
    // Anlaeufe davor haben Gruppengroesse, Deckel und Nachlaufpause angefasst - immer
    // nur die oberen Level. Level 1 blieb bei 1,0 Gegner je Sekunde stehen, weil dort
    // beides zugleich bremste: ein Takt von 1,75 s und nur 30 % Hordenanteil.
    //
    // Gerechnet wird jetzt in GEGNERN JE SEKUNDE, nicht in Einzelreglern:
    //   Gegner/s = (squadChance x Hordengroesse + Rest x 1) / (Takt + squadChance x Pause)
    //   Pause = 250 ms + 40 ms je Mitglied (level.squads).
    // Levelanfang -> Levelende (der Takt rampt mit enemy.spawnRampPerSec herunter),
    // nach der zweiten Anhebung am selben Tag (Thomas: "koennen noch ein wenig mehr
    // sein"), in Klammern der Stand davor und ganz urspruenglich:
    //   L1  3,77 -> 5,23   (2,95 -> 4,22; urspruenglich 1,01 -> 1,62)
    //   L4  5,65 -> 7,51   (4,66 -> 6,35; urspruenglich 2,33 -> 3,83)
    //   L8  6,50 -> 8,46   (5,91 -> 7,81; urspruenglich 3,57 -> 5,73)
    //   L12 8,61 -> 10,69  (7,94 -> 10,04; urspruenglich 6,63 -> 9,20)
    // Der Zuwachs ist unten am groessten und oben klein - dort kam die Steigerung schon
    // vorher aus Gegner-hp und Typenmischung, nicht aus der Menge.
    //
    // Die Menge allein haette diesmal nichts gebracht: Zuletzt scheiterten 3-5 Spawns je
    // 10 s an der Spurvergabe, und mit enemy.figureScale 1,25 braucht jede Figur mehr
    // Korridor. Deshalb sind die Spawn-Baender (enemy.spawnBands) mitgewachsen und der
    // Sicherheitsabstand ist von 6 auf 5 px gesunken - erst das macht den kuerzeren Takt
    // ueberhaupt wirksam.
    //
    // GEMESSEN im Browser (Level 1, je 10-s-Fenster der Dev-Metrik):
    //   vorher  11 / 9 / 7 Gegner            = 0,9 je Sekunde
    //   jetzt   25 / 21 / 42 / 47 / 54 / 44  = 3,9 je Sekunde im Schnitt, 4,7 am Ende
    // Real liegt es also ueber der Rechnung oben (2,95 -> 4,22): Die Nachlaufpause zieht
    // nur, wenn der Spawn-Akkumulator ueberhaupt so weit gefuellt ist - die Formel
    // rechnet sie pauschal an und schaetzt deshalb konservativ.
    //
    // GRENZE fuer den naechsten Anlauf: Im selben Lauf stieg 'deferred' von 0 auf 3-5 je
    // 10 s (bei 12-14 geplanten Ereignissen). Nicht der Takt bremst dann, sondern die
    // Spurvergabe - wer hier weiter aufdreht, muss zuerst spawnBands oder
    // spawnLaneSafetyGap anfassen, sonst verpuffen kuerzere Intervalle wirkungslos.
    //
    // 2026-08-23, FUENFTER Anlauf (Thomas: "Gegnermenge darf mit Levels noch steigen").
    // Diesmal wurde NICHT an dieser Tabelle gedreht, sondern die Kette durchgemessen -
    // und dabei ein Fehler gefunden, der die Tabelle wirkungslos machte. Gemessen im
    // Browser ueber je 60 s Fahrt (Truppe 30, Waffe normal), VORHER:
    //   Level 1:  4,95 Gegner/s   (63 von 1.247 Spawn-Versuchen erfolgreich)
    //   Level 6:  0,03 Gegner/s   ( 2 von 3.495)
    //   Level 12: 0,00 Gegner/s   ( 0 von 3.577)
    // Die Menge stieg mit dem Level also nicht - sie fiel auf NULL. Ursache war ein
    // doppelter Perspektiv-Aufschlag in spawner.spawnSquad (dort ausfuehrlich
    // kommentiert): Jede Formation wurde breiter geprueft, als der Korridor ist, und
    // fand nie eine Spur. Verschaerft durch die fehlende Verfallszeit fuer verschobene
    // Spawns - eine unplatzierbare Horde legte den gesamten Nachschub stumm.
    //
    // NACH den drei Aenderungen (Aufschlag korrigiert, Hordendeckel levelabhaengig,
    // deferredMaxAgeMs), je drei Laeufe, Mittelwert - und in Klammern der mittlere
    // Bestand auf dem Bildschirm, also das, was man tatsaechlich sieht:
    //   Level 1:   6,49 Gegner/s  (22,5 gleichzeitig)
    //   Level 4:   8,31 Gegner/s  (29,4)
    //   Level 8:  10,30 Gegner/s  (60,1)
    //   Level 12: 12,56 Gegner/s  (73,0)
    // Der Bestand steigt damit ueber den Run um Faktor 3,2. Level 1 liegt 31 % ueber
    // dem von Thomas abgenommenen Stand - das ist Folge der Fehlerbehebung, nicht eine
    // Anhebung dieser Tabelle.
    //
    // GRENZE fuer den naechsten Anlauf ist jetzt eine andere: Auch nach der Korrektur
    // werden rund 93 % der Spawn-Versuche abgelehnt, weil am Horizont bereits Gegner
    // stehen (canMeet in spawnLanes.ts). Das ist kein Fehler mehr, sondern volle
    // Auslastung - die Sperre verhindert, dass Gegner ineinander erscheinen, und die
    // wurde teuer bezahlt (siehe docs/lessons.md, 2026-08-20). Wer hier weiter
    // aufdrehen will, muss an der Verweildauer ansetzen (Tempo, Lebenspunkte), nicht
    // am Zufluss.
    //
    // Formregel unveraendert: 'row' bleibt bei vier - eine einzelne Reihe kann nicht
    // ueber die Breitengrenze hinauswachsen. Masse kommt aus 'cluster' (vier je Reihe,
    // beliebig tief) und 'wedge' (Keil, breiteste Reihe vier). Die Leveltabelle
    // verschiebt das Gewicht mit steigendem Level von wedge auf cluster. Neu ist, dass
    // die Kurve OHNE Delle steigt: Die alte Tabelle fiel bei Level 5 von 2,33 auf 1,90
    // zurueck, weil dort die erste 'row' mit fester Groesse vier dazukam.
    plans: [
      { normalPhaseSec: 75, enemyWeights: [75, 25, 0], spawnIntervalMs: 880, spawnIntervalMinMs: 550, squadChance: 0.58, squads: [{ kind: 'wedge', weight: 1, size: 7 }], companionLimit: 0 },
      { normalPhaseSec: 78, enemyWeights: [60, 40, 0], spawnIntervalMs: 840, spawnIntervalMinMs: 530, squadChance: 0.61, squads: [{ kind: 'wedge', weight: 1, size: 8 }], companionLimit: 0 },
      { normalPhaseSec: 78, enemyWeights: [65, 30, 5], spawnIntervalMs: 820, spawnIntervalMinMs: 510, squadChance: 0.63, squads: [{ kind: 'wedge', weight: 1, size: 9 }], companionLimit: 0 },
      { normalPhaseSec: 80, enemyWeights: [55, 35, 10], spawnIntervalMs: 790, spawnIntervalMinMs: 490, squadChance: 0.65, squads: [{ kind: 'wedge', weight: 1, size: 10 }], companionLimit: 0 },
      { normalPhaseSec: 80, enemyWeights: [35, 45, 20], spawnIntervalMs: 770, spawnIntervalMinMs: 480, squadChance: 0.67, squads: [{ kind: 'row', weight: 1, size: 4 }, { kind: 'cluster', weight: 3, size: 12 }], companionLimit: 1 },
      { normalPhaseSec: 82, enemyWeights: [25, 45, 30], spawnIntervalMs: 740, spawnIntervalMinMs: 460, squadChance: 0.69, squads: [{ kind: 'row', weight: 1, size: 4 }, { kind: 'wedge', weight: 2, size: 13 }], companionLimit: 1 },
      { normalPhaseSec: 82, enemyWeights: [25, 40, 35], spawnIntervalMs: 710, spawnIntervalMinMs: 440, squadChance: 0.71, squads: [{ kind: 'row', weight: 1, size: 4 }, { kind: 'cluster', weight: 3, size: 12 }], companionLimit: 2 },
      { normalPhaseSec: 84, enemyWeights: [20, 40, 40], spawnIntervalMs: 690, spawnIntervalMinMs: 420, squadChance: 0.73, squads: [{ kind: 'cluster', weight: 3, size: 12 }, { kind: 'row', weight: 1, size: 4 }], companionLimit: 2 },
      { normalPhaseSec: 84, enemyWeights: [25, 35, 40], spawnIntervalMs: 660, spawnIntervalMinMs: 400, squadChance: 0.75, squads: [{ kind: 'wedge', weight: 1, size: 10 }, { kind: 'row', weight: 1, size: 4 }, { kind: 'cluster', weight: 3, size: 13 }], companionLimit: 3 },
      { normalPhaseSec: 86, enemyWeights: [20, 35, 45], spawnIntervalMs: 630, spawnIntervalMinMs: 390, squadChance: 0.77, squads: [{ kind: 'row', weight: 1, size: 4 }, { kind: 'cluster', weight: 4, size: 13 }], companionLimit: 3 },
      { normalPhaseSec: 86, enemyWeights: [20, 35, 45], spawnIntervalMs: 610, spawnIntervalMinMs: 370, squadChance: 0.79, squads: [{ kind: 'wedge', weight: 1, size: 11 }, { kind: 'row', weight: 1, size: 4 }, { kind: 'cluster', weight: 4, size: 14 }], companionLimit: 4 },
      { normalPhaseSec: 88, enemyWeights: [15, 35, 50], spawnIntervalMs: 580, spawnIntervalMinMs: 350, squadChance: 0.81, squads: [{ kind: 'row', weight: 1, size: 4 }, { kind: 'cluster', weight: 5, size: 14 }], companionLimit: 4 },
    ] satisfies readonly LevelDefinition[],
  },
  boss: {
    referenceFirepower: {
      // Fight duration at the maximum crowd size with the normal weapon. Smaller crowds take longer,
      // capped by the level-scaled maximum so a two-figure emergency team cannot stall a run.
      // Die frueher hier verlangte Sicherheitsmarge zur Druckschwelle ist entfallen: Der
      // Boss wartet seit 2026-08-22 nicht mehr, sondern rueckt ab Kampfbeginn vor. Die
      // Kopplung ist jetzt umgekehrt und steht bei advanceSpeed - sein Tempo IST aus
      // maxFightSecCap hergeleitet, damit er genau am Ende des Zeitfensters ankommt.
      // Wer maxFightSecCap aendert, muss advanceSpeed nachrechnen.
      fightSecAtMaxTeam: 20,
      // Zielfenster fuer die Kampfdauer laut plan-v2 ("Boss V2"): 20-40 s, unabhaengig
      // vom Run-Stand. Die alten Grenzen (15 / 18 s bei Level 1) lagen UNTER dem
      // Fenster - Level 1 haette es konstruktiv nie erreichen koennen.
      //
      // ACHTUNG: Diese Werte sind die RECHNERISCHE Dauer (maxHp / referenceDps). Die
      // im Spiel gemessene weicht davon ab, weil die gerufenen Horden zwischen Truppe
      // und Boss stehen und Beschuss abfangen. Gemessen am 2026-08-22 (Truppe weicht
      // perfekt aus, sonst waere die Feuerkraft die Stoergroesse), real/rechnerisch:
      //   schwacher Run (Truppe 2):  0,78 (L1) | 0,79 (L6) | 1,17 (L12)
      //   starker Run (Truppe 30):   1,53 (L1) | 1,55 (L6) | 1,46 (L12)
      // Ein schwacher Run bei Level 1 sieht kaum Horden (7 gleichzeitig) und ist
      // deshalb SCHNELLER fertig als gerechnet; ein schwacher Run bei Level 12 sieht
      // 46 und braucht laenger. Der starke Run haelt konstant den Faktor 1,5.
      //
      // Die Grenzen zielen deshalb auf die gemessene Mitte des Fensters (~30 s), nicht
      // auf seine Raender: 20 s Untergrenze x 1,5 = 30 s real fuer starke Runs,
      // 26 s bei Level 1 x 0,78 = 20 s real und 32 s bei Level 12 x 1,17 = 37 s real
      // fuer schwache. Der erste Entwurf (20 / 20 / +1,8) verfehlte das Fenster in
      // zwei von sechs Messungen: L1 schwach 15,5 s, L12 schwach 46,6 s.
      minFightSec: 20,
      maxFightSecAtLevelOne: 26,
      maxFightSecPerLevel: 0.545,
      maxFightSecCap: 40,
      // 0 ignores crowd strength; 1 scales boss HP fully with it. This value halves
      // the fight from the smallest crowd to crowd.max without erasing the reward.
      teamDampening: 0.41,
      // 0 ignores weapon strength (the Level-1 laser bug); 1 fully equalizes weapons. This keeps
      // weapon luck noticeable without allowing a weak weapon to exceed the boss-pressure window.
      weaponDampening: 0.8,
      // Earned damage and fire-rate changes matter, but are damped before the fight clamp.
      statDampening: 0.8,
      damagePerLevel: 0.15,
      damageCap: 8,
      ratePerLevel: 0.1,
      rateCap: 8,
    },
    approachSpeed: 90,
    battleY: 300,
    // Der Boss SCHIESST SEIT V2 NICHT MEHR (Entscheidung Thomas 2026-08-22, plan-v2
    // "Boss V2"). Sein Druck kommt aus gerufenen Horden und dem Vorruecken bei
    // Zeitueberschreitung. Alle Salvenwerte sind deshalb entfallen.
    // DER BOSS PENDELT SEIT 2026-08-23 NICHT MEHR SEITLICH (Thomas nach dem iPhone-Test:
    // "Boss soll sich nicht mehr links und rechts bewegen, sondern einfach langsam auf
    // mich zu, Geschwindigkeit wie jetzt"). Die frueheren moveSpeed-Werte (110 in Phase 1,
    // 170 in Phase 2) und die zugehoerige Pendelbewegung in boss.ts sind entfallen.
    // "Geschwindigkeit wie jetzt" ist als das BESTEHENDE VORRUECK-Tempo gelesen
    // (advanceSpeed 8,35 px/s, unten hergeleitet), nicht als Uebertragung der
    // Pendelgeschwindigkeit auf die Anflugrichtung - 110 px/s wuerden die 334 px bis zur
    // Truppe in 3 s zuruecklegen und den Kampf zerstoeren.
    //
    // FOLGE, die beim Nachziehen zu beachten ist: Der stehende Boss bleibt dauerhaft in
    // der Feuerlinie der Truppe (die schiesst spurtreu), waehrend der pendelnde
    // regelmaessig aus ihr herauslief. Die gemessene Kampfdauer sinkt dadurch.
    // Phase 2 unterscheidet sich jetzt nur noch ueber Hordendruck und Faerbung.
    phaseOne: {
      hordePressureShare: 0.5,
    },
    phaseTwo: {
      hordePressureShare: 1,
      tint: 0xff6a6a,
      transitionFlashMs: 180,
    },
    hordePressure: {
      // Bezugsgroesse: Beim Bossstart schaltet die GameScene den Normalspawner ab
      // (setSpawningEnabled(false)) - der gesamte Gegnerdruck kommt jetzt vom Boss.
      // Die faire Bezugsgroesse ist deshalb der Druck unmittelbar VOR dem Boss:
      // erwartete Gegner je Spawn-Ereignis geteilt durch das Spawn-Intervall am Ende
      // der Rampe. Beides steht in der Leveltabelle, gerechnet in bossPlan.ts
      // (getNormalPhaseEnemiesPerSec) - keine geratene Zahl.
      // Gerechnet: Level 1 = 1,23 Gegner/s, Level 12 = 13,55 Gegner/s.
      //
      // phaseOneShare 0,5 / phaseTwoShare 1,0 (oben in den Phasen): In Phase 1 haelt
      // der Boss den halben Normaldruck, in Phase 2 den vollen. Begruendung: Anders
      // als in der Normalphase muss der Spieler seine Feuerkraft zusaetzlich auf den
      // Boss legen. Voller Normaldruck von Beginn an waere der V1-Befund "zu schwer"
      // in neuer Form - genau das Gegenkriterium dieser Etappe.
      //
      // Deckel gleichzeitig aktiver gerufener Gegner. NICHT aus dem Pool hergeleitet,
      // sondern aus der Geometrie - der erste Entwurf hatte 64 (Poolschutz: 104 Objekte,
      // Normalspawner aus) und war unspielbar: Gemessen standen dann bis zu 42 Gegner
      // gleichzeitig vor dem Boss und fingen praktisch allen Beschuss ab. Dieselbe
      // Kombination brauchte je nach Zufall 29 s oder 109 s - die Kampfdauer haengt
      // dann am Schild, nicht mehr an den Lebenspunkten.
      // Herleitung: Der Boss ist 118 px breit, die Strasse unten rund 300 px. Eine
      // Horde fuellt die Mittelbahn einmal. Zwei Horden gleichzeitig sind eine Welle,
      // die man umlaufen und durchschiessen kann; ab der dritten ist es eine
      // geschlossene Wand. 2 x level.squads.maxSize, mit maxSize 8 -> 14 also 16 -> 28
      // (Thomas 2026-08-22: "es muessen mehr mobs sein, auch beim boss").
      // ACHTUNG beim Nachziehen: Die gerufenen Horden stehen ZWISCHEN Truppe und Boss
      // und fangen Beschuss ab. Der erste Entwurf mit 64 war deshalb unspielbar - die
      // Kampfdauer haengt ab einer bestimmten Dichte am Schild statt an den
      // Lebenspunkten. 28 ist die obere Kante des Gemessenen, nicht ein sicherer Wert:
      // Faechert die Kampfdauer wieder auf, gehoert diese Zahl zuerst zurueckgedreht.
      // Groesse EINER gerufenen Horde. Bewusst fest, waehrend der Deckel der Normalphase
      // seit 2026-08-23 mit der Levelnummer waechst - Begruendung steht bei
      // bossPlan.getBossHordeSize. maxActiveCalled ist genau das Doppelte davon, damit
      // hoechstens zwei Horden gleichzeitig vor dem Boss stehen.
      hordeSizeCap: 14,
      maxActiveCalled: 28,
      // Untergrenze fuer den Ruf-Takt: Unter einer halben Sekunde erscheint eine
      // Horde, bevor die vorige die Bildmitte erreicht hat - das liest sich als
      // Wand aus Gegnern statt als Welle.
      minIntervalMs: 500,
    },
    // Der Boss RUECKT AB KAMPFBEGINN VOR (Thomas 2026-08-22: "der boss muss langsam auf
    // mich zukommen, langsamer als die mobs aber doch auf mich zu"). Vorher stand er
    // 36 s regungslos auf battleY und setzte sich erst dann in Bewegung - in den meisten
    // Kaempfen also nie, weil sie vorher entschieden waren.
    pressureDelayMs: 0,
    // 34 -> 8,5 px/s. Hergeleitet aus der Strecke und dem Zeitfenster, nicht geschaetzt:
    // Von battleY 300 bis zum Halt (Anker 714 minus advanceStopBeforeAnchorPx 80 = 634)
    // sind es 334 px. Der Boss soll genau dann ankommen, wenn das Kampf-Zeitfenster
    // ausgereizt ist (maxFightSecCap 40 s): 334 / 40 = 8,35 px/s - nicht gerundet,
    // damit die Ankunft exakt auf dem Fensterende liegt und der Test das pruefen kann.
    // Damit stimmt beides, was Thomas verlangt hat: Er kommt sichtbar naeher (ueber
    // 20 s rund 167 px, also mehr als eine Bosslaenge), und er ist mit 8,35 px/s um den
    // Faktor 6 langsamer als der langsamste Gegner (schwerer Gegner am Tempo-Boden:
    // 70 x 0,7 = 49 px/s).
    advanceSpeed: 8.35,
    // The boss centre stops before the crowd anchor; its lower collision edge can
    // still touch a stationary formation, but lateral escape remains available.
    advanceStopBeforeAnchorPx: 80,
    advanceContactDamage: 2,
    coinReward: 25,
    // Measured opaque bounds of src/assets/enemy-boss.png, not the 120px canvas.
    bodyWidth: 118,
    bodyHeight: 118,
  },
  feedback: {
    hitFlashMs: 80,
    gameOverRestartDelayMs: 400,
    poolWarningIntervalMs: 1000,
  },
  hud: {
    padding: 12,
    panelHeight: 62,
    panelRadius: 12,
    panelAlpha: 0.55,
    panelStrokeAlpha: 0.6,
    sidePad: 14,
    rowOneOffsetY: 9,
    rowTwoOffsetY: 38,
    primaryFontPx: 22,
    statFontPx: 15,
    secondaryFontPx: 14,
    depthPanel: 90,
    depthText: 91,
  },
  coins: {
    magnetRadius: 200,
    magnetSpeed: 900,
    collectDistance: 24,
    dropSpacing: 18,
    edgeInset: 7,
  },
  pools: {
    projectiles: {
      // Peak: ceil(1.12s flight / 0.125s interval) = 9 salvos x 8 shooters x 1 bullet = 72; 96 leaves 33% reserve.
      normal: 96,
      // Peak: 3.2 salvos/s x 8 shooters x 7 bullets x 0.672s flight = 120.4; 168 leaves 39% reserve.
      shotgun: 168,
      // Peak: ceil(0.79s flight / 0.089s interval) = 9 salvos x 8 shooters x 1 bullet = 72; 96 leaves 33% reserve.
      laser: 96,
      // Peak: ceil(2.38s flight / 0.5s interval) = 5 salvos x 3 shooters x 1 bullet = 15; 24 leaves 60% reserve.
      rocket: 24,
      // 17.6 salvos/s x 3 shooters x 1 projectile x 0.80s flight = 42.3; 56 leaves 32% reserve.
      minigun: 56,
      // Peak: 14.4 salvos/s x 3 shooters x 5 projectiles x 0.694s flight = 149.8; 200 leaves 33% reserve.
      flamethrower: 200,
      // 5.6 salvos/s x 6 shooters x 1 projectile x 0.92s flight = 30.9; 48 leaves 55% reserve.
      chainlightning: 48,
    },
    // Peak: 2 salvos/s x 3 rockets x 0.18s = 1.1 flashes; 12 leaves generous reserve.
    splashFlashes: 12,
    // At most 5.6 salvos/s x 3 shooters x 3 chain jumps x 0.12s = 6.1; 16 leaves reserve.
    chainFlashes: 16,
    // Worst case: Gegner spawnen vollstaendig oberhalb des Horizonts (halbe Koerperhoehe
    // plus bis zu 81 px Reihenversatz), laufen also bis zu 881 px. Seit alle Typen
    // gleich schnell sind, gilt dafuer EIN Tempo: am Boden speed.floor = 70 px/s, also
    // 12,6 s (vorher 18,0 s, weil der schwere Gegner mit Faktor 0,7 kroch).
    // Mit maxSize 14 und Pause 650 + 14 x 100 = 2,05 s sind das ceil(12,6 / 2,05) x 14
    // = 84 gleichzeitig aktive Gegner.
    // Mit der verkuerzten Nachlaufpause (250 + 14 x 40 = 810 ms) sind es
    // ceil(12,6 / 0,81) x 14 = 224. 264 laesst 18 % Reserve fuer gemischte
    // Einzelspawns und verzoegertes Recycling.
    // NACHGERECHNET 2026-08-23 mit dem levelabhaengigen Hordendeckel: Bei Level 12
    // wird die groesste Horde 21 gross, ihre Pause 250 + 21 x 40 = 1,09 s. Der
    // schlimmste Fall ist damit ceil(12,6 / 1,09) x 21 = 12 x 21 = 252 - der Pool
    // traegt ihn weiter, die Reserve schrumpft aber auf 5 %. Wer den Deckel weiter
    // anhebt, muss diese Zahl mit anheben.
    // GEMESSEN im Browser (je drei Laeufe ueber 60 s, Truppe 30, Waffe normal):
    // hoechster Bestand 99 bei Level 12, keine einzige Pool-Erschoepfung.
    // ACHTUNG: Das ist der Wert fuer den Fall, dass NICHT geschossen wird. Im Spiel
    // liegt der Bestand weit darunter, weil die Truppe raeumt - gemessen bei Level 12
    // mit realistischem Ausbau rund 20 gleichzeitig. Der Pool ist die Sicherung fuer
    // den schwachen Run, nicht der Erwartungswert.
    enemies: 264,
    // Must be >= crowd.max because all figures are created once and then only shown or hidden.
    crowd: 30,
    // Neu hergeleitet 2026-08-22, nachdem der Pool im Test 84-mal in Folge leerlief
    // ("Coin pool exhausted"): Mit der verkuerzten Spawn-Pause kommen bei Level 12
    // 14,55 Gegner/s, im schlimmsten Fall alle schwer mit 3 Muenzen = 43,7 Muenzen/s.
    // Eine Muenze bleibt 844 / 135 = 6,25 s im Bild, macht 273 gleichzeitig. Dazu die
    // Wandmuenzen (rund 1,1 Segmente/s x 3 = 3,3/s, also 21). Summe 294; 320 laesst
    // 9 % Reserve, ohne sich auf den Magneten zu verlassen.
    coins: 320,
    // Wand-Abschnitte (W4): Seit die Kette perspektivisch faehrt (2026-08-22) lebt ein
    // Segment laenger - es kriecht am Horizont und beschleunigt erst unten. Gerechnet
    // ueber die Weltstrecke Horizont -> unterer Bildrand: ln(195/101,4) / 0,00076 = 860
    // Welt-Pixel bei 135 px/s sind 6,4 s statt zuvor 5,1 s. Bei 135/72 = 1,875 Spawns je
    // Sekunde und Seite stehen damit rund 12 Segmente je Seite gleichzeitig, beidseitig
    // 24; freigeschossene Waffen-Rewards halten ihr Paar laenger aktiv (+2). 32 deckt
    // die Spitze mit gut einem Viertel Reserve.
    blockers: 32,
    // Densest case is an uninterrupted block (no cross streets): the fixed 120s,
    // 16.667ms-step, 390x844 city simulation then reaches 24 concurrent objects at the
    // 400ms cadence (18 with cross streets); 30 keeps the peak plus six-object reserve.
    scenery: 30,
  },
} as const
