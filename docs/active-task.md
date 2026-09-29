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

## Nacharbeit 1 (Thomas 2026-09-29 22:02, iPhone-Spieltest) — 4 Punkte

**1. Truppe nie unter 1 (Rechenkern, Regel 2 ändern — ausdrücklich erlaubt):** Beim
Aussenden bleibt immer mindestens 1 Soldat: `g = min(floor(sendeRest), floor(T) − 1)`,
gesendet wird nur bei `T ≥ 2`; bei `T < 2` ist `sendeRest = 0`. `rechnung.ts`,
`tests/v3dRechnung.test.ts` (Randfall: Mitte mit `T = 1` sendet nichts, `T` bleibt 1) und
Bots (`rhythmus*`: zurück nach links bei `T < 2` statt `< 1`) anpassen; `npm run bots3d`
ausführen und die Tabelle in den Bericht (Erwartung: praktisch unverändert).

**2. Finger verliert den Kontakt (`steuerung.ts`) — Befund Claude:** `down` ignoriert jede
neue Berührung, solange `id !== null`. Verschluckt iOS einmal `pointerup`/`pointercancel`
(oder feuert `lostpointercapture` unerwartet), bleibt die alte `id` hängen und **alle
weiteren Berührungen werden ignoriert** → "Finger verliert den Kontakt". Änderung:
- `pointerdown` übernimmt **immer** den neuen Finger (alte `id` verwerfen, Capture neu).
- `pointerup`/`pointercancel` zusätzlich auf `window` hören (nur für die aktive `id`).
- `lostpointercapture` **nicht** mehr als Loslassen werten (nur Capture neu setzen, solange
  kein `pointerup` kam).
- `pointermove` akzeptiert auch Bewegungen der aktiven `id`, die am `window` ankommen.
- Test (reine Logik mit simulierten Ereignissen): hängende `id` + neues `pointerdown` →
  Steuerung folgt dem neuen Finger; `lostpointercapture` allein beendet nicht.

**3. Drehung rechts falsch (`lauf.ts`, `saeulenBlick`) — Befund Claude:** Die Figur schaut
bei Drehung 0 nach −z; der Drehwinkel für Blickrichtung `(dx, dz)` ist
`θ = atan2(−dx, −dz)`. Aktuell `−atan2(dx, dz)` → bei der Säule vorn (dz ≈ −12) ergibt das
fast 180°, die Truppe schaut zur Kamera. Formel korrigieren; Mündungsblitze mit derselben
Drehung. **Test:** Vorwärtsvektor `(0,0,−1)` um θ gedreht zeigt zur Säule
(Skalarprodukt > 0,95) für mehrere Truppenlagen.

**4. Zähler für Horde und Bosse:**
- Über der Hordenvorderkante eine Zahl **`ceil(Z)`** (gleiche Anzeige-Technik, ≤ 4×/s neu
  gemalt), dazu oben in der Statuszeile "Welle n/3".
- Über jedem sichtbaren Boss ein **Lebensbalken** (Canvas-Sprite, ~2,5 m breit, rot auf
  dunkel) mit Zahl `ceil(B)`; verschwindet mit dem Boss.
- Tests: Anzeige folgt `Z`/`B` (Drosselung), Welle-Zähler folgt `welle`-Ereignissen.

Alles andere unverändert. `npm test`, `tsc`, `build`, `bots3d` grün; Status `IMPL_DONE`,
Nachtrag.

## Nachtrag zur Implementation (Codex 2026-09-29)

- Der Rechenkern lässt beim Aussenden mindestens einen Soldaten stehen und löscht bei
  `T < 2` den Sendrest. Beide Rhythmus-Bots wechseln dann zurück nach links.
- Die Fingersteuerung übernimmt neue Berührungen auch bei hängender alter ID; Bewegungen
  und Ende werden zusätzlich am Fenster empfangen. Verlorener Pointer-Capture beendet
  die aktive Berührung nicht. Die Säulendrehung zeigt nun zur Säule.
- Die Horde trägt `ceil(Z)` über ihrer Vorderkante, sichtbare Bosse einen roten
  Lebensbalken mit `ceil(B)`, und die Statuszeile zeigt `Welle n/3`. Anzeigen werden
  höchstens viermal pro Sekunde neu gemalt.
- Prüfung nach letztem Code-Stand: `npm test` 62 Dateien, 549 Tests grün;
  `npm run check`, `npm run build`, `npm run bots3d`, `git diff --check` Exit 0.
  Hauptbündel 1.468.039 Byte unverändert; kein `http` in `src/v3d/`.
