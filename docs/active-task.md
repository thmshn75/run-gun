# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Stand des Reviews (2026-09-19)

**Code-Review bestanden.** Der Rueckbau des Trefferblitzes ist vollstaendig (kein
`trefferBlitzMs` mehr in `src/`, Kommentar an `BALANCE.feedback` wiederhergestellt und
um das zweite Nein ergaenzt). Vorzeichen und Buchfuehrung des Rueckstosses sind in
`src/systems/rueckstoss.ts` gekapselt, die Tests dazu rechnen ueber mehrere Bilder.
`npm run check`, `npm test` (37 Dateien, 399 Tests) und `npm run build` sind gruen —
selbst im Terminal nachgelaufen, nicht aus dem Codex-Log uebernommen.

**A14 am 2026-09-19 von Thomas am iPhone abgenommen: "funktioniert gut".** Damit sind
alle Akzeptanzkriterien erfuellt.

**Nachgelagert offen:**
- **Leistungs-Reissleine.** Der Bildzeit-Median unter voller Horde ist nicht gemessen
  worden; dafuer fehlt Codex das Geraet. Steigt er ueber 16,7 ms, faellt zuerst C
  (Zerplatzen), dann B (Rueckstoss).

Der Bildzeit-Median ist nicht als Zahl gemessen worden; Thomas' Abnahme deckt ihn nur
als Eindruck ab ("funktioniert gut"). Faellt spaeter Ruckeln unter voller Horde auf,
ist die Reissleine oben der Weg.
