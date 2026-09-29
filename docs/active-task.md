# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D3-Anpassung — neue Mechanik sichtbar machen (Run Gun 3D)

Verbindlicher Plan: `docs/plan-v7.md`, Zeile "Mechanik neu" und "Schrittfolge → R2" (danach
D3-Anpassung). Der Rechenkern (R2, `rechnung.ts`) ist fertig und bleibt **unverändert**.
Dieser Schritt passt nur die Darstellung an: Truppe als schrumpfender Vorrat, Säulenbeschuss
von rechts, wachsende Wand, aktive Spezialeinheit als Anzeige. Die D3-Härtung (H1–H10 aus
dem vorigen Auftrag, u. a. Zeitschritt, Finger, Sichtgrenzen, Messung, Pause) gilt weiter.

## Erlaubte Änderungen (abschließend)

`src/v3d/lauf.ts`, `src/v3d/anzeigen.ts`, `src/v3d/szene.ts`, `src/v3d/soldaten.ts`,
`src/v3d/schilder.ts`, `src/v3d/oberflaeche.ts`, `src/v3d/balance3d.ts` (nur Block
`DARSTELLUNG`), `tests/v3dLauf.test.ts`. **Nicht:** `rechnung.ts`, `LEVELS`, `SPEZIAL`.

## Akzeptanzkriterien

### A1 Truppe als Vorrat
- Die Formation zeigt `min(floor(T), 30)` Figuren und **schrumpft sichtbar**, wenn in der
  Mitte gesendet wird; neue Läufer starten **aus der Formation heraus** (Startposition =
  Platz einer Figur der vorderen Reihe, nicht aus einem Punkt), dann Spur-Logik wie bisher.
- Links (`eingesammelt`): Formation wächst, keine Läufer, kein Schießen (Bewegung `stehen`).

### A2 Säulenbeschuss (rechts)
- Solange der Kern `saeuleTreffer` meldet: Formation dreht sich zur Säule (Blickrichtung
  auf `SAEULE_X`, `z = −12`, weich in 0,3 s), Bewegung **`schiessen`**, und es gibt
  **Mündungsblitze**: kleine additive Leuchtflecken (ein gemeinsames `InstancedMesh` aus
  Quads mit einer 64-px-Canvas-Textur, höchstens 12 gleichzeitig, je 0,06 s sichtbar, an
  der M4-Mündung zufällig ausgewählter Schützen, ~10 Blitze/s gesamt).
- Die Säule zeigt Treffer: Glas blitzt kurz heller (höchstens 5×/s gedrosselt), Zahl
  `ceil(P)` sinkt laufend.
- Verlässt die Truppe rechts, dreht die Formation zurück (Blick −z), Bewegung `stehen`.

### A3 Wand wächst
- Die Wand zeigt `×kAktuell`. Bei `wandStufe`: Text wechselt, Wand pulsiert 0,4 s (Skalierung
  1 → 1,08 → 1), kurzer heller Aufblitz. Läufer hinter der Wand zeigen `k` Figuren je
  Soldat (bis zur Sichtgrenze 50, Faktorlogik wie bisher).

### A4 Spezialeinheit aktiv
- Bei `einheitAktiv`: Banner oben mittig (DOM), z. B. "HUMVEE · 30 s", Restzeit zählt
  herunter; mehrere gleichzeitig untereinander; bei `einheitEnde` weg. Bei `einheitFrei`
  verschwindet der Innenkasten der Säule (wie bisher), die nächste Säule zeigt 150.
- Horde schrumpft dabei über die Kernwerte (keine eigene Rechnung). Fahrzeug-Modelle: D5.

### A5 Tests und Nachweise
- `tests/v3dLauf.test.ts`: Formation = `min(floor(T),30)`; rechts: Schießzustand aktiv und
  Blitze ≤ 12; `wandStufe` löst Anzeige-Wechsel aus; Banner-Liste folgt `einheitAktiv/Ende`.
- Messstufe "Lauf (Bot)" nutzt den Rhythmus-mit-Säule-Bot (S = 60), damit Säulenbeschuss,
  Blitze und Welle mitgemessen werden.
- `npm test`, `tsc`, `build` grün; Zweitstart-Zähler gleich (Claude prüft), Hauptbündel
  unverändert; kein `http` in `src/v3d/`.

## Nicht in diesem Schritt
Frontkampf-Bild (Schießen an der Front, fallende Zombies/Soldaten: D4), Fahrzeuge (D5).

## Implementation Summary

- A1–A4 umgesetzt: Formation folgt dem Vorrat; Läufer starten an Plätzen der vorderen
  Reihe. Beim Säulentreffer dreht und schießt die Formation mit begrenzten Mündungsblitzen;
  Glas und Wand reagieren auf Treffer bzw. Stufenwechsel. Aktive Einheiten erscheinen
  mit herunterzählender Restzeit als Banner. Rechenkern, LEVELS und SPEZIAL unverändert.
- A5 abgeschlossen: Die freigegebene Messstufe "Lauf (Bot)" steuert mit dem
  Rhythmus-mit-Säule-Bot (S = 60) die sichtbare Szene; Welle, Säulenbeschuss und
  Mündungsblitze werden so mitgemessen. Nach der Messung wird die Spielansicht
  wiederhergestellt. Der 60-s-Test belegt Aussenden und Säulentreffer.
- Prüfung nach dem letzten Code-Stand: `npm test` 62 Dateien, 545 Tests grün;
  `npm run check`, `npm run build` und `git diff --check` Exit 0. Hauptbündel vor/nach
  Build 1.468.039 Byte; kein `http` in `src/v3d/`. Zweitstart-Zähler prüft laut Spec
  Claude; ein Browser-/iPhone-Sichttest fand hier nicht statt.

## Freigabe (Claude 2026-09-29 21:48)

`src/v3d/messung.ts` ist für A5 **freigegeben** (nur: Mess-Bot der Stufe "Lauf (Bot)" auf
Rhythmus-mit-Säule, S = 60, und was dafür nötig ist). Dann Tests/`tsc`/Build, Status
`IMPL_DONE`, Nachtrag.
