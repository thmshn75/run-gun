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
  // Kampfhoehe), und walls.ts bildet sie ueber advanceAlongRoad auf den Bildschirm
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
    // eine Wand nach walls.maxFocusSec ohnehin in hoechstens 0,6 s faellt.
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
    // --- Laufbewegung (Thomas 2026-09-03, nach einem Genre-Video: "die Zombies
    // bewegen sich (bein und armarbeit)"). Befund: Unsere Figuren hoben und senkten
    // sich nur um 2-3 px, Arme und Beine standen still.
    //
    // Gezeichnet wird die Bewegung NICHT: Es gibt 30 einzelne Gegner-Gestalten
    // (enemy-{light,standard,heavy}[-b..j].png) plus Spielerfigur und zwei Bosse.
    // Echte Laufbilder waeren rund 130 neue Dateien; nur einen Teil zu animieren
    // hiesse, dass drei von dreissig laufen und der Rest steht. Stattdessen wird die
    // Bewegung gerechnet und wirkt damit fuer jede Gestalt gleichzeitig.
    //
    // Wiegen des Oberkoerpers: Beim Gehen wandert der Rumpf ueber das jeweilige
    // Standbein, die seitliche Kopfauslenkung betraegt rund 4 % der Koerperhoehe. Das
    // Sprite dreht um seinen Mittelpunkt, der Kopf sitzt also figureHeight/2 = 23 px
    // ueber der Drehachse: asin(0,04 x 46 / 23) = asin(1,84/23) = 4,6 Grad.
    stepSwayMaxDeg: 4.6,
    // Gegner wiegen flacher, im selben Verhaeltnis wie beim Hub (2 von 3 px): 4,6 x 2/3.
    enemyStepSwayMaxDeg: 3.1,
    // Federn beim Aufsetzen: Das Standbein beugt sich, die Koerperhoehe sinkt beim
    // Gehen um rund 3 % (Schwerpunkt-Vertikalauslenkung ~5 cm auf 175 cm). Der Hub
    // oben bildet die Hebung des Schwerpunkts ab, dieser Wert die Verformung des
    // Koerpers dabei. Die Breite geht gegenlaeufig mit (Volumen bleibt erhalten).
    stepSquashShare: 0.03,
    // Gegner federn flacher, gleiches Verhaeltnis wie beim Hub: 0,03 x 2/3.
    enemyStepSquashShare: 0.02,
    // Neigung beim Lenken: voller Ausschlag ab dieser Drag-Geschwindigkeit.
    // Der Fahrbereich ist rund 300 px breit, ein zuegiger Wisch quert ihn in ~0,4 s
    // — das sind die 750 px/s, ab denen die Truppe maximal lehnt.
    leanFullSpeedPxPerSec: 750,
    leanMaxDeg: 9,
    // Ohne Glaettung zuckt die Neigung pro Bild. 90 ms Halbwertszeit ist traege genug
    // fuer ein ruhiges Bild und schnell genug, um dem Finger zu folgen.
    leanHalfLifeMs: 90,
    // Aufploppen beim Einsammeln. Die Dauer steckt in gamefeel.popupMs; ein eigenes
    // popMs gab es bis 2026-08-23 zusaetzlich, es wurde nie gelesen (W6).
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
    // DIE LINKE SAMMELBAHN WIRD MIT DEM LEVEL DICHTER (Thomas 2026-08-24: "dass die
    // Waende der +1 Teams links (und nur diese) alle 2 oder 3 Level ein wenig schneller
    // werden, damit man bei hoeheren Leveln schneller aufladen kann").
    //
    // WARUM NICHT UEBER DIE GESCHWINDIGKEIT: Die Welt faehrt mit levelSpeed und ist bei
    // 175 px/s hart gedeckelt - 180 px/s hat Thomas selbst als "zu schnell" gemeldet.
    // Ab Level 12 steht das Tempo also, und mit ihm der Nachschub der Bahn. Eine
    // schnellere linke Bahn muesste ausserdem sichtbar schneller laufen als die Strasse,
    // auf der sie steht.
    //
    // STATTDESSEN KUERZERE KACHELN: Bei gleicher Fahrgeschwindigkeit passen mehr davon
    // in dieselbe Strecke, es kommen also mehr +1 je Sekunde an. Kuerzen statt enger
    // setzen ist entscheidend - bei gleichbleibender Kachelhoehe wuerden sie einander
    // ueberlappen und die Beschriftungen uebereinanderliegen.
    //
    // GERECHNET: Bei 135 px/s (Level 1) und 72 px Kachel kommen 1,875 Kacheln/s. Mit
    // dem Deckel 1,5 sind es 48 px Kachel, bei 175 px/s (ab Level 12) also 3,65/s statt
    // 2,43/s - rund 50 % mehr Teamnachschub am oberen Ende.
    //
    // 0,02 je Level heisst rund ein spuerbarer Schritt alle zwei bis drei Level, wie
    // gewuenscht. Der Deckel 1,5 ist nicht frei gewaehlt: Darunter wird die Kachel
    // kuerzer als die Figur breit ist, und die Beschriftung passt nicht mehr hinein.
    //
    // ACHTUNG, gilt auch fuer die ROTEN: Die Bahn traegt gute UND schlechte Kacheln im
    // Verhaeltnis badChance. Dichter heisst mehr von beidem - netto bleibt ein Gewinn,
    // aber kein doppelter.
    //
    // GEMESSEN im laufenden Spiel (Kachelhoehe direkt aus walls.getSegmentHeight):
    //   Level  1: 72,0 px links / 72 rechts -> 1,88 Plaettchen/s
    //   Level 10: 61,0 px       / 72        -> 2,73/s
    //   Level 20: 52,2 px       / 72        -> 3,35/s
    //   Level 30: 48,0 px       / 72        -> 3,65/s  (Deckel ab Level 26)
    // Das ist fast eine VERDOPPELUNG (+94 %) statt der gerechneten +50 %: Kuerzere
    // Kacheln und das mit dem Level steigende Fahrtempo multiplizieren sich. Level 1
    // bleibt unveraendert, die rechte Bahn durchgehend bei 72 px.
    leftLane: {
      densityAtLevelOne: 1,
      densityPerLevel: 0.02,
      densityCap: 1.5,
    },
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
    // UEBERLAUF: was ein Feuerkraft-Tor ZUSAETZLICH auszahlt, wenn Schaden UND Feuerrate
    // am Deckel stehen und auch die Umleitung (upgrades.applyGoodGate) nichts mehr
    // findet. Ab Level 13 ist das der Normalfall, nicht die Ausnahme: Der Deckel der
    // Feuerrate waechst dort gar nicht mehr, der des Schadens um 0,4 % je Level - also
    // um weniger, als ein einziges Tor traegt.
    //
    // DIE 1 IST GEMESSEN, NICHT GEWAEHLT - und der erste Ansatz stand auf 3. Gerechnet
    // war er plausibel: Das Tor hat zwei Inhalte, Feuerkraft und Muenzen (coinReward 3);
    // faellt der eine weg, zaehlt der andere doppelt. Bei den dokumentierten 22 bis 46
    // Toren je Level (lessons.md 2026-08-25) waeren das 66 bis 138 Muenzen extra gegen
    // 1.362 Einnahme auf Level 12, also 5 bis 10 %.
    //
    // IM BROWSER GEMESSEN (2026-08-28, Level 13, 20 s, Truppe unsterblich und dauerhaft
    // an der rechten Wand): 34 Ueberlaeufe, also 1,7 je Sekunde. Auf normalPhaseSec 82
    // hochgerechnet sind das 139 je Level - dreimal so viele wie die Obergrenze der alten
    // Messung, weil dort niemand die ganze Zeit an der Wand klebt. Mit Bonus 3 waeren das
    // 418 Muenzen extra auf 1.362, also +31 %: Die Preise stehen auf 200 % der
    // Levelseinnahme (shop.prices), und eine Stufe je Run waere geschenkt.
    //
    // Mit 1 bleibt auch dieser Extremfall bei +10 % und damit unter der vorab gesetzten
    // Grenze von 15 %. Wenig ist das trotzdem nicht: Wer die Wand zerschiesst, bekommt
    // ohnehin coinReward 3 - der Ueberlauf ist der Aufschlag darauf, und die eigentliche
    // Wirkung ist die Sichtbarkeit (Kachel "MAX +1 ¢" statt "+DMG", Quittung an der
    // Truppe) statt der Betrag.
    // WER IHN ANHEBT, muss die Einnahme je Level neu messen, nicht die Preise nachziehen.
    maxedCoinBonus: 1,
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
    // WIE TIEF MAN IN DIE SAMMELBAHN FAHREN MUSS, um ein Plaettchen einzuloesen
    // (2026-08-23, Thomas: "wenn ich voll bin mit 30 Mann dann streife ich links die
    // Waende beim Abschuessen der mobs - da verliere ich immer Team").
    //
    // Bis hierher genuegte eine BERUEHRUNG der Truppenhuelle. Gemessen (Level 6, Truppe
    // 30, je 15 s auf fester Position): Bis 60 px links der Mitte wird gar nichts
    // gesammelt, ab 80 px alles - die Zone schaltete also schlagartig, und zwar genau
    // dort, wo man stehen muss, um die aeusseren Gegner zu treffen. Seit die Feuerlinie
    // schmaler ist und Gegner ueber die ganze Strasse anlaufen (beides 2026-08-23), MUSS
    // man dort kaempfen - und loeste dabei zwangslaeufig auch die roten Kacheln ein.
    //
    // Jetzt muss die Truppe zur HAELFTE in der Bahn stehen: 1,2 von 2,4 Figurenbreiten
    // Huelle (crowd.hullWidthFigures). Damit entsteht ein Kampfstreifen am Rand, in dem
    // man schiesst, ohne zu sammeln - wer sammeln will, faehrt bewusst ganz hinein.
    // Die Regel ist absichtlich eine Ueberlappung und keine Ankerposition: Sie gilt
    // dadurch unabhaengig von Bildschirmbreite und Perspektive.
    pickupOverlapFigures: 1.2,
    // ROT VERLANGT MEHR TIEFE ALS BLAU (Thomas 2026-08-23, dritte Meldung zum selben
    // Thema: "wenn man auf der linken Seite schiesst, nimmt man die +1 und -3
    // automatisch mit ohne es zu wollen").
    //
    // Bis hierher galt EINE Schwelle fuer beide Sorten. Das kollidiert baulich mit dem
    // Kampf am Rand: Die Feuerlinie ist 78 px breit (crowd.maxWidthRatio), der
    // Anflugbereich auf Kampfhoehe 155 px - wer die linken Gegner treffen will, MUSS
    // dorthin. Dieselbe Fingerbewegung steuert damit zielen, sammeln und ausweichen.
    // Zweimal an den Zahlen zu drehen (pickupOverlapFigures 0 -> 1,2 und drainTeam
    // 5 -> 3) hat das nicht geloest, weil nicht die Hoehe der Werte das Problem ist,
    // sondern dass eine einzige Achse drei Dinge zugleich entscheidet.
    //
    // 1,6 Figurenbreiten - GEMESSEN hergeleitet, nicht aus der Huellenbreite gegriffen.
    //
    // Erster Versuch war 2,2 von 2,4 Figurenbreiten Huelle. Im laufenden Spiel gemessen
    // (Level 11, Anker in Stufen festgehalten, Einloesungen je 5 s gezaehlt) war das
    // Ergebnis: rote Kacheln loesten NIRGENDS mehr aus, auch nicht am linkesten
    // fahrbaren Punkt. Der Grund steht in der Fahrgrenze, nicht in der Huelle: Die
    // Strassenkante deckelt den Anker bei x = 60,9 (getDriveLimitHalfWidth, outerLimit),
    // die Sammelbahn endet bei x = 84 - die groesstmoegliche Ueberlappung ist damit
    // 63,8 px = 1,88 Figurenbreiten. Alles ab 1,9 ist unerreichbar.
    //
    // Der gesamte Sammelbereich ist also nur 23 px Fahrweg breit (Anker 61 bis 84).
    // 1,6 = 54,4 px teilt ihn: rot ab Anker 70 und weiter links, blau im ganzen Bereich.
    // Das laesst 14 px, in denen man sammelt ohne zu verlieren.
    //
    // Der eigentliche Kampfstreifen liegt ohnehin RECHTS davon: Ab Anker 90 loest
    // gemessen gar nichts mehr aus, und dort (90 bis 160) findet der Kampf gegen die
    // linken Gegner statt. Genau das war Thomas' Anliegen.
    //
    // Ein Test haelt beide Enden fest - dass rot erreichbar BLEIBT und dass rechts der
    // Sammelbahn nichts ausloest. Der erste Test hatte nur die zweite Haelfte geprueft
    // und den unerreichbaren Wert durchgelassen.
    drainOverlapFigures: 1.6,
    // MINDESTE VERTIKALE UEBERLAPPUNG, in Figurenhoehen.
    //
    // GEMESSEN 2026-08-23 (Browser, Level 11, Truppe 48, Anker fest auf x=120): Eine
    // Kachel mit bahnY [609..677] loeste voll ein, waehrend die Truppenhuelle bei
    // huelleY [677..751] stand - die beiden beruehrten sich an GENAU EINER LINIE. Die
    // Pruefung in GameScene.crowdStehtInSammelbahn rechnete nur die X-Achse; die
    // Y-Achse ueberliess sie der Physik, und die meldet schon bei Kantenberuehrung.
    //
    // Das verschiebt die Ausloesezone spuerbar nach rechts: Kacheln laufen
    // perspektivisch, eine weiter oben stehende ragt weiter zur Strassenmitte
    // (gemessen rechter Rand 84,2 px bei centerY 643 gegen 77,8 px auf Truppenhoehe
    // 714). Ausgeloest wurde im Sweep bis Anker 120, waehrend die reine Geometrie auf
    // Truppenhoehe bei 90 Schluss macht.
    //
    // 0,5 Figurenhoehen = 23 px von 72 px Kachelhoehe: Die Kachel muss neben der Truppe
    // stehen, nicht ueber ihr. Kleiner waere wieder Kantenberuehrung, groesser wuerde
    // die kurzen Kacheln am Horizont ganz aussperren.
    pickupOverlapHeightFigures: 0.5,
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
    // WIE VIELE TORE EIN LEVELSPRUNG KOSTET (Thomas 2026-08-25: "bei den DMG und Rate
    // Waenden rechts - ich finde man erreicht zu schnell die hoechste Stufe im Level").
    //
    // DER FEHLER, gemessen: Ein Tor gab einen FESTEN Betrag (+0,5 Schaden, +0,2 Rate),
    // der Deckel waechst aber PROZENTUAL um 15,2 % je Level. In absoluten Zahlen ist ein
    // Levelsprung winzig - 0,23 Punkte bei Level 2, 0,92 bei Level 12. Ein einziges Tor
    // deckte ihn also ab Level 2 vollstaendig ab, waehrend je Level 22 bis 46
    // Schadens-Tore erscheinen (gemessen ueber 70 s, alle Level). Der Spieler war nach
    // rund zwei Prozent des Levels fertig und fuhr den Rest an wertlosen Toren vorbei.
    //
    // JETZT haengt der Zuwachs am Levelsprung selbst: Ein Tor bringt den 16. Teil davon,
    // also +0,88 % Schaden und +0,47 % Feuerrate. Die 16 ist aus dem gemessenen Angebot
    // abgeleitet, nicht gewaehlt:
    //   Level 1  braucht 46 Schadens-Tore vom Grundwert bis zum Deckel - Angebot 46.
    //            Fuer die Feuerrate 33 gegen 34. Level 1 ist damit genau ausgefuellt.
    //   Level 2+ braucht 16 von rund 30 Toren, der Deckel faellt also etwa zur
    //            Levelmitte. Das laesst Luft fuer verpasste und fuer rote Tore.
    // WER DIESE ZAHL AENDERT, muss die Anzeige mitpruefen: Bei 16 bewegt ein Tor den
    // Schadenswert um 0,015 bis 0,06 - deshalb zeigt das HUD seit derselben Aenderung
    // zwei Nachkommastellen. Mit einer waere jeder zweite Fund unsichtbar geblieben, und
    // genau daran ist im Juli schon der Ausbau des Run-Shops gescheitert.
    gatesPerLevelStep: 16,
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
    // sind, und startet mit einer einzigen Figur (stats.hp.base) - eine rote Kachel waere
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
    // 5 -> 3 (2026-08-23, gemessen). Die Herleitung darunter ("netto -2 je vier
    // Kacheln") stimmte rechnerisch, setzte aber voraus, dass man den roten Kacheln
    // AUSWEICHEN kann. Gemessen kostete Dauerfahrt an der Bahn 19 Figuren in 15 s
    // (16 gute gegen 7 rote) - also 1,3 Figuren je Sekunde MINUS, waehrend die Bahn
    // eigentlich die Quelle fuer Masse sein soll. Mit dem Kampfstreifen (siehe
    // pickupOverlapFigures) ist Ausweichen wieder moeglich, aber 5 blieb selbst dann zu
    // hart: Bei 1,875 Kacheln/s kommt rechnerisch alle 2,1 s eine rote, man muesste also
    // im Sekundentakt hinein und hinaus. Mit 3 kostet blindes Durchfahren rund 5 Figuren
    // je 23 Kacheln statt 19 - immer noch spuerbar negativ, wie im Entwurf gewollt, aber
    // kein Grund mehr, die linke Bahn ganz zu meiden.
    drainTeam: 3,
    // Was eine rote Kachel kostet, gemessen in guten Toren. Drei, weil auf drei gute
    // eine rote kommt (badChance mit badMaxRun verduennt) - blindes Draufhalten bringt
    // damit netto nichts, und genau das sichert wallLoss.test.ts ab.
    //
    // MUSSTE MIT PROZENTUAL WERDEN: Als fester Abzug von 1,5 kostete eine rote Kachel bei
    // Level 2 (Wert 1,73) fast den ganzen Schaden, bei Level 12 (Wert 7) nur ein Fuenftel.
    // Derselbe Fehler zeigte sich am selben Tag auf der Gewinnseite.
    badCostsGates: 3,
    // Wie tief die Truppe sich an eine Wand druecken darf, in Figurenbreiten ueber die
    // Wandinnenkante hinaus. 0.5 = die innerste Figur steht zur Haelfte in der Zone,
    // ihr Schussursprung damit sicher drin. Ohne diesen Ueberstand trifft die
    // Startformation gar nichts (beide Figuren stehen in der Mittelspur, halbe
    // Formationsbreite 0, Anker endet exakt auf der Kante — gemessen 0/2 Treffer).
    // Wandkontakt kostet weiterhin nichts; die Strassenkante bleibt harte Grenze.
    driveIntoWallFigures: 0.5,
  },
  // --- Weltthema (Thomas 2026-09-03, nach einem Genre-Video: "die Bruecke ueber
  // Wasser als zusaetzliches Level bauen - wir entscheiden dann ob wir switchen von
  // Level zu Level oder ob wir komplett umstellen auf diese Optik").
  //
  // Beide Entscheidungen haengen an EINEM Wort hier:
  //   'wechsel'  Stadt und Bruecke loesen einander ab (Default zum Beurteilen)
  //   'bruecke'  jedes Level spielt auf der Bruecke
  //   'stadt'    jedes Level spielt in der Stadt (Stand bis 2026-09-03)
  // Am Spielablauf aendert das Thema NICHTS: Fahrbahn, Waende, Sammelbahn, Gegner und
  // Boss sind identisch. Es ist reine Kulisse, damit die Wahl keine Balance-Frage ist.
  welt: {
    // ENTSCHIEDEN am 2026-09-04 (Thomas: "wasser und stadt level abwechselnd"). Der
    // Wechsel war bis dahin nur zum Beurteilen eingestellt; jetzt ist er die Wahl.
    thema: 'wechsel' as 'stadt' | 'bruecke' | 'wechsel',
    // Bei 'wechsel': Laenge eines Abschnitts in Leveln. 1 = jedes Level wechselt, also
    // Stadt, Bruecke, Stadt, Bruecke - so wie entschieden.
    wechselAlleLevel: 1,
    // Bei 'wechsel': Level 1 ist Stadt, Level 2 Bruecke. Der abgenommene Stand bleibt
    // damit der erste Eindruck.
    ersteBruecke: 2,
  },
  bruecke: {
    // Gelaenderhoehe auf Kampfhoehe, in Bildschirm-px. Ein Bruecken-Gelaender ist rund
    // 1,1 m hoch, eine Figur 1,75 m: 1,1/1,75 = 0,63 der Figurenhoehe. Bei 46 px
    // Figurenhoehe sind das 29 px. Es reicht der Truppe also bis knapp ueber die
    // Huefte - hoch genug, um als Gelaender lesbar zu sein, niedrig genug, um die
    // Fahrbahn nicht zu verdecken.
    railHeightPx: 29,
    // Dicke des Handlaufs oben, als Anteil der Gelaenderhoehe. Darunter ist der
    // Zwischenraum offen: Ohne ihn waere es eine Mauer, keine Bruecke.
    railTopShare: 0.22,
    // Pfosten: Breite auf Kampfhoehe und Abstand in Scroll-Anteilen. 16 Pfosten ueber
    // die sichtbare Strecke ergeben unten rund einen Pfosten je Figurenbreite - dicht
    // genug fuer die Tiefenwirkung, weit genug, dass daraus keine Wand wird.
    posts: 16,
    postWidthPx: 5,
    // Betonkante der Fahrbahn: Sie sitzt AUSSERHALB der Strassenkante und traegt das
    // Gelaender. Ohne sie schwebt die Strasse ueber dem Wasser.
    deckOverhangPx: 9,
    deckHeightPx: 7,
    // Wellen: Pool und Form. 40 -> 90 (Thomas 2026-09-04: das Wasser soll "noch
    // bewegter" sein). Die alte Zahl stand unter der Annahme, mehr wuerde das Bild
    // unruhig machen - diese Vorsicht ist damit ausdruecklich ueberstimmt. Sie war
    // ohnehin zu vorsichtig gerechnet: Die Sammelbahn links und die Wandkacheln rechts
    // verdecken den groessten Teil der Wasserflaeche, sichtbar ist nur ein schmaler
    // Streifen je Seite.
    waves: 90,
    waveWidthPx: 34,
    waveHeightPx: 3,
    // --- Kraeuseln (2026-09-04). Vorher zogen die Wellen als starre Striche vorbei;
    // Wasser bewegt sich aber AN SICH, nicht nur relativ zum Betrachter.
    //
    // Seitliches Schwingen: ein Viertel der Wellenbreite (34 / 4 = 8,5 px auf
    // Kampfhoehe). Darunter ist es nicht zu sehen, darueber wandert die Welle sichtbar,
    // statt zu schwingen.
    waveSwayShare: 0.25,
    // Kaemme tauchen auf und vergehen, statt dauerhaft dazustehen. 0,8 Hz entspricht
    // etwa der Periode einer Kraeuselung auf ruhigem Wasser.
    waveShimmerHz: 0.8,
    // Wie weit die Deckkraft dabei einbricht, als Anteil von waveAlpha. Bei 1 blinkt es,
    // bei 0 steht es still - 0,7 laesst den Kamm verschwinden und wiederkommen, ohne
    // dass ein hartes Blinken entsteht.
    waveShimmerDepth: 0.7,
    // Seitlicher Bereich, in dem Wellen liegen duerfen: ab der Bruecke nach aussen bis
    // zum Bildrand. Als Anteil der halben Bildbreite.
    waveSpreadShare: 1,
    waveAlpha: 0.5,
    // Anteil dunkler Wellentaeler am Pool. Wasser zeigt Kaemme und Senken etwa gleich
    // haeufig; etwas weniger Senken, weil die dunkle Farbe vor dem dunklen Vordergrund
    // ohnehin staerker traegt als die helle.
    troughShare: 0.45,
    // Jede Welle bekommt eine eigene Laenge zwischen diesen Faktoren. Gleich lange
    // Wellen lesen sich als Muster statt als Wasser.
    waveLengthMin: 0.55,
    waveLengthMax: 1.5,
    // Die Wellen laufen langsamer als die Bruecke an einem vorbeizieht: Wasser bewegt
    // sich nicht mit dem Fahrzeug mit. Anteil der Scrollgeschwindigkeit.
    waveScrollShare: 0.35,
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
    // OBERGRENZEN WACHSEN MIT DEM LEVEL (Thomas 2026-08-23, nach dem iPhone-Test:
    // "mein Team kann ich einfach stehen lassen in der Mitte und es laeuft durch" -
    // sein Screenshot zeigte auf LEVEL 2 bereits alle drei alten Deckel erreicht).
    //
    // Die alten festen Deckel (60 / 20 / 8) waren am 2026-08-22 gegen dieselbe
    // Beschwerde gesetzt worden und haben nicht gewirkt, weil nicht ihre HOEHE das
    // Problem war, sondern das TEMPO: Die linke Sammelbahn liefert 1,875 Kacheln je
    // Sekunde, davon drei Viertel gut - wer den roten ausweicht, gewinnt 1,41 Figuren
    // je Sekunde und steht nach 40 s am Deckel. Ein Level dauert 75-88 s.
    //
    // GEMESSEN am alten Stand (Truppe 60, Schaden 20, Rate 8, Laser): Feuerkraft
    // 2.867 Schaden/s gegen einen Bedarf von 18 auf Level 2 und 707 auf Level 12 -
    // Faktor 155 bzw. 4. Kein einziger Gegner erreichte die Truppe (0 von 388 auf
    // Level 2, 0 von 718 auf Level 12), und Ausweichen aenderte daran nichts:
    // stehend 388 Toetungen, pendelnd 425, Todeshoehe in beiden Faellen 225 px von
    // 714. Deshalb fuehlt sich Stehenbleiben richtig an - es IST egal, wo man steht.
    //
    // NEUE REGEL: Der Deckel folgt dem Bedarf des Levels. Bedarf = Nachschub in
    // Gegnern je Sekunde (im Browser gemessen: 6,5 auf Level 1 bis 12,6 auf Level 12)
    // mal deren mittleren Lebenspunkten (enemyWeights der Leveltabelle x
    // hpPerLevelGrowth). Zielkorridor ist eine Feuerkraft von rund dem 2,5-fachen
    // dieses Bedarfs - genug, um alles zu raeumen, aber nicht mehr beliebig viel.
    //
    // Die Endwerte sind daraus gerechnet, nicht gewaehlt:
    //   Level 12: Bedarf 705, Ziel 1.760 -> 8 Schuetzen x Bonus 4 x 7,0 x 8,0 = 1.792
    // Die Startwerte liegen knapp ueber den Basiswerten (Schaden 1, Rate 3), damit auf
    // Level 1 etwas zu gewinnen bleibt, ohne dass der Einstieg sofort ueberversorgt ist.
    // Der frueher hier bindende Upgrade-Shop ist am 2026-08-23 entfallen (Thomas: "Den
    // Shop kannst du streichen") - damit faellt auch die Untergrenze weg, die seine
    // gekauften Startwerte erzwungen haben, und die Kurve darf tief anfangen.
    //
    // Dazwischen wird EXPONENTIELL interpoliert, nicht linear: Der Bedarf waechst
    // selbst exponentiell (Lebenspunkte x 1,2 je Level), eine Gerade wuerde die
    // mittleren Level ueberversorgen. Gerechnet ergibt die Kurve 14,2x auf Level 1,
    // 8,5x auf Level 4, 4,6x auf Level 8 und 2,5x auf Level 12 - vorher 260x / 114x /
    // 21x / 4x. Ab Level 13 bleibt es beim Level-12-Deckel.
    //
    // Der Zufluss aus den Waenden bleibt bewusst UNVERAENDERT: Der Spieler sammelt
    // weiter gern und schnell, er laeuft nur frueher gegen einen Deckel, der zum
    // Level passt. Rote Kacheln ziehen weiter ab, Nachsammeln bleibt also noetig.
    // Die TRUPPENGROESSE bleibt fest gedeckelt: Sie ist Ueberlebenszeit, nicht
    // Feuerkraft. Gebremst wird stattdessen der Schadensbonus, den sie erzeugt -
    // siehe crowd.damageMultiplierCap*. So darf man weiter Figuren sammeln, ohne
    // dass die Feuerkraft mitwaechst.
    // TRUPPENGROESSE WAECHST JETZT AUCH MIT DEM LEVEL (2026-08-23, Thomas: "ich selbst
    // werde ja nie staerker in den Leveln oder schon? Bzw das Maximum an Team koennte man
    // von Level zu Level anheben" - und danach: "wir koennen auf Level 1 auch mit weniger
    // starten").
    //
    // Er hatte recht: Von den vier Groessen, die der Spieler ausbaut, war diese als
    // EINZIGE ueber alle Level fest (60/60), waehrend Schaden 4,7x, Feuerrate 2,3x und
    // der Truppenbonus 2,7x steigen durften. Das war ein Versehen aus dem Umbau vom
    // selben Tag, kein Entwurf - die Struktur dafuer stand schon da.
    //
    //   Level 1  = 30 = crowd.max. Keine Reserve: Was im Bild steht, ist alles, was man
    //              hat. Die klarste denkbare Regel fuer das erste Level - und auf Level 1
    //              gibt es ohnehin noch keinen Durchbruchschaden (breakthroughMinLevel 2).
    //   Level 12 = 100 = 30 sichtbar + 70 Reserve. Die Reserve ist aus dem GEMESSENEN
    //              Verlust hergeleitet, nicht gewaehlt: Am Level-12-Deckel kostet ein
    //              Durchbruch-Dauerbeschuss 0,375 Figuren/s (Truppe 60 -> 54 in 16 s),
    //              70 Reserve tragen davon 187 s. Im schlechtesten gemessenen Fall
    //              (Level 5, halb ausgebaut, ohne Sammeln: 1,0 Figuren/s) sind es 70 s,
    //              also knapp ein Level. Genau das soll eine Reserve leisten: einen
    //              schlechten Abschnitt ueberstehen, aber keinen ganzen Run.
    //
    // Faktor 3,3 ueber elf Level - dieselbe Groessenordnung wie bei den anderen drei
    // Ausbaugroessen. Sichtbar bleiben immer crowd.max Figuren, es waechst also nur der
    // Puffer. FEUERKRAFT ENTSTEHT DARAUS NICHT: Der Schadensbonus ist separat gedeckelt
    // (crowd.damageMultiplierCap*) und mit Truppe 30 bereits ausgereizt. Auch die
    // Gegner-Kopplung (enemy.firepowerCoupling) haengt an diesem gedeckelten Bonus, wird
    // also durch eine groessere Reserve nicht staerker.
    hp: { base: 1, capAtLevelOne: 30, capAtLevelTwelve: 100, floor: 0 },
    damage: { base: 1, capAtLevelOne: 1.5, capAtLevelTwelve: 7, floor: 1 },
    shotsPerSec: { base: 3, capAtLevelOne: 3.5, capAtLevelTwelve: 8, floor: 1 },
    // Gegnertempo. Seit 2026-08-22 KEIN Ausbau mehr, sondern reine Levelgroesse
    // (Thomas: "tempo einfach mit den leveln beschleunigen, kein seltenes tor daraus
    // machen und dann aus dem HUD raus nehmen"). Der Spieler kann es nicht beeinflussen,
    // also gehoert es weder in ein Tor noch in die Anzeige.
    // Hergeleitet ueber die vorhandene Haertekurve des Projekts (level.hardness):
    // 105 x hardness, also 105 bei Level 1 und 105 x 1,495 = 157 bei Level 12, gedeckelt
    // bei hardness.max 1,6 = 168. Die Reaktionszeit vom Horizont bis zur Truppe
    // (564 px) sinkt damit von 5,4 s auf 3,6 s - spuerbar enger, aber weit davon
    // entfernt, eine Horde unbeschiessbar zu machen.
    // Gegnertempo, kein Spielerwert - deshalb weiter ein FESTER Deckel.
    speed: { base: 105, capAtLevelOne: 305, capAtLevelTwelve: 305, floor: 70 },
    // WACHSTUM DER SPIELERDECKEL IM ENDLOSBEREICH (E1, 2026-08-24).
    //
    // DIE WICHTIGSTE ZEILE DIESES BLOCKS: Der Zuwachs liegt auf GENAU EINER Groesse.
    // Feuerkraft ist das Produkt aus Schuetzenzahl x Truppenbonus x Schaden x Rate -
    // wer einen Zuwachs auf mehrere dieser Faktoren legt, multipliziert ihn. Der erste
    // Modelllauf zu E1 tat genau das (Schaden, Rate und Truppenbonus je +5 %/Level, also
    // kubisch): Das Verhaeltnis aus Feuerkraft und Bedarf fiel bis Level 20 auf 0,87 und
    // stieg dann wieder auf 5,92 (L25) und 9,25 (L30) - das Spiel waere nach dem
    // Reparieren des Modulo-Sprungs ab Level 25 erneut zu leicht geworden. Derselbe
    // Fehler steht im V3-Plan schon einmal (geplant +38 %, real +92 %).
    //
    // Deshalb: shotsPerSec und der Truppen-Schadensbonus (crowd.damageMultiplierCap*)
    // bleiben auf ihrem Level-12-Wert stehen. Nur damage waechst.
    endless: {
      // Spielerschaden je Level ueber level.endless.fromLevel. Herleitung des Abstands
      // zur Gegnerkurve steht bei enemy.endlessHpGrowthPerLevel.
      // Level 30: 7,0 x 1,004^18 = 7,5 · Level 50: 8,2.
      damageGrowthPerLevel: 1.004,
      // Truppenreserve. Sie ist UEBERLEBENSZEIT, nicht Feuerkraft - der Schadensbonus
      // daraus bleibt bei seinem Level-12-Deckel, eine groessere Reserve macht also
      // nicht staerker, sondern nur laenger durchhaltend. Sie muss mitwachsen, weil der
      // Anteil schwerer Gegner steigt und die mit contactDamage 2 durchbrechen statt
      // mit 1: Bei Level 30 sind 38 % der Horde schwer gegen 20 % auf Level 12.
      // Level 30: 100 x 1,01^18 = 120 · Level 50: 146.
      hpGrowthPerLevel: 1.01,
    },
  },
  // AUFWERTUNGEN ZWISCHEN DEN LEVELN (Thomas 2026-08-23, nach Bennis Wunsch: "nach jedem
  // Level die Moeglichkeit seine DMG Rate und das maximale Team gegen Bezahlung
  // upzugraden").
  //
  // VORGESCHICHTE, die den Bauplan bestimmt: Einen Shop gab es schon; Thomas hat ihn am
  // 2026-08-23 gestrichen (Commit 120f784, "nicht notwendig"). Der Grund steht dort: Die
  // Deckel sind ueber die beiden Wandbahnen nach rund 40 s von selbst erreicht, ein Level
  // dauert 75-88 s. Was zusaetzlich obendrauf kommt, macht das Spiel leichter.
  //
  // Thomas hat sich am 2026-08-23 bewusst fuer genau das entschieden ("die automatische
  // Erhoehung pro Level von Team rate dmg usw soll bleiben - das kaufen dazwischen wird
  // zum Bonus"). Die Aufgabe ist deshalb nicht, den Effekt zu vermeiden, sondern ihn zu
  // BEGRENZEN und messbar zu halten.
  shop: {
    // Preis je Stufe, Index 0 = erste Stufe (kaufbar nach Level 1).
    //
    // GEMESSEN 2026-08-23 im Browser (Truppe 40 mittig, Deckelwerte, je 40 s in der
    // Normalphase, gedroppte gegen eingesammelte Muenzen):
    //   Level 1: 4,55 Muenzen/s   Level 4: 6,75   Level 8: 10,07   Level 12: 13,30
    //   Einsammelquote 97,8-100,2 % - der Magnet (coins.magnetRadius 200 px bei 390 px
    //   Bildbreite) holt praktisch alles. Die Planannahme von 80 % war zu pessimistisch.
    //
    // Daraus die Einnahme je Level = Rate x (normalPhaseSec + 12,5 s Bossphase bei halber
    // Rate) + boss.coinReward:
    //   L1 423 · L2 503 · L3 570 · L4 649 · L5 726 · L6 820 · L7 898 · L8 997 · L9 1.075
    //   L10 1.176 · L11 1.255 · L12 1.362 - zusammen 10.454 je vollem Run.
    //
    // PREIS = 200 % der Einnahme des Levels (E2, Thomas 2026-08-24: "durchaus so, dass
    // man zwei Level spielen muss, um sich ein Upgrade zu kaufen").
    //
    // Vorher waren es 37,5 %, also gut ein Drittel eines Levels je Stufe - man kaufte
    // fast alles. Die Preise sind daraus mit Faktor 5,3 hochgerechnet, der Verlauf ueber
    // die Stufen bleibt derselbe.
    //
    // NACHGERECHNET, weil eine erste Schaetzung falsch war: Aus dem Geldanteil (10.454
    // Einnahme gegen rund 36.000 fuer alle Stufen) wurden zuerst "4-6 Stufen je Run"
    // gefolgert. Das ist der falsche Schluss - bei steigenden Preisen kauft man ZUERST
    // die guenstigen fruehen Stufen, der Stufenanteil liegt also ueber dem Geldanteil.
    // Simuliert mit den gemessenen Level-Einnahmen und der Regel "immer die guenstigste
    // leistbare Stufe, beide Linien": 9 Stufen bis Level 12 fuer 9.910 Muenzen, Rest 544.
    // Genau der Korridor, den der V4-Plan als Akzeptanz nennt (8-10 von 22).
    //
    // ES BLEIBEN ELF STUFEN - und das ist ein Befund, kein Versehen. Der V4-Plan nennt
    // als Folgefund, dass der Shop im Endlosbereich ab Level 13 LEER ist, und schlaegt
    // vor, die Stufenzahl mitwachsen zu lassen. Der Versuch (22 Stufen, Wirkung je Stufe
    // entsprechend halbiert, damit die gemessene Endwirkung gleich bleibt) ist an einem
    // bestehenden Test gescheitert: Bei halber Wirkung BEWEGT EIN KAUF DIE ANZEIGE NICHT
    // MEHR - auf Level 1 bleibt der Schadenswert nach zwei Kaeufen sichtbar bei 1,5. Ein
    // Kauf fuer 850 Muenzen, der nichts anzeigt, ist schlimmer als ein Shop, der spaeter
    // nichts mehr anbietet.
    //
    // OFFEN FUER THOMAS: Mehr Stufen gehen nur, wenn entweder die Anzeige feiner wird
    // (zwei Nachkommastellen) oder die Endwirkung des Run-Shops steigen darf - Letzteres
    // beruehrt die gemessene Grenze von 1,40, ueber der Level 12 seinen Druck verliert.
    //
    // Der Rest fliesst aufs Konto und finanziert die dauerhaften Aufwertungen (meta) -
    // deren Preise sind auf genau diesen schmalen Rest gerechnet.
    prices: [850, 1010, 1110, 1270, 1430, 1640, 1800, 1960, 2120, 2330, 2490],
    // TRUPPE ist der grosszuegige Knopf, und das ist kein Gefuehl, sondern Bauart: Aus
    // ihr entsteht KEINE Feuerkraft. Der Schadensbonus der Truppe ist bei 30 Figuren
    // ausgereizt (crowd.damageMultiplierCap, per Test gesichert), alles darueber ist
    // Reserve, also Ueberlebenszeit. Ein grosser Truppenbonus macht das Spiel
    // nachsichtiger, nicht schneller - er verzeiht Fehler, statt Gegner wegzuraeumen.
    // 8 % je Stufe, 11 Stufen = +134 % Reserve (Level 12: Deckel 100 -> 234).
    teamBonusPerStep: 0.08,
    // FEUERKRAFT braucht einen harten Deckel. Die heutigen Grenzen liefern gemessen das
    // 14,2-fache des Bedarfs auf Level 1, 8,5-fach auf Level 4, 4,6-fach auf Level 8 und
    // nur noch 2,5-fach auf Level 12 (Herleitung bei stats). Unten ist viel Luft, oben
    // fast keine. Ziel ist ein Gesamtbonus von rund +38 %: Das hebt Level 12 von 2,5x auf
    // 3,5x Bedarf. MEHR IST OHNE NEUE MESSUNG NICHT ZULAESSIG - darueber verliert das
    // Endspiel seinen Druck, und genau das war der Befund, den Thomas dreimal korrigieren
    // musste.
    //
    // ZWEI WERTE, UNGLEICH VERTEILT - beides ist gerechnet, nicht gewaehlt.
    //
    // (1) Der Planentwurf hatte 3 % auf beide Werte vorgesehen und dabei einen
    //     Rechenfehler gemacht, den erst der Test gefangen hat: Die Stufe hebt SCHADEN
    //     UND FEUERRATE, und Feuerkraft ist deren PRODUKT. Der Bonus wirkt damit
    //     quadratisch - 1,03^11 x 1,03^11 = 1,92, also +92 % statt der gewollten +38 %.
    //
    // (2) Gleichmaessig verteilt (1,5 % auf beide) stimmt die Summe, aber die ANZEIGE
    //     ruehrt sich nicht: Schaden wird auf eine Nachkommastelle gerundet, und
    //     3,02 x 1,015 = 3,065 bleibt 3,0 bzw. springt erst nach zwei Kaeufen. Fuer einen
    //     Siebenjaehrigen ist ein Knopf, der sichtbar nichts tut, ein kaputter Knopf.
    //
    // Deshalb faellt der Loewenanteil auf den Schaden - die Zahl, die Benni meint:
    //   1,025^11 = 1,312  x  1,005^11 = 1,056  ->  1,386, also +39 % Feuerkraft.
    // Schaden springt damit ab Level 4 bei JEDEM Kauf sichtbar, auf Level 1 bei jedem
    // zweiten. Wer diese Werte aendert, rechnet den Gesamtfaktor als PRODUKT beider
    // Reihen - ein Test haelt die Obergrenze fest.
    damageBonusPerStep: 0.025,
    rateBonusPerStep: 0.005,
    // Hoechstens eine Stufe je Knopf und Levelpause. Ohne diese Regel kauft ein volles
    // Konto nach Level 1 alles frei, und der Bonus ist kein Bonus mehr, sondern ein
    // Startvorteil. Damit bleibt die Kurve auch bei reichem Konto an die Levelzahl
    // gebunden.
    maxStepsPerPause: 1,
    // Masse des Overlays. Ueber dem HUD (hud.depthText 91), damit nichts durchscheint.
    // Grosse Flaechen statt kleiner Zeilen: Der Tester ist 7 und tippt mit dem Daumen.
    ui: {
      // Fast deckend: Bei 0,88 blieb das laufende Spielfeld so deutlich sichtbar, dass
      // die Knoepfe darin untergingen (Screenshot-Pruefung 2026-08-23).
      overlayAlpha: 0.97,
      sidePadding: 20,
      // Unter dem HUD-Panel: Es reicht bis hud.padding 12 + hud.panelHeight 62 = 74 px
      // unter die Safe Area. Bei 70 lag die Ueberschrift darauf.
      titleY: 106,
      titleFontPx: 26,
      balanceY: 148,
      balanceFontPx: 24,
      firstButtonY: 196,
      // 112 STATT 132 (2026-08-25): Die zwei Kaufknoepfe waren die groessten Flaechen des
      // Bildschirms und nahmen der Waffenwahl darunter den Platz. Auf dem iPhone blieben
      // zwischen dem zweiten Knopf und SPEICHERN & BEENDEN nur 51 px fuer Titel und zwei
      // Kachelreihen - die Kacheln waeren auf 23 px geschrumpft. Mit 112 sind es 91 px
      // und die Kacheln behalten ihre volle Hoehe. Der Knopfinhalt braucht 103 px:
      // Titel (26 px Schrift, Mitte bei 30) bis Preis (22 px, Mitte bei 92) - passt.
      buttonHeight: 112,
      buttonGap: 22,
      buttonTitleY: 30,
      buttonTitleFontPx: 26,
      buttonEffectY: 62,
      buttonEffectFontPx: 15,
      buttonPriceY: 92,
      buttonPriceFontPx: 22,
      continueBottomOffset: 70,
      continueHeight: 76,
      continueFontPx: 26,
      // "SPEICHERN & BEENDEN" ueber WEITER: kleiner und ruhiger, weil es der seltenere
      // Weg ist - aber sichtbar, damit man nicht die App wegwischen muss.
      quitGap: 14,
      quitHeight: 48,
      quitFontPx: 17,
      disabledAlpha: 0.45,
      // WAFFENWAHL VOR DEM LEVEL (2026-08-25). Ihre POSITION steht nicht mehr hier,
      // sondern wird in shopWeaponRow.ts aus dem freien Raum zwischen dem zweiten
      // Kaufknopf und SPEICHERN & BEENDEN gerechnet. Grund steht dort: Die feste Zahl
      // haing an der oberen Safe Area, der Knopf darunter an der unteren - auf dem iPhone
      // lag die zweite Reihe deshalb unter dem Knopf und war nicht antippbar.
      //
      // SIEBEN STATT SECHS JE REIHE: Zwei Reihen a sechs sind zwoelf Plaetze - es gibt
      // aber DREIZEHN Waffen. Wer alle gekauft hat und weit genug ist, saehe eine davon
      // nicht mehr. Zeilenbreite jetzt 7 x 40 + 6 x 5 = 310 von 390 px Spielbreite.
      weaponTileWidth: 40,
      weaponTileHeight: 40,
      // Untergrenze, wenn der Platz fuer die volle Hoehe nicht reicht. 26 px sind mit dem
      // 20 px hohen HUD-Bild darin noch ein Tippziel, das ein Kind trifft.
      weaponTileMinHeight: 26,
      weaponTileGap: 5,
      weaponsPerRow: 7,
      weaponRows: 2,
      weaponTitleHeight: 18,
      weaponRowMargin: 8,
      depthPanel: 120,
      depthText: 121,
    },
  },
  // WEITERSPIELEN NACH DEM SCHEITERN (Benni: "wenn man ein level nicht schafft, dann soll
  // man es gegen Bezahlung von Muenzen nochmal spielen koennen").
  // DAUERHAFTE AUFWERTUNGEN IM HAUPTMENUE (E4, Benni ueber Thomas 2026-08-24: "dauerhafte
  // Aufwertungen im Hauptmenue fuer Feuerkraft und Truppe, die ueber Runs hinweg bleiben -
  // muss halt sehr teuer sein").
  //
  // WARUM DAS JETZT GEHT, obwohl derselbe Wunsch am 2026-08-23 gestrichen wurde: Der
  // Einwand war "sie summieren sich ueber viele Runs, bis das Spiel von selbst
  // durchlaeuft". Das galt, solange die Schwierigkeit bei Level 12 endete. Seit E1
  // endlos weiterrechnet, sind sie die Voraussetzung dafuer, dass ein Kind je Level 25
  // sieht - dauerhafter Fortschritt PLUS endlose Steigerung, beides zusammen traegt.
  //
  // NUR EINE GROESSE JE LINIE, sonst wirkt der Zuwachs multiplikativ: SCHLAGKRAFT geht
  // ausschliesslich auf damage, MANNSCHAFT ausschliesslich auf die Truppengroesse. Aus
  // der Truppe entsteht keine Feuerkraft (crowd.damageMultiplierCap ist bei 30 Figuren
  // ausgereizt), sie kauft Ueberlebenszeit.
  meta: {
    // Preise, Index 0 = erste Stufe. 4.500 dann x1,7, auf Hunderter gerundet.
    //
    // GERECHNET aus dem, was ein Run uebrig laesst - und das kommt aus dem
    // ENDLOSBEREICH: Bis Level 12 bleiben nach dem Run-Shop nur rund 124 Muenzen ueber.
    // Ab Level 13 ist der Run-Shop erschoepft, dort fliesst alles aufs Konto. Mit der
    // gemessenen Muenzrate bringt ein Run bis Level 16 rund 5.900 aufs Konto, bis
    // Level 20 rund 12.600, bis Level 30 rund 32.600.
    //
    // AM 2026-08-25 UM 25 % GESENKT (Thomas: "auch die aufwertungen im shop billiger
    // machen 25 %"), zusammen mit den Waffenpreisen. Die erste Stufe ist damit schon
    // nach einem Run bis Level 15 drin statt bis Level 16, beide Linien voll auszubauen
    // kostet 84.900 statt 113.140 - ein Ziel ueber viele Abende bleibt es.
    prices: [4500, 7700, 13000, 22100, 37600],
    // +4 % je Stufe, fuenf Stufen = +21,7 % je Linie. Bewusst klein: Der Run-Shop bringt
    // bei vollem Ausbau bereits +38,5 % Feuerkraft.
    firepowerBonusPerStep: 0.04,
    teamBonusPerStep: 0.04,
    // GEMEINSAMER DECKEL fuer Meta UND Run-Shop (der Zielkonflikt aus dem V4-Plan).
    // Feuerkraft ist das Produkt aus Schuetzenzahl, Truppenbonus, Schaden und Rate; bei
    // zwei multiplikativen Quellen potenziert sich jeder Fehler. Gerechnet:
    //   Run-Shop voll: damage 1,025^11 x rate 1,005^11 = 1,385
    //   Meta voll:     1,04^5 = 1,217
    //   zusammen:      1,686
    // 1,70 laesst gerade so viel Luft, dass keine der beiden Quellen den Deckel allein
    // durch Rundung reisst. Ein Test haelt ihn gegen die Einzelwerte - damit eine
    // spaetere Aenderung an einer der beiden ihn nicht still ueberschreitet.
    totalBoostCap: 1.7,
    // DAUERHAFT GEKAUFTE WAFFEN (Benni ueber Thomas 2026-08-25: "er will Waffen kaufen
    // koennen, die er dann IMMER hat, abgeloest von Run oder neuem Spiel - wenn wir das
    // so machen, muessen sie natuerlich entsprechend teuer sein, damit er sie nicht
    // sofort kaufen kann").
    //
    // WAS DER KAUF GENAU BEWIRKT - das ist der Unterschied, der die Balance rettet: Er
    // schaltet die Waffe in den WANDTOREN frei, ab Level 1 und dauerhaft. Er legt sie
    // dem Spieler NICHT in die Hand. Man muss das Tor weiterhin finden und
    // zerschiessen, und die Ziehung ist gewichtet (weapon.rewardNewnessBias). Gekauft
    // wird also die Moeglichkeit, nicht die Waffe.
    //
    // DER PREIS STEHT JE WAFFE (BALANCE.weapon.<name>.unlockPrice), abgeleitet aus der
    // GEMESSENEN Staerke statt aus der Levelnummer. Am 2026-08-25 um 22 % gesenkt
    // (Thomas: "im shop die Waffen billiger machen ca. 20-25 % - aber dafuer dann die
    // moeglichkeit die Waffen upzugraden"). Zusammen kosten die zwoelf Waffen jetzt
    // 78.000 statt 99.900; der Ausgleich steckt in der Aufruestung unten.
    //
    // DIE PISTOLE FEHLT BEWUSST: Sie ist die Startwaffe, es gibt nichts freizuschalten.

    // AUFRUESTUNG JE WAFFE (Thomas 2026-08-25: "dafuer dann die moeglichkeit die Waffen
    // upzugraden - gegen Bezahlung 5 Stufen jeweils die feuerkraft erhoehen").
    //
    // WARUM DAS NICHT UNTER DEN GEMEINSAMEN DECKEL FAELLT (totalBoostCap): Der Deckel
    // sitzt auf den RUN-WERTEN damage und shotsPerSec, die jede Waffe gleichermassen
    // tragen. Die Aufruestung sitzt am damageFactor GENAU EINER Waffe. Zwei Gruende, das
    // getrennt zu halten:
    //   1. Unter dem Deckel waere sie beim Vielspieler wirkungslos - und ein Kauf, der
    //      nichts bewirkt, ist die teuerste Art, Vertrauen zu verlieren (die Lektion vom
    //      2026-08-25: erst pruefen, ob ein Zugewinn ueberhaupt EXISTIERT).
    //   2. Sie ist kein Dauerbonus, sondern an eine Entscheidung gebunden: Wer mit der
    //      aufgeruesteten Waffe spielen will, muss sie tragen - und traegt damit nicht
    //      die staerkere, die im Wandtor haengt.
    //
    // +7 % JE STUFE, fuenf Stufen also +40 % auf EINE Waffe. Groesser gerechnet: Der
    // Abstand zwischen zwei benachbarten Waffen der Staffelung liegt bei 15 bis 30 %
    // (killsPerSec 3,40 -> 3,97 -> 4,83 -> 5,07). Voll ausgebaut schiebt sich eine Waffe
    // damit um ein bis zwei Plaetze nach oben, nicht an die Spitze. Kleiner als 5 %
    // waere die einzelne Stufe nicht spuerbar, groesser als 10 % ersetzte der Ausbau die
    // Staffelung.
    weaponSteps: 5,
    weaponStepFirepowerBonus: 0.07,
    // PREIS DER STUFEN, aus dem Waffenpreis gerechnet: 30 % fuer die erste, dann x1,45.
    // Der Vollausbau kostet damit das 3,6-Fache der Waffe. Beispiele:
    //   Sturmgewehr (1.900):  600 / 800 / 1.200 / 1.700 / 2.500  = 6.800
    //   Streubombe (15.600): 4.700 / 6.800 / 9.800 / 14.200 / 20.600 = 56.100
    //
    // GEGENGERECHNET an dem, was ein Run aufs Konto bringt (bis Level 16 rund 5.900, bis
    // Level 20 rund 12.600, bis Level 30 rund 32.600): Die ersten zwei Stufen einer
    // guenstigen Waffe sind nach einem Run drin, der Vollausbau einer teuren Waffe ist
    // ein Ziel ueber viele Abende. Genau dafuer sind die Waffen billiger geworden - der
    // Kauf ist der Einstieg, nicht mehr das Endziel.
    // WORAUS DIE PISTOLENSTUFEN GERECHNET WERDEN (Thomas 2026-08-26: "pistole soll man
    // auch aufruesten koennen, die muss man aber nicht extra kaufen, sondern die soll man
    // einfach immer haben").
    //
    // Die Pistole hat keinen Kaufpreis - es gibt nichts freizuschalten, man hat sie ab
    // dem ersten Start. Der Stufenpreis braucht aber eine Basis. HERGELEITET wie alle
    // anderen Waffenpreise aus der gemessenen Staerke: Die guenstigste kaufbare Waffe ist
    // die Schrotflinte mit 1.600 bei killsPerSec 3,13; die Pistole liegt bei 1,75, also
    // 1.600 x 1,75/3,13 = 895 -> 900. Ihre fuenf Stufen kosten damit 300 / 400 / 600 /
    // 900 / 1.300, zusammen 3.500 - der billigste Ausbau des Spiels, passend zur
    // schwaechsten Waffe.
    pistolStepBasePrice: 900,
    weaponStepPriceShare: 0.3,
    weaponStepPriceGrowth: 1.45,
  },
  // DAS TESTGELAENDE (Benni ueber Thomas 2026-08-25: "ob es sowas wie ein testlevel
  // geben kann, wo man alle waffen einzeln ausprobieren kann").
  //
  // Es ist bewusst KEIN eigener Spielmodus mit eigener Schleife, sondern das normale
  // Spiel mit drei Aenderungen: Die Truppe kann nicht sterben, es wird NICHTS
  // gespeichert, und das Level endet nie. Alles andere - Gegner, Wandtore, Sammelbahn,
  // Muenzen - laeuft wie immer. Eine zweite Spielschleife waere die teuerste Art, diesen
  // Wunsch zu erfuellen, und die erste, die bei jeder Aenderung am Spiel veraltet.
  //
  // LEVEL 5 als Buehne: Level 1 ist zu leer, um einen Unterschied zwischen zwei Waffen
  // zu sehen (dort ist der Gegnernachschub der Engpass, nicht die Feuerkraft - gemessen
  // am 2026-08-25). Ab Level 8 kommt so viel, dass man das Ausprobieren nicht mehr in
  // Ruhe beobachten kann.
  testground: {
    level: 5,
    // Feste Truppengroesse. 30 ist der Punkt, an dem der Schadensbonus aus der
    // Truppengroesse ausgereizt ist: Ab hier haengt der Unterschied zwischen zwei Waffen
    // NUR noch an der Waffe.
    truppe: 30,
    // WIE LANGE DIE GEGNERPHASE DAUERT, bevor der Boss kommt (Thomas 2026-08-26: "es
    // darf nicht so lange dauern wie ein normales Level, maximal die Haelfte - und es
    // muss einen Boss geben").
    //
    // GERECHNET, nicht gesetzt. Ein normales Level 5 besteht aus Gegnerphase 80 s +
    // Warnung 1,5 s + Bosskampf + "geschafft" 1,8 s. Der Bosskampf ist die feste Groesse:
    // Er darf NICHT gekuerzt werden, sonst waere der Bosstest wertlos - und er dauert auf
    // Level 5 zwischen 30 s (boss.referenceFirepower.minFightSec) und 36,2 s (34 plus
    // 4 x 0,545). Damit bleibt fuer die Gegnerphase:
    //   20 s + 1,5 + 30,0 + 1,8 = 53,3 s von 113,3 s = 47,0 %   (kurzer Bosskampf)
    //   20 s + 1,5 + 36,2 + 1,8 = 59,5 s von 119,5 s = 49,8 %   (langer Bosskampf)
    // 22 s reissen die Haelfte beim langen Bosskampf (51,5 %), 20 s halten sie in beiden
    // Faellen. Ein Test rechnet beide Grenzen nach.
    normalPhaseSec: 20,
    // Kulisse des Testgelaendes (Thomas 2026-09-04: "ein zusaetzliches Testlevel mit der
    // Bruecke, sodass wir in diesem Testlevel alles Neue pruefen koennen ohne den
    // eigentlichen Run angreifen zu muessen"). Fest, nicht ueber die Levelnummer: Das
    // Testgelaende spielt auf Level 5, und welches Thema dort nach der Wechselregel
    // faellig waere, ist Zufall - hier soll immer die Bruecke stehen.
    thema: 'bruecke' as const,
  },
  continueRun: {
    // 250 x erreichtes Level: 750 auf Level 3, 2.000 auf Level 8, 3.000 auf Level 12.
    // Gegenprobe an der Einnahme: Ein voller Run bringt 10.454 und kostet 6.800 an Stufen,
    // es bleiben rund 3.650 - etwa ein Weiterspielen je Run ist finanzierbar. Ein frueher
    // Tod auf Level 3 laesst rund 940 gegen 750 Preis, also gerade so.
    pricePerLevel: 250,
    // Jedes weitere Mal im selben Run kostet doppelt.
    priceDoubling: 2,
    // Danach ist Schluss - sonst spielt man einen Run endlos durch.
    maxPerRun: 2,
    // Das Level beginnt von vorn, die Truppe startet bei der Haelfte des Deckels:
    // spuerbare Strafe, aber spielbar. Voll waere Sterben folgenlos, mit 1 Figur (dem
    // Run-Startwert) waere es auf Level 8 aussichtslos.
    teamShareOnContinue: 0.5,
  },
  menu: {
    // topPadding, titleY, balanceY, rowHeight und rowGap sind am 2026-08-23 (W6)
    // entfernt worden: Sie stammen aus dem Upgrade-Shop, der am selben Tag entfallen
    // ist, und wurden seither von keiner Zeile mehr gelesen. Das Menue rechnet seine
    // Positionen in menuLayout.ts aus den Safe-Area-Insets.
    overlayAlpha: 0.20,
    sidePadding: 18,
    scoresShown: 5,
    // WIE LANGE MAN DEN TITEL HALTEN MUSS, um ans Zuruecksetzen zu kommen (2026-08-26).
    //
    // Der Knopf stand bis dahin offen im Menue, hinter einer Sicherheitsfrage - Benni ist
    // trotzdem hineingeraten und hat sie mit durchgetippt. Drei Sekunden sind laenger als
    // jeder versehentliche Druck und kurz genug, dass ein Erwachsener nicht denkt, es sei
    // kaputt. Ein Tipp allein loest nichts aus, auch ein schneller Doppeltipp nicht.
    resetHoldMs: 3000,
  },
  // WAFFENBALANCE 2026-08-23 (Thomas: "Minigun macht kaum Schaden").
  //
  // Gemessen wurde die Feuerkraft jeder Waffe bei voller Truppe, einmal gegen ein
  // Einzelziel und einmal gegen eine Horde - dort zaehlen Durchschlag, Splash und Kette
  // mit, weil sie mehrere Gegner gleichzeitig treffen:
  //   Schrot 4,20x  ·  Kette 1,46x  ·  Flamme 1,15x  ·  Laser 1,12x  ·  Standard 1,00x
  //   Rakete 0,76x  ·  MINIGUN 0,23x
  // Zwischen Minigun und Schrot lagen damit Faktor 18. Thomas' Befund war also kein
  // Gefuehl: Die Minigun war die schwaechste Waffe im Spiel, 4,3x unter der Standard-
  // waffe, weil sie als einzige gar nichts hat - kein Durchschlag, kein Splash, keine
  // Kette - und trotzdem nur mit 3 statt 8 Figuren feuerte.
  //
  // Ziel ist ein enges Band um die Standardwaffe (1,00x bis 1,3x): Waffen sollen sich
  // im CHARAKTER unterscheiden (Reichweite, Takt, Flaeche), nicht in der Staerke.
  // Erreicht wurde 1,00x bis 1,27x - die Spanne faellt damit von 18 auf 1,27.
  //
  // WARUM DAS DER RICHTIGE HEBEL IST: Thomas' urspruenglicher Auftrag lautete, die
  // Gegnerstaerke an Waffe und Truppengroesse anzupassen. Genau diese Kopplung ist im
  // Projekt schon einmal gebaut und wieder ausgebaut worden (siehe walls: eine aus
  // der Spielerstaerke abgeleitete Haerte macht JEDE Verbesserung wirkungslos). Nach
  // dem Hinweis darauf hat Thomas entschieden: "Aber dann muessen wir das anders
  // loesen". Die Waffen anzugleichen loest dasselbe Problem an der Wurzel - ist die
  // Waffe keine Stoergroesse mehr, muss die Gegnerstaerke sie auch nicht ausgleichen.
  // Die Anpassung an den Spielfortschritt laeuft weiter ueber die LEVELNUMMER
  // (enemy.hpPerLevelGrowth und die Level-Deckel bei BALANCE.stats).
  // WAFFEN-STAFFELUNG (Benni ueber Thomas 2026-08-23: "die besseren Waffen sollen auch
  // erst in den hoeheren Leveln kommen - also immer noch was Neues dazu").
  //
  // NEU SORTIERT AM 2026-08-25, nachdem Thomas meldete: "flammenwerfer ist schlechter als
  // Laser, obwohl er spaeter kommt". Er hatte recht, und die Ursache steckte in der
  // Kennzahl, nach der frueher gestaffelt wurde.
  //
  // DER FEHLER: Gestaffelt wurde nach getWeaponFirepower. Diese Groesse zaehlt
  // Durchschlag, Sprengwirkung und Kettenspruenge ABSICHTLICH nicht mit - sie ist fuer
  // den Bosskampf gedacht, und dort gibt es nur ein Ziel. Im Normalspiel fliegen die
  // Gegner in Reihen an, und genau diese Eigenschaften entscheiden. Nach der Kennzahl
  // lagen alle Waffen im engen Band 1,15 bis 1,27; tatsaechlich gemessen liegen zwischen
  // der schwaechsten und der staerksten FAKTOR ACHT.
  //
  // GEMESSEN (Level 18, Ueberlast: Truppe 6, Schaden 2, Rate 3 - erst dort trennen sich
  // die Waffen, sonst ist der Nachschub der Engpass und jede raeumt weg, was ankommt).
  // Median aus zwei Laeufen, 30 s nach 8 s Einschwingen, Sonde: scratchpad/waffenkraft.mjs.
  // Die Zahl in Klammern ist, was trotzdem durchkommt - die eigentliche Erlebnisgroesse.
  //    1 PISTOLE        1,75 Toet./s (11,0 durch)   Startwaffe, schwaechste
  //    2 STURMGEWEHR    3,40 (10,1)                 Bezugswaffe
  //    3 SCHROTFLINTE   3,13  (9,7)                 Streuung
  //    5 MINIGUN        3,97  (9,4)                 Dauerfeuer
  //    7 FLAMME         4,83  (8,4)                 Faecher, Nahbereich
  //    9 BLITZ          5,07  (9,7)                 springt auf Nachbarn ueber
  //   11 RAKETE         7,47  (4,3)                 Sprengwirkung
  //   13 PRELLSCHUSS    7,67  (6,6)                 Durchschlag
  //   15 SAEGEBLATT     7,67  (5,4)                 Durchschlag, langsam
  //   18 LASER          8,27  (6,6)                 Durchschlag, lange Reichweite
  //   21 GRANATE       10,27  (2,9)                 grosser Sprengradius
  //   25 SCHOCKWELLE   12,47  (0,9)                 wirkt rundum
  //   30 STREUBOMBE    13,80  (0,0)                 mehrfache Sprengung
  //
  // Sturmgewehr (2) und Schrotflinte (3) stehen bewusst NICHT nach Messung: Ihr Abstand
  // liegt mit 3,40 zu 3,13 innerhalb der Streuung, und das Sturmgewehr ist die
  // Bezugswaffe fuer getWeaponFirepower. Ein Tausch waere Rauschen.
  //
  // DER LASER war der groesste Ausreisser: von Level 7 auf 18. Er ist die viertstaerkste
  // Waffe des Spiels und kam als dritte - sein Durchschlag toetet mehrere Gegner
  // hintereinander, was die alte Kennzahl komplett uebersah.
  //
  // Auf Level 1 bleibt EINE Alternative zur Startwaffe - das Tor zeigt dort immer
  // dasselbe. Fuer das Lernlevel vertretbar, ab Level 2 sind es zwei, ab Level 3 drei.
  // Ein Test haelt Staffelung und Mindestzahl an Toralternativen fest.
  weapon: {
    // killsPerSec bei jeder Waffe ist der MESSWERT aus dieser Reihe, nicht nur eine Notiz
    // im Kommentar: Der Laden zeigt daraus die Staerke-Sterne in der Detailansicht, und
    // ein Test haelt fest, dass Preis und Staerke gleich sortiert sind. Wer eine Waffe
    // aendert, muss diesen Wert nachmessen - sonst zeigt der Laden etwas an, das nicht
    // mehr stimmt.
    // KAUFPREISE (unlockPrice bei jeder Waffe) - hergeleitet aus der GEMESSENEN Staerke,
    // nicht aus der Levelnummer (Thomas 2026-08-25: "logische Preise dafuer").
    //
    // Grundlage sind die Toetungen je Sekunde aus derselben Messreihe, nach der auch die
    // Staffelung sortiert ist (Herleitung dort). Preis = 900 x (Staerke / 1,75)^1,5, auf
    // hundert gerundet: ueberproportional, damit die starken Waffen spuerbar mehr kosten,
    // aber nicht so steil, dass die letzte unerreichbar wird.
    //   Sturmgewehr 2.400 · Schrotflinte 2.100 · Minigun 3.100 · Flammenwerfer 4.100
    //   Blitz 4.500 · Rakete 7.900 · Prellschuss 8.300 · Saegeblatt 8.300 · Laser 9.300
    //   Granate 12.800 · Schockwelle 17.100 · Streubombe 20.000
    // Zusammen rund 100.000. Ein Run bis Level 20 bringt etwa 12.600 aufs Konto, alle
    // zwoelf Waffen kosten also gut acht gute Runs.
    //
    // Die Schrotflinte ist billiger als das Sturmgewehr, obwohl sie spaeter erscheint:
    // Sie ist gemessen minimal schwaecher (3,13 gegen 3,40). Der Laden sortiert nach
    // Preis, damit das nicht als Fehler aussieht.
    // Ab welchem Level eine GEKAUFTE Waffe zur Verfuegung steht (Thomas 2026-08-25,
    // zweite Entscheidung: "beim kauf der waffen, die waffen von Level 1 an verfuegbar
    // machen").
    //
    // DIE MESSUNG DAGEGEN STEHT UND WIRD BEWUSST UEBERSTIMMT: Mit der Streubombe kommt
    // auf Level 1, 5 und 12 KEIN EINZIGER Gegner mehr durch - gegen 4,3 / 15,8 / 19,1 %
    // mit der Pistole, bei einem Zielkorridor von 4 bis 12 %. Der Kauf macht die unteren
    // Level also leer. Das ist der bezahlte Preis dafuer, dass ein Kauf sich sofort und
    // sichtbar auszahlt - Benni soll die Waffe benutzen, fuer die er gespart hat, statt
    // sie bis Level 12 im Schrank zu haben.
    //
    // Der Gegenhebel steckt im Preis, nicht in der Levelsperre: Die teuren Waffen sind
    // erst nach mehreren guten Runs erreichbar (BALANCE.weapon.<name>.unlockPrice).
    ownedFromLevel: 1,
    // GEWICHTUNG DER TORZIEHUNG (Thomas 2026-08-24: "neue waffen bevorzugen, aber alte
    // trotzdem bringen"). Gewicht = rewardNewnessBias ^ (minLevel - 1).
    //
    // 1,20 ist aus der gewuenschten Wirkung gerechnet, nicht gewaehlt. Mit der heutigen
    // Staffelung (minLevel 1 bis 7) ergibt das als Ziehungsanteil:
    //   Sturmgewehr/Schrot (1) 10,4 %  ·  Laser (2) 12,5 %  ·  Rakete (3) 15,0 %
    //   Minigun (4) 18,0 %  ·  Flamme (5) 21,6 %  ·  Blitz (6) 25,9 %  ·  Granate (7) 31,1 %
    // (Anteile je Waffe unter denen, die im Tor konkurrieren; die aktuell getragene
    // Waffe faellt jeweils heraus.)
    //
    // Die neueste Waffe kommt damit rund dreimal so oft wie die aelteste - deutlich
    // bevorzugt, aber die alten bleiben regelmaessig im Bild. Bei einem hoeheren Wert
    // verschwaenden die fruehen Waffen praktisch; bei 1,0 waere die Gleichverteilung
    // zurueck, die das Problem ueberhaupt erzeugt hat.
    rewardNewnessBias: 1.2,
    // PISTOLE - die Startwaffe seit 2026-08-24 (Thomas: "im ersten Level eine Pistole
    // noch vor dem Sturmgewehr"). Schwaechster Eintrag im Spiel.
    //
    // Sie ist SCHNELL und SCHWACH, nicht langsam und schwach: Ein Kind soll auf Level 1
    // dauernd etwas passieren sehen. Der Nachteil steckt im Schaden und in der kuerzeren
    // Reichweite - die Gegner kommen naeher heran als beim Sturmgewehr, und genau das
    // macht den Wechsel auf Stufe 2 spuerbar.
    //
    // Nur EIN Faktor traegt den Abstand zum Sturmgewehr (damageFactor). Rate und
    // Schuetzenzahl bleiben voll, sonst wirkt der Abzug multiplikativ und Level 1 wird
    // haerter als beabsichtigt - Thomas' Vorgabe war "nur marginal schwerer".
    //
    // GEMESSEN (je drei Laeufe, frische Szene, 8 s einschwingen, 30 s zaehlen), Anteil
    // durchkommender Gegner:
    //   Level 1: Pistole 3,8 %  gegen Sturmgewehr 3,4 %
    //   Level 2: Pistole 9,1 %  gegen Sturmgewehr 9,4 %
    //
    // Die Pistole ist damit MESSBAR NICHT SCHWAECHER, obwohl sie nominal bei 0,71x
    // liegt. Der Grund ist derselbe, der auch die Waffenmessung zweimal verdorben hat:
    // Auf den unteren Leveln ist nicht die Feuerkraft der Engpass, sondern der
    // Gegnernachschub - jede Waffe raeumt weg, was ankommt. Ein Staerkeunterschied wird
    // dort erst sichtbar, wenn die Truppe ueberfordert ist.
    //
    // DAS IST KEIN FEHLER DER AUSLEGUNG, sondern die Antwort auf Thomas' Frage "kommt
    // man mit der Pistole allein durch das erste Level?": ja, ohne Weiteres. Der
    // spuerbare Unterschied zum Sturmgewehr liegt nicht in der Bilanz, sondern in der
    // REICHWEITE (engageShare 0,48 gegen 0,55) - die Gegner kommen naeher heran, bevor
    // sie fallen. Das sieht man, auch wenn die Zahl es nicht zeigt.
    //
    // Wer den Unterschied groesser haben will, muss den Nachschub auf Level 1-2 anheben,
    // nicht die Pistole weiter schwaechen - Letzteres bliebe folgenlos.
    pistol: {
      minLevel: 1,
      killsPerSec: 1.75,
      rateFactor: 1.15,
      damageFactor: 0.62,
      shootersPerSalvo: 8,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 600,
      // Kuerzer als das Sturmgewehr (0,55): Der Kampf beginnt tiefer im Bild.
      engageShare: 0.48,
      pierces: false,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    normal: {
      minLevel: 2,
      killsPerSec: 3.4,
      unlockPrice: 1900,
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
      minLevel: 3,
      killsPerSec: 3.13,
      unlockPrice: 1600,
      rateFactor: 0.4,
      // 1,5 -> 0,45: Die Schrotflinte war mit 4,20x die mit Abstand staerkste Waffe,
      // weil sich 7 Kugeln mit dem hohen Schadensfaktor multiplizierten. Jetzt 1,26x.
      damageFactor: 0.45,
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
      // 1,10x -> Ziel 1,26x (2026-08-24). Gemessen liess er von allen Waffen die
      // MEISTEN Gegner durch (6,08/s gegen 5,96 der Startwaffe), obwohl er Durchschlag
      // hat: Seine Feuerlinie ist schmal, er trifft nur, was in der Spur steht. Nur
      // damageFactor angehoben, aus demselben Grund wie bei der Minigun.
      minLevel: 18,
      killsPerSec: 8.27,
      unlockPrice: 7300,
      rateFactor: 1.4,
      damageFactor: 0.46,
      shootersPerSalvo: 8,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 900,
      // Laser: Licht hat praktisch keine Reichweitengrenze. Bewusst trotzdem gedeckelt -
      // bei 1,0 waere die Kampfzone fuer diese Waffe komplett aufgehoben und Thomas'
      // Anliegen (Gegner sollen ankommen) fiele mit dem ersten Waffenfund wieder um.
      //
      // 0,85 -> 0,60 (Thomas 2026-08-23: "noch eines Laser ... es laeuft durch"). 0,85
      // war der Ausreisser im Waffenfeld (naechsthoeher: Kettenblitz 0,72, Standard
      // 0,55) und setzte die Feuerlinie auf y = 235 - GEMESSEN starben die Gegner im
      // Mittel auf 225, also praktisch in dem Moment, in dem sie beschiessbar wurden.
      // Solange die Feuerkraft im Ueberschuss ist, bestimmt allein die Reichweite, wie
      // weit ein Gegner kommt. 0,60 setzt die Linie auf y = 376 und laesst dem Laser
      // seinen Charakter als Fernwaffe, ohne die Kampfzone aufzuheben.
      engageShare: 0.6,
      pierces: true,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    rocket: {
      minLevel: 11,
      killsPerSec: 7.47,
      unlockPrice: 6200,
      rateFactor: 0.25,
      damageFactor: 2.5,
      // 3 -> 5 Schuetzen: Mit Splash lag die Rakete gegen Horden bei 0,76x und damit
      // als einzige Waffe unter der Standardwaffe. Jetzt 1,27x.
      shootersPerSalvo: 5,
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
      // 1,01x -> Ziel 1,20x (2026-08-24). Gemessen war sie praktisch so stark wie die
      // Startwaffe und stand trotzdem auf Stufe 4 - der schwaechste Punkt der alten
      // Staffelung. Angehoben wird NUR damageFactor: Feuerkraft ist ein Produkt, ein
      // Zuwachs auf Rate UND Schaden wirkt quadratisch.
      minLevel: 5,
      killsPerSec: 3.97,
      unlockPrice: 2400,
      rateFactor: 2.2,
      // 0,28 -> 0,55 UND 3 -> 8 Schuetzen (Thomas 2026-08-23: "Minigun macht kaum
      // Schaden"). Beides zusammen hebt sie von 0,23x auf 1,21x. Die Schuetzenzahl
      // allein haette nicht gereicht (0,23 -> 0,62), der Schadensfaktor allein auch
      // nicht (0,23 -> 0,45): Die Minigun lag um Faktor 5 zurueck, nicht um 2. Sie war
      // die einzige Waffe ohne Durchschlag, Splash oder Kette UND mit nur 3 Schuetzen.
      damageFactor: 0.63,
      shootersPerSalvo: 8,
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
      minLevel: 7,
      killsPerSec: 4.83,
      unlockPrice: 3200,
      // 14.4 salvos/s x 3 shooters x 5 projectiles x 0.694s flight = 149.8; 200 leaves 33% reserve.
      rateFactor: 1.8,
      damageFactor: 0.34,
      shootersPerSalvo: 3,
      bulletsPerShot: 5,
      fanAngleDeg: 52,
      projectileSpeed: 620,
      // 0,28 -> 0,58 (Thomas 2026-08-25: "Flammenwerfer braucht groessere Reichweite",
      // und nachgeschoben: "ab level 8-10 werden die mobs so schnell bzw. die staerkeren
      // so viele, dass Flammenwerfer oder blitz nicht mehr nachkommt sie wegzuraeumen,
      // obwohl das eigentlich die staerkeren waffen sind").
      //
      // GEMESSEN, und der Befund ist eindeutig (Level 12, Truppe 12, Schaden 2, Rate 4,
      // je 25 s, Anteil durchkommender Gegner):
      //   Pistole 32,3 %  ·  Sturmgewehr 9,9 %  ·  MINIGUN 0,9 %
      //   FLAMME 18,7 %   ·  Blitz 9,5 %        ·  Rakete 0,5 %
      // Der Flammenwerfer liess also fast DOPPELT so viele Gegner durch wie das
      // Sturmgewehr - drei Plaetze unter ihm in der Staffelung und teurer.
      //
      // DIE URSACHE IST NICHT DIE FEUERKRAFT, sondern die Reichweite: Die Kills je
      // Sekunde lagen mit 7,64 dicht an Minigun (8,96) und Rakete (8,56). Was fehlte,
      // war die STRECKE, auf der gefeuert werden darf - und je schneller die Gegner mit
      // dem Level werden, desto weniger Zeit bleibt auf der kurzen Strecke. Genau das
      // beschreibt Thomas' "kommt nicht mehr nach".
      //
      // KENNZAHL-FALLE, zum zweiten Mal in zwei Tagen: Staffelung UND Preis stehen auf
      // killsPerSec - und diese Groesse misst die Reichweite nicht mit. Zwei Waffen mit
      // gleichem killsPerSec koennen sich im Spiel um Faktor 20 im Durchkommensanteil
      // unterscheiden (siehe docs/lessons.md, 2026-08-25).
      //
      // WARUM REICHWEITE UND NICHT SCHADEN: Der Rueckstand ueber Schaden auszugleichen
      // haette Faktor 1,65 gebraucht - und im BOSSDUELL ist die Reichweitengrenze
      // ausgesetzt (setEngageLimitEnabled). Dort waere die Waffe damit um zwei Drittel
      // staerker geworden, ohne dass das Problem dort ueberhaupt existiert.
      //
      // 0,58 bleibt unter Laser (0,60), Minigun (0,62) und Rakete (0,72): Der
      // Nahkampf-Charakter aus der Realitaetsvorlage wird aufgegeben, weil er die Waffe
      // nicht ANDERS gemacht hat, sondern nur schlechter.
      engageShare: 0.58,
      pierces: false,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    chainlightning: {
      minLevel: 9,
      killsPerSec: 5.07,
      unlockPrice: 3500,
      rateFactor: 0.7,
      // 1,05 -> 0,9: Die Kette lag mit 1,46x am oberen Rand des Bandes, weil drei
      // Kettensprunge zu je 55 % ihren Wert fast verdreifachen. Jetzt 1,25x.
      damageFactor: 0.9,
      shootersPerSalvo: 6,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 780,
      // Kettenblitz: der Bogen selbst reicht nicht weit, seine Wirkung kommt aus dem
      // Ueberspringen auf Nachbarn.
      // 0,45 -> 0,56, aus derselben Messung wie beim Flammenwerfer: Der Kettenblitz lag
      // beim Durchkommensanteil mit 9,5 % GLEICHAUF mit dem Sturmgewehr (9,9 %), obwohl
      // er vier Plaetze hoeher steht und mehr als doppelt so teuer ist. Auch hier waren
      // die Kills je Sekunde nicht das Problem (7,64), sondern die Strecke.
      engageShare: 0.56,
      pierces: false,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
      chainCount: 3,
      chainRadiusPx: 118,
      chainDamageFactor: 0.55,
    },
    // GRANATWERFER (Benni ueber Thomas 2026-08-23: "eine zusaetzliche Waffe wie ein
    // Granatwerfer, der weniger oft schiesst aber viel Schaden und den ganzen Bildschirm
    // erreicht"). Achte Waffe.
    //
    // STAERKE INS BAND GERECHNET, nicht gewaehlt. Alle sieben vorhandenen Waffen liegen
    // bei 1,15-1,27x der Standardwaffe (Commit a98a920); Nominalstaerke = rateFactor x
    // damageFactor x shootersPerSalvo x bulletsPerShot, Standardwaffe = 1 x 1 x 8 x 1 = 8.
    //   0,15 x 3,2 x 4 x 1 = 1,92 nominal
    // Dazu der Splash-Aufschlag. Bezugspunkt ist die Rakete: Sie liegt nominal bei 3,125
    // und wurde mit Splash (70 px, Faktor 1,5) auf 1,27x gemessen - der Aufschlag ist dort
    // also rund 3,2. Mit groesserem Radius und hoeherem Faktor hier konservativ 5,0
    // angesetzt: 1,92 x 5,0 = 9,6 = 1,20x. Der Aufschlag ist GESCHAETZT und muss wie bei
    // den anderen Waffen gemessen werden; danach wird damageFactor nachgezogen.
    // GRANATWERFER (E3, Thomas/Benni 2026-08-24: "zu schwach").
    //
    // GEMESSEN war er das nicht - 1,35x der Standardwaffe. Was Benni spuert, ist die
    // TRAEGHEIT: rateFactor 0,15 war mit Abstand der niedrigste Wert im Spiel, man
    // wartete auf jeden Schuss. Der Test, der die Flaechenwirkung mitrechnet, sah ihn
    // sogar bei 0,82 und damit unter dem Band aller anderen Waffen - er stand nur nicht
    // in dessen Waffenliste und fiel deshalb nie auf.
    //
    // Behoben wird die TRAEGHEIT, nicht der Schaden: Feuerrate +73 % (0,15 -> 0,26),
    // Schaden -15 % als Gegengewicht (3,2 -> 2,71). Netto liegt er damit bei rund 1,20
    // statt 0,82. Wer stattdessen den Schaden angehoben haette, bekaeme dieselbe
    // Wartezeit mit groesserer Zahl - das war der ausdrueckliche Befund im V4-Plan.
    //
    // DER POOL MUSSTE MIT (pools.projectiles.grenade 12 -> 24): Er war exakt aus
    // rateFactor 0,15 gerechnet und waere bei 0,26 auf null Reserve gelaufen.
    grenade: {
      // Letzte Waffe der V3-Staffelung; seit 2026-08-24 Stufe 15 von dreizehn Waffen.
      minLevel: 21,
      killsPerSec: 10.27,
      unlockPrice: 10000,
      // Langsamste Waffe im Spiel (Rakete 0,25) - "schiesst weniger oft".
      rateFactor: 0.26,
      // Hoechster Schadensfaktor im Spiel (Rakete 2,5) - "viel Schaden".
      damageFactor: 2.71,
      shootersPerSalvo: 4,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      // Langsamer als die Rakete (300): Man schiesst weit auf Vorhalt.
      projectileSpeed: 380,
      // "Erreicht den ganzen Bildschirm" - und genau das ist die heikle Stelle. Thomas
      // musste am 2026-08-23 den Laser von 0,85 auf 0,60 zurueckdrehen, weil bei zu
      // grosser Reichweite alle Gegner am Horizont sterben und nie ankommen. Die niedrige
      // Feuerrate entschaerft das hier, hebt es aber nicht auf.
      // MESSKRITERIUM: Faellt die mittlere Todeshoehe unter 250 px, muss dieser Wert
      // runter - die Reichweite ist dann nicht verhandelbar.
      engageShare: 0.95,
      pierces: false,
      // Groesster Wirkbereich im Spiel (Rakete 70).
      splashRadiusPx: 110,
      splashDamageFactor: 1.6,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    // ---- DIE VIER SPAETEN WAFFEN (2026-08-24) ----
    //
    // WARUM SIE NICHT STAERKER SIND ALS DIE RAKETE, obwohl der V4-Plan bis 1,85x gehen
    // wollte: Gerechnet gegen die gemessene Endloskurve hebt jede Waffe ueber 1,25x den
    // ganzen E1-Effekt auf. V(30) liegt bei 0,855 der Level-12-Haerte; mit einer
    // 1,85x-Waffe waere Level 30 um 32 % LEICHTER als Level 12, mit 2,15x um 46 %.
    // Der Plan hat das Band unter der Annahme geoeffnet, E1 mache die Level deutlich
    // haerter - gemessen sind es 15 %, weil der Zielkorridor (4-12 % Durchkommen) nicht
    // mehr hergibt.
    //
    // Das Band endet deshalb beim HEUTIGEN Maximum von 1,45x (Rakete). Die vier
    // unterscheiden sich durch ihre WIRKUNG, nicht durch die Zahl - das war schon die
    // Regel der V3-Staffelung und sie ist hier aus der Bilanz heraus richtig.
    // Der eigentliche Haertegewinn kommt ohnehin aus der Umsortierung: Die Rakete war
    // die staerkste Waffe des Spiels und ab Level 3 zu haben; jetzt ab Level 13.
    //
    // ENTSCHEIDUNG FUER THOMAS, dokumentiert statt eigenmaechtig getroffen: Sollen die
    // spaeten Waffen deutlich staerker sein, muss die Levelhaerte mit - und das sprengt
    // den Korridor. Beides zusammen geht nicht.

    // PRELLSCHUSS - schnelle Salven mit Durchschlag. Das Abprallen an den Korridorwaenden
    // aus dem V4-Plan braucht eine eigene Flugbahn-Logik und ist NICHT gebaut; hier steht
    // die Naeherung mit vorhandenen Mitteln (Durchschlag statt Abprall). Als Befund
    // notiert, nicht stillschweigend ersetzt.
    ricochet: {
      minLevel: 13,
      killsPerSec: 7.67,
      unlockPrice: 6500,
      rateFactor: 1.5,
      damageFactor: 0.44,
      shootersPerSalvo: 8,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 720,
      engageShare: 0.6,
      pierces: true,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    // STREUBOMBE - drei Geschosse je Salve, jedes mit eigener Sprengwirkung. Flaeche
    // statt Punkt, der Gegenentwurf zum Granatwerfer: kleinerer Radius, dafuer dreifach
    // und breiter gestreut.
    cluster: {
      minLevel: 30,
      killsPerSec: 13.8,
      unlockPrice: 15600,
      rateFactor: 0.4,
      damageFactor: 0.54,
      shootersPerSalvo: 6,
      bulletsPerShot: 3,
      fanAngleDeg: 20,
      projectileSpeed: 440,
      engageShare: 0.78,
      pierces: false,
      splashRadiusPx: 62,
      splashDamageFactor: 1.2,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    // SAEGEBLATT - langsames Blatt, das durch die Horde maeht. Der Durchschlag ist hier
    // die Hauptwirkung, nicht eine Zugabe: Bei 220 px/s bleibt das Blatt lange im Bild
    // und nimmt alles mit, was in seiner Spur steht. Voellig anderes Timing als alles
    // andere - man legt eine Schneise, statt auf Ziele zu schiessen.
    sawblade: {
      minLevel: 15,
      killsPerSec: 7.67,
      unlockPrice: 6500,
      rateFactor: 0.42,
      damageFactor: 2.1,
      shootersPerSalvo: 5,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 220,
      engageShare: 0.88,
      pierces: true,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    // SCHOCKWELLE - kurzer Radialstoss dicht vor der Truppe. Die kleinste engageShare im
    // Spiel (0,22) bei mit Abstand groesstem Sprengradius: Sie wirkt erst, wenn die
    // Gegner nah heran sind, dann aber rundum. Damit ist sie die Antwort auf
    // Durchbrueche - die einzige Waffe, die etwas gegen bereits herangekommene Gegner
    // ausrichtet.
    shockwave: {
      minLevel: 25,
      killsPerSec: 12.47,
      unlockPrice: 13300,
      rateFactor: 0.5,
      damageFactor: 1.19,
      shootersPerSalvo: 6,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 880,
      // 0,22 -> 0,85 UND Splashradius 135 -> 480 (Thomas 2026-08-26: "schockwelle muss
      // fuer diesen preis noch staerker werden, weiter nach vorne schiessen und den
      // gesamten bildschirm, alle gegner wegraeumen").
      //
      // SIE WAR DIE KUERZESTE WAFFE DES SPIELS und kostet 13.300 - die zweitteuerste.
      // Beides zusammen ging nicht auf: Wer so lange spart, will den Bildschirm leer
      // sehen, nicht einen Stoss dicht vor den eigenen Fuessen.
      //
      // GERECHNET, nicht gewaehlt: Die Anflugstrecke des Referenzgeraets (390 x 844)
      // ist 564 px lang. Bei engageShare 0,85 schlaegt die Welle 479 px vor der Truppe
      // ein; ein Radius von 480 px reicht damit von der Einschlagstelle bis zur Truppe
      // und ueber die volle Strassenbreite. Das IST der ganze Bildschirm - genau die
      // Vorgabe.
      //
      // 0,85 statt 0,95 (Granatwerfer): Ein Rest Anflugstrecke bleibt frei, sonst
      // faellt die Kampfzonen-Regel fuer diese Waffe ganz weg und die Gegner erscheinen
      // nur noch, um sofort zu verschwinden.
      engageShare: 0.85,
      pierces: false,
      splashRadiusPx: 480,
      splashDamageFactor: 1.35,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    splashFlashMs: 180,
    // DER AUFSCHLAGBLITZ FOLGT DEM WIRKRADIUS NICHT MEHR UNBEGRENZT (2026-08-26).
    //
    // Gemessen im Browser: Mit dem neuen Schockwellen-Radius von 480 px wurde das
    // 32-px-Blitzbild auf 960 px gezogen - zweieinhalbmal so breit wie der Bildschirm
    // (390 px), und das mehrmals je Sekunde fuer je 180 ms. Ein Kind sieht dann nicht
    // eine wuchtige Waffe, sondern ein flackerndes Bild.
    //
    // ANGESEHEN, NICHT GESCHAETZT: Mit 180 px Deckel (360 px Blitz) fuellte der Kreis im
    // Screenshot immer noch die halbe Bildhoehe - bei einer Waffe, die mehrmals je
    // Sekunde einschlaegt, ist das ein Dauerleuchten. 120 px (240 px Blitz) bleibt die
    // groesste Explosion des Spiels - die Rakete kommt mit Radius 70 auf 140 px - und
    // laesst das Spielfeld sichtbar.
    //
    // Die WIRKUNG bleibt davon unberuehrt: Gedeckelt wird nur die Darstellung, der
    // Schaden trifft weiter im vollen Radius von 480 px.
    splashFlashMaxRadiusPx: 120,
    chainFlashMs: 120,
  },
  crowd: {
    // Die Starttruppe steht in stats.hp.base, nicht hier. Ein zweites Feld `start` (3)
    // stand bis 2026-08-23 daneben, wurde aber von keiner Zeile gelesen und widersprach
    // dem tatsaechlichen Startwert - entfernt in W6.
    max: 30,
    // Maximum number of figures that fire together in one rotating salvo.
    shootersPerSalvo: 8,
    rowSpacingY: 14,
    colSpacing: 24,
    minColSpacing: 11,
    // BREITE DER FORMATION - und damit die Breite der Feuerlinie, weil jede Figur
    // spurtreu nach oben schiesst (projectile.laneFollow).
    //
    // 0,44 -> 0,24 (2026-08-23). Gemessen, warum Stehenbleiben in der Mitte immer
    // funktionierte: Gegner laufen ueber einen Spurbereich von -0,84 bis +0,83 an, die
    // Truppe war bei 30 Figuren aber 130 px breit und deckte damit praktisch diesen
    // ganzen Bereich ab. Es gab schlicht nichts, was an ihr vorbeilaufen konnte -
    // gemessen starben 98 % der Gegner, der groesste Seitenabstand eines Todesortes
    // lag bei 54 px.
    // 0,20 ist der KLEINSTE zulaessige Wert, nicht ein gewaehlter: 8 Schuetzen
    // brauchen bei minColSpacing 11 px mindestens 77 px nebeneinander, sonst stapelt
    // die Formation in weitere Reihen und die Salve verliert ihre Breite ganz.
    // 390 x 0,20 = 78 px. Damit deckt die Feuerlinie rund die Haelfte des
    // Anflugbereichs (155 px auf Kampfhoehe) statt 84 % - was daneben laeuft, kommt
    // durch. Wer weiter will, muss zuerst crowd.shootersPerSalvo oder minColSpacing
    // anfassen; an maxWidthRatio allein ist hier Schluss (ein Test haelt beide
    // Grenzen fest).
    maxWidthRatio: 0.2,
    bottomMargin: 8,
    // The collision hull stays fixed instead of growing with the formation.
    hullWidthFigures: 2.4,
    hullHeightFigures: 1.6,
    damagePerExtraFigure: 0.14,
    // DER SCHADENSBONUS AUS DER TRUPPENGROESSE WAECHST MIT DEM LEVEL (2026-08-23).
    // Er war fest bei 4 und wurde schon bei Truppe 30 erreicht - zusammen mit den
    // ebenfalls schnell vollen Schadens- und Ratenwerten stand die Feuerkraft ab
    // Level 2 dauerhaft am Maximum. Hier zu bremsen statt an der Truppengroesse ist
    // der schonendere Eingriff: Figuren sammeln bleibt sinnvoll (sie sind
    // Ueberlebenszeit), nur ihre Schadenswirkung folgt jetzt dem Level.
    // Endpunkte gerechnet wie bei BALANCE.stats: 8 Schuetzen x 4 x 7,0 x 8,0 = 1.792
    // gegen einen Level-12-Bedarf von 705.
    damageMultiplierCapAtLevelOne: 1.5,
    damageMultiplierCapAtLevelTwelve: 4,
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
  // Der Block hiess bis 2026-08-23 `blockers` - ein Name aus V1, als hier noch die
  // quer stehenden Sperren geregelt wurden. Er beschreibt seit W2 die HAERTE der
  // Wandsegmente; ihre Geometrie und ihr Inhalt stehen in `walls`. In W6 umbenannt,
  // damit der Name sagt, was er meint.
  wallHardness: {
    // Level 1 mit Startteam (1 Figur, normal, dmg 1, rate 3 -> 3 dps): 3 HP = 1,0 s.
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
    // WIE VIEL DER FEUERKRAFT AN EINER KACHEL ANKOMMT (2026-08-26, Thomas: "ab level 13,
    // 14 usw. werden die waende rechts fast nicht mehr erwerbbar, weil die zahlen so hoch
    // sind, dass man sie nicht wegschiessen kann").
    //
    // DER FEHLER, DEN DAS BEHEBT: maxFocusSec ist als ZUSAGE gedacht - eine Kachel kostet
    // nie mehr als 0,6 s Dauerfeuer. Gerechnet wurde sie aber gegen die volle Feuerkraft
    // der Truppe (getCombatFirepower), und die kommt an einer Kachel nie an: Die Figuren
    // schiessen spurtreu nach oben, die Kachel ist schmal und steht am Bildrand.
    //
    // GEMESSEN (Level 13, Truppe 40, Schaden 5, Rate 6, Truppe an der Wand gehalten,
    // je 20 s) - Schaden, der TATSAECHLICH an der Kachel ankommt, gegen den geplanten:
    //   Sturmgewehr  960/s geplant ->  174/s echt  (18 %)
    //   Schrotflinte 1210/s        ->  179/s       (15 %)
    //   Minigun      1331/s        ->  164/s       (12 %)
    //   Rakete        375/s        ->  172/s       (46 %)
    // Bemerkenswert und der eigentliche Fund: Die ECHTE Wandwirkung ist bei allen vier
    // fast gleich (164-179), waehrend die geplante um Faktor 3,5 auseinanderliegt. An
    // einer Kachel entscheidet nicht die Feuerkraft, sondern wie viele Geschosse
    // geometrisch ankommen.
    //
    // FOLGE OHNE KORREKTUR: Eine Kachel kostete auf Level 13 real 0,87 s statt 0,16 s,
    // auf Level 20 3,2 s und ab Level 25 3,4 s. Ein Abschnitt sind DREI Kacheln, also
    // 10 s - bei 6,0 s, die er ueberhaupt im Bild ist. Ab etwa Level 18 war die rechte
    // Wand nicht mehr zu schaffen, auch wenn man nichts anderes tat.
    //
    // 0,18 ist der Wert der STANDARDWAFFE, nicht der Mittelwert: Sie ist die Referenz des
    // Spiels, und wer eine Waffe mit hoeherem Anteil traegt, bekommt die Wand leichter -
    // maxFocusSec ist eine Obergrenze, kein Ziel. Damit liegt eine Kachel ab Level 13
    // konstant bei 0,61 s und ein Abschnitt bei 1,84 s von 6,0 s.
    wallHitShare: 0.18,
  },
  enemy: {
    // KLEIDUNGSVARIANTEN (Benni ueber Thomas 2026-08-23: mehr Zombie-Aussehen; Thomas:
    // "die bestehenden 3 Arten von Zombies einfach mit mehr verschiedenen Kleidungsfarben
    // ausstatten").
    //
    // Drei zusaetzliche Farbfassungen je Typ (Endung -b rostrot, -c blaugrau, -d ocker).
    // Sie sind aus den Vorlagen umgefaerbt, nicht neu gezeichnet: Groesse und Alpha-Kanal
    // sind pixelgenau identisch (geprueft). Das ist Bedingung, weil die Koerpermasse
    // unten an den Vorlagen nachgemessen sind - eine abweichende Silhouette wuerde
    // Trefferflaechen und Formationsabstaende verschieben.
    //
    // GESTAFFELT FREIGESCHALTET, damit ueber den ganzen Run etwas Neues dazukommt.
    // Rein optisch: Keine Balance-Groesse haengt daran.
    //
    // 4 -> 10 STUFEN (E5, 2026-08-25). Bis dahin waren es vier reine FARBVARIANTEN
    // derselben Figur; Thomas: "verschiedene Farben haben wir, und zusaetzliche andere
    // Gestalten in allen drei Figurstaerken". Die sechs neuen (e bis j) sind echte
    // Gestalten - andere Kapuze, Haltung, Kleidung -, keine Umfaerbungen.
    //
    // Die Koerpermasse aller sechs sind nachgemessen und weichen um NULL Pixel von der
    // Vorlage ab (light 37x76, standard 50x84, heavy 82x98). Das ist die Bedingung, unter
    // der die Gestalt abweichen darf: Trefferflaechen und Formationsabstaende haengen an
    // diesen Massen, nicht am Bild.
    //
    // Die Stufen reichen bis Level 30 und laufen damit parallel zur Waffenstaffelung -
    // bis Level 12 kommt etwa alle drei Level etwas Neues, danach alle vier bis fuenf.
    // Im Endlosbereich ist das neben den Waffen die zweite Kette, die weiterlaeuft.
    variantUnlockLevels: [1, 3, 6, 9, 12, 15, 18, 21, 25, 30],
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
  // Gezeichnete Taumelbewegung der Gegner (Thomas 2026-09-04: "bewegung der kleinen
  // figuren ok, bitte auf alle anwenden" und "jetzt aber die bewegung fuer alle figuren
  // umsetzen und natuerlich die farben wieder wie gehabt").
  //
  // Der Weg dahin steht in docs/lessons.md: Ein erster Anlauf mit einem GANGZYKLUS
  // scheiterte (vier aehnliche Haltungen, 15 % Silhouettenunterschied, im Spiel ein
  // Flackern). Erst der Wechsel der BEWEGUNG - taumeln und greifen statt gehen - brachte
  // 61 %, und zwoelf statt vier Bilder brachten die Standzeit je Bild von 227 auf 76 ms.
  //
  // KEINE EINFAERBUNGEN (Thomas 2026-09-04: "dann keine einfaerbungen mehr, nur mehr
  // wirklich verschiedene figuren"). Ein kurzlebiger Zwischenstand rechnete die Farben
  // der Originalgestalten auf die Bewegungsbilder; das ist wieder ausgebaut.
  //
  // Der Grund fuer die Entscheidung steckt in einer Messung: Von den 27 Farbvarianten
  // (9 je Staerke) sind **neun formgleich** mit ihrer Grundgestalt - reine Umfaerbungen
  // (jeweils b, c, d). Die restlichen **18 haben eigene Koerper**: Soldat mit Stahlhelm,
  // Gestalt mit Hut und Mantel, Latzhosen-Typ, geharnischte schwere Figuren. Eine
  // Farbrechnung holt nur die neun Umfaerbungen zurueck - und genau die will Thomas nicht.
  //
  // Solange die 18 eigenen Gestalten keine Bewegungsbilder haben, laufen im Spiel drei
  // Gestalten (eine je Staerke). Der Ausbau steht in docs/UEBERGABE.md: 18 Saetze zu je
  // zwoelf Bildern, nach den gemessenen Laufzeiten von rund 27 Minuten je Satz etwa
  // acht Stunden Maschinenzeit.
  bilder: {
    aktiv: true,
    // Ein Satz je GESTALT, nicht je Staerke (Thomas 2026-09-04: "jede figur eine andere
    // Bewegung"). Der Schluessel ist der Texturname der Standgestalt - so waehlt der
    // Spawner erst die Gestalt wie bisher levelabhaengig und findet dann ihre Bilder.
    //
    // Fehlt ein Satz, faellt NUR diese Gestalt auf die gerechnete Bewegung zurueck.
    // Dadurch koennen die zehn offenen Gestalten nach und nach dazukommen, ohne dass
    // zwischendurch etwas kaputt ist.
    saetze: {
      'enemy-light': [
        'enemy-light-lurch-1', 'enemy-light-lurch-2', 'enemy-light-lurch-3', 'enemy-light-lurch-4',
        'enemy-light-lurch-5', 'enemy-light-lurch-6', 'enemy-light-lurch-7', 'enemy-light-lurch-8',
        'enemy-light-lurch-9', 'enemy-light-lurch-10', 'enemy-light-lurch-11', 'enemy-light-lurch-12',
      ],
      'enemy-standard': [
        'enemy-lurch-1', 'enemy-lurch-2', 'enemy-lurch-3', 'enemy-lurch-4',
        'enemy-lurch-5', 'enemy-lurch-6', 'enemy-lurch-7', 'enemy-lurch-8',
        'enemy-lurch-9', 'enemy-lurch-10', 'enemy-lurch-11', 'enemy-lurch-12',
      ],
      'enemy-heavy': [
        'enemy-heavy-lurch-1', 'enemy-heavy-lurch-2', 'enemy-heavy-lurch-3', 'enemy-heavy-lurch-4',
        'enemy-heavy-lurch-5', 'enemy-heavy-lurch-6', 'enemy-heavy-lurch-7', 'enemy-heavy-lurch-8',
        'enemy-heavy-lurch-9', 'enemy-heavy-lurch-10', 'enemy-heavy-lurch-11', 'enemy-heavy-lurch-12',
      ],
      // --- Sondergestalten mit EIGENER Gangart (Thomas 2026-09-04: "jede figur eine
      // andere Bewegung"). Sie ersetzen die verlorene Formenvielfalt durch
      // Bewegungsvielfalt: Wo frueher zehn Koerper standen, laufen jetzt verschiedene
      // Gangarten.
      'enemy-standard-e': [   // Soldat mit Stahlhelm: MARSCHIEREN, steif und aufrecht
        'enemy-standard-e-move-1', 'enemy-standard-e-move-2', 'enemy-standard-e-move-3', 'enemy-standard-e-move-4',
        'enemy-standard-e-move-5', 'enemy-standard-e-move-6', 'enemy-standard-e-move-7', 'enemy-standard-e-move-8',
        'enemy-standard-e-move-9', 'enemy-standard-e-move-10', 'enemy-standard-e-move-11', 'enemy-standard-e-move-12',
      ],
      'enemy-standard-g': [   // Latzhose: SCHLURFEN, kraftlos und gebeugt
        'enemy-standard-g-move-1', 'enemy-standard-g-move-2', 'enemy-standard-g-move-3', 'enemy-standard-g-move-4',
        'enemy-standard-g-move-5', 'enemy-standard-g-move-6', 'enemy-standard-g-move-7', 'enemy-standard-g-move-8',
        'enemy-standard-g-move-9', 'enemy-standard-g-move-10', 'enemy-standard-g-move-11', 'enemy-standard-g-move-12',
      ],
      'enemy-standard-i': [   // Hut und Mantel: SCHLEICHEN, geduckt und lauernd
        'enemy-standard-i-move-1', 'enemy-standard-i-move-2', 'enemy-standard-i-move-3', 'enemy-standard-i-move-4',
        'enemy-standard-i-move-5', 'enemy-standard-i-move-6', 'enemy-standard-i-move-7', 'enemy-standard-i-move-8',
        'enemy-standard-i-move-9', 'enemy-standard-i-move-10', 'enemy-standard-i-move-11', 'enemy-standard-i-move-12',
      ],
      'enemy-light-e': [   // hagere Gestalt, zerlumpt: RENNEN, hetzend und ausgreifend
        'enemy-light-e-move-1', 'enemy-light-e-move-2', 'enemy-light-e-move-3', 'enemy-light-e-move-4',
        'enemy-light-e-move-5', 'enemy-light-e-move-6', 'enemy-light-e-move-7', 'enemy-light-e-move-8',
        'enemy-light-e-move-9', 'enemy-light-e-move-10', 'enemy-light-e-move-11', 'enemy-light-e-move-12',
      ],
      'enemy-light-f': [   // Kapuzengestalt: KRIECHEN, tief vorgebeugt, fast auf allen vieren
        'enemy-light-f-move-1', 'enemy-light-f-move-2', 'enemy-light-f-move-3', 'enemy-light-f-move-4',
        'enemy-light-f-move-5', 'enemy-light-f-move-6', 'enemy-light-f-move-7', 'enemy-light-f-move-8',
        'enemy-light-f-move-9', 'enemy-light-f-move-10', 'enemy-light-f-move-11', 'enemy-light-f-move-12',
      ],
      'enemy-light-g': [   // Arbeitskleidung: ZUCKEN, ruckartig und krampfhaft am Platz
        'enemy-light-g-move-1', 'enemy-light-g-move-2', 'enemy-light-g-move-3', 'enemy-light-g-move-4',
        'enemy-light-g-move-5', 'enemy-light-g-move-6', 'enemy-light-g-move-7', 'enemy-light-g-move-8',
        'enemy-light-g-move-9', 'enemy-light-g-move-10', 'enemy-light-g-move-11', 'enemy-light-g-move-12',
      ],
      'enemy-light-i': [   // bandagierte Gestalt: HUMPELN, ein Bein steif nachgezogen
        'enemy-light-i-move-1', 'enemy-light-i-move-2', 'enemy-light-i-move-3', 'enemy-light-i-move-4',
        'enemy-light-i-move-5', 'enemy-light-i-move-6', 'enemy-light-i-move-7', 'enemy-light-i-move-8',
        'enemy-light-i-move-9', 'enemy-light-i-move-10', 'enemy-light-i-move-11', 'enemy-light-i-move-12',
      ],
      'enemy-heavy-e': [   // Koloss mit Eimerhelm: WATSCHELN, breitbeinig und schwerfaellig
        'enemy-heavy-e-move-1', 'enemy-heavy-e-move-2', 'enemy-heavy-e-move-3', 'enemy-heavy-e-move-4',
        'enemy-heavy-e-move-5', 'enemy-heavy-e-move-6', 'enemy-heavy-e-move-7', 'enemy-heavy-e-move-8',
        'enemy-heavy-e-move-9', 'enemy-heavy-e-move-10', 'enemy-heavy-e-move-11', 'enemy-heavy-e-move-12',
      ],
    } as Readonly<Record<string, readonly string[]>>,
    // Volle Taumelbewegung je Sekunde. Bewusst langsamer als der Schrittakt der
    // gerechneten Bewegung (rund 1,6 Hz) - ein Zombie wankt schwerfaellig. Zusammen mit
    // zwoelf Bildern ergibt das 76 ms Standzeit je Bild und damit eine fluessige
    // Bewegung (Schwelle rund 100 ms).
    //
    // GRUNDWERT fuer jeden Satz OHNE eigenen Eintrag in zyklenProSekundeJeGangart.
    zyklenProSekunde: 1.1,
    // Eigener Takt je Gangart (Thomas 2026-09-04: "jede gangart seine eigene
    // geschwindigkeit und demnach auch im bild dann die einen schneller und die anderen
    // langsamer"). Vorher liefen alle zehn Gangarten mit demselben Wert 1,1 - ein
    // Schleicher so hastig wie ein Renner.
    //
    // RECHENWEG. Ein Satz hat zwoelf Bilder und stellt einen DOPPELSCHRITT dar (links
    // und rechts), ein Zyklus sind also zwei Schritte. Aus der Schrittzahl je Sekunde,
    // die zur Gangart gehoert, folgt der Wert direkt:
    //     zyklenProSekunde = Schritte je Sekunde / 2
    // Die Schrittzahlen sind die Kadenzen der jeweiligen Gangart - eine
    // Gestaltungsgroesse, die das Spiel nicht messen kann, anders als etwa eine
    // Trefferflaeche. Der Grundwert 1,1 entspricht 2,2 Schritten je Sekunde und liegt
    // damit bei zuegigem Gehen; genau das war bei Schleichen und Schreiten zu schnell.
    //
    //   Gangart        Schritte/s   Zyklen/s
    //   Rennen              2,8       1,40
    //   Zucken              2,6       1,30   (ruckartig, kein echter Schritt)
    //   Marschieren         2,0       1,00
    //   Stampfen            1,6       0,80
    //   Kriechen            1,6       0,80   (vier Gliedmassen, kurzer Takt)
    //   Schlurfen           1,4       0,70
    //   Humpeln             1,4       0,70
    //   Watscheln           1,2       0,60
    //   Schleichen          1,2       0,60
    //   Schreiten           1,0       0,50
    //
    // GRENZE NACH UNTEN: Bei zwoelf Bildern und 0,5 Zyklen/s steht ein Bild 167 ms -
    // ueber der Flimmerschwelle von rund 100 ms, aber noch fluessig. Wer weiter
    // heruntergeht, sieht Einzelbilder statt einer Bewegung.
    zyklenProSekundeJeGangart: {
      'enemy-light-e': 1.4,      // RENNEN
      'enemy-light-g': 1.3,      // ZUCKEN
      'enemy-standard-e': 1.0,   // MARSCHIEREN
      'enemy-light-f': 0.8,      // KRIECHEN
      'enemy-standard-g': 0.7,   // SCHLURFEN
      'enemy-light-i': 0.7,      // HUMPELN
      'enemy-heavy-e': 0.6,      // WATSCHELN
      'enemy-standard-i': 0.6,   // SCHLEICHEN
    } as Readonly<Record<string, number>>,
    // Ab hier liegt die Standflaeche, daran misst bildVersatz.ts den seitlichen
    // Ausgleich. Zwei Drittel: darunter sind Beine und Fuesse, keine Arme.
    standflaecheAbAnteil: 0.667,
  },
    types: [
      // bodyWidth/bodyHeight sind die gemessenen OPAKEN Masse der Textur, seit W7 also
      // in der doppelten Aufloesung (2026-08-23 mit einem Alpha-Schwellwert von 8 an den
      // neuen Bildern nachgemessen, nicht umgerechnet). Auf Spielgroesse kommen sie ueber
      // getFigureWidth/-Height, die figureScale UND render.figureTextureScale anwenden.
      // Zum Vergleich in Kampfhoehen-Pixeln (also halbiert), alt -> neu:
      //   light    18,0 -> 18,5   standard 21,0 -> 25,0   heavy 40,0 -> 41,0
      // 'standard' ist spuerbar breiter geworden, weil die neue Figur die Arme
      // abspreizt - genau dafuer wird nachgemessen statt uebernommen.
      { key: 'light', texture: 'enemy-light', hp: 2, speedFactor: 1, contactDamage: 1, coinValue: 1, bodyWidth: 37, bodyHeight: 76 },
      { key: 'standard', texture: 'enemy-standard', hp: 8, speedFactor: 1, contactDamage: 1, coinValue: 1, bodyWidth: 50, bodyHeight: 84 },
      { key: 'heavy', texture: 'enemy-heavy', hp: 23, speedFactor: 1, contactDamage: 2, coinValue: 3, bodyWidth: 82, bodyHeight: 98 },
    ],
    // WIDERSTAND DER GEGNER (2026-08-23 neu aufgebaut, Thomas: "nehme deinen Vorschlag
    // an" - zaehere Gegner plus gedaempfte Kopplung an die Spielerstaerke).
    //
    // DER BEFUND, DER DAZU GEFUEHRT HAT. Gemessen wurde nicht die Feuerkraft, sondern
    // was zaehlt: Wie viele Gegner erreichen die Truppe? Je Fall 12 s, Standardwaffe,
    // 8 s Einschwingen davor, einmal frisch gestartet (Truppe 8, Grundwerte) und einmal
    // voll ausgebaut (Truppe 60, Level-Deckel):
    //   Level  1  2  3  4  6   8    10   12
    //   voll   0  0  0  0  0   0    25 % 57 %
    //   frisch 0  0  0  0  0   100% 100% 100%
    // Das Spiel hatte damit ZWEI getrennte Haelften und keinen Uebergang: Bis Level 6
    // war es folgenlos (kein Gegner kam an, kein Figurenverlust, Todeshoehe konstant
    // 398 px = exakt die Reichweitenlinie der Waffe), ab Level 8 kippte es innerhalb
    // von zwei Leveln auf "wer nicht am Deckel steht, wird vollstaendig ueberrannt".
    // Genau das war Thomas' Erlebnis ("ab Level 3 kann ich meine Leute einfach stehen
    // lassen"): Er spielte die untere Haelfte.
    //
    // URSACHE, gerechnet: Der Bedarf wuchs ueber elf Level um Faktor 60
    // (Lebenspunkte 7,4x mal Typmischung 4,3x mal Nachschub 1,9x), die Feuerkraft am
    // Deckel nur um 28,5x (Schaden 4,7x mal Rate 2,3x mal Truppenbonus 2,7x). Der
    // Bedarf stieg also doppelt so schnell - und weil Level 1 weit im Ueberschuss
    // startete, brauchte es sechs Level, bis sich die Kurven trafen, und danach kippte
    // es sofort.
    //
    // ZWEI AENDERUNGEN, BEIDE GERECHNET:
    //
    // (1) hpPerLevelGrowth 1,2 -> 1,0. Die gesetzte Levelkurve ist ERSATZLOS WEG. Sie
    //     war der Grund fuer die doppelte Steilheit. Das Levelwachstum kommt jetzt aus
    //     den beiden Groessen, die ohnehin schon mit dem Level steigen: der Typmischung
    //     (enemyWeights, Level 1 zu 75 % leichte Gegner, Level 12 zu 50 % schwere -
    //     Faktor 4,3) und dem Nachschub (6,5 -> 12,6 Gegner/s, Faktor 1,9). Zusammen
    //     8,2x. Der Regler bleibt als Stellschraube stehen, steht aber auf 1,0: Wer
    //     ihn anhebt, macht die Kurve wieder steiler als die Feuerkraft.
    //
    // (2) Die GRUNDWERTE steigen 1/4/12 -> 3/11/32 (Faktor 2,63, das Verhaeltnis der
    //     Typen bleibt). Hergeleitet aus dem Startzustand: Truppe 8 mit den
    //     Grundwerten macht 8 x 1 x 3 = 24 Schaden/s, Level 1 liefert 7 Gegner/s.
    //     Fuer den Zielkorridor (rund ein Viertel kommt durch, wenn man nichts tut)
    //     braucht ein Level-1-Gegner im Mittel 24 / 0,75 / 7 = 4,6 Punkte; bei der
    //     Level-1-Mischung (75 % leicht, 25 % standard = 1,75 x Leichtenwert) sind das
    //     2,63 Punkte fuer den leichten Gegner.
    //     Der Nebeneffekt ist gewollt und war Teil des Auftrags: Ein Gegner stirbt
    //     nicht mehr beim ersten Treffer, er kommt sichtbar naeher.
    hpPerLevelGrowth: 1.0,
    // WACHSTUM IM ENDLOSBEREICH (E1, 2026-08-24). Oberhalb von level.endless.fromLevel
    // wachsen die Grundlebenspunkte jedes Typs weiter - das ist neben der
    // Mischungsverschiebung der zweite und der DAUERHAFTE Haertekanal, weil die
    // Mischung bei Level 32 in ihren Deckel laeuft und der Nachschub schon ab Level 13
    // gesaettigt ist.
    //
    // 1,003 ist NICHT gewaehlt, sondern aus dem Abstand zur Spielerkurve gerechnet. Mit
    // der gedaempften Kopplung (firepowerCoupling.dampening 0,30) gilt fuer das
    // Verhaeltnis V aus Feuerkraft und Bedarf:
    //   V ~ Spielerschaden^0,70 / (Gegner-hp x Mischung)
    // Mit stats.endless.damageGrowthPerLevel 1,004 ist 1,004^0,70 = 1,0028. Gegen
    // 1,003 ergibt das 0,9998 je Level - V faellt also dauerhaft und sehr sanft, statt
    // irgendwann wieder zu steigen. Waere der Spielerzuwachs groesser als hp^(1/0,70)
    // = 1,0043, kaeme der Sagezahn in neuer Form zurueck: Das Spiel wuerde ab dem
    // Mischungsdeckel wieder leichter.
    //
    // WARUM DIE ZAHLEN SO KLEIN SIND - der teuerste Befund dieser Etappe: Der
    // Durchkommensanteil reagiert NICHT proportional auf dieses Verhaeltnis, sondern
    // beschleunigend. Gemessen im Browser (je drei Laeufe, Median):
    //   V 1,00 (Level 12) -> 5,7 %      V 0,84 (Level 16) ->  8,6 %
    //   V 0,75 (Level 20) -> 23,1 %     V 0,56 (Level 30) -> 30,9 %
    // Zwischen Level 16 und 20 faellt V um 11 % und der Anteil steigt um 168 %. Die
    // Empfindlichkeit waechst dabei selbst mit - von Faktor 2,4 (L12->L16) auf 8,7
    // (L16->L20). Das ist die in docs/lessons.md dokumentierte Bistabilitaet: Mehr
    // Durchkommer -> freie Spawn-Spuren -> mehr Nachschub -> noch mehr Durchkommer.
    // Der Kipppunkt liegt bei rund V = 0,84; darunter ist die Groesse nicht mehr
    // steuerbar. Ausgelegt wird deshalb mit Abstand: V faellt bis Level 30 nur auf
    // 0,85.
    //
    // GERECHNETE KURVE (Verhaeltnis zu Level 12), am gebauten Code nachgeprueft:
    //   L13 0,997 · L16 0,948 · L20 0,914 · L25 0,880 · L30 0,855 · L50 0,816
    // Monoton fallend, kein Ruecksprung, mit Abstand zum Kipppunkt. Zum Vergleich der
    // Zustand davor: L13 sprang auf 7,09 - Level 13 war siebenmal leichter als Level 12.
    // ACHTUNG BEI KLEINEN GRUNDWERTEN: getEnemyHp rundet auf ganze Punkte. Bei 0,3 %
    // je Level bleibt der leichte Gegner (2 Punkte) bis Level 87 bei 2 und der
    // Standardgegner bis Level 62 bei 8 - nur der schwere (23) waechst frueh sichtbar.
    // Das ist hingenommen, nicht uebersehen: Die Haerte im erreichbaren Bereich traegt
    // ohnehin die Mischung, dieser Regler ist der Kanal fuer die sehr hohen Level. Wer
    // ihn anhebt, muss die Kurve neu messen - sie liegt dicht am Kipppunkt.
    endlessHpGrowthPerLevel: 1.003,
    // STUFENHAERTE ALLE FUENF LEVEL (Thomas 2026-08-30: "die normalen gegener alle 5
    // level um 20% schwerer machen (auch endgegener)").
    //
    // DER AUFSCHLAG FLACHT NACH OBEN AB, und das ist gemessen, nicht gewaehlt. Der erste
    // Bau nahm den Auftrag woertlich: 20 % je Stufe, unbegrenzt. Gemessen (Median aus je
    // drei Laeufen, voll ausgebauter Spieler, Anteil Gegner, die die Truppe erreichen):
    //   Level 12 (Faktor 1,44)  0,0 % ->  1,1 %   gehalten
    //   Level 20 (Faktor 1,73)  0,2 % -> 43,9 %   gekippt
    //   Level 30 (Faktor 2,49)  0,2 % -> 62,4 %   gekippt
    // Der Kipppunkt liegt also zwischen Faktor 1,44 und 1,73, und ab dort ist das Spiel
    // auch voll ausgebaut nicht mehr zu halten (Thomas: "nach oben hin weniger schwer
    // machen - so dass es auch in leveln hoeher als 30 noch spielbar ist").
    //
    // DIE KURVE: Die erste Stufe traegt die vollen 20 %, jede weitere 40 % des Aufschlags
    // der vorigen. Der Gesamtaufschlag konvergiert gegen 1,321.
    //   ab L6 x1,200 · ab L11 x1,296 · ab L16 x1,313 · ab L21 x1,318
    //   ab L26 x1,320 · Grenzwert 1,321
    // Dort, wo Benni spielt, kommt der Auftrag also voll an; oben laeuft er sich tot,
    // statt das Spiel abzuschneiden.
    //
    // WARUM 40 % UND NICHT 50 %, gemessen: Mit halbierenden Stufen (Grenzwert 1,456) lag
    // der Durchkommensanteil voll ausgebaut auf Level 30 bei 20,4 % und auf Level 40 bei
    // 29,5 % - besser als die 62 % der ungedaempften Fassung, aber immer noch weit ueber
    // dem Zielkorridor von 4 bis 12 %. Der Grenzwert musste also unter den Faktor, der
    // nachweislich gehalten hat: 1,32 (Level 12 dieser Messreihe, 1,1 %).
    //
    // DIE GEBAUTE FASSUNG, gemessen (Median aus je drei Laeufen, voll ausgebaut):
    //   Level 20  0,2 % ->  1,1 %      Level 30  0,2 % -> 18,8 %
    //   Level 40  (ungemessen) -> 16,0 %
    // Level 20 bleibt also praktisch, wie es war; oberhalb von 30 kostet es spuerbar
    // Figuren, ohne dass die Truppe ueberrannt wird (die ungedaempfte Fassung stand dort
    // bei 62 %). Der Anstieg zwischen Level 20 und 30 kommt NICHT aus dieser Treppe -
    // ihr Faktor ist dort schon fast gleich (1,313 gegen 1,318) - sondern aus dem
    // Endloszuwachs und der Gegnermischung, die ohnehin weiterlaufen. Die Treppe
    // verschiebt das Ganze nur ueber den Kipppunkt.
    //
    // ZUR EINORDNUNG DER ABSOLUTEN ZAHLEN: Dieser Messaufbau ist NICHT derselbe wie der
    // von E1 (dort 7,5 bis 9,4 % auf denselben Leveln, hier 0,0 bis 0,2 % vor der
    // Aenderung). Er ist milder, weil die Truppe waehrend der Messung am Deckel gehalten
    // wird. Belastbar ist deshalb der A/B-Vergleich mit identischem Aufbau, nicht der
    // Abgleich der Absolutwerte gegen den Korridor aus plan-v4.md.
    //
    // WAS DAS BEIM BOSS TUT, steht NICHT hier, sondern in bossPlan.ts: Er wird nicht
    // zaeher, sondern gefaehrlicher (Thomas' Entscheidung 2026-08-30) - mehr Begleiter
    // und schnelleres Vorruecken bei gleicher Kampfdauer.
    stufenHaerte: {
      everyLevels: 5,
      // Aufschlag der ERSTEN Stufe.
      firstStep: 0.2,
      // Anteil, den jede weitere Stufe vom Aufschlag der vorigen behaelt.
      stepDecay: 0.4,
    },
    // GEDAEMPFTE KOPPLUNG AN DIE SPIELERSTAERKE (Thomas' urspruenglicher Auftrag:
    // "sieh zu dass die Staerken der Gegner an die Waffen und die Menge meiner Leute
    // angepasst werden zu jeder Zeit").
    //
    // Warum das hier RICHTIG ist, obwohl dieselbe Kopplung bei der Wandhaerte einmal
    // gebaut und wieder ausgebaut wurde (siehe walls): Dort war sie UNGEDAEMPFT und
    // enthielt die WAFFE - jede Verbesserung war damit exakt wirkungslos, und wer eine
    // Schrotflinte aufhob, machte die Waende schlagartig 4x haerter. Hier gilt beides
    // nicht:
    //   - Die Waffe geht NICHT ein. Nur die drei Groessen, die der Spieler sammelt:
    //     Truppengroesse (ueber den Schadensbonus), Schaden und Feuerrate.
    //   - Es gibt eine UNTERGRENZE: Unterhalb der Referenz greift die Kopplung gar
    //     nicht (Faktor 1). Wer schwach dasteht, spielt gegen den reinen Levelwert.
    //   - Sie ist GEDAEMPFT: Bei 0,42 macht doppelte Feuerkraft die Gegner nur 1,34x
    //     zaeher - netto bleiben 1,49x mehr Durchsatz. Aufruesten wirkt also klar,
    //     nur nicht mehr unbegrenzt.
    //
    // Der Wert 0,42 ist NICHT gewaehlt, sondern die Loesung der Bedingung "der Anteil
    // durchkommender Gegner ist auf Level 12 derselbe wie auf Level 1":
    //   (P12/P1)^(1-d) = Typmischung x Nachschub
    //   28,44^(1-d) = 4,31 x 1,60 = 6,90  ->  1-d = ln 6,90 / ln 28,44 = 0,577
    // wobei P1 = 63 und P12 = 1.792 die Feuerkraft am jeweiligen Level-Deckel sind.
    //
    // Ohne diese Kopplung bliebe der zweite Sprung bestehen: Der Spieler geht INNERHALB
    // eines Levels von Truppe 3 auf 60 und von Schaden 1 auf den Deckel - auf Level 8
    // gemessen der Unterschied zwischen "100 % kommen durch" und "0 %". Die Levelkurve
    // allein kann das nicht auffangen, weil sie den Ausbaustand nicht kennt.
    firepowerCoupling: {
      // 0,42 -> 0,30 nach der Gegenprobe. Die 0,42 stammen aus der Bedingung "gleicher
      // Durchkommensanteil auf Level 1 wie auf Level 12" und setzen voraus, dass der
      // Nachschub gleichmaessig ueber die Level steigt. Gemessen tut er das nicht: Er
      // springt zwischen Level 6 und 8 um 87 % (6,6 -> 12,4 Gegner/s), weil dort die
      // Leveltabelle auf cluster-Horden und companionLimit 2 umstellt. Mit 0,42 wurden
      // die oberen Level dadurch doppelt belastet und kippten vollstaendig (100 %
      // kommen durch, auch voll ausgebaut) - schlechter als vor dem Umbau. 0,30 nimmt
      // den Faktor bei Level 12 von 5,9 auf 3,7 zurueck und laesst die unteren Level
      // praktisch unberuehrt (Level 1: 1,50 -> 1,33).
      dampening: 0.30,
      // Bezugspunkt: die Truppe mit voller Schuetzenzahl und den Grundwerten, also
      // 8 Schuetzen x Bonus 1,0 x stats.damage.base 1 x stats.shotsPerSec.base 3 = 24.
      // Wer darunter liegt (kleine Truppe am Levelanfang), trifft auf ungekoppelte
      // Gegner - der Einstieg wird also nie zusaetzlich bestraft.
      referencePower: 24,
      // Sicherung gegen Ausreisser. Am Level-12-Deckel liegt der Faktor rechnerisch bei
      // 74,7^0,30 = 3,7; 5 laesst Luft fuer Kombinationen, die die Rechnung nicht
      // vorhersieht, ohne dass ein Gegner je unangreifbar wird.
      maxFactor: 5,
    },
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
    // Jetzt driften Gegner seitlich auf die Truppe zu.
    //
    // 11 -> 4 (2026-08-23). Die alte Herleitung (halbe Aufholrate = "Ausweichen wirkt
    // noch") ist durch Messung WIDERLEGT. Gemessen wurde, wo Gegner sterben, je nach
    // Standort der Truppe - Level 6, Truppe 30, je 18 s:
    //   Truppe MITTE       1 % kommen durch, mittlerer Seitenabstand 4 px
    //   Truppe links aussen 72 %,             58 px
    //   Truppe rechts aussen 45 %,            83 px
    // Bei 11 px/s zog die Suche praktisch JEDEN Gegner vor eine mittig stehende Truppe
    // (Seitenabstand 4 px, groesster 38 px). Die Mitte war damit der SICHERE Ort - und
    // genau das ist Thomas' Beschwerde, wortwoertlich: "mein Team kann ich einfach
    // stehen lassen in der Mitte und es laeuft durch". Die Suche sollte Stehenbleiben
    // bestrafen und hat es belohnt.
    //
    // 4 px/s sind rund 22 px Drift ueber den ganzen Anflug (5,4 s): genug, dass Gegner
    // nicht stur an der Truppe vorbeilaufen, zu wenig, um eine feste Position sicher zu
    // machen. Zusammen mit den breiteren Spawn-Baendern (spawnBands) gibt es damit
    // keinen Standort mehr, der alles abdeckt - wer alles erwischen will, muss fahren.
    seekSpeedPxPerSec: 4,
    // Enemy composition belongs to the level plan, never to elapsed spawn time.
    spawnRampPerSec: 6,
    // SCHONFRIST AM LEVELANFANG (Thomas 2026-08-25: "Level eins koennten etwas weniger
    // Mobs sein, gerade am Anfang - wenn man mit einem Mann hinkommt, sind es zu viele
    // Gegner und man muss zuerst mal nur einsammeln").
    //
    // Er beschreibt einen echten Konstruktionsfehler, keinen Geschmack: Ein Run startet
    // mit EINER Figur (stats.hp.base), und die Feuerkraft haengt an der Schuetzenzahl.
    // In den ersten Sekunden ist die Truppe also am schwaechsten, was sie im ganzen Run
    // je sein wird - und der Spawn-Takt laeuft von Anfang an auf vollem Niveau. Das
    // Spiel verlangt dort etwas, das der Spieler noch gar nicht leisten KANN; ihm bleibt
    // nur Einsammeln und Ausweichen.
    //
    // Der vorhandene spawnRampPerSec macht genau das Gegenteil: Er verkuerzt den Takt im
    // Lauf des Levels, also von "viel" zu "noch mehr". Eine Anlaufkurve gab es nicht.
    //
    // 12 Sekunden sind aus der Sammelrate hergeleitet, nicht gewaehlt: Die linke Bahn
    // liefert 1,875 Plaettchen/s, davon rund vier Fuenftel gute. In 12 s sind das etwa
    // 18 Figuren - genug, dass die Truppe mit mehreren Schuetzen dasteht, bevor der
    // volle Takt einsetzt. Der Faktor 2,2 halbiert den Zufluss zu Beginn und laeuft
    // linear auf 1,0 aus, damit der Uebergang nicht als Ruck auffaellt.
    //
    // NUR AUF DEN ERSTEN BEIDEN LEVELN: Ab Level 3 startet man mit gefuellter Truppe aus
    // dem Vorlevel, dort gibt es das Problem nicht.
    // GEMESSEN, erster Anlauf: Der Taktfaktor allein brachte nur 29 statt 36 Gegner in
    // den ersten 12 s (-19 %), ausgelegt waren -38 %. Der Grund steht in
    // docs/lessons.md: Nicht das Spawn-Intervall bestimmt den Druck, sondern die
    // NACHLAUFPAUSE nach jeder Horde - sie ueberschreibt das Intervall, und der Faktor
    // fasst sie nicht an.
    //
    // Deshalb kommt der Hordenanteil dazu, und der ist hier der eigentliche Hebel: Rund
    // zwei Drittel aller Spawns sind Horden mit sieben bis zwoelf Mitgliedern. Wer mit
    // EINER Figur einer Siebener-Horde gegenuebersteht, kann nichts tun ausser
    // ausweichen - genau Thomas' Beobachtung. In der Schonfrist kommen deshalb
    // ueberwiegend Einzelgegner.
    warmup: {
      untilLevel: 2,
      seconds: 12,
      intervalFactorAtStart: 2.2,
      // Anteil der Hordenwahrscheinlichkeit zu Beginn. 0,3 heisst: aus 58 % Hordenanteil
      // auf Level 1 werden 17 %, es kommen also fast nur Einzelgegner. Laeuft wie der
      // Taktfaktor linear auf den vollen Wert aus.
      //
      // GEMESSEN in den ersten 12 s von Level 1 (drei Laeufe, Median), Schonfrist im
      // Spiel zur Laufzeit an- und abgeschaltet:
      //   nur Taktfaktor:            29 mit / 36 ohne  (-19 %)
      //   Taktfaktor plus Horden:    18 mit / 26 ohne  (-31 %)
      // Gegenueber dem Zustand ohne jede Schonfrist ist der Anfang damit etwa halbiert.
      //
      // ACHTUNG BEI KUENFTIGEN MESSUNGEN: Die Einzelwerte streuen stark (10 bis 33),
      // weil eine einzelne Horde sieben bis zwoelf Gegner auf einmal bringt. Verglichen
      // wird der Median aus mindestens drei Laeufen, und MIT gegen OHNE immer innerhalb
      // derselben Messreihe - zwischen zwei Reihen sind die Absolutwerte nicht
      // vergleichbar.
      //
      // Die Zusammensetzung wiegt hier schwerer als die Zahl: Statt einer Siebener-Horde
      // kommen Einzelgegner. Mit einer Figur ist das der Unterschied zwischen
      // "ausweichen" und "spielen".
      squadChanceFactorAtStart: 0.3,
    },
    spawnLaneSafetyGap: 5,
    // DURCHBRUCH: Ein Gegner, der die Truppenhoehe passiert, ohne getoetet worden zu
    // sein, kostet Figuren (Thomas 2026-08-23: "Ja Bau das").
    //
    // WARUM ES DAS BRAUCHT. Bis hierher war die einzige Verlustquelle die BERUEHRUNG.
    // Damit haing der Schaden an der Gesamtbilanz "Feuerkraft gegen Nachschub" - und die
    // ist bistabil: Sobald der Nachschub die Raeumleistung uebersteigt, staut es sich
    // auf, durchgelaufene Gegner machen Spuren frei, und es verstaerkt sich selbst.
    // Gemessen auf den Leveln 7-11 sprang der Anteil durchkommender Gegner zwischen 1 %
    // und 78 %, ohne dass ein Zwischenzustand existierte. Schlimmer: Wer an der Seite
    // fuhr, liess 84 % durch und verlor dabei NULL Figuren - die Gegner liefen an ihm
    // vorbei ins Leere. Verfehlen war folgenlos.
    // Jetzt haengt der Verlust an dem, was man VERFEHLT, statt an einer Bilanz. Das ist
    // ein stetiger Zusammenhang: doppelt so viel durchgelassen heisst doppelter Verlust.
    //
    // WER DURCHBRICHT. Nur Gegner, die die Truppe nicht beruehrt haben - ein beruehrender
    // Gegner wird in handlePlayerHit recycelt und hat bereits gekostet. Doppelt zahlt
    // also niemand. Die Unverwundbarkeit nach einem Treffer (player.iframesMs) gilt hier
    // BEWUSST NICHT: Sie schuetzt vor einer Trefferserie, nicht vor den Folgen des
    // eigenen Verfehlens - sonst waere die Regel bei hohem Durchsatz genau dann
    // wirkungslos, wenn sie greifen soll.
    //
    // HOEHE, hergeleitet aus dem Gegenstueck links. Die Sammelbahn liefert 1,875
    // Kacheln/s; wer den roten ausweicht, gewinnt 1,41 Figuren/s. Wer dort faehrt, laesst
    // gemessen 84 % der Gegner durch, auf Level 6 also 5,9/s bei einem mittleren
    // contactDamage von 1,3 (Gewichte 25/45/30 auf 1/1/2). Damit Dauerfahrt links noch
    // lohnt, aber nicht mehr geschenkt ist - Zielwert netto +0,5 Figuren/s statt +1,41:
    //   1,41 - 5,9 x 1,3 x f = 0,5  ->  f = 0,118
    // Gerundet 0,12. Ein leichter Gegner kostet damit 0,12 Figuren, ein schwerer 0,24 -
    // es braucht also rund acht Durchbrueche fuer eine Figur. Die Bruchteile werden
    // aufsummiert und erst bei einer vollen Figur eingeloest, sonst gaebe es bei 6
    // Durchbruechen je Sekunde sechsmal Anzeige und Kamerawackeln.
    breakthroughDamageFactor: 0.12,
    // Level 1 bleibt frei - dieselbe Begruendung wie bei den roten Wandkacheln
    // (walls.badMinLevel). Dort lernt man, wofuer die beiden Bahnen da sind, und startet
    // mit einer einzigen Figur (stats.hp.base).
    // Gemessen, warum das noetig ist: Der Durchbruchschaden hat eine Rueckkopplung -
    // weniger Figuren heisst weniger Feuerkraft heisst mehr Durchbrueche. Mit Truppe 10
    // und den Grundwerten stieg der Durchkommensanteil dadurch von 10 % auf 44 %, und die
    // Truppe war nach 20 s aufgerieben. Im echten Spiel faengt die Sammelbahn das ab
    // (1,875 Kacheln/s), aber genau darauf soll sich niemand im ersten Level verlassen
    // muessen, bevor er die Regel ueberhaupt gesehen hat.
    breakthroughMinLevel: 2,
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
      // 0,28 -> 0,45 und 0,62 -> 0,66 (2026-08-23). Das Hordenzentrum streute bisher nur
      // um +/- 28 % der halben Spielfeldbreite, also rund +/- 33 px um die Strassenmitte.
      // Zusammen mit der Zielsuche landete damit alles vor einer mittig stehenden
      // Truppe (gemessen: mittlerer Seitenabstand der Todesorte 4 px). 0,45 verteilt den
      // Anflug ueber den nutzbaren Korridor, ohne in die Wandzone zu reichen: Diese
      // beginnt bei walls.laneShare 0,34 von aussen, der freie Bereich endet also bei
      // 0,66 - der Wert fuer Einzelgegner. Horden bleiben darunter, weil sie um ihr
      // Zentrum noch nach beiden Seiten ausgreifen.
      hordeLaneShare: 0.45,
      singleLaneShare: 0.66,
    },
  },
  level: {
    warningMs: 1500,
    clearedMs: 1800,
    hardness: {
      perLevel: 0.045,
      max: 1.6,
    },
    // ENDLOS-SKALIERUNG AB LEVEL 12 (E1, Thomas/Benni 2026-08-24: "zu leicht", er
    // erreichte auf Anhieb Level 16).
    //
    // DER BEFUND, DER DIESEN BLOCK AUSLOEST: getLevelPlan rechnete
    // designLevel = ((level - 1) mod 12) + 1. Level 13 bekam damit die Gegnermischung
    // von Level 1 (96/4/0 statt 41/39/20). Gerechnet als Feuerkraft am Level-Deckel
    // geteilt durch Bedarf (Nachschub x mittlere gekoppelte Lebenspunkte):
    //   Level 12 = 4,58   Level 13 = 32,48   Level 16 = 18,13   Level 25 = 29,99
    // Level 13 war also SIEBENMAL leichter als Level 12. Dazu standen ab Level 12 alle
    // Wachstumsgroessen still - getStatCap und getCrowdDamageMultiplier klemmten beide
    // auf Level 12, hardness lief bei Level 14 in ihren Deckel 1,6.
    //
    // WOHER DIE HAERTE IM ENDLOSBEREICH KOMMT - und woher NICHT: Der Nachschub ist ab
    // Level 13 gesaettigt. Der Hordendeckel (squads.maxSizeCap 26) ist dort erreicht,
    // und er ist keine frei gewaehlte Zahl, sondern die Durchsatzgrenze der
    // Nachlaufpause: 1000 / pausePerMemberMs 40 = 25 Gegner/s. Ueber 26 bringt jede
    // weitere Figur rechnerisch fast nichts und kostet nur Poolplatz. Die Endlos-Haerte
    // kommt deshalb aus ZAEHIGKEIT (endlessHpGrowthPerLevel) und MISCHUNG, nicht aus
    // der Menge - im Modell steigt der Nachschub von Level 12 auf 30 nur von 12,6 auf
    // 14,8 Gegner/s, die mittleren Grundlebenspunkte dagegen von 8,5 auf 17,6.
    endless: {
      // Ab hier gilt die Endloskurve. Bis einschliesslich Level 12 aendert sich NICHTS
      // (Akzeptanzkriterium 5: Benni soll den Anfang wiedererkennen).
      fromLevel: 12,
      // Verschiebung der Gegnermischung Richtung schwer, in Gewichtspunkten je Level
      // ueber fromLevel. Der Zuwachs geht zuerst von 'leicht' ab, danach von 'standard'.
      //
      // 0,25 Punkte je Level - der Endzustand ist bei Level 28 erreicht.
      //
      // DIESE ZAHL IST GEMESSEN, NICHT GERECHNET, und sie stand zuerst viermal hoeher.
      // Der erste Bauzyklus setzte 1 Punkt je Level (Deckel 40 % schwer). Die Messung
      // im Browser ergab damit einen Durchkommensanteil von 23,1 % auf Level 20 und
      // 30,9 % auf Level 30 - der Zielkorridor endet bei 12 %.
      //
      // NACH DER ABFLACHUNG GEMESSEN (Mediane aus je drei Laeufen, frische Szene, 8 s
      // einschwingen, 30 s zaehlen - die Vorschrift aus docs/lessons.md):
      //   Level 12  7,5 %   Level 16  9,2 %   Level 20  9,4 %
      //   Level 25  8,1 %   Level 30  8,7 %
      // Alle fuenf im Korridor, Bildrate durchgehend 60 fps, keine Pool-Erschoepfung.
      //
      // EHRLICH DAZU: Die Kurve ist damit fast flach. Die Streuung derselben Messung
      // betraegt rund 2 Prozentpunkte (Level 12 mass in zwei Zyklen 5,7 % und 7,5 %,
      // obwohl es unveraendert ist und ein Test das festhaelt), der Zuwachs von Level 12
      // auf 30 liegt also knapp im Rauschen. Mehr gibt der Korridor nicht her: Der
      // Kipppunkt liegt bei rund 10-12 %, und darueber ist die Groesse nicht mehr
      // steuerbar. Die Steigerung im Endlosmodus ist deshalb bewusst eine der
      // SICHTBAREN Groessen - mehr schwere Gegner, zaehere Gegner, hoeheres Tempo,
      // groessere Horden - bei konstant forderndem Durchkommensanteil.
      weightShiftPerLevel: 0.25,
      // ENDDECKEL DER MISCHUNG. Ohne ihn bestuende die Horde irgendwann nur aus
      // schweren Gegnern - und weil der schwere Gegner drei Muenzen wert ist statt
      // einer, wuerde die Muenzrate mitexplodieren und E4 finanziell aushebeln.
      // 24 % schwer gegen 20 % auf Level 12: die mittleren Grundlebenspunkte steigen
      // allein dadurch von 8,54 auf 9,38 (Faktor 1,10).
      maxHeavyWeight: 24,
      // hardness laeuft weiter, aber FLACHER als bis Level 12 (0,045) und ohne den
      // Deckel 1,6, der frueher schon bei Level 14 griff. Bei Level 30 sind es 1,585.
      //
      // SIE IST EIN DRITTER HAERTEKANAL und wurde im ersten Bauzyklus als solcher
      // uebersehen: Sie treibt Spawntakt UND Gegnertempo zugleich. Mit 0,02 je Level
      // lag der Nachschub auf Level 50 um 23 % ueber Level 12 - zusammen mit Zaehigkeit
      // und Mischung genug, um den Korridor zu reissen.
      hardnessPerLevel: 0.005,
      // Obergrenze des Gegnertempos ueber stats.speed: 105 x 1,9 = 200 px/s, also unter
      // dem Deckel 305. Die Reaktionszeit vom Horizont bis zur Truppe (564 px) sinkt
      // damit von 3,6 s auf Level 12 auf 2,8 s - spuerbar enger, aber die Horde bleibt
      // beschiessbar. Erreicht wird der Deckel erst bei Level 93.
      hardnessMax: 1.9,
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
      // GEWICHTE NEU GESETZT 2026-08-23, zusammen mit der Behebung der wedge-Sonderregel
      // in spawner.getSquadTypes (Thomas: "bei Level 5 habe ich keine Chance mehr Gegner
      // abzuschiessen"). Bis dahin bestand ein 'wedge' IMMER nur aus leichten Gegnern -
      // und die Level 1-4 kennen ausschliesslich Keile. Diese Gewichte galten dort also
      // faktisch nur fuer Einzelgegner, waehrend die Hordenmasse (rund zwei Drittel aller
      // Spawns, je 10-12 Mitglieder) fest auf 'leicht' stand. Ab Level 5 kamen 'cluster'
      // und 'row' dazu, die die Gewichte auswerten - und die Haerte vervierfachte sich
      // schlagartig (mittlere Lebenspunkte je Gegner 4,1 -> 18,0).
      //
      // Jetzt gelten die Gewichte fuer ALLES. Damit die Level 1-4 dabei so bleiben, wie
      // Thomas sie abgenommen hat, mussten sie deutlich leicht-lastiger werden als
      // vorher: Sie schreiben jetzt auf, was dort ohnehin schon gespielt wurde.
      // Mittlere Grundlebenspunkte je Level (Typen 2/8/23), ohne die Kopplung:
      //   L1 2,24 · L2 2,42 · L3 2,60 · L4 2,78 · L5 3,17 · L6 3,83 · L7 4,49
      //   L8 5,30 · L9 6,11 · L10 6,92 · L11 7,73 · L12 8,54
      // Eine glatte Kurve ohne Sprung, Faktor 3,8 ueber elf Level. Der Anteil schwerer
      // Gegner steigt trotzdem von 0 auf 20 %, damit das Bild sich sichtbar aendert.
      { normalPhaseSec: 75, enemyWeights: [96, 4, 0], spawnIntervalMs: 880, spawnIntervalMinMs: 550, squadChance: 0.58, squads: [{ kind: 'wedge', weight: 1, size: 7 }], companionLimit: 0 },
      { normalPhaseSec: 78, enemyWeights: [93, 7, 0], spawnIntervalMs: 840, spawnIntervalMinMs: 530, squadChance: 0.61, squads: [{ kind: 'wedge', weight: 1, size: 8 }], companionLimit: 0 },
      { normalPhaseSec: 78, enemyWeights: [90, 10, 0], spawnIntervalMs: 820, spawnIntervalMinMs: 510, squadChance: 0.63, squads: [{ kind: 'wedge', weight: 1, size: 9 }], companionLimit: 0 },
      { normalPhaseSec: 80, enemyWeights: [87, 13, 0], spawnIntervalMs: 790, spawnIntervalMinMs: 490, squadChance: 0.65, squads: [{ kind: 'wedge', weight: 1, size: 10 }], companionLimit: 0 },
      { normalPhaseSec: 80, enemyWeights: [83, 16, 1], spawnIntervalMs: 770, spawnIntervalMinMs: 480, squadChance: 0.67, squads: [{ kind: 'row', weight: 1, size: 4 }, { kind: 'cluster', weight: 3, size: 12 }], companionLimit: 1 },
      { normalPhaseSec: 82, enemyWeights: [77, 20, 3], spawnIntervalMs: 740, spawnIntervalMinMs: 460, squadChance: 0.69, squads: [{ kind: 'row', weight: 1, size: 4 }, { kind: 'wedge', weight: 2, size: 13 }], companionLimit: 1 },
      { normalPhaseSec: 82, enemyWeights: [71, 24, 5], spawnIntervalMs: 710, spawnIntervalMinMs: 440, squadChance: 0.71, squads: [{ kind: 'row', weight: 1, size: 4 }, { kind: 'cluster', weight: 3, size: 12 }], companionLimit: 2 },
      { normalPhaseSec: 84, enemyWeights: [65, 27, 8], spawnIntervalMs: 690, spawnIntervalMinMs: 420, squadChance: 0.73, squads: [{ kind: 'cluster', weight: 3, size: 12 }, { kind: 'row', weight: 1, size: 4 }], companionLimit: 2 },
      { normalPhaseSec: 84, enemyWeights: [59, 30, 11], spawnIntervalMs: 660, spawnIntervalMinMs: 400, squadChance: 0.75, squads: [{ kind: 'wedge', weight: 1, size: 10 }, { kind: 'row', weight: 1, size: 4 }, { kind: 'cluster', weight: 3, size: 13 }], companionLimit: 3 },
      { normalPhaseSec: 86, enemyWeights: [53, 33, 14], spawnIntervalMs: 630, spawnIntervalMinMs: 390, squadChance: 0.77, squads: [{ kind: 'row', weight: 1, size: 4 }, { kind: 'cluster', weight: 4, size: 13 }], companionLimit: 3 },
      { normalPhaseSec: 86, enemyWeights: [47, 36, 17], spawnIntervalMs: 610, spawnIntervalMinMs: 370, squadChance: 0.79, squads: [{ kind: 'wedge', weight: 1, size: 11 }, { kind: 'row', weight: 1, size: 4 }, { kind: 'cluster', weight: 4, size: 14 }], companionLimit: 4 },
      { normalPhaseSec: 88, enemyWeights: [41, 39, 20], spawnIntervalMs: 580, spawnIntervalMinMs: 350, squadChance: 0.81, squads: [{ kind: 'row', weight: 1, size: 4 }, { kind: 'cluster', weight: 5, size: 14 }], companionLimit: 4 },
    ] satisfies readonly LevelDefinition[],
  },
  boss: {
    referenceFirepower: {
      // TREFFERWIRKUNGSGRAD JE WAFFE (Thomas 2026-08-25: "9 Sekunden ist eindeutig zu
      // wenig, dann lieber mit Pistole viel laenger machen").
      //
      // DIE URSACHE, gemessen: Die Boss-Lebenspunkte werden aus referenceDps abgeleitet,
      // also aus der Feuerkraft, die die Truppe THEORETISCH liefert. Was davon den Boss
      // tatsaechlich trifft, ist ein Bruchteil - er steht weit oben, langsame Geschosse
      // verfehlen ihn haeufiger, und die gerufenen Horden fangen Beschuss ab. Der Anteil
      // haengt stark an der WAFFE: Er reicht von 0,18 (Pistole) bis 1,15 (Streubombe),
      // Faktor 6. Ein einziger Mittelwert fuer alle Waffen liess die Kampfdauer deshalb
      // zwischen 4 und 24 Sekunden schwanken.
      //
      // GEMESSEN auf Level 9, volle Truppe, Level-Deckelwerte, Median aus drei
      // VOLLSTAENDIG ausgefochtenen Kaempfen (Sonde: scratchpad/waffeneff.mjs).
      // NICHT ueber die ersten Sekunden hochrechnen - der Boss rueckt waehrend des
      // Kampfes vor, die Trefferrate steigt im Verlauf, und genau daran war eine erste
      // Kalibrierung um 74 % zu pessimistisch.
      //
      // Werte ueber 1,0 sind kein Messfehler: getWeaponFirepower zaehlt Sprengwirkung
      // bewusst nicht mit ("ein Boss ist ein Ziel"), die Streubombe trifft ihn aber mit
      // mehreren Teilsprengungen zugleich.
      hitEfficiencyByWeapon: {
        pistol: { beiLevel1: 0.48, beiLevel9: 0.178, abLevel12: 0.099 },
        normal: { beiLevel1: 0.67, beiLevel9: 0.281, abLevel12: 0.17 },
        shotgun: { beiLevel1: 0.41, beiLevel9: 0.237, abLevel12: 0.179 },
        minigun: { beiLevel1: 0.778, beiLevel9: 0.332, abLevel12: 0.208 },
        flamethrower: { beiLevel1: 0.274, beiLevel9: 0.149, abLevel12: 0.119 },
        laser: { beiLevel1: 0.976, beiLevel9: 0.484, abLevel12: 0.371 },
        chainlightning: { beiLevel1: 0.971, beiLevel9: 0.482, abLevel12: 0.363 },
        rocket: { beiLevel1: 1.451, beiLevel9: 0.681, abLevel12: 0.498 },
        grenade: { beiLevel1: 1.482, beiLevel9: 0.734, abLevel12: 0.558 },
        ricochet: { beiLevel1: 0.972, beiLevel9: 0.482, abLevel12: 0.371 },
        sawblade: { beiLevel1: 0.92, beiLevel9: 0.468, abLevel12: 0.361 },
        cluster: { beiLevel1: 2.994, beiLevel9: 1.483, abLevel12: 1.077 },
        shockwave: { beiLevel1: 2.063, beiLevel9: 1.023, abLevel12: 0.789 },
        // VOLLSTAENDIGKEIT erzwingt bossPlan.ts mit einer Record<WeaponKey, ...>-Annahme -
        // hier ginge das nur ueber einen Import aus weapons.ts, und der zeigt zurueck auf
        // diese Datei.
      },
      // DIE DREI STUETZSTELLEN. Zwischen ihnen wird linear interpoliert, ab Level 20
      // bleibt der Wert stehen.
      //
      // Warum drei und nicht eine Formel: Ein erster Versuch rechnete mit einem festen
      // Verfall je Level (0,973), am Median von neun Waffen zwischen Level 9 und 20
      // kalibriert. Auf Level 9 und 20 passte das; an beiden Enden nicht.
      //   Level 1  gemessen 6-12 s statt 20 - dort steht kaum ein Begleiter im Weg, also
      //            trifft fast alles. Die Waffen liegen deshalb ALLE nahe beieinander
      //            (0,64 bis 0,96, nur der Flammenwerfer 0,30) und spreizen sich erst
      //            durch die Abschirmung. Genau das kann ein gemeinsamer Faktor nicht.
      //   Level 30 gemessen 15 s statt 20 - zwischen 20 und 30 faellt die Rate GAR NICHT
      //            mehr (Laser 0,370 -> 0,369, Streubombe 1,071 -> 1,081). Der Verfall
      //            saettigt, die Formel rechnete ihn weiter herunter.
      //
      // DIE OBERE STUETZSTELLE LIEGT BEI 12, NICHT BEI 20 (korrigiert 2026-08-25, nachdem
      // Level 12 reproduzierbar 36 bis 42 s dauerte statt der geplanten 30). Gemessen ist
      // die Rate dort BEREITS auf dem Niveau von Level 20: Laser 0,372 gegen 0,371, und
      // auf Level 30 noch einmal 0,369. Der Abfall endet also genau dort, wo auch die
      // Leveltabelle endet (level.plans hat zwoelf Eintraege) - darueber uebernimmt der
      // Endlosmodus, und der laesst die Hordendichte kaum noch wachsen. Die Werte in
      // abLevel12 sind auf Level 20 gemessen und auf Level 12 und 30 bestaetigt.
      // Deshalb Messwerte statt Kurve. Die Interpolation dazwischen ist linear und liegt
      // damit eher UEBER der wahren Kurve - der Kampf wird dort im Zweifel etwas laenger
      // als geplant, nicht kuerzer, und das ist die Richtung, die Thomas verlangt hat.
      //
      // DIE WERTE SIND GEOMETRISCHE MITTEL AUS ZWEI MESSRUNDEN, und das ist kein
      // Schoenheitsfehler, sondern noetig: Der Wirkungsgrad haengt an der KAMPFDAUER, und
      // die Kampfdauer haengt am Wirkungsgrad. In der ersten Runde dauerte ein Level-1-
      // Kampf mit der Pistole 6,5 s - so kurz, dass der Boss noch keine Horde gerufen
      // hatte und fast alles traf (0,88). Mit diesem Wert eingebaut dauerte derselbe
      // Kampf 61 s, die Abschirmung baute sich auf, und die Rate fiel auf 0,375. Ein
      // direkter Wechsel auf den neuen Messwert kippt das Ergebnis nur auf die andere
      // Seite; das geometrische Mittel daempft die Schwingung.
      //
      // WER HIER NACHMISST, muss deshalb ZWEIMAL messen: einmal, um den Wert zu
      // bekommen, und einmal, um zu sehen, was er mit der Kampfdauer macht.
      //
      // DRITTE RUNDE (2026-08-25, nach der Anhebung des Zeitfensters auf 30 s): Wer die
      // Mindestdauer aendert, aendert die Kampfdauer und damit wieder die Rate - zwei
      // Werte mussten nachgezogen werden. Das SPRINGT INS AUGE, welche: Es sind wieder
      // Pistole und Sturmgewehr, die beiden mit der kuerzesten Reichweite. Die
      // streuungsarmen Waffen sassen ohne Nacharbeit (Laser exakt 30,0 s auf Level 12
      // UND auf Level 30).
      //
      // ERGEBNIS, ueber sechs Level voll ausgefochten (Sekunden, ein Kampf je Feld):
      //          L1     L5     L9     L14    L20    L30
      //   Laser  19,8   21,0   20,0   23,3   20,0   20,0
      //   Rakete 20,0   -      19,3   -      21,8   -
      //   Sturmg 21,8   32,8   22,0   22,5   27,5   21,0
      //   Pistol 34,8   26,5   30,0   53,0   34,8   43,5
      // Neun bis elf der dreizehn Waffen liegen auf jedem Level zwischen 19 und 23 s.
      //
      // WAS BLEIBT, und warum es NICHT weiter eingestellt wird: Die vier schwaechsten
      // Waffen (Pistole, Schrotflinte, Flammenwerfer, Sturmgewehr) streuen zwischen zwei
      // identischen Laeufen um Faktor zwei - die Pistole mass auf Level 9 nacheinander
      // 26, 27, 30, 34 und 40 s. Sie haben die kuerzeste Reichweite, also entscheidet
      // mit, welche Gegner der Zufall gerade davor stellt. Unterhalb dieser Streuung ist
      // keine Einstellung mehr belegbar; wer dort weiterdreht, kalibriert Rauschen.
      // Die Pistole ab Level 14 (53 s) ist der bekannte Grenzfall: Sie ist die Startwaffe
      // und wird ab Level 2 ersetzt - dort zu landen heisst, vierzehn Level lang keine
      // einzige Waffe aufgesammelt zu haben.
      hitEfficiencyLevels: { unten: 1, mitte: 9, oben: 12 },
      // BEZUGSWERT der Tabelle: Er legt fest, welche Waffe am Zielfenster gemessen wird.
      // 0,30 liegt knapp ueber dem Sturmgewehr auf Level 9 (0,275), damit die Bezugswaffe
      // im unteren Drittel des Fensters landet und die staerkeren Waffen Luft nach unten
      // haben.
      hitEfficiency: 0.3,
      // WIE STARK der Waffenunterschied herausgerechnet wird. 0 = gar nicht (dann bleibt
      // die volle Spannweite), 1 = vollstaendig (dann dauert jeder Kampf gleich lang, was
      // Thomas ausdruecklich NICHT will: "es ist ok, dass es unterschiedlich lange
      // dauert"). 0,45 zieht die Spannweite auf gut Faktor 2 zusammen; den Rest deckelt
      // das Zeitfenster.
      hitDampening: 0.45,
      // Bezugslevel fuer den WAFFENUNTERSCHIED (nicht fuer den Levelabfall): An dieser
      // Stelle wird gemessen, wie stark der Trefferaufschlag eine Waffe verlaengert.
      hitEfficiencyReferenceLevel: 9,
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
      // ANGEHOBEN AM 2026-08-25 (Thomas nach dem Spielen bis Level 9 mit gekauften
      // Aufwertungen: "die Bosse sind zu einfach (zu schnell) zu besiegen"). Gemessen
      // dauerte ein Kampf mit seinem Ausbaustand 20,0 bis 22,5 s - das System hielt also
      // genau seine Untergrenze, sie war nur zu niedrig. Ohne gekaufte Aufwertungen
      // waren es 26 bis 27 s; wer ausbaut, drueckt den Kampf also an die Untergrenze,
      // und genau dort stand Thomas.
      //
      // Alle drei Werte muessen zusammen wandern: Eine Untergrenze ueber der Obergrenze
      // von Level 1 wuerde still von Math.min gewonnen, das Fenster waere dort also
      // wirkungslos.
      minFightSec: 30,
      maxFightSecAtLevelOne: 34,
      maxFightSecPerLevel: 0.545,
      maxFightSecCap: 45,
      // 0 ignores crowd strength; 1 scales boss HP fully with it. This value halves
      // the fight from the smallest crowd to crowd.max without erasing the reward.
      teamDampening: 0.41,
      // 0 ignores weapon strength (the Level-1 laser bug); 1 fully equalizes weapons. This keeps
      // weapon luck noticeable without allowing a weak weapon to exceed the boss-pressure window.
      weaponDampening: 0.8,
      // Earned damage and fire-rate changes matter, but are damped before the fight clamp.
      statDampening: 0.8,
      damageCap: 8,
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
    // ELITE-BOSS (E7, Thomas 2026-08-24: "ein neues Bild, groesser und boeser, und er
    // darf sich hin und her bewegen").
    //
    // ER WIRD UEBER VERHALTEN GEBAUT, NICHT UEBER LEBENSPUNKTE - der wichtigste Satz
    // hier. Am 2026-08-22 und erneut am 2026-08-23 wurde gemessen, dass die
    // Boss-Kampfdauer nicht an seinen Lebenspunkten haengt, sondern am Gegnerschild
    // davor: Dieselbe Konfiguration lieferte einmal 29 und einmal 109 Sekunden. Ein Boss
    // mit mehr Lebenspunkten wird also nur LAENGER, nicht schwerer - man wartet dann
    // bloss vor einer groesseren Zahl.
    //
    // ACHTUNG, der naheliegende Hebel ist TOTER CODE: level.plans[].companionLimit sieht
    // aus wie die Stellschraube fuer Begleiter, wird aber nur durchgereicht und in einem
    // Test abgefragt - im Spiel liest ihn niemand. Der tatsaechliche Begleiterdruck
    // laeuft ueber hordePressure (oben) und phaseOne/phaseTwo.hordePressureShare.
    // AKZEPTANZ GEMESSEN (je drei Laeufe, frische Szene, Trefferrate ueber 15 s):
    //   normaler Boss (Level 9):  87 s     Elite (Level 10): 116 s
    // Der Elite liegt 34 % darueber, erlaubt sind 50 %. Erfuellt.
    //
    // ⚠ DER GROESSERE BEFUND STECKT IN DEN ABSOLUTZAHLEN, und er betrifft NICHT nur den
    // Elite: Ein Bosskampf dauert real ein bis zwei Minuten, geplant sind 20-40 s. Die
    // Lebenspunkte werden aus einer GERECHNETEN Feuerkraft abgeleitet (referenceDps in
    // bossPlan), die weit ueber der tatsaechlichen Trefferrate liegt - gemessen auf
    // Level 9 mit voller Truppe:
    //   Pistole      gerechnet 514 DPS -> 21 s   ·  gemessen  91 DPS -> 121 s
    //   Sturmgewehr  gerechnet 721 DPS -> 20 s   ·  gemessen 195 DPS ->  74 s
    //   Laser        gerechnet 464 DPS -> 22 s   ·  gemessen 229 DPS ->  44 s
    // Der Faktor schwankt zwischen 2 und 6 je nach Waffe: Nicht jeder Schuss trifft den
    // weit oben stehenden Boss, und langsame Geschosse verfehlen ihn haeufiger. Die
    // Formel kennt diesen Verlust nicht.
    //
    // BEWUSST NICHT IN E7 REPARIERT: Das ist ein bestehender Zustand des Bosssystems,
    // nicht Folge des Elite-Bosses, und er anzufassen hiesse, die Lebenspunktkurve aller
    // zwoelf Bosslevel neu herzuleiten. Thomas vorgelegt statt still gedreht.
    // Gezeichnete Bewegungsbilder statt gerechneter Bewegung (Thomas 2026-09-04, nach
    // dem Testlauf: "bewegungen so uebernehmen fuer die normalen runs - figuren
    // berechnet und bosse mit bildbewegung").
    //
    // Warum ausgerechnet beim Boss und nicht bei den Gegnern: Der Zombie-Versuch am
    // selben Tag scheiterte, weil vier fast gleiche Laufhaltungen als Flackern gelesen
    // werden (15 % Silhouettenunterschied). Der Boss ist EINE grosse Figur mit einer
    // Bewegung, deren Haltungen weit auseinanderliegen - Stampfen und Aufbaeumen,
    // gemessen 69 % Unterschied. Die Herleitung steht in docs/lessons.md.
    //
    // ZWEI SAETZE, weil es zwei Bosse gibt: Der Elite-Boss hat seit E7 bewusst ein
    // eigenes Bild, damit er auf den ersten Blick als anderer Gegner lesbar ist. Ein
    // gemeinsamer Bildsatz haette diesen Unterschied wieder eingeebnet.
    bilder: {
      elite: [
        'boss-elite-move-1', 'boss-elite-move-2', 'boss-elite-move-3', 'boss-elite-move-4',
        'boss-elite-move-5', 'boss-elite-move-6', 'boss-elite-move-7', 'boss-elite-move-8',
        'boss-elite-move-9', 'boss-elite-move-10', 'boss-elite-move-11', 'boss-elite-move-12',
      ] as const,
      basic: [
        'boss-basic-move-1', 'boss-basic-move-2', 'boss-basic-move-3', 'boss-basic-move-4',
        'boss-basic-move-5', 'boss-basic-move-6', 'boss-basic-move-7', 'boss-basic-move-8',
        'boss-basic-move-9', 'boss-basic-move-10', 'boss-basic-move-11', 'boss-basic-move-12',
      ] as const,
      // Volle Auf-und-ab-Bewegung je Sekunde. 0,55 -> 0,8 (Thomas 2026-09-04: "abgehakt
      // ... fluessiger gestalten"). GERECHNET: Mit vier Bildern stand jedes 455 ms und
      // war als Standbild zu sehen. Zwoelf Bilder bei 0,8 Zyklen ergeben 104 ms - knapp
      // an der Schwelle von rund 100 ms, ab der Sprite-Bewegung fluessig gelesen wird.
      // Der Boss baeumt sich damit in 1,25 s statt 1,8 s auf und bleibt schwerfaellig.
      zyklenProSekunde: 0.8,
      // Ab welchem Anteil der Bildhoehe die Standflaeche beginnt. Daraus misst
      // bildVersatz.ts, wie weit die Figur je Bild seitlich von der Bildmitte abweicht -
      // beim Grundboss sind das bis zu 30 von 240 px, die sonst als Rutschen zu sehen
      // waeren. Zwei Drittel: unterhalb davon sind Beine und Fuesse, keine Arme.
      standflaecheAbAnteil: 0.667,
    },
    elite: {
      // Alle fuenf Level, also 5, 10, 15, 20, ... Auf 5 und 10 muss er schaffbar
      // bleiben: Dort hat man weder Meta-Ausbau noch die spaeten Waffen.
      everyLevels: 5,
      // MEHR BEGLEITER statt mehr Lebenspunkte. Beide Werte wirken zusammen: hordeSize
      // bestimmt, wie viele auf einmal kommen, maxActive den gleichzeitigen Bestand.
      hordeSizeFactor: 1.4,
      maxActiveFactor: 1.35,
      // SCHNELLERES VORRUECKEN. Er kommt der Truppe frueher nahe, der Spieler hat
      // weniger Zeit - das ist Druck, der nicht in Wartezeit umschlaegt.
      advanceSpeedFactor: 1.3,
      // SEITLICHES PENDELN. Es wurde am 2026-08-23 beim normalen Boss bewusst entfernt;
      // hier kommt es als EIGENSCHAFT DES ELITE-BOSSES zurueck. Beim normalen bleibt es
      // entfernt. Amplitude als Anteil der halben Strassenbreite.
      //
      // 0,45 -> 0,20, GEMESSEN UND ZURUECKGENOMMEN: Die Truppe schiesst spurtreu
      // (projectile.laneFollow). Ein Boss, der quer durch den Korridor pendelt, steht
      // die meiste Zeit NEBEN der Feuerlinie - gemessen halbierte das die Trefferrate:
      //   Amplitude 0,45 -> 67 HP/s   0,20 -> 107   0,12 -> 110   ohne -> 120
      // Er wurde damit fast doppelt so lange beschossen, ohne im Geringsten
      // gefaehrlicher zu sein. Genau das verbietet der V4-Plan fuer diese Etappe: "Bleibt
      // der Elite-Boss trotz Verhaltensaenderung nur laenger" - und dieselbe Wirkungskette
      // steht schon als Lesson im Projekt (2026-08-22, Zielsuche half dem Gegner).
      //
      // Bei 0,20 kostet das Pendeln noch 11 % Trefferrate. Der Ausschlag betraegt auf
      // Kampfhoehe rund 60 px - sichtbar, man muss nachfuehren, aber die Feuerlinie
      // verliert ihn nicht.
      swingAmplitudeShare: 0.2,
      // Neigung beim Pendeln (Thomas 2026-09-04: "und auch seitlich (wenn das bei jedem
      // 5. level der fall ist)"). Der Elite-Boss soll nicht seitlich GLEITEN, sondern
      // sich in seine Bewegungsrichtung legen - dieselbe Idee wie bei der Truppe, die
      // sich beim Lenken in die Kurve neigt.
      //
      // GERECHNET, nicht gesetzt: Beim seitlichen Gehen wandert der Schwerpunkt ueber
      // das fuehrende Bein. Ein breit aufsetzender Koloss verlagert ihn um rund ein
      // Achtel seiner Koerperhoehe, das sind atan(0,125) = 7,1 Grad. Die Truppe steht
      // mit 9 Grad hoeher - sie ist leichter und wirft sich staerker herum.
      swingLeanMaxDeg: 7.1,
      swingSeconds: 3.4,
      // Lebenspunkte NUR leicht darueber. Nicht null, damit er nicht schneller faellt
      // als der gewoehnliche, aber klein genug, dass die Kampfdauer nicht davon getragen
      // wird - die Akzeptanz erlaubt hoechstens 50 % ueber dem normalen Boss, und die
      // sollen aus dem Verhalten kommen.
      maxHpFactor: 1.15,
    },
    // Der Boss RUECKT AB KAMPFBEGINN VOR (Thomas 2026-08-22: "der boss muss langsam auf
    // mich zukommen, langsamer als die mobs aber doch auf mich zu"). Vorher stand er
    // 36 s regungslos auf battleY und setzte sich erst dann in Bewegung - in den meisten
    // Kaempfen also nie, weil sie vorher entschieden waren.
    pressureDelayMs: 0,
    // 34 -> 8,5 px/s. Hergeleitet aus der Strecke und dem Zeitfenster, nicht geschaetzt:
    // Von battleY 300 bis zum Halt (Anker 714 minus advanceStopBeforeAnchorPx 80 = 634)
    // sind es 334 px. Der Boss soll genau dann ankommen, wenn das Kampf-Zeitfenster
    // ausgereizt ist: 334 / maxFightSecCap. Nicht gerundet, damit die Ankunft exakt auf
    // dem Fensterende liegt und der Test das pruefen kann.
    // 2026-08-25 mit dem Fenster nachgezogen: 334 / 45 = 7,42 statt 334 / 40 = 8,35.
    // WER maxFightSecCap AENDERT, MUSS DIESE ZAHL NACHRECHNEN - sonst erreicht der Boss
    // die Truppe, bevor der Kampf entschieden ist.
    // Damit stimmt beides, was Thomas verlangt hat: Er kommt sichtbar naeher (ueber die
    // 30 s Mindestdauer rund 223 px, also mehr als eine Bosslaenge), und er ist mit
    // 7,42 px/s um den Faktor 6 langsamer als der langsamste Gegner (schwerer Gegner am
    // Tempo-Boden: 70 x 0,7 = 49 px/s).
    advanceSpeed: 7.42,
    // The boss centre stops before the crowd anchor; its lower collision edge can
    // still touch a stationary formation, but lateral escape remains available.
    advanceStopBeforeAnchorPx: 80,
    advanceContactDamage: 2,
    coinReward: 25,
    // Gemessene opake Masse von src/assets/enemy-boss.png, nicht die Leinwand.
    // Seit W7 (2026-08-23) liegt das Bild in doppelter Aufloesung vor (240x240), die
    // Masse sind entsprechend in Texturpixeln: 236 statt 118. Auf dem Bildschirm bleibt
    // die Figur gleich gross, weil render.figureTextureScale sie halbiert.
    bodyWidth: 236,
    bodyHeight: 236,
  },
  feedback: {
    // TREFFERBLITZEN ENTFERNT (Thomas 2026-08-23: "das trefferblitzen weg lassen
    // komplett"). Bis hierher wurde jeder getroffene Gegner fuer 80 ms voll weiss
    // gefuellt (setTintFill). Bei bis zu 73 gleichzeitigen Gegnern und mehreren
    // Salven je Sekunde flackerte damit ein grosser Teil des Bildes dauerhaft.
    // Der Boss hatte denselben Zweig, aber seine flashRemainingMs wurde NIE gesetzt -
    // toter Code, der mit entfernt ist. Die Phasenumschaltung des Bosses
    // (boss.phaseTwo.transitionFlashMs) bleibt: Sie ist ein einmaliges Ereignis,
    // kein Dauerflackern.
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
  render: {
    // Deckel fuer die Schrift-Aufloesung (siehe systems/textSharpness.ts). Gemessen wird
    // die tatsaechliche Streckung; auf einem iPhone mit 390 Punkten Breite und dreifacher
    // Geraeteaufloesung ist sie genau 3. Darueber ist kein Unterschied mehr sichtbar, und
    // jede Stufe kostet quadratisch Texturflaeche.
    maxTextResolution: 3,
    // Alle Figuren-Sprites (Truppe, drei Gegnertypen, Boss) liegen seit W7 in DOPPELTER
    // Aufloesung vor. Grund: Mit pixelArt: false glaettet Phaser beim Skalieren, und
    // enemy.figureScale 1,25 VERGROESSERT die Gegner - eine Textur in Zielgroesse wurde
    // dabei hochgerechnet und wirkte weich. Aus der doppelten Aufloesung heraus wird
    // dagegen immer verkleinert, und das bleibt scharf.
    //
    // Dieser Faktor rechnet die Texturpixel zurueck auf die Spielgroesse. Er gehoert
    // ueberall dorthin, wo eine Figuren-Textur skaliert wird - dieselbe Stelle wie
    // enemy.figureScale. Wer ihn vergisst, bekommt doppelt so grosse Figuren.
    // 0,5 ist exakt der Kehrwert der Verdopplung; er ist KEIN Tuning-Wert.
    figureTextureScale: 0.5,
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
      // NACHGEZOGEN 2026-08-23 mit shootersPerSalvo 3 -> 5: 5 Salven x 5 Schuetzen = 25.
      // 40 laesst 60 % Reserve wie zuvor.
      rocket: 40,
      // 17.6 salvos/s x 3 shooters x 1 projectile x 0.80s flight = 42.3; 56 leaves 32% reserve.
      // NACHGEZOGEN 2026-08-23 mit shootersPerSalvo 3 -> 8: 17,6 x 8 x 0,80 = 112,6.
      // 152 laesst dieselben 35 % Reserve. Das ist der groesste Einzelpool nach dem
      // Flammenwerfer - die Minigun feuert am schnellsten UND jetzt mit voller Truppe.
      minigun: 152,
      // Peak: 14.4 salvos/s x 3 shooters x 5 projectiles x 0.694s flight = 149.8; 200 leaves 33% reserve.
      flamethrower: 200,
      // 5.6 salvos/s x 6 shooters x 1 projectile x 0.92s flight = 30.9; 48 leaves 55% reserve.
      chainlightning: 48,
      // Peak: shotsPerSec-Deckel 8 x rateFactor 0,26 = 2,08 Salven/s x 4 Schuetzen x
      // 1,41 s Flugzeit (536 px bei 380 px/s) = 11,7; 24 laesst 51 % Reserve.
      // 12 -> 24 mit der E3-Ratenerhoehung: Der alte Wert war exakt aus rateFactor 0,15
      // gerechnet und waere auf null Reserve gelaufen.
      grenade: 24,
      // ---- Die fuenf Waffen von 2026-08-24 ----
      // Alle nach derselben Formel wie oben: Salven/s x Schuetzen x Kugeln x Flugzeit,
      // Salven/s = shotsPerSec-Deckel 8 x rateFactor. Fuer die Flugzeit ist konservativ
      // die volle Bildhoehe von 700 px angesetzt, nicht die tatsaechliche Reichweite -
      // ein zu grosser Pool kostet Speicher, ein zu kleiner laesst ein Geschoss stumm
      // ausfallen (im Projekt bereits passiert, siehe die Muenzen weiter unten).
      //
      // 9,2 Salven/s x 8 Schuetzen x 1 x 1,17 s (700/600) = 86; 120 laesst 39 % Reserve.
      pistol: 120,
      // 12,0 x 8 x 1 x 0,97 s (700/720) = 93; 128 laesst 38 %.
      ricochet: 128,
      // 3,2 x 6 x 3 Kugeln x 1,59 s (700/440) = 92; 128 laesst 39 %. Der Dreifachschuss
      // macht sie trotz niedriger Rate zu einem der groesseren Pools.
      cluster: 128,
      // 3,36 x 5 x 1 x 3,18 s (700/220) = 53; 72 laesst 36 %. Das langsame Blatt steht
      // mehr als drei Sekunden im Bild - deshalb trotz niedrigster Rate kein kleiner Pool.
      sawblade: 72,
      // 4,0 x 6 x 1 x 0,80 s (700/880) = 19; 32 laesst 68 %. Kleinster Pool im Spiel:
      // schnelles Geschoss, kurze Reichweite, es raeumt sich selbst schnell ab.
      shockwave: 32,
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
    //
    // 264 -> 288, NEU HERGELEITET FUER DEN ENDLOSMODUS (E1, 2026-08-24). Genau der oben
    // angekuendigte Fall ist eingetreten: Der Hordendeckel squads.maxSizeCap (26) wurde
    // bis Level 12 nie erreicht - dort waren 21 wirksam. Ab Level 13 liefert
    // getMaxSquadSize ihn voll aus, und weil es jetzt Level 13 aufwaerts ueberhaupt
    // gibt, ist er der neue Bemessungsfall:
    //   Pause     = 250 + 26 x 40 = 1,29 s
    //   Standzeit = 881 px / speed.floor 70 px/s = 12,6 s (derselbe Worst Case wie oben:
    //               ein Gegner am unteren Tempo-Rand, der die volle Strecke laeuft)
    //   Bestand   = ceil(12,6 / 1,29) x 26 = 10 x 26 = 260
    // Bei 264 blieben davon 1,5 % Reserve - zu wenig, um Rundungen und verzoegertes
    // Recycling aufzufangen. 288 laesst 10,8 %.
    //
    // GEMESSEN im Browser (je drei Laeufe ueber 30 s, volle Feuerkraft, frische Szene):
    // hoechster Bestand 66 bei Level 12, 86 bei Level 20, 96 bei Level 30 - keine
    // einzige Pool-Erschoepfung. Der Abstand zur Rechnung ist gewollt: Die 260 gelten
    // fuer einen Run, in dem NICHT geschossen wird. Der Pool sichert den schwachen Run
    // ab, er ist nicht der Erwartungswert.
    //
    // Bemerkenswert und der Grund, warum die Zahl nicht weiter steigen muss: Hoehere
    // Level machen den Bestand NICHT beliebig groesser, weil das Gegnertempo mit
    // hardness mitwaechst und die Figuren dadurch kuerzer im Bild stehen. Bei Level 30
    // (Tempo 166 px/s) sind es rechnerisch 130 gleichzeitig, bei Level 12 (157 px/s)
    // 126 - der Endlosmodus verschiebt den Bemessungsfall also kaum.
    // GEMESSEN im Browser (je drei Laeufe ueber 60 s, Truppe 30, Waffe normal):
    // hoechster Bestand 99 bei Level 12, keine einzige Pool-Erschoepfung.
    // ACHTUNG: Das ist der Wert fuer den Fall, dass NICHT geschossen wird. Im Spiel
    // liegt der Bestand weit darunter, weil die Truppe raeumt - gemessen bei Level 12
    // mit realistischem Ausbau rund 20 gleichzeitig. Der Pool ist die Sicherung fuer
    // den schwachen Run, nicht der Erwartungswert.
    enemies: 288,
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
    walls: 32,
    // Densest case is an uninterrupted block (no cross streets): the fixed 120s,
    // 16.667ms-step, 390x844 city simulation then reaches 24 concurrent objects at the
    // 400ms cadence (18 with cross streets); 30 keeps the peak plus six-object reserve.
    scenery: 30,
  },
} as const
