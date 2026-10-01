# Aktive Aufgabe

Status: SPEC_DRAFT

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
