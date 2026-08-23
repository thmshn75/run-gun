# Uebergabe: Run & Gun

Stand: 2026-08-23 14:55

## Ziel
Kostenloses iPhone-PWA-Spiel (Auto-Runner-Shooter, Hochformat). **V1 abgenommen, Tag
`v1.0`** als Rueckschrittspunkt. Laufend: **V2-Spurenumbau**, Etappenplan `docs/plan-v2.md`
(W1–W5 und **W7 gebaut**, nur W6 offen). Live: https://thmshn75.github.io/run-gun/

## Harte Randbedingungen
- Claude ist normalerweise Architekt/Reviewer; **fuer V2 hat Thomas Direktumsetzung durch
  Claude angeordnet** (kein Codex-Handoff) — gilt, bis er es zurueckdreht.
- Testsuite und laengere Laeufe ins Terminal (`.command` + `open -a Terminal`), nie in der
  Extension.
- **Nie eine Groesse raten, die das Spiel messen kann.** Balance-Zahlen aus `balance.ts`
  ableiten, Rechenweg als Kommentar dazu. Messsonden als temporaere `tests/_*.test.ts`
  schreiben, per Terminal laufen lassen, danach loeschen.
- Objekt-Pools: kein `create()`/`destroy()` im Hot Path, jede Poolgroesse mit Herleitung.
- Gamefeel/Optik gelten **erst nach Thomas' iPhone-Test** als erfuellt, nie nach Desktop.
- Browser-Pruefung per Playwright: Der Hintergrund-Tab wird gedrosselt, die Spiel-Loop
  steht dann faktisch still. Systeme deshalb **manuell takten** (`crowd.update(16.67)` in
  einer Schleife) statt auf die Loop zu warten. Zugriff ueber `window.__runGun` (nur DEV).
- Nach jeder Etappe: `npm run check`, Terminal-Testsuite, Browser-Pruefung, commit + push,
  Deploy per `gh run watch` verifizieren.

## Fertig
- **V1 abgenommen** (2026-08-22 vormittags, Tag `v1.0` = Rueckschrittspunkt).
  `docs/plan.md` ist damit Archiv; **maszgeblich ist `docs/plan-v2.md`**.
- **W1–W5 gebaut**: Stadtbild, Waende links/rechts, Horden mittig, Seiten-Oekonomie,
  Boss ohne Schuss. Ton ist gebaut (Web Audio, Schalter im Menue) - steht nicht mehr aus.
- **Nach W5 ohne eigene Etappe dazugekommen** (alles aus iPhone-Rueckmeldungen, jeweils
  mit Messwerten in `docs/active-task.md` belegt):
  1. Perspektivische Figurengroesse (`road.perspective`), dreimal nachgeschaerft.
  2. Gegner auf Spielgroesse (`enemy.figureScale` 1,25) - vorher war ein Gegner selbst
     direkt vor der Truppe kleiner als eine eigene Figur.
  3. Schussreichweite je Waffe (`weapon.<name>.engageShare`, Flamme 158 px bis Laser
     479 px); im Bossduell ausgesetzt, sonst waere der Boss unangreifbar.
  4. Gegnermenge: Level 1 von 1,0 auf 5,2 Gegner je Sekunde, dazu breitere Spawn-Baender -
     ohne die bremst die Spurvergabe statt des Takts.
  5. Wandkette laeuft perspektivisch (Weltkoordinaten statt Bildschirmpixel), Kacheln
     schrumpfen mit der Entfernung und sehen als Quader statt als Aufkleber aus.
- **W7 gebaut (2026-08-23), iPhone-Urteil offen.** Drei Teile:
  1. **Plastische Figuren** (Codex): fuenf beleuchtete Sprites in doppelter Aufloesung.
     Neuer Faktor `render.figureTextureScale` 0,5 rechnet sie auf Spielgroesse zurueck;
     Koerpermasse an den neuen Bildern nachgemessen (`standard` 21 -> 25 px).
  2. **Gegnermenge steigt wieder mit dem Level.** Der Fund dahinter: Sie stieg nicht
     flach, sie fiel auf NULL — Level 6 lieferte 0,03 Gegner/s, Level 12 exakt 0,00.
     Ursache war ein doppelter Perspektiv-Aufschlag in `spawnSquad` (Formation wurde
     breiter geprueft als der Korridor ist), dazu eine Warteschlange ohne Verfallszeit
     und ein fester Hordendeckel. Jetzt: Level 1 6,5 Gegner/s (Bestand 22), Level 12
     12,6 (Bestand 73).
  3. **Boss pendelt nicht mehr**, er kommt nur noch langsam auf die Truppe zu
     (`advanceSpeed` unveraendert). X-Spanne im Kampf gemessen 0 px statt 216 px.
