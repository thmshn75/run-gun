# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Farbsystem vereinheitlichen, HUD neu aufteilen, SPD-Start senken, App-Icons neu bauen**

Vier zusammenhängende Polish-Punkte nach Thomas' iPhone-Test. Kein neues Feature,
keine Scope-Erweiterung — E3 bleibt E3.

Diagnose, die dieser Task behebt:
1. `SPD` steht im HUD grau (`#ced4da`), am Tor aber grün (`STAT_COLORS.speed`) —
   dieselbe Stat in zwei Farben.
2. `hp` (Rot `0xf03e3e`), `damage` (Orange `0xf76707`), Gegner (`0xdf4d66`) und die
   rot-orangen Projektile (`0xe8590c`/`0xffc078`) liegen alle im gleichen warmen
   Sektor — Tore verschwimmen mit Spielobjekten.
3. Die Tor-Textur ist hellgrau (`0xcccccc`, Alpha 0.82) und wird getintet: das ergibt
   eine helle Pastellfläche, während dieselbe Farbe im HUD voll gesättigt erscheint.
   Zusätzlich steht weißer Text auf heller Fläche — schlecht lesbar.
4. Das HUD hängt an festen Pixel-Offsets (`hudX + 112`, `+ 228`) in zwei Reihen oben
   links, nutzt die Bildschirmbreite nicht und zeigt `SHOTS` gar nicht an.

## Anforderungen

### 1. Neue Datei `src/config/colors.ts` — eine Farbquelle für alles

Alle Farben ziehen hierher um. Datei-Inhalt exakt so anlegen:

```ts
import type { StatKey } from '../systems/upgrades'

export const STAT_COLORS: Record<StatKey, number> = {
  hp: 0x3ddc84,
  damage: 0xff9f45,
  shotsPerSec: 0x34d1e0,
  projectiles: 0xb78cff,
  speed: 0xff4fa3,
}

export const WORLD_COLORS = {
  background: 0x10131d,
  backgroundLine: 0x172033,
  backgroundDot: 0x26344e,
  enemyEdge: 0x501f2f,
  enemyBody: 0xdf4d66,
  projectileShell: 0xe8590c,
  projectileCore: 0xffc078,
  coinRim: 0x5e4400,
  coinBody: 0xffd84c,
  gateBase: 0xffffff,
} as const

export const HUD_COLORS = {
  coins: 0xffd84c,
  panel: 0x080b12,
  panelStroke: 0x2a3550,
  textDark: '#0b0f18',
} as const
```

Der `import type` ist bewusst type-only: `upgrades.ts` importiert `colors.ts` zur
Laufzeit, die Gegenrichtung existiert nur im Typsystem und wird wegkompiliert —
kein Laufzeit-Zyklus. `Record<StatKey, number>` erzwingt, dass keine Stat vergessen wird.

Warum diese fünf Stat-Farben: Gegner (Himbeerrot), Projektile (Orange) und Coins (Gelb)
belegen den warmen Sektor. `hp` wandert deshalb von Rot auf Grün, `speed` (= Gegner-Tempo,
je höher desto schlechter) auf Pink. `damage` bleibt bewusst warm und wird auf den hellen
Projektil-Kernton abgestimmt — die Nähe zur Kugelfarbe ist ab jetzt gewollt statt zufällig.

### 2. `src/systems/upgrades.ts` — `STAT_COLORS` entfernen

Den `STAT_COLORS`-Block löschen und stattdessen `import { STAT_COLORS } from '../config/colors'`
**nicht** hier ergänzen: `upgrades.ts` braucht die Farben selbst nicht. Stattdessen die beiden
Konsumenten direkt auf die neue Datei umstellen:
- `src/scenes/GameScene.ts`: `import { STAT_COLORS } from '../systems/upgrades'` → aus `'../config/colors'`;
  `RunStats` weiter aus `'../systems/upgrades'`.
- `src/systems/gates.ts`: `STAT_COLORS` aus `'../config/colors'`, `clampStat`/`RunStats`/`StatKey`
  bleiben aus `'./upgrades'`.

Danach darf `STAT_COLORS` in `src/systems/upgrades.ts` nicht mehr vorkommen.

### 3. `src/scenes/BootScene.ts` — Hartcodierte Farben ersetzen

