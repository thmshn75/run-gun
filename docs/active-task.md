# Active Task

## Status
`IMPL_DONE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Stand des Reviews (2026-09-19)

**Code-Review bestanden.** Der Rueckbau des Trefferblitzes ist vollstaendig (kein
`trefferBlitzMs` mehr in `src/`, Kommentar an `BALANCE.feedback` wiederhergestellt und
um das zweite Nein ergaenzt). Vorzeichen und Buchfuehrung des Rueckstosses sind in
`src/systems/rueckstoss.ts` gekapselt, die Tests dazu rechnen ueber mehrere Bilder.
`npm run check`, `npm test` (37 Dateien, 399 Tests) und `npm run build` sind gruen —
selbst im Terminal nachgelaufen, nicht aus dem Codex-Log uebernommen.

**Offen und nur von Thomas zu erledigen:**

- **A14 — iPhone-Test.** Fuehlen sich die Treffer beantwortet an, ohne dass das Bild
  unruhig wird? Bis dahin gilt der Task nicht als erfuellt.
- **Leistungs-Reissleine.** Der Bildzeit-Median unter voller Horde ist nicht gemessen
  worden; dafuer fehlt Codex das Geraet. Steigt er ueber 16,7 ms, faellt zuerst C
  (Zerplatzen), dann B (Rueckstoss).

Der Status bleibt deshalb `IMPL_DONE` und **nicht** `APPROVED`.
