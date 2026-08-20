# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Drei Gegnertypen mit eigenen Bildern und unterschiedlicher Stärke**

Scope-Erweiterung auf Thomas' Wunsch (2026-08-20), nach seiner Freigabe des E4a-Stands am
iPhone. Steht **nicht** im ursprünglichen `docs/plan.md` — bewusste Entscheidung, wird dort
im Abschnitt „Gegner" nachgetragen (Anforderung 8).

**Nicht Teil dieses Tasks:** E4b (Zusatzwaffen + Waffen-Tore), E4c (Gegner als Truppen),
Hintergrundgestaltung, Boss. Formation, Truppe, Tore, Drag und HUD werden nicht angefasst.

## Anforderungen

### 1. Drei Gegner-Sprites erzeugen

Codex erzeugt drei PNG-Dateien mit **transparentem Hintergrund**, im selben Stil wie die
vorhandene Spielerfigur `src/assets/player.png` (kleine, kompakte Figur, kräftige Farben,
klare Silhouette, leicht pixelige Anmutung — das Spiel läuft mit `pixelArt: true`).

Die Gegner fliegen von oben nach unten auf den Spieler zu; man sieht sie also **von vorne**,
leicht von oben. Die Spielerfigur ist rot und wird von hinten gesehen — die Gegner müssen
sich davon farblich klar absetzen, damit im Gewühl auf einen Blick klar ist, wer wer ist.

| Datei | Größe | Motiv |
|---|---|---|
| `src/assets/enemy-light.png` | 24 × 24 px | Kleiner, schneller Angreifer. Schlanke, spitze Silhouette, wirkt leicht und flink. Helles Türkis/Cyan (`#34d1e0`-Familie), dunklerer Rand zur Abgrenzung. |
| `src/assets/enemy-standard.png` | 30 × 30 px | Der Standardgegner. Kompakte, blockige Silhouette mittlerer Masse. Kräftiges Rosa-Rot in der Familie der heutigen Platzhalterfarbe `#df4d66` mit dunklem Rand `#501f2f`. |
| `src/assets/enemy-heavy.png` | 38 × 38 px | Schwerer Brocken. Breite, massige Silhouette, sichtbare Panzerung, wirkt träge und gefährlich. Tiefes Violett-Purpur (`#8b5cf6`-Familie) mit dunklem Rand. |

Anforderungen an alle drei: Alphakanal, exakt die angegebene Kantenlänge, kein sichtbarer
Rahmen und kein Hintergrund, Motiv füllt die Fläche weitgehend aus, deutlich unterscheidbare
Silhouetten auch bei kleiner Darstellung. Die drei Größen sind bewusst gestaffelt — die
Masse soll man sehen, bevor man die Farbe liest.

Zusätzlich unter `assets/probe/gegner/vorschau.png` (der Ordner `assets/probe/` ist
gitignored, wird also **nicht** eingecheckt) ein Vorschaubild ablegen: die drei Gegner
nebeneinander, vierfach vergrößert, mit der Spielfeld-Hintergrundfarbe `#10131d` hinterlegt,
damit Thomas sie beurteilen kann.

### 2. `src/scenes/BootScene.ts` — Bilder laden statt zeichnen

- Die drei PNGs per Vite-Import und `this.load.image(...)` in `preload()` laden, unter den
  Texturschlüsseln `enemy-light`, `enemy-standard`, `enemy-heavy` — genau wie `player`.
- `createEnemyTexture()` entfällt ersatzlos; die Farben `enemyEdge` und `enemyBody` in
  `src/config/colors.ts` werden dadurch unbenutzt und sind ebenfalls zu entfernen.
- Alle übrigen erzeugten Texturen (Projektil, Hintergrund, Tor, Münze) bleiben unverändert.

### 3. `src/config/balance.ts` — Typtabelle und Wellen

Die Sektion `enemy` bekommt statt des einzelnen `hp: 3` eine Typtabelle:

```ts
enemy: {
  types: [
    { key: 'light',    texture: 'enemy-light',    hp: 1, speedFactor: 1.35, contactDamage: 1, coinValue: 1 },
    { key: 'standard', texture: 'enemy-standard', hp: 3, speedFactor: 1,    contactDamage: 1, coinValue: 1 },
    { key: 'heavy',    texture: 'enemy-heavy',    hp: 9, speedFactor: 0.7,  contactDamage: 2, coinValue: 3 },
  ],
  // Anteile je Typ, abhaengig von der Laufzeit. Die letzte Stufe gilt ab dann dauerhaft.
  waves: [
    { untilSec: 30, weights: [70, 30, 0] },
    { untilSec: 90, weights: [40, 45, 15] },
    { untilSec: 0,  weights: [20, 45, 35] },
  ],
  spawnIntervalMs: 1600,
  spawnIntervalMinMs: 450,
  spawnRampPerSec: 6,
},
```
Die Reihenfolge in `weights` entspricht der Reihenfolge in `types`. Die letzte Welle hat
`untilSec: 0` als Kennzeichnung „gilt ab hier dauerhaft"; der Code nimmt sie, wenn keine
frühere Stufe mehr passt.

