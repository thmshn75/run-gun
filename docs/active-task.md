# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E5-2 — Boss und Level: Bosskampf am Levelende, danach das nächste Level.**

Zweiter von vier Läufen für E5. Rahmen und Zahlen: `docs/e5-design.md`, Abschnitt
„Entscheidung 3" — **vor dem Bauen lesen**. E5-1 (Speicherstand) ist fertig und freigegeben.

Das ist der Teil, der die Definition „fertig" aus `docs/plan.md` einlöst: ein
2–3-Minuten-Loop **inklusive Boss**.

## Ablauf eines Levels

1. **Normale Phase**, `level.normalPhaseSec` = **75 s**: läuft wie heute.
2. **Ankündigung**, `level.warningMs` = **1500 ms**: Ein kurzer Schriftzug „BOSS" erscheint
   mittig. Ab jetzt spawnen **keine neuen normalen Gegner** mehr; bereits vorhandene laufen
   normal weiter und aus.
3. **Bosskampf**: Der Boss erscheint am Horizont, blendet wie alle Gegner über
   `road.entryFadePx` auf, fährt auf seine Kampfhöhe und bleibt dort.
4. **Boss tot** → Überblendung „LEVEL n GESCHAFFT" für `level.clearedMs` = **1800 ms**, dann
   beginnt Level n+1 **in derselben Szene**.
5. **Spieler tot** → Game Over wie bisher.

## Der Boss

### Verhalten

- Erscheint bei `y = road.horizonY`, fährt mit `boss.approachSpeed` = **90 px/s** nach unten
  bis `boss.battleY` = **300**, dann nicht weiter.
- Bewegt sich waagerecht mit `boss.moveSpeed` = **110 px/s** zwischen den Fahrbahnrändern auf
  seiner Höhe und kehrt an den Rändern um. Die Fahrbahnbreite kommt aus `getRoadHalfWidth`,
  damit er nicht über die Straße hinausfährt.
- Feuert alle `boss.fireIntervalMs` = **1400 ms** einen Schub von `boss.burstCount` = **3**
  Geschossen senkrecht nach unten, gefächert über `boss.burstSpreadPx` = **60 px**.
- Boss-Geschosse fliegen mit `boss.projectileSpeed` = **260 px/s** und machen
  `boss.projectileDamage` = **1** Schaden an der Truppe — dieselbe Wirkung wie ein Gegner,
  der die Truppe erreicht, über denselben Weg (`handlePlayerHit`), damit iFrames und Blinken
  unverändert greifen.
- Der Boss selbst macht **keinen** Berührungsschaden: Er bleibt auf seiner Höhe und kommt der
  Truppe nie nahe. Eine zweite Schadensquelle wäre nicht lesbar.

### Lebenspunkte

- `boss.baseHp` = **400**, je Level multipliziert mit `boss.hpPerLevel` = **1.6**.
  Also Level 1: 400, Level 2: 640, Level 3: 1024.
- Herleitung, die als Kommentar an den Wert gehört: Bei Grundschaden 1, Feuerrate 3,5/s und
  acht Schützen sind das rund 28 Schaden pro Sekunde — der erste Boss fällt in gut 14 s, wenn
  nichts aufgewertet wurde. Mit Toren im Level deutlich schneller; das ist gewollt.
- **Lebensbalken** oben quer über die Fahrbahnbreite, **unterhalb** der HUD-Leiste
  (`insets.top + hud.padding + hud.panelHeight + 8`), damit er nichts verdeckt. Zwei
  Rechtecke: Hintergrund und Füllung. Einmalig angelegt, nur Breite und Sichtbarkeit ändern
  sich.
- Der Boss nimmt Schaden über **denselben** Weg wie normale Gegner
  (`handleProjectileHit` → `spawner.damage`), damit Waffenfaktoren, Durchschlag und
  Flächenschaden ohne Sonderfall wirken.
- **Der Boss braucht eine `spawnId`** wie jeder Gegner, sonst schädigt ihn der Laser in jedem
  Bild erneut. Das ist die kritischste Einzelstelle dieses Laufs.
- Trefferblitz wie bei normalen Gegnern.

### Aussehen

**Das Bild erzeugt Codex** nach dem im Projekt bewährten Verfahren: groß erzeugen,
freistellen, dann herunterrechnen. Große Vorlage nach `assets/probe/boss-gross.png`
(gitignored), fertiges Sprite nach `src/assets/enemy-boss.png`, **120 × 120 px**.

