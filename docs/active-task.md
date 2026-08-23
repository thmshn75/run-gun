# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**W7 Teil 1 — Plastische Figuren (Codex-Auftrag)**

### Ziel
Die Figuren wirken flach wie Aufkleber. Sie sollen plastisch wirken — Volumen durch
Licht, wie im 3D-Referenz-Reel, das Thomas geschickt hat. Erreicht wird das mit den
Mitteln eines 2D-Motors: **gemalte Beleuchtung im Sprite selbst**. Echtes 3D ist
ausgeschlossen (Phaser ist ein 2D-Renderer).

### Was zu erzeugen ist
Fuenf Bilder, jeweils als Ersatz fuer die bestehende Datei, in **doppelter Aufloesung**:

| Datei | heute | neu (exakt) | Motiv |
|---|---|---|---|
| `src/assets/player.png` | 34x46 | **68x92** | Eigene Figur, **Rueckenansicht** |
| `src/assets/enemy-light.png` | 28x38 | **56x76** | Leichter Gegner, Frontansicht |
| `src/assets/enemy-standard.png` | 32x44 | **64x88** | Standard-Gegner, Frontansicht |
| `src/assets/enemy-heavy.png` | 42x52 | **84x104** | Schwerer Gegner, Frontansicht, breit |
| `src/assets/enemy-boss.png` | 120x120 | **240x240** | Boss, Frontansicht |

**Die Ansichtsrichtung ist Bestand und wird NICHT geaendert.** Die eigene Figur ist
bereits eine Rueckenansicht (der dunkle Bereich unter dem Helm ist der Nacken, kein
Gesicht — das wurde am 2026-08-20 schon einmal falsch beurteilt und kostete zwei
Laeufe). Vor dem Zeichnen die **grossen Vorlagen** in `assets/probe/` ansehen, nicht die
34-px-Sprites: bei 34 px ist eine Ansicht nicht sicher zu erkennen.

### Verfahren (im Projekt bewaehrt, nicht abweichen)
**Gross rendern, dann herunterrechnen.** Alle brauchbaren Figuren dieses Projekts sind so
entstanden: zuerst eine grosse Fassung (Vorlagen liegen als `*-136x184.png` und
`*-gross.png` in `assets/probe/`), daraus die Zielgroesse herunterskaliert. Direkt in
Zielgroesse erzeugte Figuren waren unbrauchbar. Die grossen Zwischenstaende gehoeren nach
`assets/probe/` (Ordner ist gitignored), die fertigen Bilder nach `src/assets/`.

### Wie „plastisch" konkret aussieht
- **Licht von oben**, leicht von vorne links. Eine klare Lichtseite, eine Schattenseite,
  dazwischen ein weicher Uebergang — keine harte Zweiteilung.
- **Kantenlicht** an der lichtabgewandten Silhouette, damit die Figur sich vom
  Hintergrund abhebt.
- **Rundung an den Volumen**: Helm, Schultern, Brustkorb, Oberschenkel bekommen jeweils
  eine eigene Lichtkante. Genau daran erkennt das Auge Volumen.
- **Bodenkontakt**: nichts zeichnen. Der Bodenschatten ist bereits als eigenes Objekt
  gebaut (`figure-shadow`) und bleibt unveraendert. Ein zweiter, ins Sprite gemalter
  Schatten wuerde doppelt liegen.
- Farbwelt und Silhouette der bestehenden Figuren bleiben erkennbar. Das ist eine
  **Ueberarbeitung, kein Neuentwurf** — Thomas soll dieselben Figuren wiedererkennen,
  nur plastisch.

### Pruefung, die Codex selbst macht
Ein **Kontrollbild** nach `assets/probe/w7-kontrolle.png`: alle fuenf Figuren
nebeneinander, **je einmal auf der Fahrbahn (dunkelgrau) und einmal auf der Umgebung
(gruen/hell)**. Beide Hintergruende muessen tragen — eine Figur, die nur auf der Strasse
funktioniert, ist nicht fertig (das ist die Lehre aus dem Betongrau-Versuch).
Zusaetzlich jede Figur einmal auf **Spielgroesse heruntergerechnet** ins Kontrollbild,
denn dort wird sie beurteilt, nicht in der Vergroesserung.

### Was Codex NICHT macht
Den Code nicht anfassen. Die doppelte Aufloesung braucht eine Anpassung der
Darstellungs-Skalierung und neu gemessene Koerpermasse in `balance.ts` — das ist eine
Architekturentscheidung und macht Claude nach der Abnahme der Bilder. **Insbesondere
`balance.ts` nicht editieren.**

