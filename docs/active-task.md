# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D7 — Level + 3D-Lobby Stufe 1 (Plan V7)

**Umgesetzt von Claude direkt** (Thomas 2026-10-01 12:15: "ohne Codex ok weiter"). Vorgänger D6
(Endboss-Tod, Ergebnistafel) in der Git-Historie (Commit e910763).

## Umgesetzt
- **10 Level** (`balance3d.ts`, `STUFEN`): Wellen 3/3/3/3/4/4/4/4/5/5, Zombies gesamt 750 → 1230,
  Endboss 3000 → 5250, Mini-Boss 400 → 760, Säulen 150 → 285, `kMax` 5 ab Level 5. Level 1 =
  bisheriger Stand.
- **Fortschritt / beste Läufe** (`speicher.ts`): Sieg schaltet das nächste Level frei, schnellster
  Sieg je Level unter `rg3d.beste.v1`; Testgelände und Prüfläufe zählen nicht.
- **Lobby** (`oberflaeche.ts` `fuelleLobby`, `einstieg.ts`): nach "RUN GUN 3D" Level-Karte 1–10
  (gesperrt = Schloss, geschafft = gold), SPIELEN · LEVEL x, Testgelände je Fahrzeug (Level 1,
  Säulen P 10, Fahrzeug sofort im Einsatz), Beste Läufe. Ergebnistafel NOCHMAL / WEITER / LOBBY;
  ZURÜCK im Lauf → Lobby, in der Lobby → Hauptmenü. Mit `?pruefung…` direkter Start wie bisher.
- Boss-Balken nehmen das Maximum des laufenden Levels.

## Nachweise
- Bots (`npm run bots3d`, 30 Spielweisen × 20 Seeds je Level): passiv 0/20 auf allen Leveln,
  beste Spielweise 20/20, gewinnende Spielweisen 24/22/19/17/15/13/10/8/6/3.
- `tests/v3dLevel.test.ts` (Tabelle monoton, passiv verliert überall, Freischalten/Bestzeit,
  2D-Stand unberührt, kaputte Einträge, Lobby-Weichen); 651 Tests grün, Build ok.
- Browser 390×844: Lobby leer und mit Fortschritt, Testgelände Panzer, Start Level 3.
