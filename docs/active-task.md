# Aktive Aufgabe

Status: SPEC_READY

## Aufgabe: Arsenal (Plan V7, D7-Lobby Punkt 3)

Plan V7: "Arsenal (Reihenfolge der Fahrzeuge in den Eisblöcken selbst festlegen) — zuletzt."
Vorgänger: Werkstatt (Commit 965d991) und Level-Neukalibrierung (Commit 7ceda1f), Thomas
2026-10-02 07:06 "ok mach weiter". Arsenal ist **kostenlos** (Plan nennt keinen Preis).

**Ist-Zustand:** Alle Level haben `saeulen: ['humvee','haubitze','panzer','hubschrauber','mecha']`
(aus `BASIS`). Die Darstellung baut die Eis-Plätze anfangs mit `LEVELS[0]`
(`szene.ts` ~Z. 85–95, 202, 219; `lauf.ts` ~Z. 783 und `setzeEisZurueck` ~Z. 859), ordnet die
Miniaturen danach aber über `z.level.saeulen` (`ordneMiniaturen`). Je Fahrzeugart gibt es genau
eine Miniatur.

## Erlaubte Änderungen (abschließend)
- `src/v3d/speicher.ts` (Arsenal-Speicher), `src/v3d/werkstatt.ts` (reine Funktion
  `wendeArsenalAn`), `src/v3d/oberflaeche.ts` (Arsenal-Ansicht, Knopf in der Lobby),
  `src/v3d/einstieg.ts` (`starteLauf`), `src/v3d/lauf.ts` (Eis-Plätze nach der Reihenfolge des
  laufenden Levels statt `LEVELS[0]`), `src/v3d/szene.ts` nur falls der Anfangsaufbau sonst
  falsch steht, `tests/`, `scripts/bots3d.ts` (Info-Profile A5).
- Nicht: Kern-Formeln, Level-Tabelle, Werkstatt-Preise, 2D-Code.

## Akzeptanzkriterien

**A1 Speicher.** Schlüssel `rg3d.arsenal.v1`: `{ version: 1, reihenfolge: string[] }`. Gültig nur,
wenn `reihenfolge` eine **Permutation** genau der fünf Namen aus `BASIS.saeulen` ist; sonst (fehlt,
kaputt, doppelt, unbekannt, zu kurz) gilt die Standardreihenfolge — nie Absturz. Schreiben mit
Rücklese-Prüfung wie `kaufe` (scheitert → `false`, Ansicht zeigt "Speichern nicht möglich").
Test: 2D-Spielstand byte-gleich, alle Fehlerfälle → Standard.

**A2 `wendeArsenalAn(level, reihenfolge): Level`** (rein, `werkstatt.ts`): neues Level-Objekt
mit neuem `saeulen`-Array in der gewünschten Reihenfolge; `LEVELS` unverändert (Freeze-Test).

**A3 Lauf.** In `starteLauf`: Normallauf **und** Testgelände nach Arsenal-Reihenfolge
(Reihenfolge: Basis → Werkstatt-Stufen → Arsenal); Prüfläufe (`direkt`) und Messmodus mit
Standardreihenfolge. Die Darstellung baut die vier sichtbaren Eis-Plätze, die Abstände
(`saeulenZiele`) und die Miniatur-Zuordnung **ab dem ersten Bild** nach `z.level.saeulen` (auch
nach NOCHMAL/WEITER und Zweitstart). Test (Welt-Stub): Reihenfolge `['mecha','humvee',
'panzer','haubitze','hubschrauber']` → nach dem ersten `zeige` steht vorn der Mecha, dann
Humvee …; nach 5 Fällen wieder der Mecha mit `P × 1,5`; zweiter Lauf mit Standardreihenfolge
zeigt vorn wieder den Humvee.

**A4 Ansicht.** Knopf **ARSENAL** in der Lobby unter WERKSTATT. Eigenes Element neben
`ui.lobby` (wie die Werkstatt), liest beim Öffnen frisch. Überschrift "ARSENAL", Hinweis
"Reihenfolge der Eis-Säulen — die oberste kommt zuerst". Fünf Zeilen mit Platznummer, Name
(HUMVEE …) und zwei Knöpfen ▲ ▼ (oberste ▲ und unterste ▼ ausgegraut); jeder Tipp speichert
sofort und zeigt die neue Reihenfolge. Knopf "STANDARD" stellt die Standardreihenfolge her.
Zeilen ≥ 56 px, Tippflächen ≥ 44 px, Schrift ≥ 16 px bei 390 × 844. ZURÜCK (oben und unten)
→ `zeigeLobby()`. Test: ▲ auf Platz 5 → Mecha auf Platz 4, gespeichert; SPIELEN startet mit
dieser Reihenfolge.

**A5 Bots (Info).** `scripts/bots3d.ts` druckt zusätzlich Zeilen `Profil Arsenal …` für Level
1, 5, 10 mit Werkstatt-Maßstab (Stufen 0/1/3 wie in der Kalibrierung) in drei Reihenfolgen:
Standard, "Mecha zuerst" (`mecha, hubschrauber, panzer, haubitze, humvee`) und umgekehrt zur
Standardreihenfolge. Bestehende Zeilen unverändert (`diff` ohne `Profil`-Zeilen leer).

## Nachweise
`npm run check`, `npm test`, `npm run build`, `npm run bots3d`. Status `IMPL_DONE`, Bericht:
geänderte Stellen, A5-Zeilen, Testergebnisse, was nicht ging.

## Reißleine
Lässt sich der Anfangsaufbau der Eis-Plätze nicht ohne Umbau der Szene auf die Level-Reihenfolge
umstellen: melden; keine Lösung, bei der im ersten Bild die falsche Reihenfolge sichtbar ist.
