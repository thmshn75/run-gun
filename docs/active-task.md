# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D5e — Eis-Säulen (Plan V7, Abschnitt "D5e")

Thomas 2026-09-30 21:00–21:24: Die Glassäulen werden zu **milchig-blauen, halbdurchsichtigen
Eisblöcken**, in denen das Fahrzeug eingefroren liegt — etwa doppelt so groß wie heute, längs
zur Straße. Beim Beschuss bekommt das Eis Risse, beim Freischießen zerspringt es in Splitter.
Auf dem Block steht **nur die Zahl** der verbleibenden Treffer (keine Namen). Nach der letzten
Säule kommt wieder die erste, mit 1,5-fachem Zähler.

**Ist-Zustand (gelesen 2026-10-01):** `szene.ts` Z. 64–116 baut je Säule Glasquader 1,6×4×1,6
(`opacity .15`), Rahmen, Sockel, Namensschild (Canvas 256×128 auf 4,95 m) und eine Miniatur
(`baueMiniatur(…, [1.5,1.5,1.5])`), `BUEHNE.SAEULE_X` 4,7 → Innenkante 3,9 m. `lauf.ts`
dreht/wippt die Miniaturen (`bewegeMiniaturen`), schiebt die Säulen nach einem Fall in 0,6 s
vor (Z. 862–875), zeichnet Name + Zahl (Z. 876–899), lässt das Glas bei `saeuleTreffer`
aufblitzen (Z. 641–645, 857–861; findet das Material per `getObjectByName('saeule')`) und liest
dabei `LEVELS[0]` statt `z.level`. Kern `rechnung.ts` Z. 114–126: nach der letzten Säule
`P = null`. `einstieg.ts` Z. 196 und 206 erzeugen `new SpielLauf(LEVELS[0], …)`.
**Bots heute (Claude, 2026-10-01, `npm run bots3d`):** passiv 0/20 · nurLinks 0/20 ·
rhythmus(40) 20/20 · rhythmusSaeule(60) 20/20, Ø 2,00 Säulen · (15) 0/20, Ø 2,00 · (25) 0/20,
Ø 3,00. In Level 1 fallen nie mehr als 3 Säulen — die Wiederholung greift dort noch nicht.

## Erlaubte Änderungen (abschließend)
- `src/v3d/rechnung.ts` — Säulenfall (Z. 114–126), neuer Export `saeulenStartP`, neues
  Zustandsfeld `PStart` (A1). Sonst nichts am Kern.
- `src/v3d/balance3d.ts` — Level-Feld `saeulenRundenFaktor`, Konstanten `EIS`,
  `BUEHNE.SAEULE_X`.
- `src/v3d/szene.ts` (Säulenbau), `src/v3d/lauf.ts` (Säulen-Darstellung, Miniaturen,
  Zurücksetzen in `gibFrei`/Vorgänger; **nicht** `Einsatzbilder`), `src/v3d/fahrzeuge.ts`
  (nur `baueMiniatur`), neue Datei `src/v3d/eis.ts` (Block, Risse, Splitter, Tafeln),
  `src/v3d/einstieg.ts` (Prüfschalter, Level-Kopie, Vorwärmen, Bildzähler),
  `src/v3d/messung.ts` (Speicherplan-Posten, Level-Kopie nicht nötig), neues Bild
  `src/v3d/bilder/v3d-eis.webp`.
- `tests/`: Bestehende Tests zu Namen, Drehung/Wippen und Säulen-Index (`tests/v3dLauf.test.ts`
  ~Z. 22, 29–41, 360–377, 427; `tests/v3dRechnung.test.ts` ~Z. 187–196, 283;
  `tests/v3dBuehne.test.ts` ~Z. 41–68: Namen, Rahmen/Sockel/Schild, Miniatur je Säule,
  Mesh-Obergrenze) werden auf die neuen Kriterien **umgeschrieben, nicht gelöscht**; Welt-Stub
  mitziehen. Neue Asserts in `v3dBuehne`: Blockmaße, 4 Plätze bei z −12/−20/−28/−36, geteilte
  Geometrie und Basismaterial, Mesh-Obergrenze neu begründet.
- **`Welt`-Felder:** `saeulen` = Block-Plätze, `saeulenInnen` → umbenennen in `miniaturen`
  (je Fahrzeugart, A9), `saeulenSchilder` = Zahltafeln je Platz.
- **Nicht:** Raten, Front, `SPEZIAL`, `Einsatzbilder`/Feldfahrzeuge, 2D-Code, Speicher,
  `index.html`, `style.css`.

## Akzeptanzkriterien

**A1 Säulen wiederholen sich (Kern, eine Quelle).** Neues Level-Feld `saeulenRundenFaktor`
(Level 1: 1,5). Export `saeulenStartP(level, index) = level.P · saeulenRundenFaktor ^
floor(index / n)` — **die einzige Stelle** dieser Formel; Kern, Darstellung und Prüfschalter
benutzen nur sie. Beim Fall: `einheit = saeulen[saeulenIndex % n]`, `saeulenIndex++` (zählt
alle gefallenen Säulen, läuft über `n` hinaus), `P = PStart = saeulenStartP(level,
saeulenIndex)`. `P` wird nie `null`, solange `saeulen` nicht leer ist (leer: wie heute).
Bilanz-Invariante unverändert gültig. Tests: (1) `x = 1`, kleines `P`: 10 Einheiten frei in
zyklischer Reihenfolge, `P` nach dem 4./8. Fall = `P·1,5` / `P·2,25`. (2) Zwei gleichzeitig
aktive Einheiten derselben Art laufen im Kern beide vollständig ab, Bilanz stimmt; dazu ein
Darstellungstest: `WeltDarstellung` mit zwei aktiven Humvees wirft keinen Fehler.
(3) `npm run bots3d` vorher/nachher — **Vorhersage: alle sechs Zeilen zahlengleich**. Weicht
eine ab, ist das ein Fehler, nicht Balance. Sieg/Niederlage bleiben unverändert (Sieg =
`eliteBoss.B` 0, nicht `P`); die Wiederholung betrifft nur den Säulennachschub. Bots und
`messung.ts` fragen `z.P !== null` nur für die Phasenwahl — das bleibt so.
**Bekannte Grenze (bewusst, kein Codex-Auftrag):** Zwei gleiche Einheiten gleichzeitig werden
übereinander gezeichnet (`Einsatzbilder` bleibt unverändert). Im normalen Level-1-Spiel kommt
das nicht vor (≤ 3 Fälle je Lauf); mit `&eis=` kann es vorkommen. Lösung gehört zu D7/Werkstatt.

