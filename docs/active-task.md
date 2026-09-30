# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D5c — Humvee und Hubschrauber auf dem Feld + bleibende Panzer-Schneise

Verbindlicher Plan: `docs/plan-v7.md`, Zeile **"Einsatz der Fahrzeuge (Thomas 2026-09-30)"**
und "Schrittfolge → D5c". Der Rechenkern kennt Humvee und Hubschrauber seit D5b
(`SPEZIAL.humvee`: fahrt 3 s → feuer 30 s @ 4/s; `SPEZIAL.hubschrauber`: fahrt 2 s → feuer
12 s @ 15/s + Boss 25/s; ab S3 20/s). Dieser Schritt zeigt beide auf dem Feld, nach dem Muster von
Panzer/Haubitze in der Klasse `Einsatzbilder` (`src/v3d/lauf.ts`).

**Dazu (Thomas 2026-09-30 17:06, dritte Meldung zum selben Punkt):** "Der Panzer zieht noch
immer keine bleibende Schneise — er soll durchfahren, langsamer, und dabei seine komplette
Breite an Zombies dauerhaft wegräumen." Befund Claude: Die Schneise besteht heute aus
Treffer-Löchern, die alle 0,25 s wieder zuheilen — die Gasse ist nach ~1 s zu
(`docs/lessons.md`, 2026-09-30, zwei Einträge).

Thomas' Maßstäbe (gelten für alle Fahrzeuge): Wirkung **am Ort sichtbar** (Explosion + Loch),
Fahrzeuge **in der Mitte der Fahrbahn**, **nicht zu groß**, Wirkung muss **stehen bleiben**,
nicht nur im Einzelbild auftauchen.

## Erlaubte Änderungen (abschließend)

- `src/v3d/lauf.ts` (`Einsatzbilder`, `baueHorde`, `HordeLoecher`, Aufrufe in `WeltDarstellung`),
  `src/v3d/fahrzeuge.ts` (`baueFeldFahrzeug`),
  `src/v3d/balance3d.ts` (**nur** `FAHRZEUGE`, `DARSTELLUNG` und `SPEZIAL.panzer` Phase
  `schneise`, siehe S1/S1b),
  `src/v3d/einstieg.ts` (nur `pruefEinsatz` und sein Aufruf),
  `src/v3d/messung.ts` (nur M1),
  Tests `tests/v3d*.test.ts` (bestehende Tests, die durch die hier beauftragten Änderungen
  zwangsläufig brechen, werden auf die neuen Sollwerte umgestellt und im Bericht einzeln
  genannt — z. B. Panzer-Gesamtdauer 6,7 → 9,2 s in `tests/v3dRechnung.test.ts` Zeile 17,
  `pruefEinsatz` in `tests/v3dFahrzeuge.test.ts` Zeilen 19–23).
- **Nicht:** `src/v3d/rechnung.ts` (Ausnahme: S1b, nur der Spezial-Abschnitt), übrige `SPEZIAL`-Werte (Ausnahme S3), `LEVELS` (Ausnahme S3: nur `saeulen`), `scripts/`, Modelle,
  Bilder, `src/v3d/anzeigen.ts`, alles außerhalb von `src/v3d/` und `tests/`.
- Haubitze: sichtbares Verhalten (Größe, Wege, Schüsse, Abgang) bleibt unverändert; nur der
  interne Skalierungsweg wird vereinheitlicht (F2).

## Reihenfolge (verbindlich)

**Zuerst** auf dem unveränderten Stand `npm run bots3d` ausführen und die Tabelle als
"Vorher" in den Bericht schreiben; am Ende "Nachher". Kernänderungen: Streckung der
Panzer-Schneise bei gleicher Horde-Wirkung, 5 % Boss-Leben je Boss (S1b), neue
Säulen-Reihenfolge und stärkerer Hubschrauber (S3). Die Balance ändert sich damit gewollt:
keine ±-Grenze als Abbruch, Claude bewertet die Tabelle; harte Grenze nur **passiv verliert
20/20**. Verletzt → melden, **nicht** an Zahlen drehen.

## Akzeptanzkriterien

### F — Gemeinsames

**F1 Anlegen/Abgleich.** `Einsatzbilder.abgleichen` legt für **jede** `AktiveEinheit` in
`z.aktiv` ein Feld-Fahrzeug an (Schlüssel bleibt die Objektidentität). Anlegen mitten in
einer Phase ist erlaubt (z. B. nach `zuruecksetzen()` im Vorgänger-Zweig): Position aus
`phaseBei`, Zähler bei 0, kein Nachholen von Schüssen (beim Panzer, dessen Schüsse aus
`verstrichen` geplant sind: beim Anlegen `schuss := geplant`). Position/Phase nur aus
`a.verstrichen` und `z.y`.