Alle `graphics.fillStyle(0x...)`/`lineStyle`-Literale durch `WORLD_COLORS`-Werte ersetzen
(Import aus `'../config/colors'`). Die Zeichenlogik selbst bleibt unverändert, **mit einer
Ausnahme** — `createGateTexture()` wird neu:

```ts
private createGateTexture(): void {
  const width = (this.scale.width - BALANCE.gates.gapBetween) / 2
  const graphics = this.add.graphics()
  graphics.fillStyle(WORLD_COLORS.gateBase, 0.2)
  graphics.fillRect(0, 0, width, BALANCE.gates.gateHeight)
  graphics.lineStyle(4, WORLD_COLORS.gateBase, 1)
  graphics.strokeRect(2, 2, width - 4, BALANCE.gates.gateHeight - 4)
  graphics.generateTexture('gate', width, BALANCE.gates.gateHeight)
  graphics.destroy()
}
```

Grund: Phaser-Tint multipliziert die Texturfarbe. Eine **weiße** Basis ergibt getintet exakt
die Stat-Farbe aus dem HUD — identische Farbe an beiden Orten. Die Fläche bleibt bei Alpha 0.2
dunkel durchscheinend, nur der Rahmen leuchtet voll; damit wird der weiße Tortext wieder lesbar.

### 4. `src/systems/gates.ts` — Textkontrast

Nur die beiden Textstile in `createPair()` ändern, sonst nichts:
- `textStyle`: `color: '#ffffff'`, `stroke: HUD_COLORS.textDark`, `strokeThickness: 4`,
  `fontStyle: 'bold'`, `fontSize` bleibt `'34px'`.
- `statLabel`-Stil: `fontSize: '17px'`, `fontStyle: 'bold'`,
  `stroke: HUD_COLORS.textDark`, `strokeThickness: 3`. Die Farbe wird weiterhin in `spawn()`
  per `setColor(statColorCss)` gesetzt — diese Zeile bleibt unangetastet.

Der Trefferblitz (`setTintFill(0xffffff)`) bleibt unverändert.

### 5. `src/config/balance.ts` — neue `hud`-Sektion

Neben `feedback` (bleibt, wird von `drawSafeAreaDebug` genutzt) eine neue Sektion ergänzen:

```ts
hud: {
  padding: 12,
  panelHeight: 62,
  panelRadius: 12,
  panelAlpha: 0.55,
  panelStrokeAlpha: 0.6,
  sidePad: 14,
  rowOneOffsetY: 9,
  rowTwoOffsetY: 38,
  primaryFontPx: 22,
  statFontPx: 15,
  depthPanel: 90,
  depthText: 91,
},
```

### 6. `src/scenes/GameScene.ts` — HUD neu aufteilen

Das bisherige HUD (fünf Texte an festen Offsets, zwei Reihen links oben) wird ersetzt.
Alle Positionen aus `this.scale.width` und den Safe-Area-Insets berechnen — **keine festen
Pixel-Offsets mehr**, sonst bricht das Layout auf schmalen Geräten.

Aufbau in `create()`:
- `panelX = insets.left + BALANCE.hud.padding`,
  `panelY = insets.top + BALANCE.hud.padding`,
  `panelW = this.scale.width - insets.left - insets.right - 2 * BALANCE.hud.padding`,
  `panelH = BALANCE.hud.panelHeight`.
- Ein `this.add.graphics()` einmalig in `create()`: `fillStyle(HUD_COLORS.panel, BALANCE.hud.panelAlpha)`
  + `fillRoundedRect(panelX, panelY, panelW, panelH, BALANCE.hud.panelRadius)`, dazu
  `lineStyle(1, HUD_COLORS.panelStroke, BALANCE.hud.panelStrokeAlpha)` +
  `strokeRoundedRect(...)`. `setDepth(BALANCE.hud.depthPanel)`.
  Das Graphics-Objekt wird **einmal** gezeichnet, nie im `update()` — kein Neuzeichnen im Hot Path.
- Zeile 1, `fontSize: BALANCE.hud.primaryFontPx`, `fontStyle: 'bold'`,
  y = `panelY + BALANCE.hud.rowOneOffsetY`:
  - `hp`: x = `panelX + BALANCE.hud.sidePad`, `setOrigin(0, 0)`, Farbe `STAT_COLORS.hp`
  - `coins`: x = `panelX + panelW - BALANCE.hud.sidePad`, `setOrigin(1, 0)`, Farbe `HUD_COLORS.coins`
    (identisch zum Coin-Sprite `WORLD_COLORS.coinBody` — beide `0xffd84c`)