Weiter ändern:
- `pools.enemies` von `20` auf **48**, mit neuer Herleitung im Kommentar: Schwere Gegner sind
  mit `speedFactor 0,7` deutlich langsamer und halten 9 Treffer aus, bleiben also länger im
  Bild. Schlimmster Fall: SPD am Floor 70 × 0,7 = 49 px/s, Bildhöhe 844 px = 17,2 s Flugzeit,
  bei minimalem Spawnabstand von 450 ms also bis zu 39 gleichzeitig. 48 lässt Reserve.
- `coins.value` bleibt `1` und ist ab jetzt der **Standardwert**, den `coinValue` je Typ
  überschreibt.

### 4. `src/systems/spawner.ts` — Typwahl, Textur und Tempo

- Beim Spawn den Typ ziehen: Aus `BALANCE.enemy.waves` die erste Stufe nehmen, deren
  `untilSec` größer als die verstrichene Laufzeit in Sekunden ist; gibt es keine, die letzte
  Stufe. Dann gewichtet aus `types` ziehen (Summe der Gewichte bilden, eine Zufallszahl
  darauf ziehen, aufsummieren bis die Grenze überschritten ist).
- **Texturwechsel korrekt durchführen** — das ist die kritische Stelle:
  ```ts
  enemy.setTexture(type.texture)
  enemy.enableBody(true, x, y, true, true)
  const body = enemy.body as Phaser.Physics.Arcade.Body
  body.setSize(enemy.displayWidth, enemy.displayHeight)
  body.updateFromGameObject()
  ```
  Ohne `body.setSize` nach `setTexture` behält der Physikkörper die Maße der vorher
  benutzten Textur — ein kleiner Gegner hätte dann die Trefferfläche eines großen und
  umgekehrt. Das ist keine Kosmetik, sondern der Unterschied zwischen fairen und
  unerklärlichen Treffern.
- Per `setData` am Gegner ablegen: `hp`, `speedFactor`, `contactDamage`, `coinValue`,
  zusätzlich `flashUntil` wie bisher.
- Die x-Ziehung bleibt wie sie ist — sie rechnet bereits mit `enemy.displayWidth / 2` und
  passt sich damit automatisch an die unterschiedlichen Größen an.
- In `update()` bewegt sich jeder Gegner mit
  `enemySpeed * (enemy.getData('speedFactor') as number)`. `getEnemySpeed()` selbst bleibt
  unverändert und liefert weiter den reinen SPD-Stat.
- Pool-Regel gilt unverändert: kein `create()`/`destroy()` zur Laufzeit, nur
  `enableBody`/`disableBody` und `setActive`/`setVisible`.

### 5. `src/systems/coins.ts` — Münzwert je Gegner

- `spawnAt(x: number, y: number, value: number = BALANCE.coins.value): void` — der Wert wird
  per `setData('value', value)` an der Münze abgelegt.
- Beim Einsammeln `this.collected += coin.getData('value') as number` statt des festen
  `BALANCE.coins.value`.
- Pool und Magnetlogik bleiben unverändert. Bewusst **eine** Münze mit höherem Wert statt
  drei einzelner Münzen — drei Münzen pro schwerem Gegner würden den Münzvorrat sprengen.

### 6. `src/scenes/GameScene.ts` — Kontaktschaden und Münzwert

- In `handleProjectileHit()` vor dem Schaden den Münzwert des Gegners auslesen und beim Kill
  an `this.coins.spawnAt(enemyX, enemyY, coinValue)` übergeben. Wichtig: **vor** dem Aufruf
  von `spawner.damage()` auslesen, weil der Gegner beim Kill sofort recycelt wird.
- In `handlePlayerHit()` statt `hp − 1` den Wert
  `hp − (enemy.getData('contactDamage') as number)` abziehen. Ebenfalls vor dem Recyceln
  auslesen. Der bestehende Schutz „bei hp ≤ 0 Game Over" und die iFrames bleiben unberührt.
- Sonst nichts ändern.

### 7. `src/config/colors.ts`

`enemyEdge` und `enemyBody` entfernen (durch die Bilder ersetzt). Alle übrigen Farben,
insbesondere `STAT_COLORS`, bleiben unverändert.

### 8. `docs/plan.md` — Abschnitt „Gegner" ergänzen