- **W7 von Thomas abgenommen (2026-08-23): "w7 ok".**
- **Gegner-Widerstand neu aufgebaut (2026-08-23), iPhone-Urteil offen.** Thomas hatte den
  Vorschlag "zaehere Gegner plus gedaempfte Kopplung" angenommen. Gemessen wurde diesmal
  die Erlebnisgroesse (Anteil Gegner, die die Truppe erreichen) statt einer Bilanz - und
  die zeigte etwas anderes als erwartet: Bis Level 6 war das Spiel folgenlos (0 % kamen
  an), ab Level 8 kippte es auf 100 %. Der eigentliche Grund war raeumlich: Die Truppe war
  130 px breit und deckte den ganzen 155 px breiten Anflugbereich ab, die Zielsuche zog
  den Rest vor sie - die Mitte war der sichere Ort. Gebaut: Levelkurve der Gegner-hp weg
  (Wachstum kommt aus Typmischung und Nachschub), Grundwerte 1/4/12 -> 2/8/23, gedaempfte
  Kopplung (`enemy.firepowerCoupling`, 0,30, ohne Waffe, mit Untergrenze), Zielsuche
  11 -> 4 px/s, Spawn-Baender breiter, Feuerlinie 130 -> 78 px. Ergebnis: jedes Level im
  Korridor 4-12 % statt 0 %/100 %, und die Position zaehlt (Mitte 13 % durch bei 8 Figuren
  Verlust, Seite 84 % durch bei 0 Verlust).
- **Trefferblitzen komplett entfernt (2026-08-23, Thomas).** Beim Boss war derselbe Zweig
  toter Code (`flashRemainingMs` wurde nie gesetzt) und ist mit raus.
- **Durchbruch-Regel gebaut (2026-08-23, Thomas: "Ja Bau das"), iPhone-Urteil offen.**
  Ein Gegner, der die Truppenhoehe passiert, ohne getoetet zu werden, kostet Figuren
  (`enemy.breakthroughDamageFactor` 0,12, aus der Sammelrate hergeleitet; Level 1 frei
  ueber `breakthroughMinLevel` 2). Damit haengt der Verlust an dem, was man verfehlt,
  statt an einer Gesamtbilanz - das war der Ausweg aus der Bistabilitaet. Wer beruehrt,
  zahlt nicht doppelt (der Gegner ist dann schon recycelt); die Unverwundbarkeit nach
  einem Treffer gilt hier bewusst nicht.
