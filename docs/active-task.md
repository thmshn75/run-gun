# Active Task

## Status
`IDLE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
_(kein aktiver Task — bereit für den nächsten)_

**Sammelbahn links, Wand rechts, zwei Blautoene fertig** (2026-08-22, Claude direkt,
Thomas: "Waende in einem schoenen Blau links +1 ... und rechts in einem anderen blau",
Funktionsweise per Rueckfrage entschieden).
**Thomas' zwei Entscheidungen:** (1) Die +1-Kette wird DURCHFAHREN, nicht beschossen.
(2) Der Truppenzaehler laeuft ueber die sichtbaren 30 Figuren hinaus weiter, die
Ueberzahl ist Reserve.
Die Seiten sind damit grundsaetzlich verschieden statt zwei Varianten derselben Wand:
- **LINKS = Sammelbahn.** Jede Kachel ist ein "+1"-Plaettchen ohne Lebenspunkte, das
  man durch Beruehrung einloest. Kugeln fliegen wirkungslos durch (sonst schoesse man
  sich die eigene Verstaerkung weg), und die Plaettchen bremsen die Truppe nicht
  (`getWallPresence` ignoriert sie - wer einsammeln soll, muss hineinfahren duerfen).
- **RECHTS = Wand.** Zerschiessbare Segmente mit Lebenspunkten wie bisher, Waffen
  unregelmaessig darin, Rest Muenz-Segmente.
- **Reserve statt Deckel.** `stats.hp.cap` 30 -> 999. Vorher war bei 30 alles am
  Anschlag: nur 8 Figuren schiessen, der Schadensbonus deckelt bei 29 Figuren, und die
  Truppengroesse ist die Lebensanzeige - ein weiteres +1 bewirkte exakt nichts. Jetzt
  bleiben 30 sichtbar, der Rest rueckt nach, wenn eine faellt. Die Reserve kauft
  Ueberlebenszeit, keine Feuerkraft (Schadensbonus bleibt gedeckelt).
- **Zwei Blautoene** (`wall-segment-left` / `-right` statt einer Textur): links
  Kornblumenblau, rechts Royalblau. Der erste helle Ton wirkte halbtransparent ueber
  der grauen Strasse tuerkis statt blau und wurde nachgezogen.
- **Entfallen:** Die Verstaerkungs-Angebote der linken Wand (Operator "+4", "x1.5",
  zustandsabhaengig gezogen) samt `getReinforcementOffer` und deren Tests. Viele kleine
  Quittungen schlagen wenige grosse - Entscheidung nach dem Referenzvorbild.
**Gemessen im Browser** (20 s durchgehend links gefahren): 22 Plaettchen eingesammelt =
1,10 je Sekunde, gerechnet waren 1,125 (135 px/s / 72 px Kachel x 3/5 Wandanteil).
Truppe 2 -> 24. Ueber 45 s weiter: Zaehler 74, sichtbare Figuren konstant 30,
Schadensbonus konstant am Deckel 4, HUD zeigt "TEAM 74".
Wer die ganze Zeit links faehrt, gewinnt also rund 67 Figuren je Minute - und holt in
derselben Zeit rechts keine Waffe und schiesst kaum Gegner. Genau diese Abwaegung ist
der Zweck.
Nachweise: 133 Tests gruen, `npm run check` sauber, Browser-Messung wie oben.
**Offen: Thomas' iPhone-Urteil** - besonders, ob 1,1 Figuren je Sekunde zu viel ist.

**Optik Schritt 1 fertig: Bodenschatten und glatte Kanten** (2026-08-22, Claude direkt,
Thomas: "die Optik und das realistische Gefuehl ist mir wichtiger", nach zwei
Referenz-Screenshots aus einem 3D-Vorbild).
Befund aus dem Vorher-Screenshot: Im ganzen Spiel warf **nichts** einen Schatten -
Truppe, Gegner und Boss schwebten ueber der Strasse. Das ist der groesste
Einzelunterschied zu den Vorbildern. Zweiter Befund: `pixelArt: true` liess die
34x46-Figuren als harte Kloetzchen erscheinen, obwohl die grossen Vorlagen in
`assets/probe/` (136x184) beleuchtet und plastisch sind.
- **Bodenschatten** fuer Truppe, Gegner und Boss (`shadow`-Sektion in `balance.ts`,
  Textur in `BootScene`). Ein Schatten je Poolplatz, beim Aufbau erzeugt, nie zur
  Laufzeit. Die Textur sind gestaffelte Ellipsen statt eines Verlaufs -
  `fillGradientStyle` wirkt nicht ueber `generateTexture` (Lesson 2026-08-20).
- **Der Schatten bleibt am Boden, waehrend die Figur wippt**, und schrumpft mit der
  Hebung. Erst dadurch liest man das Laufwippen als Schritt statt als Zittern.
- **Blinken uebertraegt sich**: Nach einem Treffer blinkt die Truppe; ohne Kopplung
  waere ein Fleck auf der Strasse stehengeblieben.
- **`pixelArt: false`** (mit `roundPixels: false`): Gegner am Horizont sind jetzt als
  Figuren erkennbar statt als Kloetzchen. Das ist eine Geschmacksentscheidung und mit
  einer Zeile zuruecknehmbar - Kommentar steht in `main.ts`.
Gemessen im Browser: 14 von 14 Truppenschatten sichtbar, Position an den Fuessen
(23 px unter der Figurenmitte bei 46 px Figur), Groesse 25x8 px, Deckkraft 0,42.
**Nebenbefund:** In der dichten Formation (13-14 px Reihenabstand bei 46 px hohen
Figuren) verdecken die Figuren die Schatten der hinteren Reihen - sichtbar bleibt vor
allem die vorderste Reihe. Das ist physikalisch richtig und im Vorbild genauso.
Nachweise: 134 Tests gruen (neu `tests/shadow.test.ts`), `npm run check` sauber,
Vorher-Nachher-Screenshots verglichen.
**Offen: Thomas' iPhone-Urteil, besonders zu den glatten Kanten.**
**Naechste Optik-Schritte (nicht gebaut):** plastischere Sprites in doppelter
Aufloesung (Codex-Auftrag), Wandsegmente sehen als halbtransparente Rechtecke wie
Platzhalter aus, Horden-Masse deutlich groesser.

**W5 Boss ohne Schuss fertig** (2026-08-22, Claude direkt, Thomas: "zuerst den Ton und
den Boss ohne Schuss"). Umgesetzt nach `plan-v2.md`, Abschnitt "Boss V2".
- **Der Boss feuert nicht mehr.** Salvensystem komplett entfernt: `bossBurst.ts`
  geloescht, Projektil-Pool, Projektil-Textur, Farben, Boss-Projektil-Kollision,
  eigenes Unverwundbarkeitsfenster und alle `burst*`-Balance-Werte raus. Ein Test
  greppt `boss.ts` und `GameScene.ts` gegen jede Projektilspur - der Negativbefund
  ist damit belegt, nicht behauptet.
- **Druck aus gerufenen Horden statt Einzelbegleitern.** Der Boss ruft ganze
  Formationen des Levels (`spawnSquad` mit Boss-Markierung). Der Ruf-Takt ist aus dem
  Gegnerdruck der Normalphase hergeleitet: erwartete Gegner je Spawn-Ereignis geteilt
  durch das Spawn-Intervall am Ende der Rampe (gerechnet: 1,23/s bei Level 1, 20,22/s
  bei Level 12). Phase 1 haelt den halben Normaldruck, Phase 2 den vollen - denn
  anders als in der Normalphase muss der Spieler zusaetzlich den Boss beschiessen.
- **Deckel gleichzeitig gerufener Gegner: 16**, hergeleitet aus der Geometrie
  (2 x groesste Hordengroesse). Der erste Entwurf hatte 64 aus dem Pool hergeleitet
  und war unspielbar: bis zu 42 Gegner standen als geschlossene Wand vor dem Boss und
  fingen praktisch allen Beschuss ab. Dieselbe Kombination brauchte dann je nach Zufall
  29 s oder 109 s.
- **Kampfdauer-Grenzen neu**, weil die alten (15 s / 18 s bei Level 1) UNTER dem
  Zielfenster 20-40 s lagen - Level 1 konnte es konstruktiv nie erreichen. Jetzt
  20 s Untergrenze, 26 s bei Level 1, +0,545 s je Level (32 s bei Level 12).

**Messung (drei Wiederholungen je Fall, frische Szene je Lauf, Truppe weicht perfekt
aus):** L1 schwach 17,1-23,2 s | L1 stark 29,2-49,1 s | L6 schwach 21,5-23,6 s |
L6 stark 24,9-37,3 s | L12 schwach 18,2-24,8 s | L12 stark 28,1-49,4 s. Der Boss faellt
in allen 18 Laeufen.
**OFFENER BEFUND, bewusst nicht weggedreht:** Die Mediane liegen alle im Fenster
(19,2-39 s), die Einzellaeufe streuen aber 17-49 s. Ursache ist nicht die HP-Formel,
sondern der Schild: Wie lange der Kampf dauert, haengt davon ab, wie viele und welche
Gegner gerade zwischen Truppe und Boss stehen - und deren Typen werden gezogen. Das
Akzeptanzkriterium "alle sechs Messungen im Fenster" ist mit EINER Messung je Fall
erfuellbar, mit drei nicht. Weiter an den Lebenspunkten zu drehen wuerde den Zufall
nicht beseitigen, nur eine Messung schoenrechnen. Entscheidend ist Thomas' Urteil
"fordernd, aber schaffbar" am iPhone.
**Fuer W6 vorgemerkt:** `companionLimit` in der Leveltabelle ist seit dieser Etappe
tot (12 Eintraege plus Typ), ebenso die Umbenennung `blockers.ts` -> `Walls`.
Nachweise: 128 Tests gruen, `npm run check` sauber, Browser-Messungen wie oben.
**Offen: Thomas' iPhone-Urteil.**

**Ton fertig** (2026-08-22, Claude direkt, Thomas: "zuerst den Ton und den Boss ohne
Schuss"). Vorher gab es im Projekt KEIN Audio - kein AudioContext, keine Datei.
Gebaut: synthetischer Ton per Web Audio (keine Audiodateien, nichts nachzuladen,
offline identisch, keine Kosten), sieben Klaenge in `src/systems/audio.ts`, die
Drosselregel phaserfrei und testbar in `src/systems/audioPlan.ts`.
- **Klaenge:** Schuss (Rauschstoss + tiefer Koerper), Gegner faellt (Gleitton 420->140 Hz),
  Wandbruch (Rauschen 3200->260 Hz + Wuchtanteil), Verstaerkung auf/ab (Terz A5->Cis6
  bzw. A5->F5 - die Wandbelohnung kann die Truppe auch verkleinern), Waffenwechsel
  (C-Dur-Dreiklang), eigener Schaden (Absturz 200->55 Hz). Muenzen bewusst stumm -
  gleiche Entscheidung wie bei den Popups.
- **Ratenbremse statt fester Mindestpause.** Der erste Entwurf hatte eine feste Pause
  von 125 ms (= 1000 / shotsPerSec.cap). Der Test fand den Fehler: Trifft der
  Waffentakt nicht auf das Drosselraster, fallen Toene aus - die Minigun (17,6
  Salven/s) klang mit 5,9 Toenen/s LANGSAMER als die Standardwaffe mit 8. Jetzt eine
  Rate mit zwei Nachhol-Marken; gemessen 8,0/s fuer beide Waffen.
- **Stimmen-Deckel 6** fuer die haeufigen Toene (Splash toetet bis zu acht Gegner im
  selben Bild). Wandbruch, Schaden, Verstaerkung, Waffenwechsel umgehen ihn - sie
  duerfen nie im Schussgeraeusch untergehen.
- **iOS:** Freischaltung uebernimmt Phasers Sound-Manager (Nutzergeste); wird ein Ton
  vor der Freigabe angefordert, holt `play()` ihn nach dem `resume()` nach statt ihn
  verfallen zu lassen. Ton-Schalter im Menue rechts neben dem Kontostand (nicht im HUD:
  die ganze Spielflaeche ist Drag-Steuerung), Zustand in eigenem localStorage-Schluessel.
  **ACHTUNG beim Test:** Steht der seitliche Stummschalter des iPhones auf lautlos,
  spielt iOS auch Web Audio nicht ab - das ist Systemverhalten, kein Fehler.
Nachweise: 128 Tests gruen (neu `tests/audioPlan.test.ts`), `npm run check` sauber,
Browser-Lauf gemessen - AudioContext running/entsperrt, alle sieben Klaenge erzeugen
die geplanten Knoten, **Schall am Analyser gemessen**: Ruhe 0,000 / Wandbruch 0,290 /
stummgeschaltet 0,000. Menue-Schalter sitzt bei x=333 ohne Kollision mit dem Kontotext.
**Offen: Thomas' iPhone-Urteil.**

**Lebendigkeit (ohne Ton) fertig** (2026-08-22, Claude direkt). Thomas: „immer noch
nicht so wie in den App Store spielen — ich kann dir aber auch nicht sagen, woran es
liegt." Beim Nachsehen gefunden: Im ganzen Spiel bewegte sich nichts außer Positionen.
Kein Ton (keine Audio-Datei, kein Sound-Aufruf), keine Laufbewegung (Figuren sind
`add.image` ohne `anims` — sie *glitten* über die Straße), keine Kamerareaktion, keine
Tweens, keine Quittung beim Einsammeln. Trefferblitz an Gegnern gab es bereits
(`setTintFill`) — die erste Meldung an Thomas war da falsch und wurde korrigiert.
Thomas' Wahl aus drei Optionen: „Lebendigkeit zuerst, ohne Ton".
Gebaut (neu `src/systems/gamefeel.ts` als phaserfreie, testbare Rechnung):
- **Laufbewegung** für Truppe und Gegner: Wippen im Schrittrhythmus, Frequenz aus
  `scrollSpeed` und Schrittlänge abgeleitet statt geraten (3,3 Hz bei 135 px/s).
  Betrag statt Sinus — ein Läufer fällt und stößt sich ab. Taktversatz je Figur über
  den goldenen Winkel, damit die Truppe kein hüpfender Block ist.
- **Neigung beim Lenken** bis 9°, geglättet mit 90 ms Halbwertszeit
  (frameratenunabhängig). Die Kollisionshülle bleibt bewusst ruhig, sonst hinge
  Schaden am Zufall des Laufzyklus.
- **Quittungen** beim Einsammeln: hochfliegende Zahl mit Aufploppen (`popups.ts`,
  fester Pool 16) für Verstärkung (+N) und Waffenwechsel. Münzen bewusst ohne Popup —
  bei 3 Münzen je Segment wäre das Lärm statt Rückmeldung.
- **Kamerawackeln** nur bei Splash-Explosion und eigenem Schaden.
Nachweise: 119 Tests grün (neu `tests/gamefeel.test.ts`), `npm run check` sauber,
Browser-Lauf mit manuell getaktetem Crowd-Update gemessen (der Hintergrund-Tab wird
gedrosselt, deshalb nicht über die Spiel-Loop): Wippweite 2,98 px bei Sollwert 3,
6 Figuren auf 6 verschiedenen Höhen, Neigung 0 in Ruhe / −0,115 rad beim Lenken,
Hülle unverändert bei y=714, Popups steigen 600 → 585 px und räumen sich auf.
**Offen: Thomas' iPhone-Urteil. Ton ist bewusst noch nicht gebaut.**

**Wandhärte neu hergeleitet fertig** (2026-08-22, Claude direkt). Thomas: „immer noch
schwer was zu holen, speziell in weiteren Level, die Zahlen steigen zu schnell an."
Das alte Modell koppelte die Wand-HP 1:1 an die Feuerkraft — die Fokusdauer blieb über
den ganzen Run bei 0,70 s (Aufrüsten war gegen Wände folgenlos), und die Zahl hing an
der Waffe: bei Truppe 8 zwischen 4 (Minigun) und 71 (Schrot), im Vollausbau 1482.
Neu in `blockerPlan.ts`: Zielhärte aus Levelnummer und gedämpfter Truppengröße, die
Waffe geht gar nicht mehr ein (sie lässt die Wand schneller fallen statt mitwachsen),
plus harter Fokus-Deckel `blockers.maxFocusSec` 0,6 s für jede Kombination aus Level,
Truppe und Waffe. Verlauf jetzt 3 HP / 0,50 s (L1 Start) bis 254 HP / 0,12 s (L12
Vollausbau); Waffenwechsel bei Level 3 bewegt die Zahl nur noch zwischen 3 und 12.
Nebenbefund, nicht behoben: Minigun und Rakete feuern nur mit 3 Figuren
(`shootersPerSalvo`) und lagen ohne Deckel bei 1,25 s je Segment — schlechter als die
Standardwaffe. Der Deckel fängt das ab, die Waffenbalance selbst bleibt offen.

**W4-Nachbesserung „Tempo" fertig** (2026-08-22, Claude direkt, Thomas: „die Wände sind
zu schnell — mach die langsamer", Wahl aus drei Optionen: „einfach alles langsamer").
`scrollSpeed` 180 → 135 (−25 %): Eine Wand braucht 5,14 s statt 3,86 s durchs Bild.
Drei Werte mitgezogen, damit nur das Tempo sich ändert und nicht still die Balance:
- `scenery.spawnIntervalMs` 400 → 533 (Takt ist zeitbasiert; sonst rücken die Häuser
  enger zusammen und das abgenommene Stadtbild verdichtet sich)
- Goodie-Werte ×1,333 (`reinforcementChance` 0.12 → 0.16, `weaponChance` 0.08 → 0.107,
  `goodieMaxDry` 16 → 12), damit die Kadenz **pro Sekunde** bleibt (5,6 s / 8,3 s)
- `pools.coins` 48 → 64 (Münzen brauchen 6,25 s statt 4,69 s durchs Bild)
**Nicht behoben und bewusst so:** Wände fahren linear, Straße und Häuser perspektivisch —
am Horizont bleibt die Wand 5,1× schneller als die Kulisse. Das Verhältnis hängt nicht an
`scrollSpeed`; Thomas hat die Perspektiv-Kopplung als Option gesehen und abgewählt.
Gegner hängen nicht an `scrollSpeed`, das Kampftempo ist unverändert.
Nachweise: 103 Tests grün, Browser-Lauf gemessen — Wandtempo 135 px/s, 11 von 11
Segmenten getroffen, Goodie-Kadenz im erwarteten Bereich.

**W4-Nachbesserung „Wände treffen" fertig** (2026-08-22, Claude direkt, nach Thomas'
iPhone-Rückmeldung „voll schwer überhaupt Wände wegzubekommen am Anfang"). Ursache war
nicht die Härte der Wand, sondern Unerreichbarkeit: Der Fahrbereich endete auf Spuranteil
0,519, die Wandzone beginnt bei 0,660, und der starre Senkrechtschuss lief perspektivisch
aus der Wandzone heraus — das Segment direkt neben der Truppe war nicht beschießbar.
Zwei Änderungen, beide nötig (die erste allein traf gemessen gar nichts mehr):
1. **Spurtreue Flugbahn** (`BALANCE.projectile.laneFollow`, `weapons.ts`,
   `roadGeometry.getLaneRatio/getLaneSlope`): Jede Kugel behält ihren Anteil an der halben
   Straßenbreite über den ganzen Flug, statt senkrecht aus der Spur zu laufen.
2. **Fahrbereich bis an die Wand** (`roadGeometry.getDriveLimitHalfWidth`, `crowd.ts`,
   `BALANCE.walls.driveIntoWallFigures`): Der Anker darf bis Wandinnenkante + halbe
   Formationsbreite + halbe Figurenbreite, Straßenkante bleibt harte Grenze.
Nachweise: 103 Tests grün (neu `tests/wallHits.test.ts`), `npm run check` sauber,
Browser-Lauf gemessen — Segmente fallen von 4 auf 0 HP, Anker 329,1 wie berechnet,
Kugel-laneRatio 0,756 in der Wandzone, Neigung 5,8°. **Offen: Thomas' iPhone-Urteil.**

**W1–W4 sind maschinenseitig fertig** (2026-08-22, Claude direkt). W4: Dauerwände
beidseitig (lückenlose Kette, `chainAccumulatorPx`), Goodies unregelmäßig mit Garantie
(`reinforcementPlan.ts`: links Truppe mit Operator-Anzeige und Sofortwirkung, rechts
Waffen, Rest Münzen), Mittel-Tore nur noch DMG/RATE/SPD, Pool 20 hergeleitet.
Nachweise: 94 Tests grün (Property-Test fand und fixte den Rundungs-Randfall bei
Truppe 1), Browser-Sichtprüfung. **Offen: Thomas' iPhone-Urteil W1–W4** — danach W5
(Boss ohne Schuss, Stärke aus Spielerstand).

**W1–W3 sind maschinenseitig fertig** (2026-08-22, von Claude selbst auf Thomas'
Anweisung). W3: Horden laufen mittig (Spawn-Bänder in `balance.ts`, Dichteregel
`computeHordeOffsets` — stauchen statt verkleinern, Deckel 200 px unten hergeleitet),
Typenwahl vor Layout (leichte Keile stauchen dichter als Schwere), Horden ab Level 1,
squadChance je Level angehoben. Wände: orange, rund, halbtransparent, Inhalt sichtbar,
Überhang nach außen; Tore dauerhaft zweispurig (W4-Zielbild). Nachweise: 88 Tests grün
(neu: Dichteregel, Mittelband-Zentrierung 500 Züge, Budget-Deckel), Browser-Sicht-
prüfung. **Offen: Thomas' iPhone-Urteil W1–W3** — danach W4 (Seiten-Ökonomie).