**A2 Eisblock: Maße und Lage.** `EIS = { BREITE: 2.2, LAENGE: 4.0, HOEHE: 2.0 }` (x, z, y in
m), `BUEHNE.SAEULE_X = 4.75` → Innenkante **3,65 m** (Vorgabe ≤ ~3,7), Außenkante 5,85 m.
Block steht auf dem Boden, Mitte z = −12 − j·8 wie heute. Glasquader, Rahmen, Sockel und
Namensschild entfallen. Test: Innenkante ≤ 3,7 und > `MITTE_HALB + KANTE_BREITE/2`,
Außenkante ≤ `BAHN_BREITE/2`; `saeulenBlick` zielt auf `SAEULE_X`.

**A3 Fahrzeug im Eis.** Reihenfolge in `baueMiniatur`: (1) Ausrichtung so, dass der
Mündungspunkt (`FAHRZEUGE[name].MUENDUNG`, beim Hubschrauber die Nase) bei −z liegt — wie das
Feldfahrzeug; (2) Haupt- und Heckrotor anhalten, Hauptrotor im Winkel mit der kleinsten
x-Breite; (3) Bounding-Box des **ganzen** Modells (inkl. Rotor, Rohr) messen; (4) so
skalieren, dass deren z-Ausdehnung der Zielwert ist: **3,0 m** (Humvee, Panzer, Haubitze;
heute 1,5) bzw. **3,54 m** (Hubschrauber, halbe Spielgröße); (5) **Pflicht** ist, dass die Box
in allen drei Richtungen mit ≥ 0,1 m Rand in den Block passt — sonst weiter verkleinern; die
Länge ist nur Zielwert. **Mindestlänge 2,1 m** (z-Ausdehnung der Box) — darunter nicht still
verkleinern, sondern melden. Fahrzeug mittig in der Blockhöhe, keine Drehung, kein Wippen.
Tests je Fahrzeug: Box (Welt) im Block minus 0,1 m; Mündung z < Fahrzeugmitte z; Rotation und
Position nach 5 s Laufzeit unverändert. Erreichte Längen in den Bericht.

**A4 Eis-Aussehen (milchig-blau, halbdurchsichtig, ohne Lichtbrechung).**
- **Materialien (fest):** ein **Basis-Eismaterial** für die wartenden Blöcke (geteilt, wird
  zur Laufzeit nie verändert) und ein **Treffer-Eismaterial** (gleiche Einstellungen, eigenes
  Objekt, einmal angelegt) nur für den aktiven Block — nur dieses blitzt bei Treffern auf
  (Farbe als vorab angelegtes `THREE.Color`, nicht je Bild neu; Materialverweis direkt
  übergeben, keine Namenssuche). Beim Platzwechsel werden die Materialien umgehängt.
  Beide: transparent, `depthWrite: false`, `side: FrontSide`, hellblaue Grundfarbe, Bemalung
  `v3d-eis.webp` (Mipmaps an). Feste `renderOrder`: Block 2, Riss-Auflage 3 (Abstand
  ≥ 0,01 m vor der Fläche plus `polygonOffset`), Splitter 4, Tafel 10. Keine Spiegelung, keine Brechung, keine
  zusätzliche Renderfläche, kein eigener Shader. Die Riss-Auflage (A5) ist ein eigenes Netz
  und erlaubt.
- **Bild:** `v3d-eis.webp` 512×512, nahtlos kachelbar, milchiger Frost mit hellen Schlieren und
  helleren Kanten, keine Schrift, ≤ 150 KB — **Codex erzeugt es mit seinem Bildwerkzeug**.
  Laden per Vite-Import (gehasht, landet im Precache, wie die übrigen `v3d-*.webp`); der Lauf
  startet erst, wenn das Bild geladen ist (Lade-Gate, **höchstens 3 s**). Ladefehler oder
  Zeitablauf → Eis in Grundfarbe ohne Bemalung, Konsolenwarnung, **kein** Abbruch (Test mit
  nie ankommendem Bild). Build-Test: Datei steht im `dist/sw.js`-Manifest,
  3D-Summe weiter ≤ 25 MB.
- **Plausibilitätsmessung (Startwerte, keine Abnahme):** Prüfschalter (nur `?pruefung=1`)
  `&eisansicht=normal|ohneeis|ohnefahrzeug|maske` (maske: Blöcke einfarbig, liefert die
  Pixelmaske). Gleiche Kamera, gleiches Bild, nur der Schalter wechselt. Im Maskenbereich
  Säule 1 (390×844): (a) mittleres B − R ≥ 25; (b) "normal" gegen "ohnefahrzeug" in ≥ 30 % der
  Maskenpixel Δ Helligkeit > 10 (Fahrzeug erkennbar); (c) "normal" gegen "ohneeis" an diesen
  Pixeln mittlere Abweichung ≥ 15 % (Eis dämpft). **Hat Codex keinen Browser: "nicht gemessen"
  in den Bericht, keine Schätzung** — Claude misst nach. Abnahme ist Thomas' Blick (unten).

