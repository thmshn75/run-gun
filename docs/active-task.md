# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D3 — Steuerung, Aussenden, linker Rand (Run Gun 3D)

Verbindlicher Plan: `docs/plan-v7.md`, "Spielrechnung", "Schrittfolge → D3" (inkl.
+1-Schilder-Absatz) und Randbedingungen 3, 6, 7, 10. Ab hier wird es ein **Spiel**: Der
Rechenkern `src/v3d/rechnung.ts` (R1, unverändert) läuft im Bildtakt, die Grafik stellt
ihn nur dar. Neu: Finger-Steuerung der Truppe, Aussenden von Trupps, Verdopplung an der
×2-Wand, +1-Sammeln am linken Rand, Soldaten zur Säule, Horde als Block an der
Frontlage, Zahlen-Anzeigen, einfacher Laufschluss. **Kein Kampf-Bild** (Schießen,
Umfallen, Mündungsfeuer, marschierende Bosse: D4), keine Spezialeinheiten (R2/D5).

## Erlaubte Änderungen (abschließend)

- Neu: `src/v3d/lauf.ts` (Spielschleife: Rechenkern ↔ Darstellung), `src/v3d/steuerung.ts`
  (Finger → Truppenlage), `src/v3d/anzeigen.ts` (Zahlen als Sprites/Canvas),
  Tests `tests/v3dLauf.test.ts`, `tests/v3dSteuerung.test.ts`.
- Geändert: `src/v3d/szene.ts` (statische Platzhalter-Aufstellungen → vom Lauf gesteuert;
  Nahaufnahmen bleiben), `src/v3d/einstieg.ts` (Lauf starten/pausieren/beenden, Eingabe),
  `src/v3d/oberflaeche.ts` (MESSEN in die INFO-Tafel verlegen, Laufende-Anzeige),
  `src/v3d/messung.ts` (nur: Messung pausiert den Lauf und stellt ihn danach wieder her
  bzw. läuft auf der statischen Vollast wie bisher), `src/v3d/figuren.ts`,
  `src/v3d/soldaten.ts`, `src/v3d/schilder.ts`, `src/v3d/bosse.ts` (nur Erweiterungen für
  bewegliche Aufstellungen/Zahlen, Lochposition als Parameter), `src/v3d/balance3d.ts`
  (Block `DARSTELLUNG`), `src/v3d/info.ts` (Knopf "Leistung messen", Pause beim Öffnen).
- **Ausnahme außerhalb `src/v3d/` (Härtung H9):** `src/main.ts` — nur die Prüfung eines
  globalen Flags vor dem Neuladen nach Service-Worker-Update; Regressionsnachweis:
  bestehende Tests grün, Hauptbündel nicht gewachsen (±200 Byte erlaubt).
- **Nicht ändern:** `src/v3d/rechnung.ts`, `LEVELS` in `balance3d.ts`, Tests von R1.

## Grundsatz: Rechenkern führt, Grafik folgt

- Je Bild: `schritt(zustand, { x }, dt)` mit `dt` in Sekunden (gedeckelt 0,1 s, pausierbar
  wie die Animationszeit), danach Darstellung aus dem Zustand und den Ereignissen.
  **Keine** eigene Spiellogik in der Grafik (keine eigenen Zähler, die vom Kern abweichen).
- Koordinaten wie D1: Kern-Position `pos` → `z = −pos`, Frontlage `y` → `z = −y`.
- Zufall: fester Seed je Lauf (`Date.now()` ist erlaubt als Seed, im Zustand gespeichert).

## Akzeptanzkriterien

### A1 Steuerung (`steuerung.ts`, Plan D3)

- **Absolut zum Finger:** Solange ein Finger auf der Steuerfläche liegt, ist die Zielposition
  der Truppe die Finger-x-Position, in Weltkoordinaten auf Höhe der Aussendelinie `z = 0`
  (Strahl aus der Kamera auf die Ebene `y = 0` schneiden). Ohne Finger bleibt die Truppe,
  wo sie ist.
- **Geglättet**, höchstens **8 m/s** seitlich (Konstante). Grenzen: Truppenmitte
  `xWelt ∈ [−3, +3]` (Formation 6 m breit bleibt auf der 12-m-Straße).
- Eingabe an den Kern: `x = xWelt / 3` (→ `[−1, +1]`); damit sammelt die Truppe ab
  `xWelt < −1.8` (Kern-Schwelle −0,6) und schickt ab `xWelt > +1.8` zur Säule.
