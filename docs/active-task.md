# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D4-Nacharbeit — Bildpunkte nach Thomas' Rückmeldung (2026-09-30 11:08)

Verbindlicher Plan: `docs/plan-v7.md`. D4 ist online (f153c50). Thomas: umfallende
Horde-Zombies sind aus der Kamera kaum sichtbar → **weglassen** (nur Bosse sterben sichtbar);
**+1-Schilder schneller**; **rechts mehrere Säulen im Bild**, damit man vorab sieht, was noch
kommt. Dazu Claude-Befund: Hordenzahl liegt auf dem Boss-Balken. Rechenkern unverändert.

## Erlaubte Änderungen (abschließend)

`src/v3d/lauf.ts`, `src/v3d/szene.ts` (nur Funktion `platzhalter` und `Welt`-Felder der
Säulen), `src/v3d/figuren.ts` (nur `FallendeZombies` entfernen), `src/v3d/balance3d.ts`
(Blöcke `DARSTELLUNG` und `BUEHNE`, nur neue/benannte Werte unten), `src/v3d/messung.ts`
(nur, falls es Säulen-Felder der `Welt` anfasst), Tests `tests/v3dLauf.test.ts`,
`tests/v3dBuehne.test.ts`, `tests/v3dFiguren.test.ts`. **Nicht:** `rechnung.ts`, `LEVELS`,
`SPEZIAL`.

## Akzeptanzkriterien

### B1 Keine umfallenden Horde-Zombies
- `FallendeZombies` samt Pool, Auslösung (`zombieGefallen`/`spezialTreffer`), Diagnosefeldern
  und Tests entfernen; `DARSTELLUNG.FALL_ZOMBIES_MAX` entfällt. Die Protokoll-Ungleichung für
  Fall-Zombies entfällt ebenfalls; alle Kern-Gleichungen (A5 D4) bleiben.
- Fallende **Soldaten** und der Mini-Boss-Tod (`death_1`) bleiben unverändert.

### B2 +1-Schilder schneller
- `DARSTELLUNG.SCHILDER_TEMPO_LANGSAM` 2 → **4**, `SCHILDER_TEMPO_SCHNELL` 8 → **16** m/s;
  Beschleunigung von 24 auf **48** m/s² (sonst dauert das Hochfahren zu lange). Die
  Rechnung (+6/s) bleibt; die Schilder sind reine Anzeige.

### B3 Säulen-Vorschau rechts
- Neben der aktuellen Säule (z = −12) stehen die **nächsten Säulen der Level-Liste**
  (`LEVELS[0].saeulen` ab `saeulenIndex + 1`), höchstens `DARSTELLUNG.SAEULEN_VORSCHAU = 3`,
  bei `z = −12 − k · BUEHNE.SAEULEN_ABSTAND` (`= 8`, k = 1…3), gleiche Glasoptik und
  Innenkasten.
- **Name der Einheit** als kleines Schild über jeder Säule (Canvas-Sprite wie `ZahlAnzeige`,
  Großbuchstaben, z. B. "PANZER"); die aktuelle Säule zeigt zusätzlich wie bisher `ceil(P)`
  (Zahl darunter, nicht überlappend). Vorschau-Säulen zeigen keine Zahl.
- Fällt die aktuelle Säule (`einheitFrei`), verschwindet sie wie bisher; die Vorschau
  **rückt in 0,6 s um einen Platz vor**, die vorderste wird die neue aktuelle Säule mit
  Zahl. Nach der letzten Säule: keine Säule mehr.
- **Budget:** Die 12 Kanten-Boxen je Säule werden zu **einer** zusammengeführten Geometrie
  je Säule (`mergeGeometries`); je Säule also 3 Netze (Innen, Glas, Rahmen) + Schild.
  Draw Calls rechts damit ≤ 4 × 4 = 16 (heute 14 für eine Säule). Materialien und
  Geometrien werden zwischen den Säulen geteilt; Freigabe beim Verlassen wie bisher.
- Die Vorschau gehört zur Lauf-Darstellung (in `laufGruppen`), ist in Nahaufnahme und
  Messvollast ausgeblendet wie die Säule heute; "Nochmal" beginnt wieder mit der ersten.