**F2 Aufbau und Skala — Kurs-Gruppe.** `baueFeldFahrzeug(bau, name)` nimmt alle vier Namen
und liefert eine **Kurs-Gruppe** (äußerste Gruppe, `rotation.y` = Kurs, Kurs 0 ⇒ Front
zeigt nach −z, `scale` = 1). Darin die DREHUNG-Gruppe (`FAHRZEUGE[name].DREHUNG`), darin das
Modell mit der **vollständigen Spielgröße** eingebacken: z-Ausdehnung = `LAENGE ×
FAHRZEUGE[name].SPIEL_SKALA`, Unterkante y = 0, Box-Mitte in x/z auf dem Ursprung der
Kurs-Gruppe.
- Jedes der vier Fahrzeuge bekommt `SPIEL_SKALA` und `MUENDUNG` als eigenes Feld (typsicherer
  Zugriff ohne `??`): Panzer 0,8, Haubitze 0,5, Humvee 0,8 (→ 3,68 m), **Hubschrauber 0,4**
  (→ 7,08 m; mit 0,8 wäre er 14 m, breiter als die 12-m-Bahn). Das globale
  `FAHRZEUGE.SPIEL_SKALA` entfällt, wenn danach unbenutzt.
- Die Sonderzeile `gruppe.scale.setScalar(FAHRZEUGE.haubitze.SPIEL_SKALA / FAHRZEUGE.SPIEL_SKALA)`
  in `Einsatzbilder` entfällt; `halt1` rechnet mit `SPIEL_SKALA` des Fahrzeugs.
- **Abgang** schrumpft über `kursGruppe.scale` von 1 auf 0 (die Spielgröße steckt innen,
  daher kein Größensprung).
- **Mündung:** `MUENDUNG` = Punkt in Kurs-Gruppen-Koordinaten **bei Skala 1** (Front −z, Box-
  Mitte, Boden y = 0), wie die vorhandenen Panzer-/Haubitzenwerte. Weltpunkt =
  `kursGruppe.updateMatrixWorld(true)`, dann `kursGruppe.localToWorld(MUENDUNG ×
  SPIEL_SKALA)` — genau eine Hilfsfunktion für alle vier. Humvee (Rohrende des MG auf dem
  Dach) und Hubschrauber (Bugkanone unter der Nase) bestimmt Codex an der Geometrie
  (Knotennamen/Teil-Boxen) und nennt beide Werte im Bericht; nicht bestimmbar → Reißleine.
- Regression Haubitze/Panzer: z-Ausdehnung 3,65 ± 0,05 bzw. 7,84 ± 0,05; Mündungs-Weltpunkt
  vor und nach der Umstellung gleich (± 0,05 m) — Test.

**F3 Rotoren** des Feld-Hubschraubers drehen wie in der Miniatur (`rotor` um y mit 8π/s,
`heckrotor` um x mit 12π/s), getrieben von einer Uhr in `Einsatzbilder` (Summe der `dt`,
läuft auch in `nachlauf`).

**F4 Schusstakt — ein Verfahren für Humvee und Hubschrauber.** Je Fahrzeug ein Akkumulator
`schussUhr`, Reihenfolge verbindlich: in einem Bild **mit Auslöser** (siehe H/K)
`schussUhr = min(schussUhr + dt, 2 · takt)`, dann `while (schussUhr ≥ takt − 1e-9)`: ein
Schuss, `schussUhr −= takt` (also höchstens 2 Schüsse je Bild). In Bildern **ohne** Auslöser
bleibt `schussUhr` unverändert. Der Takt wird **nie** aus `a.verstrichen` abgeleitet. Takte
als benannte Konstanten in `DARSTELLUNG` (`HUMVEE_TAKT_S = 0.25`, `HUBSCHRAUBER_TAKT_S = 0.2`).
Für Tests und M1 zählt `Einsatzbilder` je Einheit die Schüsse kumulativ und merkt die letzten
Ziele (lesbar, z. B. `schuesse(a)`, `letzteZiele(a)`), weil Explosionen bei Vollstand still
verworfen werden und sich nicht zählen lassen. `DARSTELLUNG.EXPLOSIONEN_MAX` 8 → **12**
(Humvee 4/s + Hubschrauber 5/s + Panzer gleichzeitig; ein Draw Call bleibt ein Draw Call).