**A5 Risse je Treffer.** **Eine** Riss-Auflage: ein Netz aus drei Flächen (+z, Oberseite, −x),
knapp vor den Blockflächen, eigenes Material mit **einer** Canvas-Textur 512×512
(`generateMipmaps = false`, linear). Sie hängt immer am aktiven Block und wandert beim
Platzwechsel mit. Rissnetz je Säule aus dem Säulen-Index als Startwert berechnet (helle,
dünne, verzweigte Linien), nicht gespeichert. Es wächst in **8 Stufen** mit `1 − P/PStart`
(Stufe 0 = keine Risse, Stufe 7 ab 7/8): jede Stufe behält die Linien der vorigen und fügt
neue hinzu. Hochladen **nur beim Stufenwechsel**. Damit ≤ 7 Uploads je Säule; nach einem
Kontext-Restore ein zusätzlicher Upload der aktuellen Stufe (zählt nicht mit), und das
Vorwärmen (A7) läuft einmal erneut. Je Treffer-Takt (höchstens alle 0,2 s, wie heute)
zusätzlich: Aufhellen des Treffer-Materials und 2–3 kleine Eissplitter von der Vorderseite
(Pool A6). Pause/App-Wechsel zeichnet nichts neu.
**"Aktiv" hängt an der Säule, nicht am Platz:** Aktiver Block = Block der Säule
`saeulenIndex`, auch während er in 0,6 s nach vorn rückt; Treffer-Material, Riss-Auflage und
`ceil(P)` gehören zu ihm. **Im Bild mit `einheitFrei`** (in dieser Reihenfolge, alles im selben
Bild): Treffer-Aufhellen und Treffer-Splitter dieses Bildes entfallen; Zerspringen (A6) an der
alten Blocklage; Riss-Canvas leeren ohne Upload, Auflage unsichtbar (Stufe 0); Treffer-Material
in Grundfarbe an den neuen aktiven Block, Basis-Material an alle anderen; Auflage an den neuen
aktiven Block. Tests: Stufen monoton, Uploads ≤ 7 je Säule über einen ganzen Abbau, Stufe 0 bei
`P = PStart`, 7 kurz vor 0; wartende Blöcke tragen nie Risse und blitzen nie.

**A6 Zerspringen beim Freischießen.** Im Bild, in dem der Kern `einheitFrei` meldet: Block und
Miniatur unsichtbar, gleichzeitig **24–40 Splitter** (eine `InstancedMesh`, ein Zeichenaufruf,
flache unregelmäßige Eisstücke im Basis-Eismaterial oder einem dritten, einmal angelegten
Material), nach außen/oben, Schwerkraft, **0,9 s**, Ausklingen per **Skalierung auf 0** (keine
Alpha je Instanz), dazu ein kurzer heller Blitz an der alten Blocklage (eigenes Sprite oder
Aufhellen der Splitter, **nicht** das Treffer-Material). Effektzeit: dt je Bild höchstens 0,1 s,
steht bei Pause/verdeckter Seite still (Test: dt 2 s nach Wiederkehr → Splitter laufen weiter,
≥ 3 Bilder). Pool `EIS.SPLITTER_POOL = 80`; ein
neues Zerspringen überschreibt die ältesten Einträge (auch Treffer-Splitter), Treffer-Splitter
verdrängen nie ein laufendes Zerspringen. Kurzlebig-Regel (Lesson 2026-09-30): Altern erst ab
dem Bild nach dem ersten Zeichnen, mindestens **3 gerenderte Bilder**. "Gerendert" zählt ein
Bildzähler, der nach jedem `renderer.render` der Spielschleife hochgezählt und den Effekten
übergeben wird (im Test simuliert). Tests: nach `einheitFrei` ≥ 24 aktive Splitter, nach
0,9 s 0; bei dt 0,1 und 1/60 je ≥ 3 gezählte Bilder mit Splittern; Block im selben Bild
unsichtbar; `P = 1` → genau ein Zerspringen je Fall.

**A7 Vorwärmen.** Basis-, Treffer-, Riss- und Splittermaterial (als `InstancedMesh`) werden vor
dem ersten Laufbild übersetzt — Objekte dafür **sichtbar außerhalb des Bildes** (nicht
`visible = false`), dann `renderer.compile`/ein Bild, danach zurückgesetzt (Verfahren wie
D5d-Nacharbeit 4, `vorwaermenEffekte`). Schalter `&vorwaermen=0` schaltet es mit ab. Nachweis
über die Prüf-Diagnose (wie D5d): längstes Bild ±0,5 s um den ersten Treffer und um das
erste Zerspringen, mit und ohne Vorwärmen, dazu `renderer.info.programs.length` vor dem ersten
Treffer und 0,3 s nach dem Zerspringen. Ergebnis als "Letzte Messung" sichtbar. iPhone-Wert
holt Claude mit Thomas.

**A8 Zahl auf dem Block, keine Namen.** Über jedem sichtbaren Block eine Tafel **nur mit einer
Zahl**: aktiver Block `ceil(P)`, wartende Blöcke `saeulenStartP` ihrer Säule. Ab 10 000 als
`12,5k` bzw. `3,4M`; die Zahl passt immer auf die Tafel. Kein Fahrzeugname, keine Beschreibung
im 3D-Bild. **Lage fest:** Tafel 1,2 m × 0,7 m, zur Kamera gedreht, Unterkante 0,2 m über der
Blockoberkante, über der Blockmitte; `depthTest` an. Ziffernhöhe am aktiven Block ≥ 18 px bei
390×844 (heute ~11 px). Rechnerischer Test mit `baueKamera(390, 844)` aus `kamera.ts`:
projizierte Ziffernhöhe (Tafelhöhe × Ziffernanteil der Canvas) am Platz 0 ≥ 18 px; ist das mit
0,7 m nicht erreichbar, Tafel höher bis 1,0 m und melden. Projizierte Tafel überdeckt das **eigene** Fahrzeug nicht; Überdeckung mit dem Fahrzeug des
nächsten Blocks wird ausgegeben (Zahl in den Bericht, Grenze ≤ 20 % seiner Fläche).
Neu zeichnen: aktive Tafel bei Zahländerung, höchstens alle 0,1 s; wartende Tafeln nur beim
Platzwechsel.