- Zeile 2, `fontSize: BALANCE.hud.statFontPx`, y = `panelY + BALANCE.hud.rowTwoOffsetY`,
  vier gleich breite Spalten: `colW = panelW / 4`, Spalte `i` bei
  x = `panelX + colW * (i + 0.5)`, `setOrigin(0.5, 0)`:
  `DMG` (i=0), `RATE` (i=1), `SHOTS` (i=2), `SPD` (i=3), jeweils in ihrer Stat-Farbe.
- Alle fünf Texte `setDepth(BALANCE.hud.depthText)` — Tore fahren durch den HUD-Bereich
  und dürfen ihn nie überdecken.

`HudSegments` bekommt das neue Feld `shots`. `updateHud()` setzt zusätzlich
`this.hud.shots.setText(\`SHOTS ${this.runStats.get('projectiles')}\`)`.
`SHOTS` war bisher bewusst ausgeblendet; mit vier Spalten ist Platz, und alle fünf Stats,
die über Tore verändert werden, sind damit auch ablesbar.

`colorFor()` bleibt als Helfer erhalten (rechnet `number` → CSS-Hex) und wird auch für
`HUD_COLORS.coins` benutzt, damit es nur eine Umrechnungsstelle gibt.

`getSpdShown()` und die Update-Drossel (`lastShownSpeed`) bleiben unverändert.

### 7. `src/config/balance.ts` — SPD-Start auf 70 %

- `stats.speed.base`: `150` → `105` (70 % des bisherigen Startwerts)
- `stats.speed.floor`: `100` → `70` (proportional mitgezogen; sonst läge der Boden fast auf
  dem Startwert und SPD-Minus-Tore hätten keine Wirkung mehr)
- `stats.speed.cap`: `350` → `305` (hält die HUD-Spanne bei 1–200, denn
  `getSpdShown()` rechnet `enemySpeed − stats.speed.base`)

Der Kommentar über `pools.enemies` muss auf die neuen Zahlen nachgerechnet und angepasst
werden: Gegner sind jetzt länger sichtbar (Startphase 844px / 105px/s ≈ 8,0s statt 5,6s).
Gegenrechnung, die im Kommentar stehen soll: dichteste Phase ist die Startphase mit
Spawn-Intervall 1600ms bei 8,0s Sichtbarkeit ≈ 5 gleichzeitig; im Spätspiel ≈ 200px/s bei
450ms Intervall ≈ 9,4 gleichzeitig. Pool 20 bleibt ausreichend, **nicht** erhöhen.

### 8. App-Icons neu bauen — `scripts/make-icons.py`

Neues Skript (Python 3 + Pillow, beides lokal vorhanden; läuft **nicht** im CI, die Icons
werden fertig committet). Aufruf: `python3 scripts/make-icons.py` aus dem Projekt-Root.

Es erzeugt drei Dateien und überschreibt die bestehenden:
- `public/icon-192.png` (192×192)
- `public/icon-512.png` (512×512)
- `public/apple-touch-icon.png` (180×180)

Aufbau je Icon (Reihenfolge der Ebenen):
1. **Hintergrund:** dasselbe Muster wie die `background-tile`-Textur im Spiel — ein 64×64-Tile
   (Basis `#10131d`; Linien `#172033` bei y=12–13 und y=44–45 über volle Breite; Punkte
   `#26344e` bei (8,28)–(11,29) und (42,58)–(45,59)), dann mit `Image.NEAREST` auf die
   Icon-Größe **hochskaliert** (nicht gekachelt) — so bleiben die Linien groß und ruhig.
2. **Glow:** weiche Ellipse hinter der Figur, Farbe `#e8590c` (Projektil-Orange), Deckkraft
   max. 90/255, Radius ≈ 0,34 × Icongröße, zentriert, per `ImageFilter.GaussianBlur`
   (Radius ≈ 0,08 × Icongröße) auf einer eigenen RGBA-Ebene weichgezeichnet und dann
   alpha-komponiert. Damit hebt sich die dunkelrote Figur vom dunklen Grund ab.
3. **Figur:** `src/assets/player.png` mit `Image.NEAREST` skaliert auf Höhe
   `round(size * 0.58)` (Breite proportional, ganzzahliger Faktor bevorzugt, damit die Pixel
   scharf bleiben), zentriert einkomponiert. 58 % hält die Figur sicher in der mittleren
   70 % — iOS rundet die Ecken und darf nichts abschneiden.