**F5 Treffer-Löcher.** Die Ereignismenge (`spezialTreffer.menge`) wird je Fahrzeug in `rest`
aufgespart; bei jedem **Horde**-Schuss werden `floor(rest + 1e-9)` Zombies als
`HordeTreffer` am Ziel dieses Schusses gemeldet und von `rest` abgezogen. Boss-Schüsse ziehen
nichts ab (der Rest bleibt für den nächsten Horde-Schuss). Keine Menge wird ohne Ziel verworfen. Über einen
ganzen Einsatz bei freiem `Z`: Summe der gemeldeten Mengen ≥ Kernwirkung − eine Schussmenge
(Humvee ≥ 119 von 120, Hubschrauber ≥ 237 von 240).

**F6 Löcher bleiben stehen.** `HordeLoecher`: Jedes Loch steht mindestens
`DARSTELLUNG.LOCH_STANDZEIT_S = 2` s; danach heilt das **älteste** fällige Loch, höchstens
eines je `LOCH_HEILEN_S` (0,25 s wie bisher). Obergrenze `DARSTELLUNG.LOECHER_MAX = 150`
(darüber werden neue Treffer nur nicht mehr als Loch gezeigt; der Kern zählt weiter).
Gilt für alle Fahrzeuge.

**F7 Doppelte Fahrzeuge.** Wird ein Humvee angelegt, während ein anderes Boden-Fahrzeug
(Panzer, Haubitze, Humvee) aktiv ist, fährt er auf x = +2 (bei nochmals belegt −2), sonst
x = 0; eine Durchdringung mit dem Panzer in dessen Schneise ist bewusst akzeptiert (selten,
kurz). Ein zweiter gleichzeitiger Hubschrauber fliegt seinen Kreis um π versetzt; der
Kurssprung an seiner Phasengrenze wird vermieden, indem der Kurs in den letzten 0,4 s der
`fahrt` auf kürzestem Bogen auf den Kreiskurs überblendet (gilt für beide Hubschrauber).

**F8 Abgang** (Ablaufende, Sieg, Niederlage oder Einheit aus `z.aktiv` verschwunden): Position
und Kurs beim Abgangsstart werden im `FeldStand` eingefroren; die Abgangsbewegung nutzt nur
diese Werte und `dt`, nie `z.y` oder `phaseBei`.

**F9 Aufräumen.** `zuruecksetzen()` entfernt alle Feld-Fahrzeuge und setzt Rotor-Uhr,
Schussuhren, Boss-Schusszähler, MG-Schwenk und die Schneise (S2) auf Anfangswerte;
`gibFrei()` hinterlässt nichts in Szene/`laufGruppen`, geteilte Geometrie/Material bleiben
bestehen. Keine neuen Objekte je Bild in den Schleifen von `abgleichen` (Vektoren
wiederverwenden; neue Objekte nur je Schuss/Anlegen).