**A9 Nachrücken im Kreis.** `min(n, SAEULEN_VORSCHAU + 1)` Block-Plätze (Level 1: 4), einmal in
der Welt gebaut. Platz j zeigt Säule `saeulenIndex + j`, Fahrzeug `saeulen[(saeulenIndex + j)
% n]`. Miniaturen: je Fahrzeugart so viele, wie sie in `saeulen` vorkommt (Level 1: je eine),
einmal gebaut; ein Platz hängt die passende per Elternwechsel ein. Nach einem Fall rücken die
übrigen wie heute in 0,6 s vor; der zerbrochene Platz erscheint hinten (j = 3) neu:
unversehrt, Zahl = `saeulenStartP`. Im Fallbild wird die passende Miniatur umgehängt; dann
wächst **nur das Eis** in 0,6 s aus dem Boden (`scale.y` 0,001 → 1), Miniatur und Tafel sind
erst sichtbar, wenn es fertig gewachsen ist. Darstellung
liest `z.level`, nie `LEVELS[0]`. **Zurücksetzen:** Alle Eis-Zustände (Rissstufe, Wachstum,
Splitter, Canvas, Zahl-Merker, Platz-Zuordnung, Material-Zuordnung, Aufhellung) werden in
`gibFrei` und im Vorgänger-Zurücksetzen auf Anfang gestellt: Treffer-Material in Grundfarbe
an Block 0, Basis-Material an den übrigen, Riss-Auflage an Block 0. Tests:
`renderer.info.memory.geometries`/`.textures` (bzw. gezählte Anlagen im Stub) nach dem 1. und
6. Fall gleich; Zweitstart nach einem Fall und mitten in einem Treffer-Aufblitzen: Stufe 0,
Höhe 1, Splitter 0, Platz 0 zeigt Säule 0 mit Treffer-Material in Grundfarbe.

**A10 Prüfschalter `&eis`.** Nur bei `?pruefung=1`: `&eis=<ganze Zahl 1…100000>` setzt `P`
einer **Kopie** von `LEVELS[0]`; diese Kopie nutzen beide `new SpielLauf`-Stellen in
`einstieg.ts` (Start und "Nochmal"). Andere Werte und ohne `pruefung=1` wirkungslos (Tests).
Kombinierbar mit `&einsatz=` und `&eisansicht=`.

**A11 Leistung.** `?messung=1` alle Stufen im Budget (Plan Randbedingung 7). Speicherplan
führt `v3d-eis.webp` (mit Mipmaps ≈ 1,4 MB), Riss-Canvas (1 MB) und Splitter-Puffer als
Posten; **die neuen Posten zusammen ≤ 3 MB** (Test schlägt darüber fehl). Desktop-Vorprüfung durch
Codex; iPhone-Messung macht Claude mit Thomas.

## Nachweise
`npm run check`, `npm test`, `npm run build` (inkl. Manifest-Test), `npm run bots3d`
(vorher/nachher, A1-Vorhersage) grün. Wenn Browser verfügbar (390×844, hasTouch): Nahbild je
Fahrzeug im Eis, Spielbild mit vier Blöcken, Bildfolge eines Zerspringens
(`?pruefung=1&eis=10`), Zahlen A4/A7/A8/A9 — sonst ausdrücklich "nicht gemessen".
Status am Ende `IMPL_DONE`, Abschlussbericht: was geändert, Testergebnisse, Messzahlen,
Fahrzeuglängen, was nicht ging und warum.

## Reißleine
- Kein brauchbares `v3d-eis.webp` aus dem Bildwerkzeug: **melden**, Eis in Grundfarbe
  fertigbauen, im Bericht als offen. Kein programmatisch gemaltes Ersatzbild als "fertig".
- A4 (b)/(c) oder A8 (18 px gegen Überdeckung) nicht gleichzeitig erreichbar: melden mit
  Messwerten, nicht still eines opfern.
- Hubschrauber unter 2,1 m: melden.
- Reißt die iPhone-Messung das Budget (Claude): in dieser Reihenfolge zurückbauen — Riss-
  Auflage weg, dann 3 statt 4 Plätze, dann `v3d-eis.webp` auf 256 px. Höchstens zwei
  Anläufe für D5e, dann zurück zu Thomas.

## Abnahme
1. **Thomas im Browser** (sein Wunsch 2026-10-01: ansehen reicht im Browser):
   `?pruefung=1&eis=10` — Eis milchig-blau, Fahrzeug erkennbar, Risse wachsen beim
   Rechtssteuern, Splitter beim Zerspringen, nur Zahlen, fünfte Säule wieder Humvee mit 15.
2. **Einmal iPhone** `?messung=1` (nur Leistung, Plan Randbedingung 7).

## Implementation Summary

D5e umgesetzt: Der Rechenkern wiederholt die vier Säulen zyklisch und erhöht den Startzähler je Runde mit dem Faktor 1,5. Vier wiederverwendete Eisplätze ersetzen Glas, Rahmen, Sockel und Namensschilder. Miniaturen stehen still im Eis; Risse wachsen in acht Stufen, Treffer blitzen auf, und pro Freigabe zerspringt ein Block in 32 Splitter mit kurzem Lichtblitz. Der hintere Platz wächst aus dem Boden nach. Tafeln zeigen nur Zahlen. `?pruefung=1&eis=1…100000` nutzt eine Level-Kopie; `eisansicht`-Varianten, Vorwärmen, Lade-Gate (3 s, dann Grundfarbe), Kontext-Restore und die Eis-Diagnose für „Letzte Messung“ sind eingebaut. Die generierte, kachelbare Textur liegt unter `src/v3d/bilder/v3d-eis.webp` (512×512, 28.406 Byte). Bildwerkzeug-Prompt: milchig hellblauer, nahtlos kachelbarer Frost mit hellen Schlieren, ohne Schrift; der mittlere Bildausschnitt wurde gespiegelt gekachelt und als WebP gespeichert.