Direkt vor dem Abschnitt „Waffentypen" einen neuen Abschnitt „Gegnertypen (Scope-Erweiterung
V1.1)" einfügen, der die Typtabelle, die Wellenlogik und die Poolherleitung aus Anforderung 3
in zwei bis vier Sätzen festhält. Kein Umschreiben bestehender Abschnitte.

## Akzeptanzkriterien

1. `npm run check` und `npm run build` laufen fehlerfrei.
2. Die drei PNGs existieren unter `src/assets/`, haben exakt 24×24, 30×30 und 38×38 Pixel
   und einen Alphakanal. Im Abschlussbericht die tatsächlichen Maße und den Farbmodus je
   Datei angeben (z. B. per Python/PIL ausgelesen), nicht behaupten.
3. `assets/probe/gegner/vorschau.png` existiert und zeigt alle drei Gegner vierfach
   vergrößert nebeneinander.
4. `grep -rn "createEnemyTexture\|enemyBody\|enemyEdge" src/` liefert keinen Treffer.
5. **Trefferflächen-Nachweis:** In `spawner.ts` folgt auf jedes `setTexture` ein
   `body.setSize(...)` mit anschließendem `updateFromGameObject()`. Im Abschlussbericht die
   Codestelle zitieren.
6. **Typverteilung nachweisen:** Wegwerf-Skript außerhalb von `src/` (nicht einchecken), das
   die Ziehfunktion 20.000-mal je Zeitpunkt aufruft — bei 10 s, bei 60 s und bei 150 s — und
   die gemessenen Anteile ausgibt. Erwartet: 70/30/0, 40/45/15 und 20/45/35, jeweils mit
   maximal 2 Prozentpunkten Abweichung. Ergebnis im Bericht angeben.
7. `BALANCE.pools.enemies === 48`, und der Herleitungskommentar nennt die 17,2 s Flugzeit
   des schweren Gegners am SPD-Floor.
8. Ein schwerer Gegner kostet beim Zusammenstoß zwei Figuren, ein leichter und ein
   Standardgegner je eine — im Code nachvollziehbar über `contactDamage`.
9. Ein schwerer Gegner hinterlässt **eine** Münze im Wert von 3; der Münzzähler steigt beim
   Einsammeln entsprechend um 3.
10. Pool-Checkpunkte gelten unverändert: `grep -n "destroy()" src/systems/spawner.ts` und
    `src/systems/coins.ts` liefern keinen Treffer, und es gibt kein `scene.add`/`create`
    außerhalb der Konstruktoren.
11. Ein Kurztest im Dev-Server ist erlaubt, aber **kein** Nachweis: Ob die Gegner gut
    aussehen, unterscheidbar sind und sich die Stärkeabstufung richtig anfühlt, beurteilt
    Thomas — Bilder am Vorschaubild, Spielgefühl am iPhone.

## Reißleine
Gelingen die Bilder nach zwei Versuchen nicht in brauchbarer Qualität (unklare Silhouette,
Hintergrund nicht sauber transparent, bei 24 px unkenntlich), **nicht weiter iterieren**:
Die drei Gegner stattdessen programmatisch mit PIL zeichnen — schlichte geometrische Formen
in den drei genannten Farben, klar unterscheidbare Umrisse — und ein Skript
`scripts/make-enemies.py` analog zu `scripts/make-icons.py` einchecken. Der gesamte
Spielmechanik-Teil (Anforderungen 3 bis 8) ist davon unabhängig und muss in jedem Fall
vollständig stehen.

## Nicht ändern
- `src/systems/crowd.ts`, `src/systems/formation.ts`, `src/systems/weapons.ts`,
  `src/systems/gates.ts`, `src/systems/upgrades.ts`, `src/main.ts`, `vite.config.ts`,
  `index.html`.
- Formation, Kollisionshülle, Salvenrotation, Torlogik, HUD-Layout, Drag-Clamp,
  Spawn-Korridor.
- Alle Balance-Werte außer den unter Anforderung 3 genannten.

## Implementation Summary
<!-- Von Codex auszufüllen -->
Drei transparente Pixel-Sprites samt gitignorierter Vierfach-Vorschau und reproduzierbarem `scripts/make-enemies.py` ergänzt (Reißleine nach zwei für 24–38 px zu detailreichen KI-Versuchen). Gegner wählen nun über zeitabhängige Gewichte ihren Typ, setzen Textur und Arcade-Hitbox beim Pool-Reuse korrekt zurück und speichern HP, Tempo, Kontaktschaden und Münzwert. Münzen übernehmen den Typwert; schwere Gegner kosten zwei Figuren und hinterlassen eine Münze im Wert 3. `npm run check`, `npm run build`, Bildmetadaten-, Pool- und 20.000er-Verteilungsprüfungen bestanden.