### H — Humvee
- `L` = 3,68 m, Start z = +10, x nach F7. `halt1 = −5 − L/2 − 1`.
  `halt = −(5 + max(0, y0 − 5)/2)` mit `y0` = `z.y` beim Anlegen ("bis zur Hälfte Wand →
  Front"); liegt `halt` nicht mindestens 2 m vor `halt1`, gilt `halt = halt1`.
  Laufendes Ziel in **jedem** Bild: `zielZ = min(halt1, max(halt, −z.y + L/2 + 2))` (weicht
  zurück, wenn die Front näher als 2 m an den Bug rückt, nie hinter `halt1`).
- `fahrt` (3 s): z = lerp(+10, `zielZ`, anteil) — am Phasenende genau `zielZ` (± 0,05 m),
  kein Sprung an der Phasengrenze. `feuer` (30 s): z = `zielZ`.
- **Auslöser** für F4: ein `spezialTreffer` des Humvee im Bild. Je Schuss Mündungsblitz +
  Explosion Ø 1,5 m auf einen Zielpunkt in den vordersten 2,5 m der Horde
  (z zufällig zwischen `−y − 0,5` und `−y − 2,5`); x schwenkt als Dreieckswelle über
  `[−2,6; +2,6]`: Schuss s liegt bei `−2,6 + 5,2 · d/12` mit `d` = s mod 24, gespiegelt ab 12
  (12 Schritte hin, 12 zurück) — man sieht das MG die Front abmähen. Loch-Radius 1,5 m.
- Abgang: 0,8 s rückwärts (+z, 6 m/s), schrumpft auf 0, dann entfernt.

### K — Hubschrauber
- `L` = 7,08 m. `FAHRZEUGE.hubschrauber`: `FLUGHOEHE = 7` (Unterkante),
  `KREIS_RADIUS = 3`, `KREIS_S = 6` (zwei Runden in 12 s). Kreismitte `(0, mz)` mit
  `mz = −z.y − 5`, folgt der Front in jedem Bild.
- **Kreis (Formel verbindlich):** θ = 2π · lokal / KREIS_S (+ π bei F7),
  x = R·cos θ, z = mz − R·sin θ, Flugrichtung (dx, dz) = (−sin θ, −cos θ), Kurs
  (`rotation.y` der Kurs-Gruppe) = θ. Bei θ = 0: Punkt (R, mz), Flug nach −z (vorwärts).
- `fahrt` (2 s): von `(0, 9, +10)` linear zum Kreispunkt θ = 0 (bzw. π) der **aktuellen**
  Kreismitte, Kurs = Richtung der Fahrt; am Phasenende genau dort (± 0,05 m).
- **Auslöser** für F4: ein `spezialTreffer` des Hubschraubers im Bild **oder** (Phase `feuer`
  und `bossPunkt` gesetzt). `abgleichen(z, ereignisse, dt, bossPunkt?: THREE.Vector3)`:
  `WeltDarstellung` setzt `bossPunkt` nur, wenn das Boss-Objekt **sichtbar** ist — Mini-Boss
  (`welt.miniboss.objekt.visible`) vor Elite-Boss (`welt.eliteboss.objekt.visible`) — mit
  dessen `objekt.position` + 1,5 m Höhe (ein Bild Verzug ist akzeptiert).
- Zielwahl je Schuss: Gab es im Bild einen `spezialTreffer` des Hubschraubers, geht er auf die
  Horde, außer jeder dritte Schuss bei gesetztem `bossPunkt`; gab es keinen, geht er auf
  `bossPunkt`. Ohne Ziel kein Schuss. Horde-Ziel: Explosion Ø 2,5 m, x zufällig in
  `[−2,8; +2,8]`, z zufällig zwischen `−y − 1` und `−y − 9`, Loch-Radius 2 m. Boss-Ziel:
  Explosion Ø 2,5 m, kein Loch.
- Abgang: 1,0 s in eingefrorener Flugrichtung weiter (12 m/s), steigt 3 m/s, schrumpft auf 0.

### S — Bleibende Panzer-Schneise (Thomas)
**S1 langsamer.** `SPEZIAL.panzer` letzte Phase: `schneise` **5 s @ 20/s** (statt 2,5 s @
40/s; Gesamtwirkung bleibt 30 + 30 + 100 = 160). Alles, was die Schneisendauer heute als
Zahl enthält (z. B. `tempo = … / 2.5` im Abgang), liest sie aus `SPEZIAL`.

**S1b Panzer trifft die Bosse (Thomas 17:20/17:28: "den beiden soll er auch Leben
entziehen", "5 % bei beiden Bossen").** Die Phase `schneise` bekommt
`bossAnteil: 0.05`. **Kern-Änderung (einzige in `rechnung.ts`, freigegeben):** In einer
Phase mit `bossAnteil` verliert **jeder** Boss, der im Feld ist (`imFeld && B > 0`), anteilig
über die Phasendauer `bossAnteil × Start-Lebenspunkte` (aus dem Level: `B_mini`, `B_elite`),
also bei voller Schneise Mini −20 (von 400), Elite −150 (von 3000); gemeldet als vorhandenes
`bossTreffer`-Ereignis mit `boss`, keine neue Ereignisart; Tod des Bosses wie beim
Hubschrauber (`imFeld = false`). Der Hubschrauber-Zweig (`bossPunkteProSekunde`, nur ein
Boss) bleibt unverändert. Vereinfachung, bewusst: Abzug über die ganze Schneise, nicht nur im
Moment der Durchfahrt; ist kein Boss im Feld, verfällt es.
Bild: Wenn die Panzerspitze auf Höhe eines sichtbaren Bosses ist (|bugZ − Boss-z| < 1,5 m,
Boss-Position wie `bossPunkt` in K, hier für beide Bosse), eine Explosion Ø 2,5 m am Boss
(einmal je Boss und Durchfahrt).
Tests: Kern — Mini allein −20 ± 0,1, Elite allein −150 ± 0,1, beide im Feld beide zugleich,
kein Boss → keine Wirkung (dt 1/30 und 0,1); Horde-Wirkung unverändert 160; Invariante
Ereignisprotokoll grün; Bild — genau eine Boss-Explosion je Boss bei der Durchfahrt.

**S2 Gasse bleibt.** Neue kleine Klasse `HordeGasse` in `lauf.ts` (Zustand: `aktiv`, `x`,
`halb`, `bis`): Die Gasse ist ein Streifen in **Horde-Koordinaten** (Eintrag-x/-z der
Aufstellung, Front bei z = 0, nach hinten negativ): verdeckt ist jeder Eintrag mit
`|e.x − x| < halb` **und** `e.z ≥ bis`.
- `halb` = halbe x-Ausdehnung des Feld-Panzers im Spiel (Codex misst sie an der Box, Wert als
  `FAHRZEUGE.panzer.SCHNEISE_HALB` im Bericht) — "seine komplette Breite".
- Während `schneise`: `bis = min(bis, bugWelt + z.y)` in jedem Bild (bugWelt = Welt-z der
  Panzerspitze) — die Gasse wächst mit dem Panzer von vorn nach hinten; bei Schneisenende
  bleibt `bis` dort stehen (der Panzer ist hinten aus der Horde heraus).
- **Wann sie zugeht (Thomas 17:20: "nicht bis zum Ende des Laufs — wenn von hinten Zombies
  nachkommen, dann ganz normal"):** Die Gasse bleibt offen, bis die **nächste Welle** kommt
  (Kern-Ereignis `welle` nach Schneisenbeginn). Ab dann schließt sie sich von hinten nach
  vorn: `bis` wandert über `DARSTELLUNG.GASSE_SCHLIESSEN_S = 3` s linear bis 0 (die
  nachrückenden Zombies füllen sie auf), danach Gasse aus. Einträge hinter `bis` — auch die
  zum Auffüllen hinten angehängten — sind immer normal. Kommt keine Welle mehr, bleibt sie
  offen. Reset über `zuruecksetzen()`/neuen Lauf. Ein zweiter Panzer legt eine neue Gasse an
  (ersetzt die alte).
- Die Zahl `Z` bleibt die des Kerns: `baueHorde(zahl, loecher, gasse)` liefert genau `zahl`
  Einträge nach dem Filtern (Löcher **und** Gasse) plus `basisLaenge` (Zahl der verbrauchten
  Einträge der ungefilterten Basisliste). Die Basisliste ist präfixstabil (geprüft: gleiche
  Position je Index bei größerer Anzahl). Startgröße direkt ableiten:
  `n = ceil((zahl + loecher.size) / (1 − f)) + 20` mit `f = 2·halb / (ZOMBIE_X_MAX −
  ZOMBIE_X_MIN)` (0 ohne Gasse); fehlt danach etwas, `n += ceil(Defizit / (1 − f)) + 20`,
  höchstens 4 Durchgänge. Die Horde wird dafür hinten länger — gewollt.
- **Loch-Indizes zeigen auf die ungefilterte Basisliste**, die Gasse ist nur ein zusätzlicher
  Filter (sonst verrutschen Löcher, wenn `bis` wächst). Eine gemeinsame Funktion für die
  Basisliste; `HordeLoecher.passeAn` und `treffer` nutzen `basisLaenge` statt
  `zahl + indizes.size`; `treffer` schließt Einträge in der Gasse als Kandidaten aus.
- Die bisherigen Schneisen-Löcher (Treffer entlang des Wegs, `lauf.ts` ~133–140) entfallen:
  In Phase `schneise` meldet der Panzer **keine** `HordeTreffer` und verwirft `rest` — die
  Gasse ist die einzige Darstellung dieser Wirkung (kein Rückfall in den `else if
  (stand.ziel)`-Zweig mit veraltetem Ziel). Die Schüsse links/rechts bleiben wie sie sind.
- Neu gesetzt wird die Horde wie bisher bei geänderter Zahl oder Lochversion, zusätzlich bei
  geändertem `bis` (Drossel 0,1 s bleibt).

### S3 — Reihenfolge und Hubschrauber als Stärkster (Thomas 17:31)
- `LEVELS[0].saeulen` = `['humvee', 'haubitze', 'panzer', 'hubschrauber']` (Haubitze vor
  Panzer). Miniaturen und Namensschilder in den Säulen folgen der Liste (nicht fest
  verdrahtet); bestehende Zuordnungstests auf die neue Reihenfolge umstellen.
- "Hubschrauber muss das stärkste sein": `SPEZIAL.hubschrauber` Feuer **20/s** (statt 15/s)
  → 240 Zombies in 12 s, dazu Boss 25/s wie bisher. Rangfolge der Horde-Wirkung damit:
  Humvee 120 < Panzer 160 (+ 5 % je Boss) < Haubitze 180 < Hubschrauber 240 (+ 300 Boss-Punkte).
  Test: Kern-Summe Hubschrauber 240 ± 0,1 bei freiem `Z`.
- **Bots:** Diese Punkte ändern die Balance bewusst (Freischalt-Reihenfolge, mehr Wirkung).
  Die Grenze "±1/20, ±5 %" gilt hier nicht als Abbruch; stattdessen Tabelle vorher/nachher
  im Bericht, Claude bewertet. Harte Grenze bleibt: **passiv verliert 20/20**.

### P — Prüfparameter
- `pruefEinsatz` liefert eine **Liste**: `?pruefung=1&einsatz=humvee,hubschrauber` startet
  beide (Reihenfolge wie angegeben, Doppelte und Unbekannte ignoriert, höchstens vier); ein
  einzelner Name wie bisher; ohne `pruefung=1` leere Liste. Aufruf in `einstieg.ts` einmalig
  nach dem ersten `SpielLauf`, danach `protokollNeuBasieren()`, nicht bei "Nochmal".

### M1 — Dauertest mit Fahrzeugen (Messmodus)
- Neue exportierte Klasse `DauertestFahrzeuge` in `messung.ts` (`aktualisiere(dt)`,
  `gibFrei()` idempotent). Sie besitzt eine eigene `Einsatzbilder`-Instanz und einen
  Schau-Zustand (`neuerLauf(LEVELS[0], 1)`, `y` fest **15** — die Vollast-Horde beginnt bei
  z = −15, so treffen die Ziele mitten hinein —, `Z` fest 600, Humvee und Hubschrauber per
  `starteEinheit`). `aktualisiere`: `verstrichen += dt` je Einheit; kurz vor Ablaufende
  springt `verstrichen` auf den Beginn der Feuerphase zurück (Dauerfeuer); synthetische
  `spezialTreffer` mit `menge = Rate · dt`; `nimmTreffer()` leeren und verwerfen. Der Kern
  (`schritt`) läuft nicht.
- **Eine** Instanz für alle drei Minuten des Dauertests: angelegt beim Eintritt in die erste
  Stufe, deren Name mit "Dauertest" beginnt (**nach** dem Ausblenden der `laufGruppen` in
  `starteMessung`), gefüttert nur in Phase `messen`; in `warm`/`umbau` läuft nur
  `nachlauf(dt)` (nichts friert halb aufgelöst ein); zwischen den Minuten nicht neu angelegt.
  `gibFrei()` genau an zwei Stellen: beim Übergang auf "Lauf (Bot)" und in `bricheAb` (vor
  `l.bot?.gibLaufFrei()`).
- Stufennamen und Ergebnisformat bleiben gleich. Hinweis im Bericht und im Kommentar an
  `MESSSTUFEN`: Dauertest-Werte ab D5c enthalten zwei Fahrzeuge und sind mit früheren
  Dauertest-Messungen nicht direkt vergleichbar.

### B — Budget
- Feld-Humvee 1 Netz, Feld-Hubschrauber höchstens 3 Netze; keine neuen Materialien, Bilder
  oder Geometrien (geteilt aus `welt.fahrzeuge`).
- Claude misst im Browser: Zuwachs `renderer.info.render.calls` mit
  `einsatz=humvee,hubschrauber` gegenüber ohne Einsatz **≤ +5**.
- Zweitstart: Menü → 3D (mit Einsatz) → Menü → 3D: `renderer.info.memory.geometries` und
  `.textures` exakt gleich; ebenso vor/nach einer vollständigen Messung.

### T — Tests (Verhalten ausrechnen, keine Quelltext-Mustersuche)
Jeder Test mit `dt = 1/60` **und** `dt = 0,1`, wo Zeit läuft.
- **Humvee:** am Ende der Fahrt genau bei `zielZ` (großes `y` → Hälfte; kleines `y` →
  `halt1`); sinkt `y` im Feuer, weicht er zurück, nie hinter `halt1`, kein Sprung > 0,5 m je
  Bild; Schüsse über 30 s bei Ereignis in jedem Bild = 120 ± 1; ohne Ereignis kein Schuss;
  Zielpunkte in den vordersten 2,5 m, x-Werte decken `[−2,6; +2,6]` ab; Summe der
  Treffer-Mengen ≥ 119; Mündung liegt bei Kurs 0 vor der Fahrzeugmitte (kleineres z).
- **Hubschrauber:** am Ende der Fahrt am Kreispunkt θ = 0; im Feuer Abstand zur Kreismitte
  3 ± 0,05 und Unterkante 7 ± 0,05, auch wenn `y` sich ändert; nach 6 s wieder am
  Einstiegspunkt; Mündung liegt in Flugrichtung vor der Mitte (bei θ = 0 und θ = π/2);
  Schüsse über 12 s = 60 ± 1; Summe ≥ 237; mit `bossPunkt` und ohne `spezialTreffer` gehen
  alle Explosionen auf den Boss, keine Löcher; ohne Ereignis und ohne `bossPunkt` kein Schuss.
- **Takt:** Schüsse über den kumulativen Zähler (F4) zählen, nicht über Explosionen.
  Fahrzeug bei `verstrichen = 15` angelegt → in den ersten 3 Bildern höchstens 1 Schuss; ein
  Bild mit `dt = 1` erzeugt höchstens 2 Schüsse; Panzer mitten in Phase 3 angelegt → kein
  nachgeholter Schuss.
- **Loch-Stabilität:** Ein Loch zeigt denselben Zombie (gleiche x/z), während `bis` der Gasse
  wächst.
- **Löcher:** Humvee hält nach 2 s Feuer ≥ 6 Löcher gleichzeitig; ein Loch verschwindet nicht
  vor 2 s; nie mehr als 150.
- **Schneise:** Nach Schneisenende liegt in der an `zombieMasse.setze` übergebenen Liste
  **kein** Eintrag im Streifen `|x| < halb` vor `bis` — auch 10 s später und nach
  Frontbewegung, solange keine Welle kam; die Liste hat genau `min(600, ceil(Z))` Einträge;
  während der Schneise wächst der verdeckte Bereich monoton nach hinten; nach einem
  `welle`-Ereignis ist die Gasse nach 3 s ± 0,2 vollständig zu (und davor teilweise); nach
  `zuruecksetzen()` ist sie weg.
  Prüffrage: fiele der Test mit der alten, heilenden Schneise durch? (muss ja).
- **Skala/Regression:** z-Ausdehnung Humvee 3,68, Hubschrauber 7,08, Haubitze 3,65, Panzer
  7,84 (je ± 0,05); Haubitzen-/Panzer-Mündung unverändert; Abgang ohne Größensprung
  (Skala fällt monoton von 1).
- **Doppelte:** zwei Humvees gleichzeitig ≥ 2 m Mittenabstand; zwei Hubschrauber ≥ 5 m.
- **Lebenszyklus:** beide gleichzeitig → Abgang bei Sieg; nach `nachlauf` 1,5 s `anzahl = 0`;
  Abgangsbahn bleibt gerade, wenn `y` sich danach ändert; zwei Einsätze nacheinander im selben
  Objekt nach `zuruecksetzen()` liefern bei gleichem Seed identische Schuss-/Zielfolgen;
  `gibFrei()` hinterlässt nichts.
- **`pruefEinsatz`:** Liste, Doppelte, Unbekannte, ohne `pruefung=1` → `[]`.
- **M1** (über `DauertestFahrzeuge` mit Welt-Attrappe wie in `tests/v3dLauf.test.ts`):
  legt `einsatz-humvee` und `einsatz-hubschrauber` an; `aktualisiere` über 70 s zeigt
  durchgehend Explosionen (≥ 1 Schuss je Sekunde); `aktualisiere(0,5)` erzeugt keinen Burst
  (≤ 2 Schüsse je Fahrzeug); nach `gibFrei()` (auch zweimal) nichts in Szene/`laufGruppen`
  und Geometrie-/Texturzähler wie vor dem Anlegen.
- **Prüffrage je Test:** Würde er durchfallen, wenn das Fahrzeug stehen bliebe, falsch herum
  flöge, nie schösse oder die Gasse wieder zuwüchse? Wenn nein, prüft er nichts.

### Nachweise
- `npm run check`, `npm test`, `npm run build`, `npm run bots3d` (vorher/nachher); kein
  `http` in `src/v3d/`.
- Claude prüft im Browser (390×844, Touch) als Bildfolge:
  `?pruefung=1&einsatz=panzer` (Durchfahrt, 5 s nach Schneisenende steht die Gasse, nach der
  nächsten Welle geht sie zu; Mini-Boss verliert Leben mit Explosion bei der Durchfahrt), `…=humvee`, `…=hubschrauber`, `…=humvee,hubschrauber` (Anfahrt, Feuer mit Explosion
  und stehenden Löchern, Abgang); Hubschrauber-Start liegt im Bild und verdeckt Truppe/Front
  höchstens 2 s — sonst Start auf (0, 9, +6) bzw. `KREIS_RADIUS` 2,5 (nur über `FAHRZEUGE`,
  Claude entscheidet); Draw Calls; Zweitstart-Zähler.
- Thomas: iPhone-Blick + Messung inkl. Dauertest 3 min (Grenze ≥ 55 fps, langsamste 5 %
  ≤ 25 ms, Schwarz ≤ 10 %, kein Absturz).

### Reißleine
- Riskanteste Stelle ist S2 (Gasse + Aufstellung): Lässt sich die "genau `zahl` Einträge"-
  Bedingung in 4 Durchgängen nicht halten oder kostet `baueHorde` am Desktop > 2 ms je Aufruf,
  **melden** und die übrigen Punkte fertig bauen — kein Ersatz über heilende Löcher.
- Lässt sich ein Kriterium nicht erfüllen (z. B. Mündung nicht bestimmbar): melden, Rest
  fertig bauen. Kein Ersatzprodukt (kein Fahrzeug ohne Feuer, keine Wirkung ohne
  Explosion/Loch, keine Kern-/`SPEZIAL`-Änderung über S1/S1b hinaus, um Tests grün zu bekommen).
- Passiv-Bot gewinnt irgendwo (Grenze 20/20 verletzt) → melden, nichts anpassen.
- Höchstens zwei Anläufe, dann zurück zu Thomas.

## Nacharbeit 1 (Claude-Review 2026-09-30 19:30) — nur diese zwei Punkte

1. **Hubschrauber zu hoch.** Im Browser (390×844) haengt der kreisende Hubschrauber am
   oberen Bildrand und ist teils abgeschnitten. `FAHRZEUGE.hubschrauber.FLUGHOEHE` 7 → **4**
   (Unterkante). Anflug-Start bleibt (0, 9, +10), die Fahrt endet auf der neuen Hoehe. Tests,
   die 7 als Zahl pruefen, auf die Konstante umstellen (nicht auf 4 hart codieren).
2. **Kurs in der Anflugphase seitenverkehrt.** `lauf.ts`, Hubschrauber `phase.index === 0`:
   Kurs muss der Formel aus K folgen (Flugrichtung (dx, dz) = (−sin θ, −cos θ) ⇒
   θ = atan2(−dx, −dz)) mit (dx, dz) = Zielpunkt − Startpunkt der Fahrt, nicht die aktuelle
   Position. Test: Bei Versatz 0 (Ziel x = +R) zeigt die Flugrichtung aus dem Kurs in der
   ersten Haelfte der Fahrt nach +x (Kurs < 0), bei Versatz π nach −x.

Sonst nichts aendern. `npm run check`, `npm test`, `npm run build` gruen. Status am Ende
IMPL_DONE, kurzer Abschlussbericht.

## Abschlussbericht (Pflicht)
Was geändert, Bots vorher/nachher, Testergebnis mit Zahlen, Mündungswerte Humvee und
Hubschrauber, `SCHNEISE_HALB`, jeder umgestellte Bestandstest mit Grund, was nicht ging und
warum. Status am Ende auf `IMPL_DONE`.

## Implementation Summary
- Nacharbeit 1: Flugunterkante des Hubschraubers auf 4 m gesetzt; der Anflugkurs wird aus der Richtung Startpunkt → Zielpunkt berechnet. Bestehenden Höhentest an `FLUGHOEHE` gebunden und Anflugrichtung für beide Kreisversätze bei `dt = 1/60` und `0,1` geprüft.
- D5c: Humvee und Hubschrauber als Feldfahrzeuge mit Kurs-Gruppe, maßstäblicher Geometrie, Rotoren, Schusstakt, Zielpunkten, Treffern und Abgang; Panzer-Schneise bleibt bis zur nächsten Welle offen und schließt dann in 3 s. Panzer-Bosswirkung, Säulen-Reihenfolge und Hubschrauber-Wirkung gemäß S1b/S3 umgesetzt. Dauertest zeigt beide Fahrzeuge.
- Geometrie: Humvee-Mündung `[0, 3.15, -2.3]`, Hubschrauber-Mündung `[0, 1.2, -8.85]` (je Kurs-Gruppen-Koordinaten vor Spielskalierung); Panzer-Schneisen-Halbbreite `1.3954 m` aus Modell-x-Ausdehnung `3.4885 m × 0.8 / 2`.
- Bots vor Änderungen aus `HEAD`: passiv 0/20, nurLinks 0/20, rhythmus(40) 20/20, rhythmusSaeule(60) 20/20 (108.0 s, 2.05 Säulen), rhythmusSaeule(15) 0/20, rhythmusSaeule(25) 0/20. Danach: gleiche Siege; rhythmusSaeule(60) 106.3 s, 2.00 Säulen; alle übrigen Mittelwerte unverändert. Harte Grenze passiv 0/20 eingehalten.
- Bestandstests angepasst: `v3dFahrzeuge` für Listen-Rückgabe von `pruefEinsatz` und neue Säulenfolge; `v3dRechnung` für Panzerdauer 9.2 s und Hubschrauberwirkung 240; `v3dLauf` für `baueHorde`-Rückgabe, dauerhafte Gasse statt heilender Schneisentreffer, Panzer-Restdauer und frühestens nach 2 s heilende Löcher. Neue D5c-Verhaltenstests in `v3dEinsatzD5c`.
- Nachweise: `npm run check`, `npm test` (65 Dateien, 593 Tests), `npm run build`, `npm run bots3d` grün; `git diff --check` und keine `http`-Treffer in `src/v3d/`. Browser-Bildfolge, Draw-Call-/WebGL-Speicherzähler, iPhone-Blick und echte 3-Minuten-Messung bleiben bei Claude/Thomas gemäß Nachweise-Abschnitt. Terminal-App war in dieser Umgebung nicht verfügbar; Testsuite lief direkt in der Shell.