4. **Speichern:** als `RGB` (Alpha flachlegen auf den Hintergrund), `optimize=True`.
   iOS-Homescreen-Icons dürfen keine Transparenz haben, sonst wird der Rest schwarz gefüllt.

`vite.config.ts` und `index.html` bleiben unverändert — Dateinamen, `start_url`, `scope`,
`theme_color`/`background_color` (`#10131d`) stimmen bereits und passen zum neuen Icon.

### 9. Restliche Aufräumarbeit

- `#ced4da` (das alte SPD-Grau) und `#f9dc65` (das alte Coin-Gelb) dürfen in `src/` nicht
  mehr vorkommen.
- Keine hartcodierte Farbe mehr in `BootScene.ts`, `GameScene.ts`, `gates.ts` außer
  `#ffffff` (Tortext, Trefferblitz) und den Werten aus `colors.ts`.

## Akzeptanzkriterien

1. `npm run check` (tsc) und `npm run build` laufen fehlerfrei.
2. `grep -rn "0xf03e3e\|0xf76707\|0x22b8cf\|0x845ef7\|0x40c057\|ced4da\|f9dc65" src/`
   liefert keinen Treffer.
3. `src/config/colors.ts` existiert; `STAT_COLORS` kommt in `src/systems/upgrades.ts`
   nicht mehr vor; `GameScene.ts` und `gates.ts` importieren es aus `../config/colors`.
4. Das HUD zeigt fünf Werte (`HP`, `¢`, `DMG`, `RATE`, `SHOTS`, `SPD` — HP und Coins in
   Zeile 1 an den Außenkanten, die vier Stats gleichmäßig verteilt in Zeile 2), alle
   Positionen aus `scale.width`/Insets berechnet, kein `+ 112`/`+ 228` mehr im Code.
5. Das HUD-Panel wird genau einmal in `create()` gezeichnet — kein `graphics.clear()`
   oder Neuzeichnen in `update()`/`updateHud()` (Pool-Regel: nichts im Hot Path erzeugen).
6. `BALANCE.stats.speed` steht auf `base: 105`, `floor: 70`, `cap: 305`; der
   `pools.enemies`-Kommentar ist auf diese Werte nachgerechnet, `pools.enemies` bleibt 20.
7. `python3 scripts/make-icons.py` läuft durch und erzeugt die drei Dateien. Prüfbar:
   ```
   python3 -c "from PIL import Image; [print(p, Image.open(p).size, Image.open(p).mode) for p in ['public/icon-192.png','public/icon-512.png','public/apple-touch-icon.png']]"
   ```
   muss `(192, 192) RGB`, `(512, 512) RGB`, `(180, 180) RGB` ausgeben.
8. Ein Screenshot ist **nicht** verlangt und zählt auch nicht als Nachweis — Farb- und
   Gamefeel-Abnahme macht Thomas am iPhone.

## Nicht ändern
- Physik, Kollision, Pools, Spawnraten, Gate-Mathematik, Coin-Werte.
- `vite.config.ts`, `index.html`, Manifest-Felder, Service-Worker-Konfiguration.
- `src/assets/player.png` (dient dem Icon-Skript nur als Vorlage).
- Alle übrigen `BALANCE`-Werte außer `stats.speed` und der neuen `hud`-Sektion.

## Implementation Summary

Farben liegen jetzt zentral in `src/config/colors.ts`; Boot-Texturen, Tore und HUD
verwenden diese Quelle. Das HUD ist ein einmalig gezeichnetes, Safe-Area-basiertes
Panel mit HP und Coins außen sowie DMG, RATE, SHOTS und SPD in vier Spalten.
Die Gegnergeschwindigkeit startet bei 105 und die drei Homescreen-Icons werden mit
`scripts/make-icons.py` aus dem Spiel-Hintergrund, Glow und Spieler-Sprite gebaut.

Validierung: `npm run check` und `npm run build` erfolgreich. Die Altfarben-Suche
liefert keinen Treffer; die Icons sind `192x192 RGB`, `512x512 RGB` und `180x180 RGB`.
Die sichtbare Farb- und Gamefeel-Abnahme am iPhone ist bewusst nicht Teil dieser Aufgabe.
