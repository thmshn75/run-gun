# Aktive Aufgabe

Status: APPROVED

## Aufgabe: Messergebnisse scrollbar und gespeichert (Run Gun 3D)

Thomas (iPhone, 2026-09-30 11:58): Die Ergebnisliste nach "Leistung messen" lässt sich nicht
scrollen → Dauertest-Ergebnis unsichtbar. Ursache (Claude): `messung.ts` setzt die Anzeige auf
`pointerEvents = 'none'` (auch in `bricheAb`), dazu `touch-action: none` global in
`src/style.css`.

## Erlaubte Änderungen (abschließend)

`src/v3d/messung.ts`, `src/v3d/info.ts`, `src/v3d/oberflaeche.ts` (nur das Ergebnis-Element),
`src/v3d/einstieg.ts` (nur Verdrahtung), Tests `tests/v3dMessung*.test.ts` bzw. bestehende
v3d-Tests. Keine Änderung an der Messlogik selbst (Stufen, Dauer, Auswertung).

## Akzeptanzkriterien

1. **Während** der Messung bleibt die Anzeige durchlässig (`pointerEvents: none`) wie heute.
2. **Nach** der letzten Stufe (und bei Abbruch mit Grund) wird die Anzeige bedienbar:
   `pointerEvents: auto`, `touchAction: pan-y`, `overflowY: auto`, `overscrollBehavior:
   contain`, Höhe begrenzt auf den sichtbaren Bereich (zwischen Kopfleiste und unterem
   Rand inkl. `env(safe-area-inset-*)`), oben ein Knopf **"SCHLIESSEN"** (≥ 44 × 44 px), der die
   Anzeige ausblendet und wieder durchlässig macht. Solange sie offen ist, pausiert das
   Spiel wie bei offener INFO-Tafel (kein Steuern durch die Liste hindurch).
3. **Letzte Messung speichern:** Der vollständige Ergebnistext wird mit Datum/Uhrzeit in
   `localStorage` (`rg3d-letzte-messung`, jeder Zugriff in `try/catch`, bei Fehler still
   weiter) abgelegt. In der INFO-Tafel erscheint, wenn vorhanden, ein Knopf
   **"Letzte Messung"**, der den gespeicherten Text scrollbar in der Tafel zeigt.
4. Tests: Anzeige nach Messende `pointerEvents === 'auto'`, während Messung `'none'`;
   Speichern/Laden mit Attrappe von `localStorage` inkl. werfendem Zugriff; INFO zeigt den
   Knopf nur bei vorhandenem Eintrag.
5. `npm test`, `tsc`, `build` grün; Hauptbündel unverändert; kein `http` in `src/v3d/`.

## Implementation Summary

- Während der Messung bleibt die Anzeige durchlässig. Nach vollständigem Lauf oder
  Abbruch mit Grund zeigt sie den Text scrollbar im sichtbaren Bereich mit
  44 × 44 px großem SCHLIESSEN-Knopf; solange sie offen ist, pausiert das Spiel.
- Das Ergebnis wird mit Datum/Uhrzeit unter `rg3d-letzte-messung` gespeichert.
  Die INFO-Tafel zeigt „Letzte Messung“ nur bei vorhandenem Eintrag und lädt
  den Text dort scrollbar; gesperrter Speicher wird still übergangen.
- Nachweis: `npm test` 63 Dateien / 565 Tests grün; `npm run check`,
  `npm run build`, `git diff --check` Exit 0. Hauptbündel weiterhin
  1.468.039 Byte; kein `http` in `src/v3d/`.
- iPhone-Scrollen und echter mehrminütiger WebGL-Messlauf hier nicht geprüft.
  Terminal.app war nicht verfügbar; die Tests liefen im PTY.
