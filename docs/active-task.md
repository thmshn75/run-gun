# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D6 — Elite-Endboss, Sieg und Niederlage (Plan V7)

**Umgesetzt von Claude direkt** (Thomas 2026-10-01 11:59: "setze ohne Codex um" — Codex am
Limit). Vorgänger D5e (Eis-Säulen) ist abgenommen: Browser ok (Thomas 11:56), iPhone-Messung
alle Stufen grün (Thomas 12:05); Spec und Nacharbeiten 1–8 in der Git-Historie (Commit 269e998).

**Bestand vorher:** Endboss erschien und verschwand bei B = 0 schlagartig; bei Sieg/Niederlage
sofort ein schlichter Textkasten "SIEG · 48,7 s". Bots belegten beide Ausgänge schon
(passiv 0/20, rhythmus 20/20).

## Umgesetzt
- **Endboss-Tod** (`lauf.ts`, `eliteSterben`, `ELITE_TOD`): kippt in 1,6 s nach hinten um, sinkt
  0,8 m ein, drei Explosionen (0 / 0,45 / 1 s), nach 2,5 s weg; Lebensbalken aus. Läuft auch im
  Nachlauf nach dem Sieg weiter. Zurücksetzen in `setzeBossZurueck` und beim Vorgänger.
- **Niederlage:** Die Truppe fällt im Nachlauf um (`fallen`-Bewegung).
- **Ergebnistafel** (`einstieg.ts`, `endeTafel`, `zaehleEnde`): erscheint 2,5 s (Sieg) bzw. 2 s
  (Niederlage) nach dem Ende; großer Titel SIEG (gold) / NIEDERLAGE (rot), Zeit, Zombies
  besiegt (Summe `zombieGefallen` + `spezialTreffer`), Säulen gebrochen, größte Truppe;
  NOCHMAL/ZURÜCK wie bisher.
- **Prüfschalter** `?pruefung=1&schnell=1`: zwei Wellen à 60, Endboss nach 10 s mit 400 LP.

## Nachweise
- `tests/v3dEnde.test.ts`: Kipp-Verlauf monoton, Verschwinden nach 2,5 s, Tafel nach dem
  Abgang, Zählung = verschwundene Zombies im echten Kernlauf, Prüfschalter nur mit pruefung=1.
- `npm run check`, `npm test` (644), `npm run build`, `npm run bots3d` (unverändert) grün.
- Browser 390×844, `?pruefung=1&schnell=1`: Sieg (Endboss kippt mit Explosion, Tafel SIEG
  0:48), Niederlage (Truppe liegt, Tafel NIEDERLAGE 1:55).

## Bekannt, nicht beauftragt (Kandidat D8)
Bei der Niederlage verschwindet die Horde im Moment des Durchbruchs, statt über die Truppe
herzufallen.