- **Steuerfläche** = ganzer Bildschirm **außer** den Knopf-Tippflächen (ZURÜCK, INFO; je
  eigene Fläche ≥ 44 × 44 pt, Plan D3). `touch-action: none` auf der Zeichenfläche, keine
  Seiten-Scrolls, Mehrfinger: der erste Finger zählt. Pointer Events (kein Phaser-Input;
  Phaser ist im Schlaf).
- Werte für Safe-Area/Touch aus dem bestehenden Code übernehmen (Randbedingung 6), nicht
  neu erfinden; im Bericht nennen, woher.

### A2 Truppe und Aussenden

- **Truppe an der Linie:** `T` (Kern) wird als Formation `stehen` gezeigt, 10 je Reihe,
  höchstens **30 Figuren** (Konstante); Mitte = Truppenlage, Blick −z. Zahl `T` (ganzzahlig
  abgerundet) als Anzeige über der Truppe.
- **Trupps:** Jedes Kern-Ereignis `ausgesandt` erzeugt einen sichtbaren Trupp an `z = 0`,
  x = Truppenlage beim Aussenden; der Trupp folgt `trupp.pos` aus dem Kern (Bewegung
  `laufen`), zeigt `min(anzahl, 10)` Figuren in einem kleinen Block. Nach `vervielfacht`
  zeigt er entsprechend mehr (bis 10) und kurz eine "×2"-Aufblende (optional, billig).
- **Wege:** Trupp mit Ziel `front` läuft nach der Wand in die Mitte (x → 0 geglättet,
  bleibt in `[−2.8, 2.8]`); Ziel `saeule` läuft nach der Wand in den rechten Streifen
  (x → `SAEULE_X`) und verschwindet bei `angekommenSaeule` an der Säule.
- **Front:** `F` (Kern) wird als Gruppe `stehen` an `z = −y + 1,5` gezeigt, `min(F, 40)`
  Figuren (≙ Kontaktbreite K), 10 je Reihe, Blick −z; Zahl `F` darüber. (Schießen: D4.)
- **Sichtgrenze Soldaten gesamt 120:** Formation ≤ 30, Trupps zusammen ≤ 50 (älteste
  zuerst weglassen), Front ≤ 40. Bewegungen je Gruppe über die vorhandene
  `SoldatenMasse` (Instanzen neu setzen nur bei Änderung, sonst Formen weiterschalten).

### A3 ×2-Wand, +1-Schilder, Säule

- **×2-Wand** zeigt `×k` aus dem Level (Level 1: 2); Text wird nur bei Änderung neu gemalt.
- **+1-Schilder** (Plan D3-Absatz): laufen im linken Streifen der Truppe **entgegen**
  (+z), Grundtempo **2 m/s**, solange die Truppe nicht sammelt; sobald der Kern
  `eingesammelt` meldet, Tempo **8 m/s** (2/s × 4 m Abstand). Ein Schild, das `z = 0`
  erreicht, verschwindet mit kurzem Aufleuchten und taucht hinten wieder auf (Ring aus
  Schildern, keine neuen Objekte). Das Sammeln selbst zählt **nur** der Kern (`T` steigt
  kontinuierlich); die Schilder sind Darstellung — Gleichlauf ±1 über 10 s ist ausreichend.
- **Säule:** Zahl zeigt `ceil(P)`; bei `einheitFrei` blinkt die Säule kurz, der
  Platzhalter-Kasten innen verschwindet, und für die nächste Säule (neuer Wert 150)
  erscheint ein neuer Kasten. Nach der letzten Säule: Säule ausblenden.

### A4 Horde (nur Lage, noch kein Kampf)

- Der Zombie-Block steht mit seiner **Vorderkante an `z = −y`** und zeigt
  `min(ceil(Z), 600)` Zombies (Aufstellung nach hinten wie bisher); Neuaufstellung nur,
  wenn sich die gezeigte Zahl um ≥ 10 ändert oder die Lage um ≥ 0,1 m (Instanzen nur
  verschieben, nicht neu erzeugen). Zombies laufen auf der Stelle.
- Mini-Boss sichtbar, solange `miniBoss.imFeld && B > 0`, in der Vorderreihe (x = 0,
  `z = −y − 1`); Elite-Boss sichtbar ab `eliteBoss.imFeld`, hinter der Masse (`z = −y − 12`
  bzw. bei `Z = 0` an der Front). Bosse laufen auf der Stelle (Angriff/Tod: D4/D6).