### Reissleine
Wenn die gewuenschte Plastizitaet nicht erreichbar ist: **melden, nicht ersetzen.**
Ausdruecklich **kein** zulaessiger Ersatz sind:
- programmatisch gezeichnete Formen (Rechtecke, Kreise, Farbverlaeufe per Code),
- abstrakte oder symbolhafte Figuren statt erkennbarer Koerper,
- Figuren in einfacher statt doppelter Aufloesung,
- eine geaenderte Ansichtsrichtung (die Rueckenansicht der eigenen Figur bleibt).
Kommt eines davon heraus, ist der Auftrag nicht erfuellt — dann Abschlussbericht mit der
Begruendung, was nicht ging, statt eines Ersatzprodukts abzuliefern.

### Abschluss
Status auf `IMPL_DONE`, Abschlussbericht: was geaendert, welche Zwischenstaende in
`assets/probe/` liegen, was nicht ging und warum.

---

**W7 Teil 2: Gegnermenge steigt mit dem Level, Boss pendelt nicht mehr**
(2026-08-23, Claude direkt. Thomas nach dem iPhone-Test: "W5 passt am iphone soweit, aber
Gegner menge darf mit levels noch steigen, Boss soll sich nicht mehr links und rechts
bewegen, sondern einfach langsam auf mich zu, geschwindigkeit wie jetzt".)

**(e) Boss pendelt nicht mehr.** `moveAcrossRoad` und beide `moveSpeed`-Werte (110/170)
sind entfernt; die X-Position steht ab `activate()` fest in der Strassenmitte. Das
Vorruecken (`advanceSpeed` 8,35 px/s) bleibt unveraendert — "Geschwindigkeit wie jetzt"
ist als das bestehende Vorrueck-Tempo gelesen, nicht als Uebertragung der
Pendelgeschwindigkeit (110 px/s haetten die 334 px bis zur Truppe in 3 s zurueckgelegt).
Belegt: In fuenf Messlaeufen betraegt die X-Spanne des Bosses ueber den ganzen Kampf
exakt 0 px (vorher 216 px).
**Befund zur Kampfdauer, NICHT nachbalanciert:** Die Vorhersage war, dass der stehende
Boss dauerhaft in der Feuerlinie bleibt und der Kampf dadurch kuerzer wird. Der direkte
Vorher/Nachher-Vergleich mit identischem Messverfahren widerlegt das: Level 1
104,1 -> 100,4 s, Level 6 115,1 -> 110,5 s (je -4 %), Level 12 89,5 s -> Zeitlimit 180 s
ohne Abschuss. Die Streuung innerhalb eines Falls ist groesser als der Unterschied
zwischen den Faellen — bestimmend ist weiterhin der Gegnerschild vor dem Boss, nicht
seine Bewegung (derselbe Befund wie am 2026-08-22). Nach der Reissleine in `plan-v2.md`
(maximal zwei Balance-Zyklen, dann Entscheidung mit Thomas) wurde daran nichts gedreht.

**(d) Gegnermenge — der eigentliche Fund: sie stieg nicht flach, sie fiel auf null.**
Statt zum fuenften Mal an der Leveltabelle zu drehen, wurde die Kette durchgemessen
(angefordert -> erzeugt). Ergebnis im Browser, je 60 s Fahrt, Truppe 30, Waffe normal:
- **VORHER:** Level 1 4,95 Gegner/s (63 von 1.247 Versuchen), Level 6 **0,03** (2 von
  3.495), Level 12 **0,00** (0 von 3.577). Bei hohen Leveln kam gar kein Gegner mehr an.
- **Ursache 1 — doppelter Perspektiv-Aufschlag** (`spawner.spawnSquad`):
  `computeHordeOffsets` entwirft die Horde auf bis zu 220 px, dieselbe Horde wurde danach
  mit 220 x 1,519 = 334 px gegen den 234 px breiten Korridor geprueft. `chooseSpawnLane`
  lieferte konstruktiv `maxLane = 0`. Korrigiert: Der Aufschlag gehoert nur auf die
  FIGURENBREITE — die Mitglieds-Abstaende werden in `activateEnemy` ohnehin in
  Spuranteile umgerechnet und wachsen damit genau wie der Korridor.
- **Ursache 2 — Warteschlange ohne Verfallszeit:** Eine abgelehnte Horde blieb als
  `deferredSpawn` liegen und blockierte den gesamten Takt, auch jeden Einzelgegner.
  Gemessen lag eine Horde ueber 55 s im Weg. Neu: `enemy.deferredMaxAgeMs` (2.700 ms =
  halbe Anflugzeit, hergeleitet), danach wird sie verworfen.
- **Ursache 3 — fester Hordendeckel:** `level.squads.maxSize` 14 schnitt die
  hardness-Skalierung ab Level 5 ab; ueber sieben Level stieg die Menge nur um 18 %. Neu
  levelabhaengig (`maxSizeAtLevelOne` 14, `maxSizePerLevel` 1, `maxSizeCap` 26 — die
  Kappe ist die Nachlaufpause: der Durchsatz laeuft gegen 1000/pausePerMemberMs = 25/s).
  Die Boss-Hordengroesse folgt bewusst NICHT mit (eigener `hordePressure.hordeSizeCap`
  14), sonst haette `maxActiveCalled` nur noch eine statt zwei Horden zugelassen und der
  Bossdruck aus W5 waere still gesunken.
- **NACHHER**, je drei Laeufe, Mittelwert, in Klammern der mittlere Bestand am Schirm:
  Level 1 **6,49** /s (22,5) · Level 4 **8,31** /s (29,4) · Level 8 **10,30** /s (60,1) ·
  Level 12 **12,56** /s (73,0). Der sichtbare Bestand steigt ueber den Run um Faktor 3,2.
  Keine einzige Pool-Erschoepfung, hoechster Bestand 99 gegen Pool 264.
- **Offen und bewusst nicht angefasst:** Level 1 liegt jetzt 31 % ueber dem von Thomas
  abgenommenen Stand — Folge der Fehlerbehebung, nicht einer Anhebung der Tabelle.
  Ausserdem werden weiterhin rund 93 % der Spawn-Versuche abgelehnt; das ist ab hier
  keine Fehlfunktion mehr, sondern die Sperre gegen ineinander erscheinende Gegner bei
  voller Auslastung. Wer mehr will, muss an der Verweildauer ansetzen, nicht am Zufluss.

Regressionstest gegen Ursache 1 in `tests/perspective.test.ts` (prueft gegen den
Korridor, nicht gegen die Formel). 154 Tests gruen, `npm run check` sauber.


**Gegner auf Spielgroesse gebracht, Kurve steiler, nochmal mehr Nachschub**
(2026-08-22, Claude direkt, Thomas zum DRITTEN Mal zur Groesse: "Die mobs wirken immer
noch zu klein - muessen schneller wachsen und koennen noch ein wenig mehr sein").
- **Der eigentliche Fehler lag nicht in der Ferne, sondern auf Kampfhoehe.** Die beiden
  Anlaeufe davor haben nur die Fernkurve angefasst. Auf Kampfhoehe war ein Gegner aber
  exakt so gross wie sein Sprite: 38 px beim leichten gegen 46 px bei einer eigenen
  Figur. Selbst direkt vor der Truppe war er der Kleinere - das kann keine Fernkurve
  ausgleichen. Neu ist `enemy.figureScale` 1,25: leichter Gegner 47 px, schwerer 61 px.
  Der Faktor gilt fuer ALLES im Kampfhoehen-System (Darstellung, Trefferflaeche,
  Spurabstaende, Formationsbreite, Schatten) - dafuer gibt es jetzt
  `enemyTypes.getFigureWidth/-Height`; die Rohmasse bleiben nur noch dem Arcade-Body,
  den Phaser selbst mitskaliert.
- **Kurve steiler:** `horizonScale` 0,80 -> 0,84, `growthExponent` 0,45 -> 0,35. Auf
  einem Viertel der Anflugstrecke jetzt 94 % der vollen Groesse (vorher 89 %,
  urspruenglich 68 %), auf der Haelfte 97 %.
- **Mitgewachsen, damit aus Horden keine Kloesse werden:** Formationsabstaende 44 -> 52
  und 54 -> 62 px (bewusst nur Faktor 1,18 statt 1,25 - dichter soll sie wirken). Vier
  Figuren passen weiter nebeneinander; `hordeMaxWidthPx` bleibt bei 220, weil der
  Korridor auf Kampfhoehe nur 234 px breit ist. Eine 14er-Horde steht jetzt in vier
  statt drei Reihen.
- **Menge:** Takt -12 %, Hordenanteil +0,03, Hordengroessen der ersten vier Level +1.
  Level 1 damit 3,77 -> 5,23 Gegner je Sekunde (vorher 2,95 -> 4,22; urspruenglich
  1,01 -> 1,62). **Der Takt allein haette nichts gebracht:** Zuletzt scheiterten 3-5
  Spawns je 10 s an der Spurvergabe, und groessere Figuren brauchen mehr Korridor.
  Deshalb sind die Spawn-Baender mitgewachsen (0,20 -> 0,28 und 0,50 -> 0,62) und der
  Sicherheitsabstand von 6 auf 5 px gesunken - erst das macht den kuerzeren Takt wirksam.
**Gemessen im Browser** (Level 1, 10-s-Fenster): 40 / 52 / 41 Spawns gegen 35 / 31 / 37
davor, `deferred` weiter bei 3-4 und keine Pool-Warnung. Im Bild stehen die Gegner jetzt
auf Augenhoehe mit der eigenen Truppe und haben schon im oberen Bilddrittel fast volle
Groesse.
**Grenze fuer einen vierten Anlauf:** Ueber `horizonScale` 0,85 wird die Horde am
Horizont zu Matsch (die Formation schrumpft weiter mit der Strasse, die Figuren nicht),
und mehr Menge braucht dann zuerst wieder Platz - Baender, Sicherheitsabstand oder einen
breiteren Korridor.
Nachweise: 153 Tests gruen, `npm run check` sauber, Browser-Messung wie oben.
**Offen: Thomas' iPhone-Urteil.**

**Wandkette laeuft perspektivisch - Kacheln schrumpfen mit der Entfernung**
(2026-08-22, Claude direkt, Thomas: "Ja mach die Wandkarten fertig").
Der Rest aus dem vorigen Task ist damit erledigt: Die Kachel war das einzige Objekt im
Bild ohne Tiefe - Breite perspektivisch, Hoehe konstant 72 px bis zum Horizont.
- **Kette laeuft jetzt in WELT-Pixeln statt in Bildschirm-Pixeln.** `scrollSpeed` misst
  Weltstrecke auf Kampfhoehe; `advanceAlongRoad` bildet sie auf den Bildschirm ab. Am
  Horizont deckt dieselbe Weltstrecke weniger Pixel ab, das Segment kriecht dort und
  beschleunigt beim Naeherkommen. Damit ist nebenbei ein alter, in `balance.scrollSpeed`
  dokumentierter Bruch behoben: Waende waren am Horizont 5,1x schneller als die Haeuser
  daneben.
- **Geschlossene Loesung statt Schrittintegration.** Aus dy/dw = r(y)/r_anker und einer
  in y linearen Strassenbreite folgt r(w) = r0 x e^(lambda w). Eine Euler-Naeherung je
  Bild waere bildratenabhaengig gewesen - ein Test prueft jetzt, dass ein 100-ms-Schritt
  exakt dasselbe ergibt wie zehn 10-ms-Schritte.
- **Hoehe exakt statt genaehert.** `getRoadSegment` liefert Mitte UND Hoehe aus derselben
  Abbildung. Die naheliegende Naeherung (Nennhoehe x Massstab) haette bei 72 px rund 4 px
  Fuge zwischen zwei Kacheln gelassen. Zweiter Fallstrick, vom Test gefunden: Die
  Bildschirmmitte liegt wegen der Kruemmung ~0,03 px unter dem Weltanker - wer die
  gezeichnete Mitte im naechsten Bild als Anker zurueckliest, sammelt den Versatz auf.
  Deshalb fuehrt jedes Paar seinen `anchorY` getrennt und zeichnet nur nach `centerY`.
- **Mitgezogen:** Beschriftung und Lebenspunkte-Zahl skalieren mit der Kachel (fester
  Pixelabstand haette bei 41 px Ferndarstellung unten herausgeragt), der Fahrbereichs-
  Test (`getWallPresence`) rechnet mit der tatsaechlichen statt der Nennhoehe, und der
  Pool waechst 20 -> 32, weil ein Segment jetzt 6,4 statt 5,1 s lebt (rund 12 gleichzeitig
  je Seite).
- **Unveraendert:** Der Spawn-Takt haengt an der Weltstrecke, die Sammelrate bleibt also
  bei 1,875 Plaettchen je Sekunde - keine stille Balanceverschiebung.
- **Bewusst nicht mitgezogen:** Muenzen (`coins.ts`) fahren weiter in Bildschirmpixeln.
  Sie fliegen nach wenigen Zehntelsekunden zur Truppe; dort faellt der Unterschied nicht
  auf, und jede Aenderung am Einsammel-Timing waere Risiko ohne sichtbaren Gewinn.
Nachweise: 153 Tests gruen (sechs neue zur Kette), `npm run check` sauber,
Browser-Sichtpruefung: Kacheln laufen nach oben sichtbar zusammen, keine Fugen, keine
Pool-Warnung im Dev-Log. **Offen: Thomas' iPhone-Urteil.**

**Schussreichweite je Waffe, Gegner nochmal groesser, Wandkacheln als Quader**
(2026-08-22, Claude direkt, Thomas nach dem zweiten iPhone-Test: "Ja Schuss Weite
begrenzen, die mobs wirken immer noch zu klein und die Waende- naja die muessen wir noch
anpassen wirken wie Platzhalter - gehoeren auch wie 3d Optik", Nachtrag:
"Schussreichweite an Waffen anpassen - Vergleich zur Realitaet").
- **Reichweite.** Der vervierfachte Nachschub hatte die Strasse nicht gefuellt, weil die
  Truppe bis zum Horizont traf. Jetzt endet jeder Schuss auf einer Linie, die JE WAFFE
  woanders liegt - `engageShare` als Anteil der Anflugstrecke (564 px), nicht als
  Pixelzahl, damit die Linie auf jedem Geraet gleich sitzt. Von kurz nach weit:
  Flamme 0,28 (158 px), Schrot 0,38 (214), Blitz 0,45 (254), Gewehr 0,55 (310),
  Minigun 0,62 (350), Rakete 0,72 (406), Laser 0,85 (479). Der Laser ist bewusst
  gedeckelt: bei 1,0 waere die Kampfzone mit dem ersten Waffenfund wieder aufgehoben.
  Das alte `rangePx` ist ersatzlos weg - zwei Regler fuer dieselbe Sache.
  **Bewusste Ausnahme: im Bossduell gilt keine Reichweite.** Der Boss steht auf
  battleY 300, also 414 px entfernt, und rueckt von dort in 40 s vor; mit der Flamme
  (158 px) waere er den halben Kampf unangreifbar. Die Alternative - battleY an die
  kuerzeste Waffe koppeln (545) und advanceSpeed nachrechnen - haette die ganze
  Bossdramaturgie umgebaut.
- **Groesse.** `horizonScale` 0,72 -> 0,80, `growthExponent` 0,55 -> 0,45. Auf halber
  Anflugstrecke jetzt 95 % der vollen Groesse (vorher 91 %, urspruenglich 79 %), am
  Horizont 0,80 statt 0,57. Preis bewusst bezahlt: Zwei schwere Gegner nebeneinander
  ueberlappen am Horizont um ~7 px - in einer Horde das Zielbild, kein Fehler. Der
  Wandzonen-Aufschlag zog automatisch mit (1,31 -> 1,44).
- **Wandkacheln.** Aus dem flachen Rechteck wird ein Quader: Deckflaeche oben,
  Helligkeitsverlauf nach unten, Schattensockel, helle linke und dunkle rechte Kante -
  eine Lichtquelle fuer alle Kacheln. Alles in der gebackenen Textur, also kein einziges
  zusaetzliches Zeichenobjekt zur Laufzeit. Regler stehen in `walls.block`.
**Gemessen im Browser** (Level 1, 10-s-Fenster): 35 / 31 / 37 Spawns. Etwas weniger als
vor der Reichweitengrenze (bis 54) - erwarteter Nebeneffekt: Gegner leben laenger,
belegen laenger eine Spur, `deferred` steigt. Im Bild ist das Gegenteil sichtbar: statt
2 Gegnern stehen jetzt 10-12 gleichzeitig auf der Strasse.
**Bekannter Rest, nicht gebaut:** Die Kacheln behalten ihre volle Hoehe bis zum Horizont,
nur ihre Breite folgt der Perspektive. Das ist der groesste verbliebene Bruch in der
Wandoptik. Der Fix ist kein Textur-, sondern ein Geometrie-Umbau: Die Kette laeuft mit
festem Pixeltakt (`chainAccumulatorPx` gegen `segmentHeightPx`); skaliert man nur die
Hoehe, reissen oben ~14 px Luecken. Richtig waere, jedem Segment einen Streckenwert zu
geben und y perspektivisch abzubilden - eigener Task, mittleres Risiko (Trefferlogik,
Sammelbahn-Takt, Wandmuster haengen daran).
Nachweise: 147 Tests gruen, `npm run check` sauber, Browser-Messung wie oben.
**Offen: Thomas' iPhone-Urteil.**

**Gegner wachsen frueher, deutlich mehr Gegner ab Level 1**
(2026-08-22, Claude direkt, Thomas nach dem iPhone-Test: "Die mobs sind jetzt voll klein
und wachsen bis zu mir zur vollen Groesse - sollte schon frueher passieren - und es
sollen noch immer auch schon ab Level 1 mehr sein").
- **Groesse.** Bis hierher hing die Figurengroesse strikt an der Strassenbreite: 0,57 am
  Horizont, 1,00 auf Kampfhoehe, linear dazwischen. Jetzt zwei Regler in
  `road.perspective`: `horizonScale` 0,72 hebt die Ferngroesse an, `growthExponent` 0,55
  zieht das Wachstum nach vorne. **Gemessen** (390x844): auf einem Drittel der
  Anflugstrecke 0,855 statt 0,685, auf der Haelfte 0,911 statt 0,786; Kampfhoehe bleibt
  exakt 1,000, damit die ganze Hordengeometrie weiter stimmt.
  **Nebenwirkung, vom Test gefunden statt vom Auge:** Die Figur schrumpft nach oben jetzt
  langsamer als der Korridor und stand am Horizont mit der Schulter im Wandsegment
  (gemessen 0,35 px beim leichten, 5 px beim schweren Gegner). Die Spurwahl rechnet den
  Randabstand deshalb mit `getFigureOverscanFactor` - 1,31, und zwar abgetastet, nicht am
  Horizont abgelesen: Weil die Groesse gekruemmt waechst und der Korridor linear, sitzt
  das groesste Missverhaeltnis bei y = 182 und nicht am Horizont (dort waeren es 1,26).
  Der Aufschlag gilt nur fuer den Rand, nicht fuer die Abstaende zwischen Gegnern - dort
  wuerde er Spawn-Durchsatz kosten.
- **Menge, vierter Anlauf.** Die drei vorherigen haben Gruppengroesse, Deckel und
  Nachlaufpause angefasst und damit nur die oberen Level bewegt. Level 1 stand weiter bei
  1,75 s Takt und 30 % Hordenanteil. Die ganze Tabelle rechnet jetzt in **Gegnern je
  Sekunde** statt in Einzelreglern; die Kurve steigt ohne Delle (die alte fiel bei Level 5
  von 2,33 auf 1,90 zurueck, weil dort die erste 'row' mit fester Groesse vier dazukam).
  **Gemessen im Browser, Level 1, 10-s-Fenster der Dev-Metrik:**
  vorher 11 / 9 / 7 = **0,9 Gegner je Sekunde**, jetzt 25 / 21 / 42 / 47 / 54 / 44 =
  **3,9 im Schnitt, 4,7 am Ende der Rampe** - Faktor 4,3.
- **Grenze fuer den naechsten Anlauf:** Im selben Lauf stieg `deferred` von 0 auf 3-5 je
  10 s (bei 12-14 geplanten Ereignissen). Ab hier bremst nicht mehr der Takt, sondern die
  Spurvergabe. Wer weiter aufdreht, muss zuerst `spawnBands` oder `spawnLaneSafetyGap`
  anfassen, sonst verpuffen kuerzere Intervalle.
- **Befund, der noch eine Entscheidung braucht:** Mehr Nachschub fuellt das Bild nur so
  lange, wie er ueber der Abschussrate liegt. Im Messlauf (Truppe 2, DMG 1, RATE 3) sind
  das 6 Toetungen je Sekunde gegen 4,4 Spawns - die Strasse blieb trotz vervierfachtem
  Nachschub leer. Mit Thomas' iPhone-Werten (DMG 18,5, RATE 8) ist der Abstand noch
  groesser. Der naechste wirksame Hebel ist deshalb NICHT noch mehr Spawns, sondern eine
  **Schussreichweite**: Kugeln nur bis zu einer Hoehe fliegen lassen, damit sich Gegner
  oben sammeln und erst nah bekaempft werden. Das ist eine Produktentscheidung und wartet
  auf Thomas.
Nachweise: 146 Tests gruen (drei neue zur Perspektive), `npm run check` sauber,
Browser-Messung wie oben. **Offen: Thomas' iPhone-Urteil.**

**Rechte Wand auf Feuerkraft, Tore raus, SPD als Levelgroesse, HUD neu geordnet**
(2026-08-22, Claude direkt, Thomas: "ok fuer deine empfehlung, Feuerrate, schaden und
waffen, das muss dann aber auch den Toren in der mitte raus" + "tempo einfach mit den
leveln beschleunigen, kein seltenes tor daraus machen und dann aus dem HUD raus nehmen
und den rest logisch anordnen").
Die Oekonomie hat jetzt genau zwei Seiten und keine Mitte mehr:
- **LINKS = Masse.** Durchfahren, muehelos, aber weit weg vom Kampfgeschehen.
- **RECHTS = Feuerkraft.** JEDES Segment traegt einen Gewinn: Waffe (selten, mit
  Garantie nach Nieten), sonst je zur Haelfte Schaden oder Feuerrate. Der Preis ist
  Feuerzeit - waehrend man die Wand beschiesst, trifft man keine Gegner. Muenzen fallen
  jetzt bei JEDEM zerschossenen Segment ab statt als eigener Inhalt.
  Zugewinne aus dem Gegenstueck links hergeleitet: Ein "+1"-Plaettchen ist 1 von 30
  sichtbaren Figuren = 3,3 % der Spanne; dieselben 3,3 % auf Schaden (Spanne 19) und
  Feuerrate (Spanne 5) ergeben 0,63 und 0,17, gerundet auf 0,5 und 0,2.
- **Mittel-Tore vollstaendig entfernt**: `gates.ts`, `gateLanes.ts`, Gate-Textur,
  `gates`-Balance-Sektion, `pools.gateGroups`, `reserved.gateLanes` aus allen zwoelf
  Leveldefinitionen, `colors.gateBase` und zwei Testdateien. Kein Rest im Bundle.
- **SPD ist keine Ausbaugroesse mehr**, sondern eine reine Levelgroesse in `speed.ts`:
  105 x hardness, also 105 bei Level 1 und 157 bei Level 12 (Deckel 168). Nutzt die
  vorhandene Haertekurve, damit Gegnertempo, Spawn-Takt und Hordengroesse derselben
  Steigerung folgen statt drei eigenen.
- **HUD neu geordnet, zwei Reihen mit je einem Gedanken:**
  Reihe 1 "wo stehe ich?" TEAM | LEVEL | Muenzen.
  Reihe 2 "womit kaempfe ich?" Waffe | DMG | RATE - die Waffe links, weil sie Schaden
  und Feuerrate bestimmt. SPD ist raus: Der Spieler kann es nicht beeinflussen, also
  gehoert es nicht in eine Anzeige, die zeigt, was er sich erarbeitet hat.
**Gemessen** (25 s rechts an der Wand): Schaden 1 -> 8,5 | Feuerrate 3 -> 5,2 |
90 Muenzen | Waffenwechsel auf Laser. HUD-Spalten sitzen exakt auf den Dritteln
(73/195/317), `hud.speed` existiert nicht mehr, Gegnertempo Level 1 = 105.
**Zahl im Blick behalten:** 25 s Dauerbeschuss rechts geben +7,5 Schaden. Hochgerechnet
waere der Cap 20 nach gut einer Minute erreicht - real teilt man die Zeit mit Gegnern
und der linken Bahn, aber wenn es zu schnell geht, sind `walls.damageGain` und
`rateGain` die Stellschrauben.
Nachweise: 130 Tests gruen, `npm run check` sauber, Browser-Messung wie oben.
**Offen: Thomas' iPhone-Urteil.**

**Bugfix "Spieler verschwinden an der rechten Wand" + Tempo je Level fertig**
(2026-08-22, Claude direkt).
- **BUG (von Claude selbst eingebaut, von Thomas gemeldet):** "wenn ich mit meinen
  Spielern nach rechts in eine blaue Wand fahre verschwinden sie ploetzlich". Ursache:
  Fuer die Sammelbahn prueft die Truppenhuelle seit dem letzten Commit gegen die GANZE
  Wandgruppe. Eine beruehrte rechte Wand ist weder Reward noch Pickup und fiel deshalb
  bis zur Gegnerbehandlung durch. Sie hat kein `contactDamage` - der Trupp wurde auf
  NaN gesetzt und verschwand komplett. **Reproduziert und gemessen** (Wandsegment auf
  Truppenhoehe gezwungen): Truppe 20 -> null, sichtbare Figuren 0, im Protokoll steht
  `wall-segment-right` als Gegner. Fix: Wandsegmente vor der Gegnerbehandlung
  ausschliessen, plus zweite Sicherung in `handlePlayerHit` (kein Schaden ohne endliche
  Zahl). **Gegenprobe mit Vorhersage:** Echte Gegner muessen weiter Schaden machen -
  gemessen 4 erzwungene Kontakte, Truppe 20 -> 14. Regressionstest prueft die
  Reihenfolge der Abfragen im Kollisionshandler.
- **Tempo je Level** (Thomas: "die plus 1 waende muessen jedes Level ein wenig
  schneller werden"). Umgesetzt als Tempo der GANZEN Welt in `speed.ts`, nicht nur der
  Waende - dieselbe Wahl wie bei der Verlangsamung am selben Tag ("einfach alles
  langsamer"). Nur die Waende zu beschleunigen haette sie mit jedem Level weiter aus
  dem Takt mit Strasse, Haeusern und Muenzen laufen lassen.
  Hergeleitet aus zwei bekannten Punkten: 135 px/s ist abgenommen (Level 1), 180 px/s
  war "zu schnell". Level 12 zielt auf 175 -> Faktor 1,0238 je Level, harter Deckel 175.
  Alle fuenf Systeme lesen jetzt EINE Zahl; ein Test prueft, dass keines mehr die feste
  Grundgeschwindigkeit liest.
- **Betriebsvorfall dabei:** Der Pruefbrowser hing und blockierte Thomas' Bildschirm,
  weil eine Sperrdatei geloescht statt der Prozess beendet wurde. Aufgeraeumt, in
  `docs/lessons.md` und im zentralen Logbuch vermerkt.
Nachweise: 142 Tests gruen (neu `tests/levelSpeed.test.ts`), `npm run check` sauber,
Bug und Gegenprobe im Browser gemessen.
**Noch offen aus Thomas' Nachricht:** Rechte Wand auf Feuerkraft umbauen (Schaden,
Feuerrate, Waffen) und dann die Frage, was den Mittel-Toren bleibt.

**Deckendes Blau, weisse Schrift, Sammelbahn ohne Pausen fertig** (2026-08-22,
Claude direkt, Thomas: "beide waende in decken blau und weisser schrift und die linken
waende durchgehend ohne pausen").
- **Deckend statt halbtransparent** (`walls.fillAlpha` 0.4 -> 1). **Randbedingung, die
  mitgeloest werden musste:** Der Wandinhalt (Waffe, Muenze, "+1") lag hinter der Wand
  und schien durch - deckend waere er unsichtbar geworden. Er liegt jetzt VOR der Wand
  (`layers.wallContent` 1.5 -> 2.5, ueber `gameplay` 2).
- **Weisse Schrift auf beiden Seiten**: Der "+1"-Text war gruen (`STAT_COLORS.hp`).
- **Sammelbahn links durchgehend**: `isWallSlot` gilt nur noch rechts. Links ist die
  Bahn kein Hindernis, also braucht sie keine Ausweichluecke; rechts bleiben die
  Abschnitte, dort muss die Truppe zwischen Wand und Strassenrand ausweichen koennen.
**Gemessen** (20 s durchgehend links gefahren): 36 Plaettchen = **1,80 je Sekunde**
(vorher 1,10), gerechnet 1,875 (135 px/s / 72 px Kachel). Kachelabstaende links exakt
72 px ueber die ganze Kette - lueckenlos. Schrift `#ffffff`, Inhalt auf Tiefe 2,5 vor
der Wand auf Tiefe 2.
**Damit gewinnt eine Minute Dauerfahrt links jetzt 112 Figuren statt 67.** Ist das zu
viel, gehoert die Bremse an die Kette (Pausen wieder einfuehren), nicht an den Wert des
einzelnen Plaettchens - viele kleine Quittungen sind der Reiz.
Nachweise: 135 Tests gruen, `npm run check` sauber, Browser-Messung wie oben.
**Offen:** Thomas' iPhone-Urteil. **Offene Frage von Thomas: "was machen wir mit der
Logik der rechten Waende?"** - Empfehlung im Chat abgegeben (rechts = Feuerkraft gegen
Feuerzeit, als Gegenstueck zur Masse links), noch nicht entschieden.

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