### B4 Hordenzahl nicht auf dem Boss-Balken
- Hordenzahl an den **rechten Rand der Horde**: `x = FIGUREN.ZOMBIE_X_MAX + 0,6`,
  `y = 2,4`, `z = −y + 1` (dunkelrot bleibt). Test: horizontaler Abstand zur Balkenmitte
  des Mini-Boss ≥ 2 m.

### B5 Tests und Nachweise
- Tests: kein Fall-Zombie-Objekt mehr in der Szene; Schildertempo-Werte; Vorschau zeigt
  `min(3, verbleibende)` Säulen mit richtigen Namen, rückt nach `einheitFrei` vor, nach der
  letzten keine; Rahmen je Säule genau ein Netz; Hordenzahl-Abstand.
- `npm test`, `tsc`, `build` grün; Hauptbündel unverändert; kein `http` in `src/v3d/`.
- Claude prüft: Bild im Browser, Zweitstart-Zähler; Thomas: iPhone + Messung.

## Nicht in diesem Schritt

Fahrzeug-Modelle in den Säulen (D5), Elite-Boss-Tod (D6).

## Implementation Summary

- Fallende Horde-Zombies samt Pool, Diagnose und Protokoll-Ungleichung entfernt; fallende
  Soldaten, Mini-Boss-Tod und Kern-Gleichungen bleiben. +1-Schilder laufen mit 4/16 m/s
  und 48 m/s² Beschleunigung. Hordenzahl steht rechts bei x = ZOMBIE_X_MAX + 0,6,
  y = 2,4, z = −y + 1.
- Vier Säulen aus `LEVELS[0]` mit Namen, aktueller Zahl und 0,6-s-Vorrücken. Je Säule
  drei Netze und eine gemeinsame Textfläche für Name/Zahl; Rahmenkanten zusammengeführt,
  Körper-Geometrien und Materialien geteilt. Vorschau in `laufGruppen`; Neustart setzt
  die erste Säule zurück.
- Nachweis: `npm test` 62 Dateien / 561 Tests grün; `npm run check`, `npm run build`,
  `git diff --check` grün. Hauptbündel 1.468.039 Byte unverändert; kein `http` in
  `src/v3d/`. Browser-Bild, Zweitstart-Zähler und iPhone-Messung bleiben beim
  vorgesehenen Claude-/Thomas-Review.

## Nacharbeit 1 (Claude-Review 2026-09-30 11:45) — zwei Anzeigefehler

1. **Einheiten-Banner liegt auf der Statuszeile** ("HUMVEE · 25 s" überdeckt "F … · Welle 2/3").
   `src/v3d/oberflaeche.ts` (Freigabe für diese Nacharbeit): Banner-Stapel **unter** die
   Statuszeile setzen (oberer Rand = Unterkante der Statuszeile + 6 px, per
   `getBoundingClientRect` oder fester Wert inkl. `env(safe-area-inset-top)`); Test:
   Banner-Oberkante ≥ Statuszeilen-Unterkante (DOM-Test mit festen Maßen genügt).
2. **Säulen-Name abgeschnitten** ("HUBSCHRAUBER" → "UBSCHRAUBEF"): Schrift im
   Säulen-Schild an die Breite anpassen (`measureText`, Schriftgröße verkleinern bis
   Textbreite ≤ Canvasbreite − 16 px). Test: für alle Namen aus `LEVELS[0].saeulen` passt
   der Text.

`npm test`, `tsc`, `build` grün; Status `IMPL_DONE`, Nachtrag.

## Nachtrag zur Implementation Summary (2026-09-30)

- Einheiten-Banner wird mit 6 px Abstand unter der gemessenen Statuszeile gesetzt.
  Säulennamen werden beim ersten Zeichnen und bei Aktualisierungen per `measureText`
  auf maximal 240 px Textbreite verkleinert.
- Nachweis: `npm test` 62 Dateien / 562 Tests grün; `npm run check` (TypeScript),
  `npm run build` und `git diff --check` Exit 0. Hauptbündel weiterhin 1.468.039 Byte;
  kein `http` in `src/v3d/`.
- Browser-Bild und Zweitstart-Zähler bleiben beim vorgesehenen Claude-Review;
  iPhone-Bild und Messung bei Thomas. Die Terminal-App war in dieser Umgebung nicht
  auffindbar; die Prüfungen liefen per PTY vollständig durch.