### A5 Laufbeginn und -ende, Oberfläche

- Lauf startet beim Betreten von RUN GUN 3D nach dem Laden automatisch mit Level
  `ladeFortschritt().hoechstesLevel` (nur Level 1 existiert; sonst 1).
- Bei `sieg`/`niederlage`: Kern stoppt (tut er selbst), Tafel mittig "SIEG"/"NIEDERLAGE",
  Dauer, und Knöpfe "NOCHMAL" (neuer Lauf, gleicher Level, neuer Seed) und "ZURÜCK".
  Level-Speicher nur bei Sieg (höchstes Level + 1, gedeckelt auf `LEVELS.length`).
- **MESSEN** wandert in die INFO-Tafel (Knopf "Leistung messen"); die Messung pausiert den
  Lauf, blendet die Lauf-Figuren aus, nutzt ihre statische Vollast wie bisher und stellt
  danach den Lauf wieder her.
- Pause bei `visibilitychange`/Kontextverlust wie bisher: auch der Kern steht still.
- Oben: Level, Zeit, `T` und `F` als kleine Zahlen (DOM, keine neuen Bilder).

### A6 Tests und Nachweise

- `tests/v3dSteuerung.test.ts` (reine Funktionen): Finger→Weltlage über die Kamera
  (Bildmitte → x ≈ 0; linker Rand → Grenze −3), Glättung hält 8 m/s ein, Kern-`x` ist
  `xWelt/3` und in `[−1, 1]`.
- `tests/v3dLauf.test.ts` (ohne Grafik, `lauf.ts` mit abstrahierter Darstellung):
  - **10 s Aussenden** in der Mitte: Summe `ausgesandt` = Formel `∫(2 + 0,1·T)dt` ±10 %
    (Plan D3), sichtbare Trupps entsprechen den Ereignissen.
  - **Linker Rand:** 10 s bei `xWelt = −3` → `T` steigt um 20 ±1; Mitte → `T` unverändert.
  - Rechter Rand: Trupps gehen zur Säule, `P` sinkt; `einheitFrei` löst Säulenwechsel aus.
  - Sichtgrenzen (30/50/40, 600 Zombies) nie überschritten; Pause hält den Kern an.
- Zweitstart: `renderer.info.memory` gleich (Claude prüft mit WebGL-Zählern), auch nach
  "NOCHMAL".
- `npm test`, `tsc`, `build` grün; Hauptbündel unverändert; kein `http` in `src/v3d/`.
- iPhone (Thomas): Steuerung fühlt sich direkt an; Messung aus der INFO-Tafel im Budget.

## Härtung (Claude, 2026-09-29) — gilt vorrangig vor A1–A6

**H1 Zeitschritt:** `schritt` nur mit `0 < dt ≤ 0,1` aufrufen (Kern wirft sonst
`RangeError`, `rechnung.ts:52`). Bei `dt ≤ 0`, `NaN` (erstes Bild, nach Pause, doppelter
Zeitstempel) den Kernschritt überspringen; `dt > 0,1` deckeln. Test mit `0`, `NaN`, `5`.

**H2 Finger (iOS):** Pointer Events mit `setPointerCapture`; der Finger wird verworfen bei
`pointerup`, `pointercancel`, `lostpointercapture`, `blur`, `visibilitychange`, Öffnen der
INFO- oder Ende-Tafel. Ohne Finger bleibt die letzte Lage. Finger-NDC aus
`canvas.getBoundingClientRect()` (nicht `innerWidth/Height`). Abbildung: Bildschirm-x →
Punkt `(x, 0, 0)` auf der Aussendelinie. **Randreserve:** ±3 wird schon **24 pt vor dem
Bildschirmrand** erreicht (iOS-Randgeste), dort geklemmt. Safe-Area-Werte als Zahlen in
`balance3d.ts` (Randbedingung 6), Quelle im Bericht. Tests: Bildmitte → 0 mit zwei
verschiedenen Rechtecken; x = 24 pt → −3.

**H3 Trupps stabil:** Sichtobjekte per Objekt-Referenz auf die Kern-Trupps
(`Map<Trupp, Sicht>`; der Kern mutiert die Objekte nur). Jedes Sichtobjekt hat eine feste
Phase; `SoldatEintrag` bekommt optional `phase`, `SoldatenMasse.setze` nutzt sie statt des
Listenindex (sonst springen Beinposen). `x` des Trupps merkt sich die Darstellung beim
Entstehen. Ereignisse nur für Effekte (×2, Aufleuchten).