**Motiv:** ein deutlich größerer, schwer gepanzerter Zombie im Stil der drei vorhandenen
Gegner — Frontalansicht, gleiche Pixel-Machart, dunkle Rüstungsplatten, rote Augen. Voll
transparenter Hintergrund, keine Bodenfläche, kein Schatten, kein Text.

Sichtbare Breite und Höhe **nachmessen** und als `boss.bodyWidth` / `boss.bodyHeight` in
`balance.ts` eintragen — wie bei den drei Gegnertypen. Nicht schätzen.

## Levelfortschritt

- Level beginnt bei 1 und steigt nach jedem besiegten Boss.
- Beim Levelwechsel bleiben **Statuswerte, Truppengröße, Waffe und Münzen erhalten**. Es ist
  ein durchgehender Run, kein Neustart.
- Die Gegnerwellen starten härter: Der Spawn-Zähler beginnt neu, aber das Spawn-Intervall
  startet bei `enemy.spawnIntervalMs` minus `level.spawnBonusPerLevel` = **150 ms** je
  bereits geschafftem Level, nie unter `enemy.spawnIntervalMinMs`.
- Nach jedem geschafften Level **speichern**: `highestLevel` hochziehen und den Stand
  schreiben (`writeSave`), wie im Plan vorgesehen.
- Bei Game Over wird die **erreichte Levelnummer** in den Bestenlisten-Eintrag geschrieben
  statt der festen 1 aus E5-1.
- Der Boss lässt beim Sterben `boss.coinReward` = **25** Münzen fallen, über den vorhandenen
  Münzweg.

## Pools

- Der Boss ist **ein** Objekt, einmalig angelegt, danach nur aktiviert und deaktiviert.
- Boss-Geschosse: eigener Pool, Größe **24**. Herleitung als Kommentar: Flugzeit von
  `battleY` 300 bis zum unteren Rand 844 sind 544 px bei 260 px/s = 2,1 s; bei einem Schub
  von 3 alle 1,4 s sind das höchstens 5 Schübe gleichzeitig = 15 Geschosse. 24 lässt Reserve.
- Kein `create()`/`destroy()` im laufenden Spiel, auch nicht beim Levelwechsel.

## Ausdrücklich nicht ändern

- Keine Menü-Szene, kein Startbildschirm, keine Anzeige der Bestenliste — das ist E5-3/E5-4.
- Keine Werte von Gegnern, Waffen, Toren, Himmel oder HUD ändern.
- Die Speicherlogik aus E5-1 bleibt, wie sie ist; es kommen nur Aufrufe dazu.
- Kein Partikelsystem, kein Ton, keine Tweens für den Bosskampf — Restzeiten mitführen wie
  beim Einschlag-Flash der Rakete.

## Reißleine

Wird der Bosskampf am iPhone zäh oder unlesbar, wird **in dieser Reihenfolge** nachgezogen:
zuerst `boss.baseHp`, dann `boss.fireIntervalMs`. **Kein zulässiger Ersatz** ist es, den Boss
zu streichen, die Gegner im Level auszudünnen, die Truppengröße zu deckeln oder den
Lebensbalken wegzulassen. Führt keiner der beiden Schritte zum Ziel: melden und stoppen.

Lässt sich das Bossbild nicht in brauchbarer Qualität erzeugen: **melden und stoppen**. Kein
zulässiger Ersatz ist ein programmatisch gezeichneter Klotz oder ein vergrößerter
vorhandener Gegner.

## Akzeptanzkriterien

1. Nach 75 s erscheint die Ankündigung, danach der Boss; ab der Ankündigung kommen **keine
   neuen** normalen Gegner mehr.
2. Der Boss hat auf Level 1 genau 400 Lebenspunkte und nimmt Schaden über denselben Weg wie
   normale Gegner — Waffenfaktoren, Durchschlag und Flächenschaden wirken ohne Sonderfall.
3. **Der Laser schädigt den Boss pro Durchflug genau einmal**, nachweisbar über seine
   `spawnId`.
4. Der Lebensbalken sitzt unterhalb der HUD-Leiste und überlappt sie nicht.
5. Boss besiegt → Überblendung → Level 2 beginnt in derselben Szene, mit erhaltenen
   Statuswerten, Truppe und Waffe.
