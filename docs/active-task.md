# Aktive Aufgabe

Status: SPEC_READY

## Aufgabe: D7r — Kampfrüstung "Mecha" als fünfte Säule (Plan V7, Abschnitt D7r)

Thomas 2026-10-01: Nach dem Hubschrauber eine weitere Säule mit einer Kampfrüstung; gewählt
**"Project 'Alpha' Mecha"** (Lwifff, CC-BY 4.0, Sketchfab
https://sketchfab.com/3d-models/0136cc111e0f40bdb1fe3dab6ca67b2b, API-Prüfung 2026-10-01:
37 670 Dreiecke, keine Animation, herunterladbar), "mit Guns in den Händen und Raketen über
dem Kopf". **Befund Claude:** Das Modell hat beides schon — zwei Raketenwerfer mit je 4 roten
Raketen über dem Kopf, an beiden Unterarmen eine mehrläufige Waffe statt Hand. Kein Anbau nötig.
**Aufbau:** 185 starre Einzelteile (Box…/Cylinder…/Sphere…), **kein Skelett, keine Bewegung**,
3 Bemalungen (2× 4096², 1× 1024×512), viele Materialien. Rohdatei liegt unter
`tmp/fahrzeuge/mecha/project_alpha_mecha.glb` (ignoriert; Original
`~/Downloads/rungun-roh/mecha/`). D7 (Level, Lobby) ist abgeschlossen, Commit 23a8474.

## Erlaubte Änderungen (abschließend)
- `scripts/modelle.mjs` (neues Ziel `mecha`), neue Ausgabe `src/v3d/modelle/v3d-mecha.glb`.
- `src/v3d/balance3d.ts` (`SPEZIAL.mecha`, `FAHRZEUGE.mecha`, `saeulen` + `mecha` in BASIS),
  `src/v3d/rechnung.ts` nur falls ein Typ die neue Einheit nicht zulässt (keine neue Formel),
  `src/v3d/fahrzeuge.ts`, neue Datei `src/v3d/mecha.ts` (Gliederung + Laufbewegung),
  `src/v3d/lauf.ts` (`Einsatzbilder`: Mecha-Auftritt), `src/v3d/szene.ts` (Laden, Eis-Miniatur),
  `src/v3d/einstieg.ts` (`TEST_FAHRZEUGE`, `pruefEinsatz` kennt `mecha`), `src/v3d/messung.ts`
  (Speicherplan), `docs/lizenzen.md` (Eintrag **vor** dem Modell unter `src/`), `tests/`.
- Nicht: andere Fahrzeuge, Front-/Horde-Regeln, Level-Tabelle `STUFEN`, 2D-Code.

## Akzeptanzkriterien