**H4 Front- und Trupp-Lage:** Front-Trupp gezeichnet bei `z = −min(pos, y − 1,5)`, blendet
dort in die Front-Gruppe über. Die Front-Gruppe beginnt an `z = −y + 1,5` und wächst nach
**+z** (zur Kamera). Steht die Front vor der Wand (`y < 5`): Gruppe auf `z ≤ −1` klemmen,
Trupps laufen nicht durch die Wand. Niederlage (`y ≤ 0`): Horde nicht weiter zeichnen.

**H5 Horde billig bewegen:** Horde **einmal** aufstellen und nur über
`gruppe.position.z = −y` verschieben. Neu `setze` nur bei Änderung der gezeigten Zahl,
höchstens alle 0,25 s; Zombies fallen **von vorn** (reihenweise) weg. Mini-Boss in einem
Loch der Vorderreihe (`bossFreieAufstellung` mit Lochposition als Parameter), Elite-Boss
hinter der gezeigten Masse (`z = −y − Tiefe − 2`), bei `Z = 0` an der Front.

**H6 Anzeigen sparsam:** eine Canvas-Textur je Anzeige, wiederverwendet; neu malen nur bei
geänderter ganzer Zahl und höchstens 4× pro Sekunde; Freigabe in `gibSzeneFrei`
(Zweitstart- und NOCHMAL-Zähler gleich).

**H7 Messung:** Die Welt führt `welt.laufGruppen: THREE.Object3D[]`; `starteMessung`
blendet alle aus und stellt sie danach mit den vorherigen Sichtbarkeiten wieder her;
während `messungLaeuft()` schreibt `lauf.ts` weder `visible` noch Instanzen und der Kern
pausiert. **Neue Messstufe "Lauf (Bot)" 60 s** am Ende der Stufenliste: echter Kernlauf
mit dem Strategie-Bot aus R1, Sichtgrenzen voll ausgeschöpft (600 Zombies, 30 Formation,
50 Trupps, 40 Front, beide Bosse), gleiche Budgetgrenze — ohne sie ist D3 am iPhone nicht
abnehmbar. Der Knopf "Leistung messen" schließt die INFO-Tafel vor dem Start; das
Ergebnis-Panel hat während der Messung `pointer-events: none` außer auf Knöpfen.

**H8 Tafeln:** INFO offen = Lauf pausiert (Kern + Animationszeit), Finger verworfen,
beim Schließen erstes Bild mit `dt = 0` (→ H1). Ende-Tafel: Knöpfe erst **700 ms** nach
Erscheinen aktiv; ZURÜCK/INFO ignorieren Tipps, solange ein Steuer-Finger aktiv ist.
NOCHMAL gibt den Lauf frei (`gibLaufFrei()`) und startet neu, gleicher Renderer.

**H9 Service-Worker-Neuladen:** `src/main.ts` lädt bei `pendingReload` bzw.
`controllerchange` neu (beim Sichtbarwerden). Solange der 3D-Modus aktiv ist
(`window.__rg3dAktiv === true`, gesetzt/gelöscht in `einstieg.ts`), wird das Neuladen
**aufgeschoben** und nach dem Verlassen nachgeholt. Kein Import von `src/v3d/` in
`main.ts` (Isolation, Hauptbündel).

**H10 Umfang verkleinert:** Level-Speichern bei Sieg entfällt in D3 (D6/D7). Säule nur:
Zahl `ceil(P)`, bei `einheitFrei` Innenkasten weg und neuer Kasten für die nächste Säule,
nach der letzten Säule ausblenden — **kein** Blinken. +1-Schilder: Aufleuchten nur,
solange der Kern `eingesammelt` meldet; Tempo wechselt in 0,25 s linear zwischen 2 und
8 m/s.

## Nicht in diesem Schritt

Kampf-Darstellung (Schießen, Treffer, Umfallen, Mündungsfeuer), Vorrücken der Bosse mit
Angriff, Spezialeinheiten, Vervielfacher-Wachstum (R2), mehrere Level, Klang.

## Fortsetzung (Claude 2026-09-29 20:48)