**Bots vorher (`npm run bots3d`, Exit 0):**
```
passiv: Siege 0/20, Ø Dauer 115.6 s, Ø gefallene Säulen 0.00
nurLinks: Siege 0/20, Ø Dauer 75.0 s, Ø gefallene Säulen 0.00
rhythmus(40): Siege 20/20, Ø Dauer 123.1 s, Ø gefallene Säulen 0.00
rhythmusSaeule(60): Siege 20/20, Ø Dauer 106.3 s, Ø gefallene Säulen 2.00
rhythmusSaeule(15): Siege 0/20, Ø Dauer 118.9 s, Ø gefallene Säulen 2.00
rhythmusSaeule(25): Siege 0/20, Ø Dauer 125.3 s, Ø gefallene Säulen 3.00
```
**Bots nachher (`npm run bots3d`, Exit 0):**
```
passiv: Siege 0/20, Ø Dauer 115.6 s, Ø gefallene Säulen 0.00
nurLinks: Siege 0/20, Ø Dauer 75.0 s, Ø gefallene Säulen 0.00
rhythmus(40): Siege 20/20, Ø Dauer 123.1 s, Ø gefallene Säulen 0.00
rhythmusSaeule(60): Siege 20/20, Ø Dauer 106.3 s, Ø gefallene Säulen 2.00
rhythmusSaeule(15): Siege 0/20, Ø Dauer 118.9 s, Ø gefallene Säulen 2.00
rhythmusSaeule(25): Siege 0/20, Ø Dauer 125.3 s, Ø gefallene Säulen 3.00
```
Alle sechs Zeilen sind zahlengleich.

**Tests und Messzahlen:** `npm run check` Exit 0; `npm test` 68 Dateien/637 Tests grün; `npm run build` Exit 0; Build-Manifest-Test grün; `git diff --check` Exit 0. 3D-Dateien im Build: 5.352.914 Byte = 5,10 MiB (Grenze 25 MiB); Eis-Speicherplan 2,34 MiB (Grenze 3 MiB). Die rechnerische Ziffernhöhe ist bei 390×844 etwa 18,3 px; dafür wurde die Tafel von 0,7 auf 1,0 m erhöht. Rechnerische Überdeckung der nächsten Fahrzeug-Box: 7,53 % (Grenze 20 %); die eigene Humvee-Box wird nach transparentem Tafelrand nicht überdeckt. Erreichte Fahrzeuglängen im Eis: Humvee 2,33 m, Panzer 3,00 m, Haubitze 3,00 m, Hubschrauber 2,91 m. Alle vier Modelle passen mit mindestens 0,1 m Rand in den Block und liegen über 2,1 m Länge.

**Nicht gemessen:** A4-Pixelwerte (Blauanteil, Erkennbarkeit, Dämpfung), Browser-Bildfolge/Thomas' Sichtabnahme, A7-Bildzeiten und Programmzahlen mit/ohne Vorwärmen, Desktop-`?messung=1`-Lauf und iPhone-Leistungswerte. Grund: Die Browseranbindung meldete in dieser Sitzung keinen verfügbaren Browser; der iPhone-Test ist laut Spezifikation Thomas/Claude zugeordnet. Die Werte sind nicht geschätzt. Die Eis-Diagnose speichert sie bei einem Browserlauf unter „Letzte Messung“. Kein Commit und kein Push (Projektregel: Review durch Claude).


## Nacharbeit 1 (Review Claude 2026-10-01 09:20, Browser 390×844)

Tests, Build und Bots grün (Bots zahlengleich, Vorhersage A1 bestätigt). Im Browser
(`?pruefung=1&eis=40`) gefunden:

**N1 Fahrzeuge nach dem Nachrücken um einen Block verschoben (Fehler, A9).** Nach dem ersten
Fall stand vorn der Panzer statt der Haubitze, die Haubitze im hintersten Block. Ursache
`lauf.ts` `ordneMiniaturen`: hängt die Miniatur für Reihenstelle j in `welt.saeulen[j]`
(feste Platznummer) statt in `welt.saeulen[this.blockZuordnung[j]]`. Beheben. **Verhaltenstest**,
der die alte Fassung durchfallen lässt: über den echten Ablauf (Kern-`einheitFrei`, nicht
`saeulenIndex` direkt setzen) 1, 2, 5 und 6 Fälle erzeugen; danach enthält der Block an
Reihenstelle j (Lage z −12 − j·8 nach Ende des Nachrückens) die Miniatur
`fahrzeug-${saeulen[(saeulenIndex + j) % n]}`, und die Zahltafel desselben Blocks zeigt
`saeulenStartP(level, saeulenIndex + j)` bzw. `ceil(P)` für j = 0.

**N2 Kontextverlust wie vorher (nicht beauftragte Änderung zurücknehmen).** `einstieg.ts`
`kontextVerloren` wieder wie vor D5e: `verlasse('Grafik wurde zurückgesetzt')` +
`entferneRenderer()` (sauber ins Menü, Plan Randbedingung 3). Den `webglcontextrestored`-Weg
entfernen; `EisEffekte.kontextWiederhergestellt` darf als ungenutzt entfallen.

**N3 Risse sichtbarer.** Im Bild sind die Risse nur feine Pünktchen. Linienbreite 3,5 px
(Canvas 512), volle Deckkraft, je Stufe 6 Linien mit 7 Abschnitten à bis 90 px; zusätzlich
je Linie ein 1-px-Lichtsaum `#ffffff`. Sonst A5 unverändert (Stufen, Uploads ≤ 7).

**N4 `baueMiniatur` ohne Zauberzahl.** `zielGroesse[0] < 10` als Eis-Erkennung ersetzen durch
einen ausdrücklichen Parameter (z. B. `{ eis: true }`), Verhalten gleich. Bericht: warum der
Humvee nur 2,33 m lang wird (welche Achse begrenzt).

Nur diese vier Punkte. `npm run check`, `npm test`, `npm run build`, `npm run bots3d`
ausführen. Status am Ende `IMPL_DONE`, kurzer Bericht unter diesem Abschnitt.

**Abschluss Nacharbeit 1:** N1 ordnet die Miniatur dem nachgerückten Block zu; ein Verhaltenstest prüft nach echten Kern-Freigaben die Fälle 1, 2, 5 und 6 samt Tafeln. N2 beendet bei Kontextverlust den 3D-Lauf mit „Grafik wurde zurückgesetzt“ und entfernt den Renderer; der Restore-Weg entfällt. N3 zeichnet je Stufe sechs Risse mit sieben Abschnitten (je Achse höchstens 90 px), 3,5 px Breite und 1 px weißem Lichtsaum bei voller Deckkraft. N4 nutzt `{ eis: true }` statt der Größenschwelle. Die Humvee-Länge bleibt 2,33 m: Die Modellhöhe von ca. 3,56 m wird durch die verfügbare Höhe von 1,8 m begrenzt (Skalenfaktor ca. 0,506), vor Breite und Ziellänge.