- Botwerte (`Siege/20`, mittlere Dauer, mittlere gefallene Säulen): passiv
  `0, 115,6 s, 0,00`; nurLinks `0, 75,0 s, 0,00`; rhythmus(40)
  `20, 123,1 s, 0,00`; rhythmusSaeule(60) `20, 108,0 s, 2,05`;
  rhythmusSaeule(15) `0, 118,9 s, 2,00`; rhythmusSaeule(25)
  `0, 124,8 s, 3,00`.
- iPhone-Sichtprüfung und Zweitstart-Zähler wurden hier nicht erneut ausgeführt;
  letzterer bleibt laut Akzeptanzkriterium beim Claude-Review.

## Nacharbeit 2 (Claude-Review 2026-09-29 22:25) — nur ein Punkt

Browserbefund: Die Hordenzahl (`hordeZahl`, `y = 2.8`, `z = −y + 1`) liegt fast auf der
Frontzahl (`frontZahl`, `y = 2.8`, `z = min(−1, −y + 2.5)`) → am Bildschirm übereinander
("236" über "7"), unlesbar. Änderung nur in `src/v3d/lauf.ts`: Hordenzahl auf **`y = 4.6`**
(über dem Mini-Boss-Balken) und Schrift/Hintergrund **dunkelrot** (`#6e1414`, weiße Zahl),
damit sie klar zur Horde gehört; Frontzahl bleibt. Falls `ZahlAnzeige` dafür eine Farboption
braucht: optionaler Konstruktor-Parameter in `anzeigen.ts` (Standard unverändert). Test:
Hordenzahl und Frontzahl haben ≥ 1,5 m Höhenabstand. `npm test`, `tsc`, `build` grün;
Status `IMPL_DONE`, Nachtrag.

**Punkt B (Thomas 22:12: "ausgesendete Truppen springen manchmal komisch hin und her") —
Befund Claude:** `baueLaufSpuren` dünnt bei vollem Bild (`faktor ≥ 2`) über den
**Listenindex** aus (`i % gewicht`). Erreicht der älteste Trupp die Front und fällt aus der
Liste, verschieben sich alle Indizes → die Auswahl kippt auf die jeweils andere Hälfte
der Soldaten, jede sichtbare Figur springt auf die Nachbarspur. Änderung (`lauf.ts`):
- Jeder Kernsoldat bekommt beim Anlegen eine **feste Nummer** (`nummer`, schon vorhanden in
  `SpielLauf.schritt`), wird in `Sicht.soldaten` und `LaufSoldat` mitgeführt; Ausdünnen über
  `s.nummer % gewicht` statt Index (gilt auch in `spurFaktor`).
- Test: Liste mit `faktor = 2`; ältesten Trupp entfernen → alle weiterhin sichtbaren
  Figuren behalten ihr `x` exakt (keine Figur wechselt die Spur).
- Prüfe beim Umsetzen, ob es **weitere Sprungquellen** gibt (z. B. `startX`-Übergang,
  `sicht.x`-Klemme, Wechsel `figurFaktor`), und nenne sie im Bericht; beheben nur, wenn es
  eindeutig ein Sprung ist (Positionsänderung > 0,3 m in einem Bild ohne Spielgrund).

## Nachtrag zur Nacharbeit 2 (Codex 2026-09-29)

- Hordenzahl auf 4,6 m gesetzt (1,8 m über der Frontzahl), mit dunkelrotem Hintergrund
  `#6e1414` und weißer Zahl. Die übrigen Zahlen behalten ihre bisherige Farbe.
- Jeder Läufer trägt seine feste Nummer bis in die Darstellung. Sichtauswahl und
  Sichtfaktor verwenden diese Nummer, sodass das Ausscheiden des ältesten Läufers
  die Spuren der übrigen Figuren nicht wechselt.
- Zusätzliche Sprungquelle `startX` behoben: Die seitliche Bewegung vom Startplatz
  zur Spur ist nun auf 0,3 m pro 0,1 s begrenzt. Die `sicht.x`-Klemme betrifft
  nur Trupps mit Frontziel und begrenzt auf ±2,8 m; der Wechsel des Sichtfaktors
  kann Figuren ein- oder ausblenden, versetzt aber keine weiter sichtbare Figur.
- Prüfung nach letztem Code-Stand: `npm test` 62 Dateien, 552 Tests grün;
  `npm run check`, `npm run build`, `git diff --check` Exit 0.
  Hauptbündel 1.468.039 Byte unverändert; kein `http` in `src/v3d/`.
  Browser-/iPhone-Sichtprüfung und Zweitstart-Zähler wurden hier nicht erneut
  ausgeführt; letzterer bleibt laut Akzeptanzkriterium beim Claude-Review.