Der erste Lauf brach nach ~6 min am Codex-Kontingent ab. Im Arbeitsverzeichnis liegt ein
**unfertiger Zwischenstand** (u. a. `lauf.ts`, `steuerung.ts`, `anzeigen.ts`, Tests,
Änderungen an `main.ts`, `einstieg.ts`, `szene.ts`, `messung.ts`). Zuerst `git diff` und
neue Dateien lesen, den Stand gegen die Spec (H1–H10, A1–A6) prüfen, dann **fertigstellen**
— nicht verwerfen, nicht doppelt anlegen. Volle Suite, `tsc`, Build.

## Implementation Summary

- D3-Lauf mit Kernschritten, Fingersteuerung, Formations-, Trupp-, Front- und Hordenansicht, Zahlen, +1-Schilderring, Säule und Ende-Tafel umgesetzt. H1–H10 einschließlich Pausen, Messung mit 60-s-Strategie-Bot und aufgeschobenem Service-Worker-Neuladen berücksichtigt; `rechnung.ts` und `LEVELS` unverändert.
- Nachweise: `npm test` 62 Dateien/530 Tests grün; `npm run check` und `npm run build` grün; `git diff --check` sauber; kein `http` in `src/v3d/`. Hauptbündel 1.467.937 → 1.468.039 Byte (+102, Grenze ±200).
- Offen für Abnahme: Browser/WebGL-Zähler beim Zweitstart und nach NOCHMAL sowie iPhone-Steuergefühl und 60-s-Bot-Messbudget. Die verfügbare Browseroberfläche verweigerte den Zugriff; ein iPhone ist in dieser Session nicht erreichbar. Kein Commit/Push (Projektregel).

## Nacharbeit 1 (Thomas 2026-09-29) — Trupps in der Breite, sichtbare Verdopplung

Befund (Browser): Weil der Kern fast jedes Bild einen kleinen Trupp (1–3 Soldaten)
aussendet, laufen die Soldaten als **lange Einerkolonne** hintereinander. Thomas: Sie sollen
**der Breite nach** auf die Horde zulaufen und sich an der ×2-Wand **sichtbar vermehren**.
- **Bänder statt Einzeltrupps:** Laufende Soldaten werden nach ihrer Kern-Position `pos` in
  Bänder von **1,2 m** Tiefe gruppiert; alle Soldaten eines Bandes stehen **nebeneinander in
  einer Reihe** (Abstand 0,6 m, zentriert), höchstens **10 je Reihe**, darüber eine zweite
  Reihe im selben Band. Reihenmitte: vor der Wand die Truppenlage beim Aussenden (geglättet),
  nach der Wand die Mitte (`front`) bzw. `SAEULE_X` (`saeule`).
- **Verdopplung sichtbar:** Beim Durchlaufen der Wand (`vervielfacht`) wird die Reihe eines
  Bandes auf die k-fache Figurenzahl gebracht; die neuen Figuren **fächern in 0,3 s aus der
  Mitte seitlich auf** (gleiche Reihe, dann breiter), kurzes "×2" über dem Band (vorhanden).
- **Gewicht je Figur:** Sichtgrenze Trupps bleibt **50 Figuren**. Reicht sie nicht, steht eine
  Figur für mehrere Soldaten (ganzzahliger Faktor, für alle Bänder gleich, nur nach oben
  angepasst, höchstens alle 2 s geändert) — die Verdopplung bleibt dabei sichtbar (Reihe
  wird breiter). Die gezeigten Zahlen (`T`, `F`, `P`) bleiben die Kernwerte.
- Phasen stabil (H3 gilt weiter: feste Phase je Figur, kein Beinposen-Springen).
- **Offline-Hinweis:** "Offline-Speicher nicht dauerhaft zugesagt" nach **4 s** ausblenden
  (verdeckt sonst die Statuszeile).
- Tests: Bänder-Abbildung als reine Funktion (Soldaten eines Bandes nebeneinander, ≤ 10 je
  Reihe, nach `vervielfacht` k-fache Breite bis zur Grenze, Summe ≤ 50). Status am Ende
  `IMPL_DONE`, Nachtrag.

## Nachtrag zur Nacharbeit 1 (Codex 2026-09-29)

- Laufende Soldaten werden in 1,2-m-Bändern mit 0,6 m Querabstand und maximal zwei Reihen
  dargestellt. Ein gemeinsamer, nur steigender Gewichtungsfaktor begrenzt sie auf 50 Figuren;
  neue Figuren fächern nach der Wand in 0,3 s auf. Die ×2-Aufblende nutzt wiederverwendete
  Sprites. Feste Phasen je dargestellter Figur; Anzeigen werden bei NOCHMAL freigegeben.