**M1 Aufbereitung** (`node scripts/modelle.mjs mecha`, Verfahren wie die Fahrzeuge): Bemalung
auf **eine** 512-px-WebP (Farbbild; ein Reliefbild 512 nur, wenn es im Original eines gibt),
alle Teile auf ein Material, vereinfacht auf **≤ 6 000 Dreiecke**. Die Teile werden zu **sieben
Gliedern** zusammengefasst und als eigene Knoten behalten: `rumpf` (Cockpit, Raketenwerfer,
Arme, Waffen, Hüftblock), je Seite `oberschenkel_l/r`, `unterschenkel_l/r`, `fuss_l/r`.
Zuordnung über die Lage der Teile (Mitte je Teil gegen Höhe/Seite des Modells); die Grenzen
und je Glied die Gelenkpunkte (Hüfte, Knie, Knöchel) als Zahlen im Skript und im Bericht.
Nahbild der vereinfachten Figur von vorn und von der Seite (Löcher? Glieder richtig?) in den
Bericht. Qualitätsgrenze im Skript: ≤ 6 000 Dreiecke, 1 Material, ≤ 2 Texturen à 512, 7 Glieder.
`docs/lizenzen.md`: Titel, Urheber Lwifff (https://sketchfab.com/Lwifff), Link, CC-BY 4.0
(http://creativecommons.org/licenses/by/4.0/), API-Prüfung 2026-10-01, "Änderungen:
vereinfacht, verkleinert, neu bemalt, in Glieder zerlegt, Bewegung ergänzt". Info-Bildschirm
zeigt ihn (eine Quelle).

**M2 Größe.** Echte Höhe **6,0 m** (Mecha stehend). Im Feld: Höhe × 0,75 = **4,5 m**
(Soldat 2 m). Im Eis: gemeinsamer Maßstab `EIS.MASSSTAB` 0,8 → 4,8 m hoch, auf derselben Linie
`SAEULE_X` wie die anderen, Hülle wie die übrigen Eis-Fahrzeuge, Abstände über `saeulenZiele`.
Front (Cockpitscheibe, Waffenmündungen) zeigt nach **−z** — Verhaltenstest wie bei den
Fahrzeugen.

**M3 Laufbewegung (`mecha.ts`, rein rechnend testbar).** Gerechnete Schrittbewegung aus den
Gliedern, Zyklus 1,2 s: Oberschenkel um die Hüfte ±22°, Unterschenkel um das Knie 0…45° (beugt
nur in eine Richtung, nie überstreckt), Fuß gleicht so aus, dass die Sohle beim Auftreten
waagrecht ist; Beine gegenphasig; Rumpf wippt 0,12 m (tiefster Punkt beim Auftreten) und
pendelt ±3°. Im Stand: Grundstellung. Tests: Gegenphase, Kniewinkel nie < 0, tiefster
Fußpunkt beim Auftreten auf Bodenhöhe ± 3 cm, Rumpfhöhe periodisch.

**M4 Einsatz im Feld (`Einsatzbilder`).** `SPEZIAL.mecha` (Startwerte, Claude kalibriert):
`fahrt` 3 s (stapft von der ×2-Wand in Bahnmitte zur halben Strecke, Laufbewegung),
`feuer` 10 s (zombiesProSekunde 12, bossPunkteProSekunde 40; beide Arm-Waffen feuern: Läufe
drehen sich, Mündungsblitz an jeder Waffe über den bestehenden `Muendungsblitze`-Pool, Treffer-
Löcher in der Horde wie beim Humvee), `einschlaege` 4,05 s (2 Salven, Abstand 4 s, je 70
Zombies: je Salve fliegen 4 Raketen sichtbar aus den Werfern in einem Bogen in die Horde,
Explosion + Treffer-Loch am Einschlag), `fahrt` 2 s (stapft rückwärts aus dem Bild). Wirkung
nur in `feuer`/`einschlaege`. Die Raketen sind 8 kleine Objekte aus einem Pool (eine
`InstancedMesh`), keine neue Bemalung. Kurzlebige Effekte nach der Regel aus D5d (≥ 3 Bilder).

**M5 Säule.** Fünfte Säule in allen Levels: `saeulen: ['humvee','haubitze','panzer',
'hubschrauber','mecha']`; Eis-Miniatur wie die anderen (Glieder in Grundstellung). Block-Plätze
bleiben `min(n, SAEULEN_VORSCHAU+1)` = 4.

**M6 Testgelände + Prüfschalter.** Lobby-Testgelände bekommt den Knopf MECHA (`TEST_FAHRZEUGE`),
`?pruefung=1&einsatz=mecha` startet ihn sofort.

**M7 Nachweise.** Rechenkern-Test mit/ohne Mecha: Differenz der getöteten Zombies = Tabelle
± 5 %. `npm run bots3d` vorher/nachher; weicht ein Level ab, Zahlen in den Bericht (Claude
kalibriert, Codex ändert die Level-Tabelle nicht). Leistung: Messmodus unverändert im Budget
(Speicherplan nennt die Mecha-Bemalung). Bestehende Tests mitziehen (Säulenliste, Testgelände),
nicht löschen. `npm run check`, `npm test`, `npm run build`.

## Reißleine
- Lassen sich die Teile nicht sauber in Glieder trennen oder sieht die Schrittbewegung nach
  **einem** Anlauf falsch aus (Beine reißen auseinander, Glieder schweben): **melden**, Mecha
  stattdessen als Ganzes stampfen lassen (Rumpf wippt 0,12 m, ganzer Körper pendelt ±4°) und
  den Rest fertig bauen. Kein anderes Modell, kein programmatisch gebauter Ersatz-Mecha.
- Bleibt die Vereinfachung über 6 000 Dreiecke oder zeigt Löcher: melden mit Zahl und Nahbild.

## Abschlussbericht
Status `IMPL_DONE`; Bericht: Gliederung (Grenzen, Gelenkpunkte), Dreiecke, Bemalungsgröße,
Nahbilder, Testergebnisse, Bot-Ausgabe vorher/nachher, was nicht ging und warum.
