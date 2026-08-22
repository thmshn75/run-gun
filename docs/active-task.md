# Active Task

## Status
`IDLE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
_(kein aktiver Task — bereit für den nächsten)_

**Ton fertig** (2026-08-22, Claude direkt, Thomas: "zuerst den Ton und den Boss ohne
Schuss"). Vorher gab es im Projekt KEIN Audio - kein AudioContext, keine Datei.
Gebaut: synthetischer Ton per Web Audio (keine Audiodateien, nichts nachzuladen,
offline identisch, keine Kosten), sieben Klaenge in `src/systems/audio.ts`, die
Drosselregel phaserfrei und testbar in `src/systems/audioPlan.ts`.
- **Klaenge:** Schuss (Rauschstoss + tiefer Koerper), Gegner faellt (Gleitton 420->140 Hz),
  Wandbruch (Rauschen 3200->260 Hz + Wuchtanteil), Verstaerkung auf/ab (Terz A5->Cis6
  bzw. A5->F5 - die Wandbelohnung kann die Truppe auch verkleinern), Waffenwechsel
  (C-Dur-Dreiklang), eigener Schaden (Absturz 200->55 Hz). Muenzen bewusst stumm -
  gleiche Entscheidung wie bei den Popups.
- **Ratenbremse statt fester Mindestpause.** Der erste Entwurf hatte eine feste Pause
  von 125 ms (= 1000 / shotsPerSec.cap). Der Test fand den Fehler: Trifft der
  Waffentakt nicht auf das Drosselraster, fallen Toene aus - die Minigun (17,6
  Salven/s) klang mit 5,9 Toenen/s LANGSAMER als die Standardwaffe mit 8. Jetzt eine
  Rate mit zwei Nachhol-Marken; gemessen 8,0/s fuer beide Waffen.
- **Stimmen-Deckel 6** fuer die haeufigen Toene (Splash toetet bis zu acht Gegner im
  selben Bild). Wandbruch, Schaden, Verstaerkung, Waffenwechsel umgehen ihn - sie
  duerfen nie im Schussgeraeusch untergehen.
- **iOS:** Freischaltung uebernimmt Phasers Sound-Manager (Nutzergeste); wird ein Ton
  vor der Freigabe angefordert, holt `play()` ihn nach dem `resume()` nach statt ihn
  verfallen zu lassen. Ton-Schalter im Menue rechts neben dem Kontostand (nicht im HUD:
  die ganze Spielflaeche ist Drag-Steuerung), Zustand in eigenem localStorage-Schluessel.
  **ACHTUNG beim Test:** Steht der seitliche Stummschalter des iPhones auf lautlos,
  spielt iOS auch Web Audio nicht ab - das ist Systemverhalten, kein Fehler.
Nachweise: 128 Tests gruen (neu `tests/audioPlan.test.ts`), `npm run check` sauber,
Browser-Lauf gemessen - AudioContext running/entsperrt, alle sieben Klaenge erzeugen
die geplanten Knoten, **Schall am Analyser gemessen**: Ruhe 0,000 / Wandbruch 0,290 /
stummgeschaltet 0,000. Menue-Schalter sitzt bei x=333 ohne Kollision mit dem Kontotext.
**Offen: Thomas' iPhone-Urteil.**

**Lebendigkeit (ohne Ton) fertig** (2026-08-22, Claude direkt). Thomas: „immer noch
nicht so wie in den App Store spielen — ich kann dir aber auch nicht sagen, woran es
liegt." Beim Nachsehen gefunden: Im ganzen Spiel bewegte sich nichts außer Positionen.
Kein Ton (keine Audio-Datei, kein Sound-Aufruf), keine Laufbewegung (Figuren sind
`add.image` ohne `anims` — sie *glitten* über die Straße), keine Kamerareaktion, keine
Tweens, keine Quittung beim Einsammeln. Trefferblitz an Gegnern gab es bereits
(`setTintFill`) — die erste Meldung an Thomas war da falsch und wurde korrigiert.
Thomas' Wahl aus drei Optionen: „Lebendigkeit zuerst, ohne Ton".
Gebaut (neu `src/systems/gamefeel.ts` als phaserfreie, testbare Rechnung):
- **Laufbewegung** für Truppe und Gegner: Wippen im Schrittrhythmus, Frequenz aus
  `scrollSpeed` und Schrittlänge abgeleitet statt geraten (3,3 Hz bei 135 px/s).
  Betrag statt Sinus — ein Läufer fällt und stößt sich ab. Taktversatz je Figur über
  den goldenen Winkel, damit die Truppe kein hüpfender Block ist.
- **Neigung beim Lenken** bis 9°, geglättet mit 90 ms Halbwertszeit
  (frameratenunabhängig). Die Kollisionshülle bleibt bewusst ruhig, sonst hinge
  Schaden am Zufall des Laufzyklus.
- **Quittungen** beim Einsammeln: hochfliegende Zahl mit Aufploppen (`popups.ts`,
  fester Pool 16) für Verstärkung (+N) und Waffenwechsel. Münzen bewusst ohne Popup —
  bei 3 Münzen je Segment wäre das Lärm statt Rückmeldung.
- **Kamerawackeln** nur bei Splash-Explosion und eigenem Schaden.
Nachweise: 119 Tests grün (neu `tests/gamefeel.test.ts`), `npm run check` sauber,
Browser-Lauf mit manuell getaktetem Crowd-Update gemessen (der Hintergrund-Tab wird
gedrosselt, deshalb nicht über die Spiel-Loop): Wippweite 2,98 px bei Sollwert 3,
6 Figuren auf 6 verschiedenen Höhen, Neigung 0 in Ruhe / −0,115 rad beim Lenken,
Hülle unverändert bei y=714, Popups steigen 600 → 585 px und räumen sich auf.
**Offen: Thomas' iPhone-Urteil. Ton ist bewusst noch nicht gebaut.**

**Wandhärte neu hergeleitet fertig** (2026-08-22, Claude direkt). Thomas: „immer noch
schwer was zu holen, speziell in weiteren Level, die Zahlen steigen zu schnell an."
Das alte Modell koppelte die Wand-HP 1:1 an die Feuerkraft — die Fokusdauer blieb über
den ganzen Run bei 0,70 s (Aufrüsten war gegen Wände folgenlos), und die Zahl hing an
der Waffe: bei Truppe 8 zwischen 4 (Minigun) und 71 (Schrot), im Vollausbau 1482.
Neu in `blockerPlan.ts`: Zielhärte aus Levelnummer und gedämpfter Truppengröße, die
Waffe geht gar nicht mehr ein (sie lässt die Wand schneller fallen statt mitwachsen),
plus harter Fokus-Deckel `blockers.maxFocusSec` 0,6 s für jede Kombination aus Level,
Truppe und Waffe. Verlauf jetzt 3 HP / 0,50 s (L1 Start) bis 254 HP / 0,12 s (L12
Vollausbau); Waffenwechsel bei Level 3 bewegt die Zahl nur noch zwischen 3 und 12.
Nebenbefund, nicht behoben: Minigun und Rakete feuern nur mit 3 Figuren
(`shootersPerSalvo`) und lagen ohne Deckel bei 1,25 s je Segment — schlechter als die
Standardwaffe. Der Deckel fängt das ab, die Waffenbalance selbst bleibt offen.

**W4-Nachbesserung „Tempo" fertig** (2026-08-22, Claude direkt, Thomas: „die Wände sind
zu schnell — mach die langsamer", Wahl aus drei Optionen: „einfach alles langsamer").
`scrollSpeed` 180 → 135 (−25 %): Eine Wand braucht 5,14 s statt 3,86 s durchs Bild.
Drei Werte mitgezogen, damit nur das Tempo sich ändert und nicht still die Balance:
- `scenery.spawnIntervalMs` 400 → 533 (Takt ist zeitbasiert; sonst rücken die Häuser
  enger zusammen und das abgenommene Stadtbild verdichtet sich)
- Goodie-Werte ×1,333 (`reinforcementChance` 0.12 → 0.16, `weaponChance` 0.08 → 0.107,
  `goodieMaxDry` 16 → 12), damit die Kadenz **pro Sekunde** bleibt (5,6 s / 8,3 s)
- `pools.coins` 48 → 64 (Münzen brauchen 6,25 s statt 4,69 s durchs Bild)
**Nicht behoben und bewusst so:** Wände fahren linear, Straße und Häuser perspektivisch —
am Horizont bleibt die Wand 5,1× schneller als die Kulisse. Das Verhältnis hängt nicht an
`scrollSpeed`; Thomas hat die Perspektiv-Kopplung als Option gesehen und abgewählt.
Gegner hängen nicht an `scrollSpeed`, das Kampftempo ist unverändert.
Nachweise: 103 Tests grün, Browser-Lauf gemessen — Wandtempo 135 px/s, 11 von 11
Segmenten getroffen, Goodie-Kadenz im erwarteten Bereich.

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
