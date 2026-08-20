# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Trefferflächen der Zombies auf die sichtbare Figur begrenzen**

Folgefehler aus dem Zombie-Bildtausch, beim Review gemessen. Kleiner, klar umrissener Fix.

**Nicht Teil dieses Tasks:** Bilder erneut ändern, Balance, Wellen, Waffen, Truppe, Tore.

## Befund (gemessen, nicht vermutet)

Die alten geometrischen Gegner füllten ihr Bildfeld nahezu vollständig aus. Die Zombies tun
das nicht — sie sind schmale Figuren mit viel leerem Raum links und rechts:

| Sprite | Bildfeld | sichtbare Figur | Breite genutzt |
|---|---|---|---|
| `enemy-light` | 26 × 36 | 14 × 34 | 54 % |
| `enemy-standard` | 32 × 44 | 21 × 42 | 66 % |
| `enemy-heavy` | 42 × 52 | 40 × 49 | 95 % |

`spawner.ts` setzt den Trefferkörper aber auf `enemy.displayWidth / displayHeight`, also auf
das **ganze Bildfeld**. Beim leichten Zombie liegen damit links und rechts je 6 Pixel
Trefferfläche neben der sichtbaren Figur — fast die halbe Breite ist Luft. Das erzeugt
Treffer, die der Spieler nicht nachvollziehen kann, und trifft ausgerechnet den Gegnertyp,
dem man am ehesten ausweichen will. Bei der Höhe ist der Effekt vernachlässigbar (94–95 %
genutzt), sie wird deshalb nicht angefasst.

## Anforderungen

### 1. `src/config/balance.ts` — Trefferbreite je Typ

Jeden Eintrag in `enemy.types` um ein Feld `bodyWidth` ergänzen, mit den oben gemessenen
Werten der sichtbaren Figur:

```ts
{ key: 'light',    texture: 'enemy-light',    hp: 1, speedFactor: 1.35, contactDamage: 1, coinValue: 1, bodyWidth: 14 },
{ key: 'standard', texture: 'enemy-standard', hp: 3, speedFactor: 1,    contactDamage: 1, coinValue: 1, bodyWidth: 21 },
{ key: 'heavy',    texture: 'enemy-heavy',    hp: 9, speedFactor: 0.7,  contactDamage: 2, coinValue: 3, bodyWidth: 40 },
```

Kommentar darüber: Werte sind die gemessene Breite der sichtbaren Figur im jeweiligen
Sprite; werden die Bilder ausgetauscht, müssen sie neu gemessen werden. Alle übrigen
Balance-Werte bleiben unverändert.

### 2. `src/systems/spawner.ts` — Trefferkörper aus der Typangabe

In `spawn()` die Zeile `body.setSize(enemy.displayWidth, enemy.displayHeight)` ersetzen durch
```ts
body.setSize(type.bodyWidth, enemy.displayHeight, true)
```
Der dritte Parameter `true` zentriert den Körper im Sprite — das ist Pflicht, sonst sitzt die
schmalere Trefferfläche linksbündig statt auf der Figur. Die Reihenfolge bleibt
`setTexture` → `enableBody` → `setSize` → `updateFromGameObject`; an `updateFromGameObject`
ändert sich nichts, es überschreibt die gesetzte Größe nicht.

Die Höhe bleibt bewusst `enemy.displayHeight`.

### 3. `src/main.ts` — Arcade-Debug an den Debug-Schalter hängen

`physics.arcade.debug` steht fest auf `false`. Auf `BALANCE.debug` umstellen (Import
ergänzen). Grund: Trefferflächen sind sonst unsichtbar und nur durch Codelesen prüfbar; mit
dem Schalter lassen sie sich in einem Handgriff sichtbar machen. `BALANCE.debug` bleibt auf
`false`, es wird also nichts am ausgelieferten Verhalten geändert. Am übrigen Inhalt von
`main.ts` — insbesondere am Update-Mechanismus der PWA — nichts ändern.

## Akzeptanzkriterien

1. `npm run check` und `npm run build` laufen fehlerfrei.
2. `grep -n "setSize" src/systems/spawner.ts` zeigt genau einen Treffer, und dieser nutzt
   `type.bodyWidth` sowie den Zentrier-Parameter `true`.
3. `BALANCE.enemy.types` enthält für alle drei Typen `bodyWidth` mit 14, 21 und 40.
4. Im Abschlussbericht je Typ die tatsächliche Bildfeldbreite und die neue Trefferbreite
   gegenüberstellen und den prozentualen Unterschied nennen.
5. `grep -n "debug" src/main.ts` zeigt die Bindung an `BALANCE.debug`; `BALANCE.debug` selbst
   ist unverändert `false`.
6. `git diff src/assets/` ist leer — an den Bildern wird nichts angefasst.
7. `git diff src/systems/crowd.ts src/systems/weapons.ts src/systems/gates.ts
   src/scenes/GameScene.ts` ist leer.
8. Der Sichtnachweis mit eingeschaltetem Debug-Rahmen ist **kein** Codex-Kriterium — den
   führt Claude im Review selbst.

## Reißleine
Zentriert `setSize(..., true)` den Körper wider Erwarten nicht korrekt, stattdessen
`body.setOffset((enemy.displayWidth - type.bodyWidth) / 2, 0)` nach dem `setSize` setzen und
das im Bericht vermerken.

## Nicht ändern
- Alle Bilder unter `src/assets/`, `docs/plan.md`, `vite.config.ts`, `index.html`,
  `src/config/colors.ts`, alle übrigen Dateien in `src/systems/` und `src/scenes/`.
- Alle Balance-Werte außer dem neuen `bodyWidth` je Gegnertyp.

## Implementation Summary
<!-- Von Codex auszufüllen -->
Trefferbreiten der sichtbaren Zombiefiguren je Typ in der Balance hinterlegt und beim Pool-Spawn zentriert auf den Arcade-Körper angewendet; Arcade-Debug ist nun an den unveränderten Schalter `BALANCE.debug` gebunden. `npm run check` und `npm run build` bestanden; Bilder, Crowd, Waffen, Tore und GameScene blieben unverändert.
