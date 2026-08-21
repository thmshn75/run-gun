# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E9 — Sperren mit Waffe dahinter.**

Dritte Etappe der Scope-Erweiterung V1.3 (siehe `docs/plan.md`, Abschnitt „Sperren"). Eine
Sperre steht quer über einen **Teil** der Straße, hat eigene Lebenspunkte, und dahinter liegt
eine bessere Waffe.

**Boss, Leveltabelle, Trupps und die Tore werden nicht umgebaut.** Die mehrspurigen Tore sind
E10.

---

## Der Kern: der Zielkonflikt, nicht das Hindernis

Waffen-Tore gibt es bereits (`gates.weaponGateEvery`, jedes vierte Torpaar) — dort ist die
Waffe **gratis**, man wählt nur die Seite. Die Sperre ist das Gegenstück: Die Waffe dahinter
ist besser, **kostet aber Feuerkraft**. Wer sie will, muss früh auf die Sperre schießen und
schießt in dieser Zeit nicht auf die anlaufenden Gegner.

Daraus folgen zwei Regeln, die nicht verhandelbar sind:

1. **Eine Sperre erscheint immer zusammen mit anlaufenden Gegnern**, nie in einer ruhigen
   Passage. Ohne diese Gleichzeitigkeit ist sie nur eine Verzögerung und die ganze Mechanik
   sinnlos.
2. **Es gibt immer einen freien Weg daneben.** Wer die Waffe nicht will oder nicht schafft,
   fährt vorbei und verliert nichts außer der Waffe. Eine Sperre, die man durchschießen
   *muss*, wäre bei starkem Gegnerdruck eine Sackgasse.

## Verlangte Umsetzung

1. **Neues System `src/systems/blockers.ts`**, aufgebaut wie `gates.ts`: fester Pool, einmalig
   erzeugt, Recycling über `setActive(false)/setVisible(false)`, **kein** `create()` oder
   `destroy()` zur Laufzeit. Poolgröße mit Herleitung in `balance.ts`.

2. **Eine reine Funktion für die Platzierung**, etwa
   `computeBlockerPlacement(roadHalfWidth, minGapPx, rng)`, ohne Phaser-Abhängigkeit. Sie
   liefert Mitte und Breite der Sperre und **garantiert** einen freien Durchlass. Der Durchlass
   muss mindestens so breit sein wie die Kollisionshülle der Truppe
   (`crowd.hullWidthFigures` Figurenbreiten) plus eine Marge aus `balance.ts` — sonst passt
   die Truppe rechnerisch durch, in Wirklichkeit aber nicht.

3. **Lebenspunkte hergeleitet, nicht geraten.** Die Sperre soll bei der Feuerkraft, die im
   jeweiligen Level erreichbar ist, in **etwa 1,5 bis 2,5 Sekunden** fallen — lang genug, dass
   das Umlenken der Feuerkraft spürbar ist, kurz genug, dass es sich lohnt. Nutze dafür
   dieselbe Referenzrechnung wie der Boss (`referenceFirepower` und
   `getCrowdDamageMultiplier` aus `src/systems/crowdDamage.ts`), damit beide Seiten nicht
   auseinanderlaufen. Rechenweg als Kommentar.

4. **Die Waffe dahinter** ist ein eigenes Objekt, das **erst einsammelbar wird, wenn die Sperre
   zerstört ist**. Wird die Sperre nicht zerstört, fahren Sperre und Waffe gemeinsam am
   Spieler vorbei und werden recycelt. Welche Waffe erscheint, wählt der Spawner aus den
   vorhandenen Typen; sie darf **nicht** die aktuell getragene sein.

5. **Berührung einer noch stehenden Sperre** kostet Figuren wie ein schwerer Gegner (Wert in
   `balance.ts`). Dabei gilt die Trefferprüfung aus Commit `729df4d` unverändert: Ein Treffer
   zählt nur bei echter Berührung einer Figur, nicht der Hülle allein.

6. **Sperren erscheinen nur in Leveln, deren Leveltabelle sie vorsieht.** Das Feld
   `reserved.blockers` existiert bereits in `src/config/balance.ts` und ist ab Level 7 auf
   `true` gesetzt; es wird jetzt wirksam. Häufigkeit als eigener Wert je Level.

7. **Die Sperre trifft der Beschuss der Truppe wie ein Gegner, sie ist aber keiner:** Sie
   droppt keine Münzen, zählt nicht als Abschuss und taucht nicht im Gegner-Pool auf.

## Ausdrücklich nicht ändern

- Tore (`src/systems/gates.ts`), einschließlich der bestehenden Waffen-Tore.
- Boss, Leveltabelle, Trupps, Truppe des Spielers, Menü, Titelbildschirm, Speicherformat.
- Die Preise aus dem letzten Task.
- Keine neuen Bilddateien: Die Sperre wird aus vorhandenen Mitteln gezeichnet (Rechteck mit
  Rahmen, wie die Tore). Die Waffensymbole `weapon-*-gate` existieren bereits.

## Reißleine

Fühlt sich die Sperre nach einem Balance-Zyklus wie eine reine Verzögerung an statt wie eine
Entscheidung, liegt es an der Gleichzeitigkeit mit Gegnern — **erst diese verschärfen**, und
erst danach über die Lebenspunkte nachdenken. Bleibt es zäh: melden, nicht weiter drehen.

## Akzeptanzkriterien

1. `computeBlockerPlacement` ist eine reine Funktion ohne Phaser-Import. Ein Unit-Test über
   mindestens 500 Zufallswerte weist nach, dass **immer** ein Durchlass bleibt, der breiter ist
   als die Kollisionshülle der Truppe plus Marge — und dass die Sperre nie über den
   Straßenrand hinausragt.
2. Ein Unit-Test weist nach, dass die Lebenspunkte der Sperre bei der Referenz-Feuerkraft des
   jeweiligen Levels eine Zerstörungsdauer zwischen 1,5 und 2,5 Sekunden ergeben — geprüft für
   mindestens die Level 7, 9 und 12 und für die Kaufstände „nichts gekauft" und „voll
   ausgebaut".
3. Sperren erscheinen ausschließlich in Leveln mit `reserved.blockers: true` und nie ohne
   gleichzeitig anlaufende Gegner.
4. Die Waffe hinter der Sperre ist erst einsammelbar, nachdem die Sperre zerstört wurde, und
   ist nie die aktuell getragene Waffe.
5. Sperren nutzen einen eigenen festen Pool mit dokumentierter Herleitung; kein `create()`
   oder `destroy()` zur Laufzeit.
6. Eine zerstörte Sperre droppt keine Münzen und zählt nicht als Abschuss.
7. Tore, Boss, Trupps, Leveltabelle, Menü und Speicherstand verhalten sich unverändert.
8. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

Kriterien 1, 2, 5 und 8 prüfst du selbst über Tests und Diff. Kriterien 3, 4, 6 und 7 prüft
Claude am laufenden Spiel; ob der Zielkonflikt sich richtig anfühlt, entscheidet Thomas am
iPhone.

## Implementation Summary

<!-- Von Codex auszufüllen -->

## Verification

<!-- Von Codex auszufüllen -->