6. Der Boss von Level 2 hat 640 Lebenspunkte.
7. Nach jedem geschafften Level ist `highestLevel` im Speicherstand erhöht und geschrieben.
8. Bei Game Over steht im Bestenlisten-Eintrag die tatsächlich erreichte Levelnummer.
9. Boss-Geschosse treffen die Truppe über denselben Weg wie Gegner; iFrames und Blinken
   verhalten sich unverändert.
10. Kein `create()`/`destroy()` im laufenden Spiel, auch nicht beim Levelwechsel; Pools mit
    Herleitung als Kommentar.
11. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

Kriterien 1 bis 9 prüft Claude am laufenden Spiel nach, Kriterium 3 über eine Zählung der
tatsächlichen Schadensereignisse je Projektil und Ziel. Ob der Kampf Spaß macht und die
Länge stimmt, entscheidet Thomas am iPhone.

## Implementation Summary

- Boss-Sprite erzeugt, transparent nach `src/assets/enemy-boss.png` übernommen und seine sichtbaren Maße (118 × 118 px) in `balance.ts` hinterlegt.
- Boss-, Level- und Bossgeschoss-Pools ergänzt: 75-s-Normalphase, BOSS-Ankündigung, Kampf, Levelabschluss und Start der härteren nächsten Welle in derselben Szene.
- Boss nutzt den bestehenden Schadensweg inklusive `spawnId`-Laser-Schutz, Trefferblitz, Münzdrop, Lebensbalken, iFrames und Blinken für Bossgeschosse.
- Levelstand wird nach Boss-Sieg gespeichert; Game-Over-Scores erhalten die tatsächlich erreichte Levelnummer.
- Jede Kampf-Kollision erkennt Spieler-Projektile an `weapon`, Boss-Geschosse an `damage` und die Truppenhülle an ihrer Instanz, statt sich auf Phasers Rückrufreihenfolge zu verlassen; unbekannte Paare warnen im DEV-Modus höchstens einmal pro Sekunde.
- Verifiziert mit `npm run check`, `npm run build` und `npm test` (5 Tests bestanden).


---

# NACHARBEIT (Claude, am laufenden Spiel gemessen)

Der Bosskampf ist **unlösbar**: Der Boss nimmt keinen Schaden, und das Spiel wirft dabei
Fehler.

## Befund

Gemessen über einen vollständigen Lauf bis in die Bossphase:

```
TypeError: Cannot read properties of undefined (reading 'damageFactor')
  at GameScene.handleProjectileHit (GameScene.ts:232)
  at World.collideSpriteVsGroup (phaser.js)
```

Ursache: `physics.add.overlap(this.weapons.getProjectiles(), this.boss.getEnemy(), …)`
registriert eine **Gruppe gegen ein einzelnes Objekt**. Phaser erkennt das und ruft intern
`collideSpriteVsGroup` auf — die Rückruffunktion bekommt dadurch
**(einzelnes Objekt, Gruppenkind)**, also `(Boss, Projektil)` statt `(Projektil, Boss)`.
`handleProjectileHit` liest daraufhin die Waffe vom Boss, findet nichts, und
`BALANCE.weapon[undefined].damageFactor` wirft.

Folgen, alle gemessen:
- Boss verliert über 75 s Bosskampf **keinen einzigen Lebenspunkt**.
- Boss-Geschosse treffen die Truppe **nie** (0 Treffer), weil die geworfene Ausnahme den
  restlichen Kollisionsdurchlauf desselben Bildes abbricht.
- Kein Levelwechsel, kein Speicherstand — die ganze Kette dahinter ist tot.

**Das ist ein Wiederholungsfehler.** Genau diese Falle steht bereits als Kommentar im Code
(`// Zone must be first: Phaser passes (single object, group child) to this callback`) und
im projektübergreifenden Logbuch.

## Verlangte Korrektur — die Falle strukturell beseitigen

Nicht die Reihenfolge an dieser einen Stelle korrigieren. Die Reihenfolge richtig zu **raten**
ist genau das, was schon zweimal schiefgegangen ist.

Stattdessen: eine kleine Hilfsfunktion, die die beiden Rückrufargumente **an ihren eigenen
Daten erkennt**, statt sich auf ihre Position zu verlassen.