- Der Hinweis zum Offline-Speicher verschwindet nach 4 s. Reiner Bändertest ergänzt.
- `npm test`: 62 Dateien, 532 Tests grün; `npm run check`, `npm run build` und
  `git diff --check` grün. Hauptbündel 1.468.039 Byte, gegenüber D3 unverändert.
- Browser/WebGL-Zähler und iPhone-Steuergefühl samt 60-s-Bot-Budget bleiben als
  Geräteabnahme offen: Der Browserzugriff wurde in dieser Session verweigert; ein iPhone
  war nicht erreichbar. Terminal.app war für den Teststart nicht auffindbar, daher liefen
  die Tests in einer direkten Terminal-PTY. Kein Commit/Push (Projektregel).

## Nacharbeit 2 (Claude 2026-09-29 21:08) — Breite über feste Spuren statt Bänder

Befund (Browser, 390×844): weiterhin **Einerkolonne**. Ursache (Claude, Rechnung): Der Kern
schickt ~4 Soldaten/s einzeln los, sie laufen 6 m/s → Abstand ~1,5 m je Soldat; ein
1,2-m-Band enthält fast nie mehr als einen. Der Band-Ansatz aus Nacharbeit 1 war falsch.
Neu (ersetzt die Bänder):
- **Feste Spur je Soldat:** Jeder sichtbare laufende Soldat bekommt beim Entstehen eine
  **Spur 0…9** (reihum in gemischter, fester Reihenfolge, z. B. 4,7,1,9,2,5,0,8,3,6), Spur-
  abstand 0,6 m, Spurenfeld zentriert auf die Laufmitte (vor der Wand: Truppenlage, nach der
  Wand: Mitte bzw. `SAEULE_X` mit 3 Spuren). z kommt weiter aus der Kern-Position.
  → Der Strom läuft als **breite Welle** über die Mitte, nicht hintereinander.
- **Verdopplung sichtbar:** Ab `vervielfacht` wird jeder Soldat als **k Figuren
  nebeneinander** (Abstand 0,35 m, k=2 → links/rechts der Spur) gezeigt, in 0,3 s aus der
  Spurmitte auseinander gefächert. Bleibt die Summe über 50, gilt der Figuren-Faktor aus
  Nacharbeit 1 (für alle gleich), die Paar-Darstellung bleibt.
- Phasen stabil (H3). Tests: Spurverteilung (10 aufeinanderfolgende Soldaten belegen 10
  verschiedene Spuren; x-Spanne ≥ 5 m in der Mitte), Verdopplung (k Figuren je Soldat nach
  der Wand), Summe ≤ 50. Status `IMPL_DONE`, Nachtrag.

## Nachtrag zur Nacharbeit 2 (Codex 2026-09-29)

- Die Bänder-Abbildung wurde durch zehn feste, gemischt vergebene Spuren je Kernsoldat
  ersetzt. Die Spuren liegen 0,6 m auseinander und spannen 5,4 m auf; hinter der Wand
  nutzt der Säulenweg drei Spuren. Die Position in Laufrichtung bleibt die Kern-Position.
- An der Wand zeigt jeder sichtbare Kernsoldat zwei Figuren, die sich in 0,3 s um
  0,35 m trennen. Die Phasen bleiben fest. Der gemeinsame Gewichtungsfaktor steigt
  höchstens alle 2 s; bei mehr als 50 Figuren entfallen zuerst die ältesten Läufer.
- Tests für feste Spurvergabe, Breite, Verdopplung und Sichtgrenze ergänzt.
  `npm test`: 62 Dateien, 533 Tests grün; `npm run check`, `npm run build` und
  `git diff --check` grün. Hauptbündel: 1.468.039 Byte, unverändert. Kein `http`
  in `src/v3d/`.
- Browser/WebGL-Zähler, sichtbare Prüfung bei 390×844 und iPhone-Steuergefühl samt
  60-s-Bot-Budget bleiben Geräteabnahme: Der Browserzugriff wurde verweigert; ein iPhone
  ist hier nicht erreichbar. Terminal.app ließ sich nicht über `open` starten; die
  Tests liefen in einer direkten Terminal-PTY. Kein Commit/Push (Projektregel).
