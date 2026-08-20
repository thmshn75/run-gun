# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E3-Zusatz — Sattere HUD-/Tor-Farben, Projektile rot-orange**

Thomas' Auftrag: schönere, sattere Farben im HUD (statt der bisherigen
Pastelltöne) und die Schüsse in Rot-Orange. Die Tore und Tor-Labels ziehen
über `STAT_COLORS` automatisch mit — es sind nur zwei Dateien zu ändern:
`src/systems/upgrades.ts` und `src/scenes/BootScene.ts`.

## Anforderungen

### 1. `src/systems/upgrades.ts` — `STAT_COLORS` ersetzen

```ts
export const STAT_COLORS: Record<StatKey, number> = {
  hp: 0xf03e3e,
  damage: 0xf76707,
  shotsPerSec: 0x22b8cf,
  projectiles: 0x845ef7,
  speed: 0x40c057,
}
```

Nur die fünf Zahlenwerte tauschen (Familien bleiben: HP rot, DMG orange,
RATE cyan, SHOTS violett; SPD wechselt von Blassgrau zu sattem Grün — Grau
hat keine satte Variante, Gelb wäre mit den Coins verwechselbar). Sonst
nichts in der Datei ändern.

### 2. `src/scenes/BootScene.ts` — `createProjectileTexture()` ersetzen

```ts
private createProjectileTexture(): void {
  const graphics = this.add.graphics()
  graphics.fillStyle(0xe8590c)
  graphics.fillRect(0, 0, 6, 14)
  graphics.fillStyle(0xffc078)
  graphics.fillRect(1, 1, 4, 9)
  graphics.generateTexture('projectile', 6, 14)
  graphics.destroy()
}
```

Rot-oranger Körper mit hellem Kern Richtung Flugrichtung (oben) — wirkt wie
ein glühender Tracer. Texturgröße bleibt exakt 6×14 (der Physik-Body hängt
an der Texturgröße, NICHT ändern).

## Akzeptanzkriterien

1. `npm run check` (tsc) und `npm run build` laufen fehlerfrei.
2. `STAT_COLORS` enthält exakt die fünf oben genannten Werte.
3. `createProjectileTexture()` zeichnet 0xe8590c mit Kern 0xffc078;
   Texturgröße unverändert 6×14.
4. Keine Änderungen außerhalb der zwei genannten Dateien; keine neuen
   Dateien.

## Reißleine
Kleiner Zwei-Dateien-Task — läuft er nicht im ersten Anlauf plus einem
Nacharbeitszyklus grün, stoppen und Thomas informieren.

## Implementation Summary
`STAT_COLORS` in `src/systems/upgrades.ts` auf die fünf vorgegebenen satten
HUD-/Tor-Farben gesetzt. `createProjectileTexture()` in
`src/scenes/BootScene.ts` zeichnet jetzt einen rot-orangen Körper (`0xe8590c`)
mit hellem Kern (`0xffc078`); die Textur bleibt 6×14.

Testergebnisse: `npm run check` — erfolgreich (Exit 0); `npm run build` —
erfolgreich (Exit 0). Keine Akzeptanzprüfung fehlgeschlagen. Vite meldet nur
die nicht-blockierende bestehende Chunk-Größenwarnung (JavaScript-Bundle über
500 kB); der Build wurde dennoch erfolgreich erzeugt.

## Review Notes
Diff exakt nach Spec: fünf STAT_COLORS-Werte getauscht (Tore/Labels ziehen
automatisch mit), Projektil-Textur rot-orange mit hellem Kern, Größe 6×14
unverändert. Selbst verifiziert: `npm run check` und `npm run build` grün,
keine Änderungen außerhalb der zwei Dateien. Alle 4 Akzeptanzkriterien
erfüllt → APPROVED.