- **Level-5-Sprung behoben (2026-08-23, Thomas: "bei Level 5 habe ich keine Chance
  mehr Gegner abzuschiessen").** Ursache war ein Konstruktionsfehler, kein Balance-Thema:
  `spawner.getSquadTypes` liess einen `wedge` IMMER nur aus leichten Gegnern bestehen.
  Level 1-4 kennen nur Keile, ab Level 5 kommen `cluster`/`row` dazu, die die
  Leveltabelle auswerten - die mittleren Lebenspunkte je Gegner sprangen dadurch von 4,1
  auf 18,0 und Level 5 war haerter als Level 6. Sonderregel entfernt, Gewichte aller
  zwoelf Level neu gesetzt (sie gelten jetzt fuer alle Horden, nicht nur fuer
  Einzelgegner). Haerte steigt jetzt monoton, ein Test sichert das.
- Stand: 176 Tests gruen, `npm run check` sauber, Arbeitsverzeichnis sauber.

## Offen — naechster Schritt zuerst
1. **Thomas' iPhone-Urteil zum neuen Gegner-Widerstand** hat Vorrang: Kommen jetzt genug
   Gegner durch, ohne dass es unfair wird? Zaehlt die Position spuerbar? Fehlt das
   Trefferblitzen?
   Tuning ohne Umbau: `enemy.breakthroughDamageFactor` (was ein Durchbruch kostet),
   `enemy.breakthroughMinLevel`, `enemy.firepowerCoupling.dampening` (hoeher = Gegner
   folgen der Spielerstaerke staerker), `enemy.types[].hp`, `crowd.maxWidthRatio`
   (Feuerlinie), `enemy.seekSpeedPxPerSec`, `enemy.spawnBands`, `level.plans`.
2. **W6 — V2-Abnahme** (die letzte Etappe): toten Code raus (`blockers.ts` heisst noch so,
   meint aber Waende), Volllast-Messung, Netzwerk-Null-Check, Update-Pfad, README.
   Thomas 2026-08-23: "3. kommt erst dann" — also nach Punkt 1 und 2.

## Befunde, die Thomas kennen sollte (nicht behoben, bewusst)
- **Die Bistabilitaet im oberen Levelbereich ist entschaerft, nicht beseitigt.** Der
  Anteil durchkommender Gegner sprang auf den Leveln 7-11 zwischen 1 % und 78 %, weil das
  System nur zwei Zustaende kannte. Die Durchbruch-Regel macht den Verlust jetzt stetig
  (doppelt so viel durchgelassen = doppelter Verlust), der SPRUNG im Durchkommensanteil
  selbst bleibt aber - er steckt in der Rueckkopplung ueber freie Spawn-Spuren. Level 8
  ist dabei die haerteste Stelle der Tabelle (dort springt der Nachschub um 87 %).
- **Die Feuerlinie ist am unteren Anschlag.** `crowd.maxWidthRatio` 0,20 = 78 px ist der
  kleinste Wert, bei dem 8 Schuetzen noch nebeneinander stehen. Wer die Truppe weiter
  verschmaelern will, muss zuerst `crowd.shootersPerSalvo` oder `crowd.minColSpacing`
  anfassen; ein Test haelt beide Grenzen fest.
- **Boss-Kampfdauer haengt am Gegnerschild, nicht an den Lebenspunkten.** Gemessen
  2026-08-23 mit identischem Verfahren vorher/nachher: Das entfernte Pendeln aendert die
  Dauer kaum (Level 1 104 -> 100 s, Level 6 115 -> 111 s), bei Level 12 streut sie so
  stark, dass keine Aussage moeglich ist. Dieselbe Ursache war schon am 2026-08-22
  dokumentiert. Die Reissleine (max. zwei Balance-Zyklen, dann Entscheidung mit Thomas)
  ist gezogen — hier wurde bewusst nicht weitergedreht.
- **Level 1 liegt 31 % ueber dem von Thomas abgenommenen Mengen-Stand** (4,95 -> 6,49
  Gegner/s). Das ist Folge der Fehlerbehebung, nicht einer Anhebung der Leveltabelle.
- **Rund 93 % der Spawn-Versuche werden weiterhin abgelehnt.** Das ist ab hier keine
  Fehlfunktion, sondern volle Auslastung: Die Sperre verhindert, dass Gegner ineinander
  erscheinen. Wer mehr Masse will, muss an der Verweildauer ansetzen (Tempo,
  Lebenspunkte), nicht am Zufluss.

## Offene Nebenbefunde (nicht behoben, bewusst)
- **Minigun und Rakete feuern nur mit 3 Figuren** (`shootersPerSalvo`) und sind dadurch
  nominell ~4x schwaecher als die Standardwaffe. Waffenbalance insgesamt offen.
- **Muenzen fahren weiterhin in Bildschirmpixeln**, waehrend Waende und Kulisse
  perspektivisch laufen. Sie fliegen nach Sekundenbruchteilen zur Truppe; eine Umstellung
  waere Risiko am Einsammel-Timing ohne sichtbaren Gewinn.
- **Wandkacheln behalten ihre Nennbreite**, waehrend die Hoehe perspektivisch schrumpft -
  gewollt, weil `widthShare` die Wand bewusst ueber die Strassenkante hinausragen laesst.

## Wichtige Dateien und Befehle
- Plan `docs/plan-v2.md` · Task `docs/active-task.md` · **Lessons `docs/lessons.md`** (zu
  Sitzungsbeginn lesen, enthaelt die teuer bezahlten Regeln)
- Balance: `src/config/balance.ts` (alle Tuning-Werte mit Herleitung als Kommentar)
- Waende: `blockers.ts`, `blockerPlan.ts`, `wallPattern.ts`, `reinforcementPlan.ts`
- Geometrie: `roadGeometry.ts` (`getLaneRatio`, `getDriveLimitHalfWidth`)
- Gamefeel: `gamefeel.ts`, `popups.ts` · Gegner: `spawner.ts`, `squads.ts`
- Boss (W5): `boss.ts`, `bossPlan.ts`, `bossBurst.ts`
- `npm run check` · `npm run dev` · Tests via Terminal-Skript · `npm run test:dist`
- Deploy verifizieren:
  `gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`

## Einstiegssatz
"Lies `docs/UEBERGABE.md`, `docs/lessons.md` und `docs/plan-v2.md` und arbeite dort weiter.
**Nichts neu aufsetzen - V1 ist abgenommen (Tag `v1.0`), von V2 sind W1-W5 und W7 gebaut,
W7 ist abgenommen.** Naechster Schritt: Thomas' iPhone-Urteil zum neuen Gegner-Widerstand
abwarten (kommen genug Gegner durch, zaehlt die Position, ist der Verlust durch
vorbeilaufende Gegner fair, fehlt das Trefferblitzen) -
Korrekturen haben Vorrang. Danach W6, die V2-Abnahme. Die offenen Befunde stehen in der UEBERGABE unter
'Befunde'."
