# Active Task

## Status
`IDLE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
_(kein aktiver Task — bereit für den nächsten)_

**W4-Nachbesserung „Wände treffen" fertig** (2026-08-22, Claude direkt, nach Thomas'
iPhone-Rückmeldung „voll schwer überhaupt Wände wegzubekommen am Anfang"). Ursache war
nicht die Härte der Wand, sondern Unerreichbarkeit: Der Fahrbereich endete auf Spuranteil
0,519, die Wandzone beginnt bei 0,660, und der starre Senkrechtschuss lief perspektivisch
aus der Wandzone heraus — das Segment direkt neben der Truppe war nicht beschießbar.
Zwei Änderungen, beide nötig (die erste allein traf gemessen gar nichts mehr):
1. **Spurtreue Flugbahn** (`BALANCE.projectile.laneFollow`, `weapons.ts`,
   `roadGeometry.getLaneRatio/getLaneSlope`): Jede Kugel behält ihren Anteil an der halben
   Straßenbreite über den ganzen Flug, statt senkrecht aus der Spur zu laufen.
2. **Fahrbereich bis an die Wand** (`roadGeometry.getDriveLimitHalfWidth`, `crowd.ts`,
   `BALANCE.walls.driveIntoWallFigures`): Der Anker darf bis Wandinnenkante + halbe
   Formationsbreite + halbe Figurenbreite, Straßenkante bleibt harte Grenze.
Nachweise: 103 Tests grün (neu `tests/wallHits.test.ts`), `npm run check` sauber,
Browser-Lauf gemessen — Segmente fallen von 4 auf 0 HP, Anker 329,1 wie berechnet,
Kugel-laneRatio 0,756 in der Wandzone, Neigung 5,8°. **Offen: Thomas' iPhone-Urteil.**

**W1–W4 sind maschinenseitig fertig** (2026-08-22, Claude direkt). W4: Dauerwände
beidseitig (lückenlose Kette, `chainAccumulatorPx`), Goodies unregelmäßig mit Garantie
(`reinforcementPlan.ts`: links Truppe mit Operator-Anzeige und Sofortwirkung, rechts
Waffen, Rest Münzen), Mittel-Tore nur noch DMG/RATE/SPD, Pool 20 hergeleitet.
Nachweise: 94 Tests grün (Property-Test fand und fixte den Rundungs-Randfall bei
Truppe 1), Browser-Sichtprüfung. **Offen: Thomas' iPhone-Urteil W1–W4** — danach W5
(Boss ohne Schuss, Stärke aus Spielerstand).

**W1–W3 sind maschinenseitig fertig** (2026-08-22, von Claude selbst auf Thomas'
Anweisung). W3: Horden laufen mittig (Spawn-Bänder in `balance.ts`, Dichteregel
`computeHordeOffsets` — stauchen statt verkleinern, Deckel 200 px unten hergeleitet),
Typenwahl vor Layout (leichte Keile stauchen dichter als Schwere), Horden ab Level 1,
squadChance je Level angehoben. Wände: orange, rund, halbtransparent, Inhalt sichtbar,
Überhang nach außen; Tore dauerhaft zweispurig (W4-Zielbild). Nachweise: 88 Tests grün
(neu: Dichteregel, Mittelband-Zentrierung 500 Züge, Budget-Deckel), Browser-Sicht-
prüfung. **Offen: Thomas' iPhone-Urteil W1–W3** — danach W4 (Seiten-Ökonomie).