**Prüfungen:** `npm run check` Exit 0; `npm test` 68 Dateien/639 Tests grün; `npm run build` Exit 0; `npm run bots3d` Exit 0. Alle sechs Bot-Zeilen sind gegenüber der Vorher-Messung oben zahlengleich. `git diff --check` Exit 0. Browser-Sichtprüfung der kräftigeren Risse und ein echter WebGL-Kontextverlust wurden in dieser Nacharbeit nicht durchgeführt; Terminaltests können das Bild bzw. den Geräte-Kontextverlust nicht belegen. Kein Commit/Push gemäß Projektregel.

## Nacharbeit 2 (Thomas 2026-10-01 09:12: "Fahrzeuge im Eis mindestens 2,5-fach so groß")

Bezug (Annahme Claude, Thomas kann widersprechen): 2,5 × die alte Miniatur 1,5 m.
**N5** Ziel-Länge (z-Ausdehnung der Box) **≥ 3,75 m für alle vier Fahrzeuge** (Hubschrauber
ebenfalls 3,75 m statt 3,54). `EIS.LAENGE` 4,6 (Rest von A2 gleich: Breite 2,2, Höhe 2,0,
Innenkante 3,65). Begrenzt Breite oder Höhe ein Fahrzeug darunter: `EIS.HOEHE` bis 3,2 (Humvee ist laut Nacharbeit 1 höhenbegrenzt: braucht ~3,1 m) bzw.
die Breite bis höchstens 2,3 (Innenkante bleibt 3,65 → `SAEULE_X` = 3,65 + Breite/2) anheben,
bis jedes Fahrzeug ≥ 3,75 m erreicht; schafft es eins trotzdem nicht: melden mit Maß und
begrenzender Achse. Tests von A2/A3 mitziehen, A8-Tafel-Projektion neu prüfen (Ziffer ≥ 18 px,
eigenes Fahrzeug nicht verdeckt). Bericht: erreichte Längen je Fahrzeug, endgültige Blockmaße.

**Abschluss Nacharbeit 2:** Der Eisblock misst endgültig 2,3 × 4,6 × 3,2 m (Breite × Länge × Höhe); seine Innenkante bleibt bei 3,65 m. Die erreichten Fahrzeuglängen sind Humvee 3,75 m, Panzer 3,75 m, Haubitze 3,75 m und Hubschrauber ca. 3,06 m. Beim Hubschrauber begrenzt der Hauptrotor die x-Breite; selbst die erlaubte Höchstbreite von 2,3 m lässt keine Länge von 3,75 m zu. Alle Modelle haben mindestens 0,1 m Rand zum Eis.

**Prüfungen:** `npm run check` Exit 0; `npm test` 638/639 Tests grün, 1 Fehler; `npm run build` Exit 0; `npm run bots3d` Exit 0 mit sechs unveränderten Bot-Zeilen; `git diff --check` Exit 0. Die A8-Projektion hält die Ziffernhöhe von mindestens 18 px und die Überdeckung des Folgefahrzeugs liegt rechnerisch bei ca. 10,0 % (Grenze 20 %). Die Tafel überdeckt jedoch rechnerisch ca. 1,0 % der eigenen Humvee-Box statt 0 %; genau daran scheitert der eine Test. N5s Ziel von 3,75 m für den Hubschrauber und A8s Nullüberdeckung sind damit nicht erfüllt. Ein Browserbild und eine iPhone-Sichtprüfung wurden nicht durchgeführt; sie lassen sich durch die Terminalprüfungen nicht belegen. Der geforderte Terminal-Fensterstart war nicht möglich, weil `open -a Terminal` keine Terminal-App fand; die vier Befehle liefen stattdessen im Terminal-PTY. Kein Commit/Push gemäß Projektregel.


## Nacharbeit 3 (Claude 09:22)
**N6** Die Tafel überdeckt rechnerisch 1 % der eigenen Humvee-Box (einziger roter Test). Tafel-
Unterkante von 0,2 auf 0,35 m über der Blockoberkante anheben (oder so weit, bis die
Überdeckung 0 ist, höchstens 0,6 m). Test-Grenze bleibt 0 %. Folgefahrzeug-Überdeckung und
Ziffernhöhe ≥ 18 px weiter einhalten, Werte berichten. Hubschrauber 3,06 m wird so angenommen.

**Abschluss Nacharbeit 3:** Die Unterkante der Zahltafel liegt 0,35 m über dem Eisblock. Bei 390×844 beträgt die rechnerische Überdeckung der eigenen Humvee-Box 0 %, die des Folgefahrzeugs 10,00 % (Grenze 20 %); die Ziffernhöhe beträgt 18,68 px (Grenze 18 px). Der Test prüft auch die tatsächliche Tafelposition. `npm run check` Exit 0; `npm test` 68 Dateien/639 Tests grün. Der Terminal-App-Start war nicht möglich (`Unable to find application named 'Terminal'`); die Prüfungen liefen im Terminal-PTY. Kein Commit/Push gemäß Projektregel.


## Nacharbeit 4 (Review Claude 09:35, Browser 390×844, `?pruefung=1&eis=30`)
Fahrzeugzuordnung nach dem Nachrücken jetzt richtig, Risse gut sichtbar, Zahlen je Runde
richtig (30 → 45 → 68). Zerspringen ist aber nicht erkennbar:
**N7 Blitz ist ein hartes weißes Quadrat** (≈ 60×60 px, 3 Bilder). Ursache: `SpriteMaterial`
ohne Bild → volles Quadrat. Stattdessen weicher runder Lichtschein: einmal angelegte
Canvas-Textur 64×64 mit radialem Verlauf (Mitte weiß, Rand transparent), additiv, Ø 3 m,
Helligkeit 1 → 0 über 0,15 s (Kurzlebig-Regel bleibt: ≥ 3 Bilder).
**N8 Splitter unsichtbar** (im Bild nur einzelne Pünktchen). Splitter größer (Kantenlänge
0,35–0,6 m, nicht flachgedrückt — Faktor y ≥ 0,6), eigenes, einmal angelegtes Material: hell
eisblau `#dff4ff`, `opacity` 0,9, `MeshStandardMaterial` mit `emissive` leicht (`#9fd6ef`,
Stärke 0,4), damit sie vor Wasser und Straße sichtbar sind; zufällige Drehung je Splitter,
die sich beim Flug weiterdreht. 32 Splitter, Flug wie bisher. In A7 mit vorwärmen.
Test: Splittermaterial ≠ Eismaterial, Mindestgröße, Drehung ändert sich über die Zeit.
Nur N7/N8. `npm run check`, `npm test` ausführen, Status `IMPL_DONE`, kurzer Bericht.

