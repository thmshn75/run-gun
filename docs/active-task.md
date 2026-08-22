# Active Task

## Status
`IDLE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
_(kein aktiver Task — bereit für den nächsten)_

**W2 ist maschinenseitig fertig** (2026-08-22, von Claude selbst auf Thomas' Anweisung):
Wandsegmente links/rechts (Sperren-System in-place umgebaut, Umbenennung in W6), Breiten-
budget in `balance.ts`, Spawner und Tore auf Spielfeld-Restbreite, HP aus Feuerkraft-
Herleitung, Münz-Drop, Waffen-Segmente jedes 3. Segment. Optik nach Thomas-Feedback
nachgezogen: Wände breiter (laneShare 0.26, Maximum bei 90-px-Torspuren), halbtransparent,
Inhalt (Waffe/Münze) ab Spawn dahinter sichtbar. Nachweise: 83 Tests grün (Budget,
Torspuren ≥ 90 px, kein Spawn in der Wandzone, Transparenz-Regression), Browser-
Sichtprüfung. **Offen: Thomas' iPhone-Urteil W1+W2** — danach W3 (Horden mittig).
