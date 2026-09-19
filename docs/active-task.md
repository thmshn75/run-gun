# Active Task

## Status
`IMPL_DONE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**V5 / E1 — Die Truppe als sichtbare Masse, nur im Torlauf.**

Plan: `docs/plan-v5.md` (freigegeben 2026-09-19). E0 ist abgenommen (Commit `5c0c2dc`).
E1 loest den offenen Punkt 1 der Uebergabe ("Truppenanzeige: gedeckelt oder echte
Zahl?") **fuer den Torlauf**: Dort zeigt die Truppe jede Figur bis 150, dicht gestaffelt
wie im Video. **Der echte Run, das Testgelaende und der Bahnen-Probelauf bleiben bei 30
und bei ihren heutigen Formationswerten** — das ist die harte Grenze dieses Tasks.

### Was der Bestand vorgibt (gelesen, nicht vermutet)

- `Crowd` legt im Konstruktor genau `BALANCE.pools.crowd` (30) Figuren und Schatten an
  (`crowd.ts:53-66`); `setSize` klemmt hart auf `BALANCE.crowd.max` (Z.79).
- Die Formation ist ein **Dreieck** (Reihe n hat n Plaetze, `formation.ts`), das vom
  Anker nach **unten** waechst (`offsetY = row * spacing`). 150 Figuren brauchen so 17
  Reihen. Der Anker steht 130 px ueber dem Boden (`player.anchorBottomOffset`), unter
  ihm bleiben `844 - 714 - 23 - 8 = 99 px` Tiefe — 17 Reihen wuerden auf 6 px Abstand
  gepresst, die 46-px-Figuren laegen fast vollstaendig uebereinander.
- Die Breite ist auf `maxWidthRatio` 0,2 = 78 px gedeckelt, mit einem Kommentar, der
  0,20 als **kleinsten zulaessigen** Wert fuer den Run begruendet (Feuerlinie) und einen
  Test dahinter nennt.
- Die Kollisionshuelle ist **fest** 2,4 x 1,6 Figuren (`hullWidthFigures`, Kommentar:
  "stays fixed instead of growing with the formation"). Sie waechst heute **nicht** mit —
  `docs/plan-v5.md` E1 hat das falsch angenommen und wird hier korrigiert.
- Die Feuerkraft haengt an `shootersPerSalvo` 8 (rotierend ueber alle aktiven
  Figuren) und am Truppenbonus, der ueber `damageMultiplierCap*` gedeckelt ist und ab
  rund 30 Figuren nichts mehr hinzugibt. **Die Zahl der aktiven Figuren aendert die
  Feuerkraft nicht** — das ist die Sicherung aus dem Plan, und sie steht schon.
- Figurenmass: `render.figureTextureScale` 0,5 auf die doppelt aufgeloeste Textur,
  46 px hoch. Schatten, Huelle und Fahrbereichs-Einzug (`dragClampFigures`) haengen an
  `displayWidth/Height` und skalieren mit.

---

## A — Ein Formationsprofil statt fester Konstanten

`Crowd` bekommt im Konstruktor ein **Profil** (Werteobjekt), das alles buendelt, was
heute direkt aus `BALANCE.crowd` und `BALANCE.pools.crowd` gelesen wird:

```ts
type FormationsProfil = Readonly<{
  poolGroesse: number        // wie viele Figuren+Schatten angelegt werden
  max: number                // Klemme in setSize
  figureScale: number        // Faktor auf render.figureTextureScale
  rowSpacingY: number
  colSpacing: number
  minColSpacing: number
  maxWidthRatio: number
  form: 'dreieck' | 'block'  // Run: dreieck (heutige Logik), Torlauf: block
  plaetzeJeReihe: number     // nur fuer block
  huelleFolgtFormation: boolean
}>
```

- **Der Run behaelt sein Profil aus `BALANCE.crowd` unveraendert**: `poolGroesse` 30,
  `max` 30, `figureScale` 1, `form` dreieck (heutige Logik),
  `huelleFolgtFormation` false. Ein Test belegt, dass `computeFormation` fuer das
  Run-Profil **bitgleich** dieselben Slots liefert wie vor diesem Task (Fixtures fuer
  1, 8, 30 Figuren).
- **Der Torlauf bekommt `BALANCE.torlauf.crowd`**, ein eigener Block mit Rechenweg je
  Wert (Vorschlaege, Herleitung unten): `poolGroesse` 150, `max` 150, `figureScale`
  0,6, `rowSpacingY` 9, `colSpacing` 10, `minColSpacing` 8, `maxWidthRatio` 0,55,
  `form` block, `plaetzeJeReihe` 20, `huelleFolgtFormation` true.
- **Alle** direkten Leser in `crowd.ts` gehen auf das Profil — gegrept, nicht
  vermutet: Z.48/49 (`hullWidthFigures`/`hullHeightFigures`), **Z.54
  (`createCrowdMotionProfiles(BALANCE.pools.crowd, …)`) und Z.55 (Schleifenlaenge
  `BALANCE.pools.crowd`)** — werden diese beiden vergessen, existieren im Torlauf nur 30
  Figuren-Objekte und `setSize(150)` zeigt still 30 —, Z.78 (`max`), Z.80-84
  (`rowSpacingY`, `colSpacing`, `minColSpacing`, `maxWidthRatio`, `bottomMargin`). Ein
  Test instanziiert `Crowd` mit dem Torlauf-Profil (Phaser gemockt wie in
  `trefferquittung.test.ts`) und zaehlt **150 Member-Objekte** — nicht nur 150 Slots aus
  `computeFormation`.
- Die Weiche liegt in `GameScene.create()` beim `new Crowd(...)` (Z.307):
  `this.istTorlauf() ? BALANCE.torlauf.crowd : BALANCE.crowd`-Profil. **Einzige Stelle.**
  `istTorlauf()` ist in `create()` bereits gesetzt (init laeuft davor) — das hat E0
  belegt.

**Herleitung der Torlauf-Werte:**

- `figureScale` 0,6 → 28 px hohe, 20 px breite Figuren. Das Video zeigt Figuren von
  rund einem Zwanzigstel der Bahnbreite; unsere Bahn ist auf Kampfhoehe ~300 px breit,
  20 px sind ein Fuenfzehntel — etwas groesser als im Video, damit die 12-Bild-Laufsaetze
  lesbar bleiben.
- **Die Formation hat zwei Formen, `form: 'dreieck' | 'block'`.** Der Run laeuft mit
  `dreieck` — das ist der heutige Code in `computeFormation`, Zeile fuer Zeile. Der
  Torlauf laeuft mit `block`: **jede Reihe hat `plaetzeJeReihe` Plaetze, die letzte den
  Rest, zentriert.** Ein Dreieck wuerde 150 Figuren in 17 immer breitere Reihen legen —
  spitz und schmal, nicht die Masse des Videos.
- `plaetzeJeReihe` **20** → 150 Figuren = 7 volle Reihen plus 10, also 8 Reihen; das
  Video zeigt rund 8 x 18. Bei `minColSpacing` 8 ist eine volle Reihe 152 px breit.
- `maxWidthRatio` 0,55 → 214 px, zwei Drittel der Bahn auf Kampfhoehe; die 152 px
  einer vollen Reihe passen mit Rand hinein, `colSpacing` 10 wird also nie unter
  `minColSpacing` gedrueckt.
- `rowSpacingY` 9 → 8 Reihen = 63 px Tiefe; die Figuren (28 px hoch) ueberlappen zu
  zwei Dritteln, genau die dichte Staffelung des Videos. Die Depth-Regel
  `gameplay + row` bleibt, damit hintere Reihen hinter vorderen liegen.
- `poolGroesse`/`max` 150: Das Video zeigt ~8 x 18. Ueber 150 traegt die Zahl weiter,
  die Menge bleibt stehen (`setSize` klemmt auf `max`), und `runStats.hp` ist davon
  unberuehrt — die Zahl ueber der Truppe zeigt weiterhin `hp`.

## B — Der Anker steht im Torlauf hoeher

Im Torlauf braucht der Block Platz nach unten: `BALANCE.torlauf.anchorBottomOffset`
**220** statt 130 (Rechenweg: 8 Reihen x 9 px = 63 px plus halbe Figur plus
`bottomMargin`, plus Reserve fuer 150 Figuren in 8 Reihen; 220 laesst 220 - 14 - 8 =
198 px, das Doppelte des Bedarfs, damit die Formation nie komprimiert). Die Weiche
sitzt in `GameScene.create()` (Z.307, `new Crowd(..., height - offset)`), die den
Wert ueber eine Szenen-Funktion `getAnchorBottomOffset()` liest:
`istTorlauf() ? BALANCE.torlauf.anchorBottomOffset : BALANCE.player.anchorBottomOffset`.

**Die zwoelf Leser von `BALANCE.player.anchorBottomOffset` (grep 2026-09-19) und was
mit jedem passiert — Pflichtliste, keine Vermutung:**

| Fundstelle | Zweck | Torlauf |
|---|---|---|
| `GameScene.ts:307` `new Crowd` | Truppenposition | **folgt** (220) |
| `spawner.ts:230` `meldeDurchbruch` | Hoehe, ab der ein Gegner als durchgebrochen gilt | **folgt** — sie meint die Truppe |
| `spawner.ts:445` `getTargetLane` | Spur, auf die Gegner zulaufen | **folgt** |
| `spawner.ts:525` `spawnSingle`, `:549` `spawnSquad` | Spurbreite auf Kampfhoehe | **folgt** — Kampfhoehe ist die Truppe |
| `roadGeometry.ts:48, 67, 88, 140, 173, 183` | Kalibrierpunkt der Strassenperspektive (lambda, Skalierung, Segmente) | **bleibt bei 130** — das ist Geometrie der Strasse, nicht Position der Truppe; wer sie mitzieht, verzerrt Strasse und Wandbewegung im Torlauf |
| `bruecke.ts:133` | Kalibrierung der Brueckenwellen auf Kampfhoehe | **bleibt bei 130** — dieselbe Klasse wie roadGeometry |

Der Spawner bekommt den Wert **injiziert** (Konstruktor-Callback `getAnchorBottomOffset`,
wie er heute `getCrowdAnchorX` bekommt), nicht per Import aus der Szene.
`roadGeometry.ts` und `bruecke.ts` lesen weiter `BALANCE.player.anchorBottomOffset`; ein
Test haelt fest, dass `getRoadScale`/`advanceAlongRoad` fuer beide Modi identische
Werte liefern.

**Der Boss folgt der Truppe.** `boss.getAnchorY` ist an `crowd.getAnchorY()` gebunden
(`GameScene.ts:405`), sein Halt liegt `advanceStopBeforeAnchorPx` davor
(`boss.ts:255`). Im Torlauf steht er damit automatisch 90 px hoeher — richtig, denn er
soll die Truppe erreichen. Seine Kampfdauer ist auf die Run-Strecke gerechnet
(`advanceSpeed` 7,42 px/s auf 334 px) und verkuerzt sich im Torlauf entsprechend um
rund 12 s. **Das ist Torlauf-Balance, in Kauf genommen; E4 entscheidet, ob der Boss im
Torlauf eigene Werte bekommt.** Kein Umbau in E1.

**Folge, ausdruecklich in Kauf genommen:** Die Anflugstrecke der Gegner ist im Torlauf
um 90 px kuerzer (rund 0,7 s weniger Beschuss bei 135 px/s). Das ist Torlauf-Balance
und wird in E2/E3 an Toren und Horde kalibriert, nicht hier.

## C — Die Huelle folgt der Formation (nur Torlauf)

Mit `huelleFolgtFormation` true setzt `setSize` die Huelle nach jeder Formation neu:
Breite = 2 x `halfFormationWidth` + eine Figurenbreite, Hoehe = Formationstiefe + eine
Figurenhoehe, **Position so, dass die vorderste Reihe (der Anker) die Oberkante
bleibt** — der erste Kontakt mit einem Gegner faellt also auf dieselbe Hoehe wie
heute, nur die Breite waechst. Begruendung: Im Video ist die Masse die Kontaktflaeche;
E3 (Horde frisst bei Beruehrung) braucht genau das. Im Run bleibt die Huelle fest
(Profil false, Code-Pfad unveraendert).

**Die Falle, die das kaputt macht:** `Crowd.update()` setzt die Huelle **jedes Bild**
auf `(anchorX, anchorY)` zurueck (`crowd.ts:254`), und eine Phaser-Zone positioniert
ueber ihren **Mittelpunkt**. Wer nur `setSize` aendert, hat eine gewachsene Flaeche,
die `update()` sofort wieder um den Anker zentriert — Oberkante zu hoch, Unterkante zu
kurz, und kein `setSize`-Test merkt es. Deshalb: Bei `huelleFolgtFormation` setzt
`update()` die Huelle auf `(anchorX, anchorY + formationstiefe / 2)`, damit die Oberkante
am Anker bleibt; die Formationstiefe merkt sich `setSize`. Der A4-Test prueft die
Huellenlage **nach `update()`**, nicht nach `setSize()`.

## D — Feuerkraft bleibt, Feuerlinie wird breiter

- `shootersPerSalvo` 8, `damagePerExtraFigure`, `damageMultiplierCap*` werden **nicht**
  angefasst; die Salve rotiert wie heute ueber alle aktiven Figuren. Ein Test haelt
  fest, dass die Feuerkraft-Zahlen bei 30 und bei 150 Figuren identisch sind
  (Schuetzen je Salve, Schadensbonus).
- Dass die Feuerlinie im Torlauf 214 px statt 78 px breit ist, ist gewollt (Masse
  deckt die Bahn) und Torlauf-Balance. Der Run-Kommentar bei `maxWidthRatio` ("0,20 ist
  der kleinste zulaessige Wert") gilt fuer den Run und bleibt samt seinem Test.

## E — Mess-Sonde und Nachweis

Codex hat keinen Browser; die Messung macht der Reviewer. Codex liefert dafuer **im
DEV-Build** (hinter `import.meta.env.DEV`, wie `window.__runGun`) eine Sonde:
`window.__runGunMessung.bildzeit(dauerMs)` — sammelt `requestAnimationFrame`-Deltas ueber
`dauerMs` und liefert `{ median, p95, bilder }`. Kein Produktionscode, keine Kosten.

**Was der Reviewer misst (steht hier, damit die Zahl vergleichbar ist):** Torlauf
Startlevel 20 (Truppe ~54: `getStatCap('hp', 20)` ≈ 108 x `teamShareOnContinue` 0,5),
dann per Sonde `hp` auf 150 setzen, 30 s laufen lassen mit voller Horde; Vergleich mit
dem Bahnen-Probelauf Level 20 ueber 30 s. **Grenze: Median nicht ueber 16,7 ms** (der
Wert aus der Uebergabe), gemessen im selben Browser hintereinander.

## Reissleine

Liegt der Median darueber: zuerst `poolGroesse` auf 75, dann die Bewegungsstreuung aus
dem Abwechslungs-Task fuer Figuren ab Index 30 abschalten (ein Profil-Flag). **Kein Umbau
der Renderschleife.** Laesst sich `computeFormation` nicht in **einer Session** um die
Block-Form erweitern, ohne den Dreieckszweig anzufassen, dann Block als **eigene
Funktion** neben dem Dreieck statt als Option — nicht weiterbohren.

---

## Akzeptanzkriterien

- **A1** `Crowd` nimmt ein Formationsprofil; der Run, das Testgelaende und der
  Bahnen-Probelauf laufen mit einem Profil aus `BALANCE.crowd` (30, Dreieck, feste
  Huelle). Ein Test belegt: `computeFormation` liefert fuer 1, 8 und 30 Figuren im
  Dreieck **exakt** dieselben Slots wie vor diesem Task (Fixture aus dem heutigen
  Stand erzeugen, bevor der Code angefasst wird).
- **A2** Im Torlauf zeigt die Truppe bis 150 Figuren als Block (20 je Reihe), Figuren
  0,6-fach, Anker 220 px ueber dem Boden. Bei 54 Figuren (Startlevel 20) sind drei
  Reihen sichtbar, bei 150 acht.
- **A3** Ueber 150 bleibt die Menge bei 150, `hp` und die grosse Zahl laufen weiter.
- **A4** Die Huelle deckt im Torlauf die Formation ab, Oberkante = Anker; im Run ist sie
  unveraendert 2,4 x 1,6 Figuren. Ein Test belegt beides.
- **A5** Die Tabelle in B ist umgesetzt: `GameScene:307` und die vier Spawner-Stellen
  lesen ueber `getAnchorBottomOffset()` (Spawner per Injektion); `roadGeometry.ts` und
  `bruecke.ts` lesen weiter `BALANCE.player.anchorBottomOffset`. Ein Test greppt genau
  diese Verteilung (Spawner 0 Direktleser, roadGeometry 6, bruecke 1) und belegt, dass
  `getRoadScale`/`advanceAlongRoad` modusunabhaengig sind.
- **A6** Feuerkraft-Zahlen bei 30 und 150 Figuren identisch (Test). `BALANCE.crowd`,
  `BALANCE.stats`, `BALANCE.pools.crowd` fuer den Run unveraendert (Test).
- **A7** Die grosse Zahl aus E0 steht ueber der vordersten Reihe (Anker) und wird von
  keiner Reihe ueberdeckt. Die Depth-Regel `gameplay + row` bleibt **unveraendert**: Der
  Run erreicht mit 30 Figuren im Dreieck heute schon 8 Reihen (`gameplay + 7`), ohne
  dass Popups (`+2`) oder Zahl (`+1`) verdeckt wuerden, weil beide ueber dem Anker und
  damit oberhalb aller Reihen stehen. Kein Umbau, nur Sichtpruefung am iPhone.
- **A8** Mess-Sonde im DEV-Build vorhanden; im Produktions-Build nicht enthalten (Test
  auf `import.meta.env.DEV`-Guard).
- **A9** `npm run check`, `npm test`, `npm run build` gruen.
- **A10 (Reviewer)** Bildzeit-Median Torlauf 150 Figuren ≤ 16,7 ms, gemessen wie in E.
- **A11 (Thomas)** iPhone: Die Truppe liest sich als Masse, nicht als Raster; beim
  Lenken bleibt sie zusammen; die Zahl steht frei. **Erst danach erfuellt.**

## Was kein zulaessiger Ersatz ist

- **Nicht** `BALANCE.crowd` oder `pools.crowd` fuer den Run veraendern.
- **Nicht** die Feuerlinie ueber die Figurenzahl staerken (Schuetzen, Bonus).
- **Nicht** den Dreieckszweig von `computeFormation` "vereinheitlichen" — er bleibt
  Zeile fuer Zeile, die Block-Form kommt daneben.
- **Nicht** den Anker im Run anheben.
- **Nicht** die Messung durch eine Schaetzung ersetzen.

---

## Wo die Historie steht

Projektstand: `docs/UEBERGABE.md`, Regeln: `docs/lessons.md`, Plan: `docs/plan-v5.md`.
**Zuletzt abgeschlossen:** V5/E0 TORLAUF-Geruest, Commit `5c0c2dc`, abgenommen
2026-09-19.

## Stand des Reviews (2026-09-19)

**Code-Review bestanden, eine kleine Nacharbeit (Rechenweg-Kommentare, Zaehl-Test).**
Formationsprofil in `Crowd` mit allen gegrepten Lesern (inkl. Z.54/55), Block-Formation
als eigene Funktion neben dem unveraenderten Dreieck (Fixtures 1/8/30 bitgleich),
Huelle folgt der Formation und wird in `update()` korrekt mit Oberkante am Anker
gesetzt (im Browser gemessen: `body.top` = 624 = Anker), Anker-Tabelle aus B exakt
umgesetzt (Spawner 0 Direktleser, roadGeometry 6, bruecke 1), DEV-Sonde im
`import.meta.env.DEV`-Guard. `npm run check`, `npm test`, `npm run build` gruen, im
Terminal nachgelaufen.

**A10 — Bildzeit, selbst gemessen (Playwright, Vite-Dev, Viewport 390x844, je 30 s
vollstaendig in der Gegnerphase, 1800 Bilder):**

| Lauf | Figuren | Gegner (Mittel) | Median | p95 |
|---|---|---|---|---|
| Torlauf Level 20, 150 Figuren erzwungen, 8 Reihen | 150 durchgehend | 18,1 | **16,7 ms** | 18,1 ms |
| Referenz Bahnen-Probelauf Level 20 | 26,3 | 37,3 | 16,7 ms | 17,8 ms |

Kein messbarer Unterschied; die Grenze 16,7 ms ist eingehalten. 0 Konsolenfehler.
Screenshot der Masse im Session-Scratchpad (`nachweis-e1/e1-150-masse.jpeg`): 8
dichte Reihen als Block, Zahl frei darueber.

**Im Browser zusaetzlich belegt:** 150 Member-Objekte im Torlauf; Startlevel 20 ergibt
56 Figuren in 3 Reihen, Figurenhoehe 28 px, Anker 624.

**Befund fuer E2 (im Plan notiert):** `runStats.set('hp', 150)` liefert 113 — die
Klemme am Level-Cap. Die 150 waren fuer die Messung nur per Halte-Schleife erreichbar.
E2 braucht einen Torlauf-eigenen Truppendeckel, sonst sind ×2-Tore wirkungslos.

**Angemerkt, nicht behoben:** Die neuen Kommentare in `BALANCE.torlauf` sind woertlich
aus dieser Spec kopiert, mit Markdown-Fettdruck und einem verrutschten Absatz an
`bottomMargin`. E2 fasst den Block ohnehin an und glaettet das mit.

**Offen: A11 — Thomas' iPhone-Test.** Bis dahin `IMPL_DONE`, nicht `APPROVED`.