**Abschluss Nacharbeit 4:** N7 nutzt eine einmal erzeugte 64×64-Canvas-Textur mit radialem Verlauf für einen weichen, additiven Lichtschein von 3 m Durchmesser; er blendet über 0,15 s aus und bleibt mindestens drei gerenderte Bilder erhalten. N8 nutzt 32 Eisstücke mit 0,35–0,6 m Kantenlänge, ohne Abflachung, eigenem hellblauen Material und zufälliger Anfangsdrehung sowie fortlaufender Drehung. Das neue Splittermaterial wird vom vorhandenen Vorwärmweg erfasst. Tests prüfen Material, Größe, Drehung und Blitz. `npm run check` Exit 0; `npm test` 68 Dateien/640 Tests grün. Eine neue Browser-Sichtprüfung wurde nicht durchgeführt. Kein Commit/Push gemäß Projektregel.


## Nacharbeit 5 — Eis in Fahrzeugform statt Block (Thomas 2026-10-01 10:17)

Thomas nach Blick im Browser: "Die Eisblöcke sollen keine Blöcke sein, sondern die Form des
Fahrzeugs haben, als wäre das Fahrzeug einfach eingefroren — und die Fahrzeuge noch größer,
dass man sie erkennt — aber die Größen der Fahrzeuge im Spiel beibehalten."
Ersetzt A2 (Blockmaße) und die Block-Teile von A4/A5/A9; alles andere (Kern, Zahlen, Risse-
Stufen, Zerspringen, Wiederholung, Vorwärmen, Zurücksetzen, Prüfschalter) bleibt.

**N9 Eishülle statt Quader.** Je Miniatur (eine je Fahrzeugart, wie heute) eine **Eishülle**:
Für jedes Mesh des Fahrzeugs eine Kopie der Geometrie, deren Punkte entlang **geglätteter**
Normalen nach außen geschoben werden (vorher `mergeVertices` nur nach Position, dann
`computeVertexNormals`, damit die Hülle an Kanten nicht aufreißt), Dicke `EIS.HUELLE` = 0,12 m
(Weltmaß nach Skalierung). Hülle im Basis- bzw. Treffer-Eismaterial (A4: milchig-blau,
`v3d-eis.webp`, transparent, `depthWrite: false`, `FrontSide`), `opacity` so, dass das
Fahrzeug darin klar erkennbar und bläulich gedämpft ist (Start 0,45). Hülle einmal je
Fahrzeugart gebaut (beim Welt-Aufbau), nie je Fall. `EIS.BREITE/LAENGE/HOEHE`, Block-Geometrie
und `saeulenBloecke` als Quader entfallen (Feld darf bleiben, zeigt dann auf die Hüllen-Gruppe).
**Fahrzeug steht auf dem Boden** (Räder/Ketten auf y = Hülldicke), Hubschrauber schwebt nicht,
sondern steht ebenfalls.

**N10 Größer, Feld unverändert.** Ziel-Länge (z-Ausdehnung inkl. Hülle) **5,0 m** für alle
vier. Erlaubter Bereich der Hülle in x: **3,6 bis 6,0** (Innenkante ≥ 3,6, nicht über den
Bahnrand); `SAEULE_X` = Mitte dieses Bereichs, Fahrzeug mittig darin. Begrenzt die Breite
(Hubschrauber-Rotor im Winkel kleinster Breite), so weit verkleinern, bis es passt; erreichte
Länge berichten (kein Melden nötig, solange ≥ 3,0 m). Abstand der Plätze bleibt 8 m.
**Feldfahrzeuge (`baueFeldFahrzeug`, Einsatz) bleiben exakt so groß wie heute**: Test, der die
Box-Maße aller vier Feldfahrzeuge vor/nach vergleicht (Werte aus `FAHRZEUGE.LAENGE ×
SPIEL_SKALA`).

**N11 Risse auf der Hülle.** Die Riss-Auflage ist jetzt eine zweite Kopie der Hüllen-Geometrie
des aktiven Fahrzeugs (0,01 m weiter außen, `renderOrder` 3, `polygonOffset`) mit dem
Riss-Material. UVs dafür **nicht** die Fahrzeug-UVs, sondern aus der Position projiziert
(z. B. u = (x + z)/L, v = y/H in Hüllkoordinaten), damit die Risslinien gleichmäßig über die
Hülle laufen. Stufen, Upload-Grenze, Canvas wie A5/N3. Beim Platzwechsel hängt die Auflage an
die Hülle des neuen aktiven Fahrzeugs (je Fahrzeugart eine vorgebaute Auflage-Geometrie oder
Umhängen — keine Neuanlage je Fall).

**N12 Nachrücken/Erscheinen.** Der neu hinten erscheinende Platz wächst als Ganzes (Fahrzeug +
Hülle gleichmäßig, `scale` 0,3 → 1 in 0,6 s), Tafel erst danach sichtbar. Zerspringen: Splitter
und Lichtschein aus der Mitte der Hülle; Hülle und Fahrzeug verschwinden im Fallbild wie bisher.

**N13 Tafel.** Unterkante 0,35 m über der höchsten Stelle der Hülle des jeweiligen Platzes;
A8-Projektionstest neu (eigenes Fahrzeug 0 %, Folgefahrzeug ≤ 20 %, Ziffer ≥ 18 px). Ist das
mit 5 m nicht erreichbar: melden mit Werten.

