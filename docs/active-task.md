# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E3-Zusatz — Stat-Farben in HUD und Toren**

Thomas' Wunsch: Jeder Tor-Wert bekommt eine feste Farbe, die im HUD und an den
Toren identisch ist, damit sofort erkennbar ist, welches Tor welchen Wert
ändert. Kleiner, klar umrissener Task — keine Spec-Härtung nötig. Zu ändern:
`src/systems/upgrades.ts`, `src/scenes/BootScene.ts`, `src/systems/gates.ts`,
`src/scenes/GameScene.ts`.

## Anforderungen

### 1. `src/systems/upgrades.ts` — zentrale Farbtabelle

```ts
export const STAT_COLORS: Record<StatKey, number> = {
  hp: 0xff6b6b,          // Rot
  damage: 0xffa94d,      // Orange
  shotsPerSec: 0x66d9e8, // Türkis
  projectiles: 0xb197fc, // Violett
}
```

Einzige Quelle für Stat-Farben; HUD und Tore leiten CSS-Strings bei Bedarf
daraus ab (`'#' + color.toString(16).padStart(6, '0')`).

### 2. `src/scenes/BootScene.ts` — Gate-Textur neutral zeichnen

Die Gate-Textur wird künftig per `setTint` eingefärbt. Damit die Farbe kräftig
rauskommt: Füllung von `0x574a9e` auf `0xcccccc` (Alpha 0.82 bleibt), Rand von
`0xc7bcff` auf `0xffffff`. Tint multipliziert — so wird die Fläche zu ~80 % der
Stat-Farbe, der Rand zur vollen Stat-Farbe. Sonst nichts ändern.

### 3. `src/systems/gates.ts` — Tore beim Spawn einfärben

In `spawn()`:
- `pair.left` und `pair.right`: statt `clearTint()` →
  `setTint(STAT_COLORS[stat])`.
- `pair.statLabel`: zusätzlich `setColor(<CSS-String der Stat-Farbe>)`.
- `leftText`/`rightText` bleiben weiß mit Stroke (lesbar auf jeder Farbe).
- Der Auswahl-Flash (`setTintFill(0xffffff)` in `applyPair`) bleibt unverändert;
  der nächste Spawn setzt den Tint ohnehin neu.

### 4. `src/scenes/GameScene.ts` — HUD-Segmente einfärben

Ein Phaser-Text kann nur EINE Farbe — das HUD deshalb von einem Text-Objekt auf
fünf umbauen (gleicher Stil, gleiche Position oben links, zwei Zeilen):

- Zeile 1: `HP <n>` (Farbe hp), `¢ <n>` (Gelb `#f9dc65`), `SPD <n>` (`#ced4da`)
- Zeile 2: `DMG <n>` (Farbe damage), `RATE <n>` (Farbe shotsPerSec)
- Feste Spalten-X-Offsets (z. B. 0 / 130 / 250; Zeile 2: y + 28); Feinjustierung
  von Offsets/fontSize (24 → min. 20, falls es bei `SPD 330` eng wird) ist
  Codex' Ermessen — Kriterium: keine Überlappung bei Maximalwerten
  (`HP 20   ¢ 999   SPD 330`).
- `updateHud()` setzt alle fünf Texte; Rundung wie bisher (DMG/RATE eine
  Dezimale, Rest ganzzahlig).
- Update-Disziplin unverändert: `setText` nur über die bestehenden
  ereignisgesteuerten Pfade und den `lastShownSpeed`-Guard, nie pro Frame.

## Akzeptanzkriterien

1. `npm run check` (tsc) und `npm run build` laufen fehlerfrei.
2. `STAT_COLORS` liegt in `upgrades.ts` und ist die einzige Farbdefinition der
   vier Stats (grep: kein Stat-Hexwert doppelt woanders).
3. Tore und statLabel tragen beim Spawn die Farbe ihres Stats; Gate-Textur ist
   neutral grau/weiß.
4. HUD zeigt die fünf Segmente in den definierten Farben ohne Überlappung bei
   Maximalwerten.
5. Kein `setText` pro Frame; keine neuen Dateien; keine Änderungen außerhalb
   der vier genannten Dateien; Balance-Werte unangetastet.

## Implementation Summary
- `STAT_COLORS` zentral in `upgrades.ts` ergänzt; BootScene-Gate-Textur neutral grau/weiß gemacht; beide Gate-Flächen und ihr Stat-Label erhalten beim Spawn die Stat-Farbe; das HUD besteht nun aus fünf farbigen Text-Segmenten in zwei Zeilen (20 px, feste Offsets ohne Überlappung bei `HP 20   ¢ 999   SPD 330`). Die ereignisgesteuerten `updateHud()`-Pfade und der `lastShownSpeed`-Guard blieben unverändert.
- `npm run check`: erfolgreich (Exit 0). `npm run build`: erfolgreich (Exit 0; 20 Module, PWA-Service-Worker erzeugt). Der Build meldet nur die bestehende Vite-Warnung zum JavaScript-Chunk über 500 kB.
- Nichts funktional fehlgeschlagen. Der sonst übliche externe Terminal-Start konnte nicht vorbereitet werden, weil die Umgebung keine temporäre `.command`-Datei außerhalb des Projekts schreiben lässt; beide verlangten Prüfungen wurden deshalb direkt im Projekt-Shell ausgeführt.

## Review Notes
Review 2026-08-20 (Claude): bestanden. STAT_COLORS einzige Farbquelle, Gate-Textur
neutral, Tore/statLabel beim Spawn getintet, HUD in fünf farbige Segmente mit
festen Offsets (keine Überlappung bei Maximalwerten), setText weiter nur
ereignisgesteuert. check/build selbst ausgeführt, grün.