- Ein Spieler-Projektil ist daran erkennbar, dass es `getData('weapon')` liefert.
- Ein Boss-Geschoss ist daran erkennbar, dass es `getData('damage')` liefert.

Beide Überlappungen für den Boss laufen künftig über diese Erkennung. Das gilt auch für die
Überlappung von Boss-Geschossen mit der Truppenhülle.

Die bestehende Überlappung Projektile ↔ normale Gegner bleibt unverändert, weil dort Gruppe
gegen Gruppe steht und die Reihenfolge nachweislich stimmt — sie wird aber ebenfalls auf die
Hilfsfunktion umgestellt, damit es im Code nur **einen** Weg gibt.

Zusätzlich: Erkennt die Hilfsfunktion keines der beiden Objekte, wird im DEV-Modus einmal pro
Sekunde laut auf der Konsole gewarnt, statt still etwas Falsches zu tun.

## Zusätzliche Akzeptanzkriterien

12. Der Boss verliert Lebenspunkte und lässt sich besiegen; im laufenden Spiel entstehen
    **keine** Konsolenfehler.
13. Boss-Geschosse treffen die Truppe nachweislich mindestens einmal pro Bosskampf.
14. Nach dem Sieg beginnt Level 2, der Boss dort hat 640 Lebenspunkte, und `highestLevel`
    steht im Speicherstand auf 2.
15. Die Reihenfolge der Rückrufargumente wird an keiner Stelle mehr vorausgesetzt.


## Review-Ergebnis nach der Nacharbeit (Claude, am laufenden Spiel gemessen)

Die Korrektur greift. Alle fuenfzehn Kriterien erfuellt.

- **Kriterium 12 und 15:** Vier Ueberlappungen laufen jetzt ueber **eine** Erkennungsfunktion,
  die die Objekte an ihren eigenen Daten unterscheidet statt an ihrer Position im Aufruf.
  Ueber mehrere vollstaendige Laeufe: **0 Seitenfehler, 0 unbekannte Ueberlappungen**.
- **Kriterium 2, 6, 14:** Boss-Lebenspunkte gemessen 400 / 640 / 1024 / 1638 fuer Level 1
  bis 4 — exakt Faktor 1,6 je Level. Der Boss stirbt, Level 1 bis 10 liefen durch.
- **Kriterium 3 (Laserdurchschlag), die kritischste Stelle:** 22 895 Ueberlappungen des
  Lasers mit Gegnern und Boss, davon 18 039 korrekt uebersprungen, 4856 tatsaechliche
  Schaeden — und **0 Verletzungen der Zusicherung**: In keinem einzigen Fall wurde Schaden
  zugefuegt, obwohl die Marke schon gesetzt war.
  *Hinweis fuer kuenftige Messungen:* Ein erster Anlauf meldete 936 vermeintliche
  Doppelschaeden. Das war ein Fehler der Messung, nicht des Spiels — der Schluessel aus
  Geschoss und Ziel unterscheidet zwei **verschiedene Schuesse** desselben
  wiederverwendeten Geschosses nicht. Bei kurzlebigen Gegnern faellt das nie auf, beim
  langlebigen Boss sofort. Gemessen werden muss die Zusicherung selbst, nicht ihr Abbild.
- **Kriterium 1:** Nach der Ankuendigung **0** neue normale Gegner.
- **Kriterium 4:** Lebensbalken bei y = 82, HUD-Leiste endet bei y = 74 — keine Ueberlappung.
- **Kriterium 7:** `highestLevel` im Speicherstand stieg mit jedem geschafften Level bis 10.
- **Kriterium 8:** Nach dem Tod steht im Bestenlisten-Eintrag `{coins: 74, level: 4}` — die
  tatsaechlich erreichte Levelnummer, und die Muenzen sind auf dem Konto.
- **Kriterium 13:** Boss-Geschosse trafen die Truppe (6 Treffer in einem Kampf).
- **Kriterium 11:** `npm run check`, `npm run build`, `npm test` selbst im Terminal, alle
  exit 0.

**Nicht geprueft:** Ein Bildschirmfoto des Bosskampfs liess sich nicht sauber ablichten — mit
den ueber 75 Sekunden erspielten Aufwertungen faellt der erste Boss zu schnell fuer eine
getimte Aufnahme. Die Zahlen belegen den Kampf; das Aussehen sieht Thomas am Geraet.