**Tests umschreiben, nicht löschen** (Blockmaße → Hüllen-Bereich x 3,6–6,0, Länge, Fahrzeug
steht auf dem Boden, Hülle umschließt das Fahrzeug: jede Ecke der Fahrzeug-Box liegt innerhalb
der Hüllen-Box; Speicherplan: Hüllen-Geometrien als Posten, neue Posten weiter ≤ 3 MB).
`npm run check`, `npm test`, `npm run build`, `npm run bots3d` (zahlengleich). Status
`IMPL_DONE`, Bericht: erreichte Längen je Fahrzeug, Hüllen-Dreiecke gesamt, Testergebnisse.

**Abschluss Nacharbeit 5:** Die Quader wurden durch einmal je Fahrzeug gebaute, an geglätteten
Normalen aufgeweitete Hüllen ersetzt. Risse folgen den Hüllen mit gemeinsamer
Positionsprojektion; beim Nachrücken wachsen Fahrzeug und Hülle zusammen. Alle vier Modelle
stehen auf dem Boden; die Feldfahrzeuge behalten ihre Box-Maße. Erreichte Hüllenlängen:
Humvee **5,00 m**, Panzer **5,00 m**, Haubitze **4,36 m**, Hubschrauber **3,39 m**. Insgesamt
**9.709 Hüllen-Dreiecke**; Hüllen-Geometrien im konservativen Speicherplan 574.968 Byte,
neue Eisposten zusammen **2,89 MiB** (Grenze 3 MiB).

**Prüfungen:** `npm run check` Exit 0; `npm test` 638/639 grün (68 Dateien, 1 Fehler);
`npm run build` Exit 0; `npm run bots3d` Exit 0, alle sechs Bot-Zeilen zahlengleich mit dem
vorher dokumentierten Stand; `git diff --check` Exit 0. Der rote Test betrifft N13: Bei
390×844 überdeckt die projizierte Tafel **2,25 %** der eigenen Humvee-Box statt 0 %.
Die Folgefahrzeug-Überdeckung liegt bei **13,10 %** (Grenze 20 %), die Ziffernhöhe bei
**18,85 px** (Grenze 18 px). Die vorgegebene Unterkante 0,35 m über der Hülle und die
Humvee-Länge 5,0 m wurden beibehalten; N13s Nullüberdeckung ist damit offen.
Eine Browser-Sichtprüfung war nicht möglich, weil die automatische Freigabe den Zugriff
auf Google Chrome abgelehnt hat; ein iPhone-Lauf wurde hier nicht durchgeführt.
`open -a Terminal` fand keine Terminal-App, daher liefen die Prüfungen im Terminal-PTY.
Kein Commit/Push gemäß Projektregel.


## Nacharbeit 6 — richtige Größenverhältnisse (Thomas 2026-10-01 10:50)

Thomas: "Die Größenverhältnisse der Fahrzeuge stimmen nicht — sie müssen im Verhältnis zu den
anderen Fahrzeugen richtig dargestellt sein, sie dürfen auch größer sein und über die Fahrbahn
ragen." Ersetzt N10 (feste 5 m je Fahrzeug).

**N14 Ein Maßstab für alle.** Neue Konstante `EIS.MASSSTAB = 0.8`. Länge jeder Eis-Miniatur
(z-Ausdehnung des Fahrzeugs ohne Hülle) = `FAHRZEUGE[name].LAENGE × EIS.MASSSTAB` →
Humvee 3,68 m, Panzer 7,84 m, Haubitze 5,84 m, Hubschrauber 14,16 m. **Keine** Verkleinerung
einzelner Fahrzeuge wegen Breite/Höhe mehr (Verhältnis ist Pflicht). Test: Länge/Länge zweier
beliebiger Miniaturen = Verhältnis ihrer `LAENGE` (±1 %).
**N15 Lage.** Innenkante der Hülle (kleinstes x) ≥ 3,6 (nicht ins Kampffeld); nach außen darf
sie über Bahnrand und Wasser ragen (keine Obergrenze). Hubschrauber-Rotor weiter im Winkel
kleinster Breite, Rotor steht über dem Wasser. Fahrzeug steht auf dem Boden (Hubschrauber auf
seinen Rädern/Kufen).
**N16 Abstände nach Länge.** Plätze nicht mehr im festen 8-m-Raster: vorderster Platz j = 0 mit
Hüllenvorderkante bei z = −9; jeder weitere hinter dem vorigen mit 1,5 m Lücke zwischen den
Hüllen (aus den Hüllenlängen der aktuellen Reihenfolge berechnet). Beim Nachrücken (0,6 s) zu den
neuen Zielen gleiten; der hinten neu erscheinende Platz bekommt sein Ziel aus derselben Rechnung.
Eine Funktion für die Ziel-z je Reihenstelle (Test: Lücken 1,5 m ± 0,01 bei jeder der vier
Reihenfolgen).
**N17 Feld unverändert** (Test aus N10 bleibt). Tafel: über der höchsten Stelle der Hülle wie
N13; Projektionstest: Ziffer ≥ 18 px am vordersten Platz, eigenes Fahrzeug ≤ 5 %,
Folgefahrzeug ≤ 20 % — Werte berichten, bei Verfehlung melden statt Maßstab ändern.
`npm run check`, `npm test`, `npm run build`, `npm run bots3d`. Status `IMPL_DONE`, Bericht:
Längen, Ziel-z je Reihenfolge, Hüllen-Dreiecke, Testergebnisse.

**Abschluss Nacharbeit 6 (Claude 11:40):** Codex-Lauf hing nach der Umsetzung ~23 min ohne
Datei- oder Prozessaktivität und wurde beendet; der hinterlassene Stand war vollständig grün
(639 Tests, Build, Bots zahlengleich). N14–N16 umgesetzt (`EIS.MASSSTAB` 0,8,
`saeulenZiele`), den fehlenden Lücken-Test (N16) hat Claude ergänzt
(`tests/v3dSaeulenZiele.test.ts`), 640 Tests grün. Browserbild: Verhältnisse stimmen,
Hubschrauber ragt über das Wasser.
