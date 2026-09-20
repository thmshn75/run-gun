# Aktive Aufgabe

Status: APPROVED

## Aufgabe: N20 — Scharfe Darstellung auf hochauflösenden Bildschirmen

Thomas am 2026-09-20: *"die schriften im menübildschirm wirken sehr unscharf"* —
und auf die Erklärung, dass dafür ein eigener Umbau nötig ist: *"ja umbauen"*.

### Die Ursache (gemessen, nicht vermutet)

Das Spiel legt seinen Zeichenbereich mit **390 × 844 echten Bildpunkten** an
(`src/main.ts`, `scale.width/height`). Ein iPhone zeigt diese 390 Punkte auf
1.170 Gerätepunkten — jeder gezeichnete Punkt wird auf drei gestreckt.

`enableSharpText` rendert die Schrift-Textur zwar bereits in dreifacher
Auflösung, aber sie wird auf diesen 390-Punkte-Puffer gezeichnet. **Feiner als
der Puffer kann sie dort nicht werden.** Das betrifft nicht nur Schrift, sondern
alles Gezeichnete; bei Schrift fällt es nur am stärksten auf.

**Bereits geprüft und verworfen:** `scale.zoom` ändert bei `mode: FIT` nichts am
Puffer — gemessen bei `devicePixelRatio` 3 blieb er unverändert 390 px breit.
Nicht erneut probieren.

### Der Umbau

Der Zeichenbereich wird in Gerätepunkten angelegt, das Spiel rechnet aber
weiterhin in seinem gewohnten Feld von 390 × 844. Dafür sind drei Dinge nötig:

#### 1. Eine feste Feldgröße, unabhängig vom Puffer

Neue Konstante, z. B. `export const FELD = { breite: 390, hoehe: 844 } as const`
in einer eigenen kleinen Datei (`src/config/feld.ts`), damit sie sowohl von
`main.ts` als auch von jeder Szene ohne Zyklus importierbar ist.

**Alle 123 Stellen** in `src/`, die heute `this.scale.width` bzw.
`this.scale.height` lesen, holen ihren Wert künftig aus dieser Konstante. Sie
verteilen sich auf 18 Dateien:

`scenes/`: BootScene, MenuScene, TitleScene, GameScene, GameOverScene
`systems/`: walls, coins, weapons, road, weaponDetail, spawner, boss, scenery,
versuchBahnen, shopOverlay, crowd, bruecke
`v2/`: RunGunV2Scene

Das ist der Kern des Umbaus: Sobald der Puffer größer ist, liefert
`this.scale.width` nicht mehr 390, sondern 390 × Gerätefaktor — **jede einzelne
dieser Stellen würde sonst falsch rechnen und das Layout zerreissen.**

Wo eine Stelle die Größe an eine Funktion weiterreicht (etwa
`bahnKantenBeiY(width, height, y)`), bleibt die Signatur unverändert; nur der
übergebene Wert kommt aus der Konstante.

#### 2. Der Puffer wird in Gerätepunkten angelegt

In `src/main.ts`:

```ts
const geraeteFaktor = Math.min(2, Math.max(1, window.devicePixelRatio || 1))
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: FELD.breite * geraeteFaktor,
  height: FELD.hoehe * geraeteFaktor,
}
```

**Gedeckelt auf 2**, mit Rechenweg als Kommentar: Der Puffer wächst quadratisch,
Faktor 3 bräuchte die neunfache Fläche. Zwischen 2 und 3 ist auf dem Gerät kaum
ein Unterschied zu sehen, der Leistungsunterschied dagegen schon — und das Spiel
läuft auf einem iPhone, nicht auf einem Rechner.

#### 3. Jede Szene zoomt ihre Kamera auf den Faktor

Damit das Spiel weiter in 390 × 844 rechnet, während der Puffer größer ist,
bekommt **jede Szene** in ihrem `create` eine Zeile:

```ts
this.cameras.main.setZoom(geraeteFaktor).centerOn(FELD.breite / 2, FELD.hoehe / 2)
```

Sinnvollerweise als gemeinsame Hilfsfunktion (etwa `passeKameraAn(scene)` neben
`enableSharpText`), damit keine Szene vergessen wird und der Rechenweg an einer
Stelle steht. Betroffen sind alle Szenen: Boot, Title, Menu, Game, GameOver,
RunGunV2.

**Achtung bei `cameras.main.shake`** (GameScene, zwei Stellen): Die Stärke wird
in Bildpunkten angegeben und wirkt durch den Zoom anders. Prüfen und, falls
nötig, durch den Faktor teilen — der Bildschirm soll gleich stark wackeln wie
vorher, nicht doppelt so stark.

### Grenzen

- **Das Spielverhalten darf sich nicht ändern.** Keine Position, keine
  Schriftgröße, kein Abstand wird angefasst — nur die Herkunft der Feldgröße und
  die Kameraeinstellung.
- `enableSharpText` bleibt wie es ist; es wirkt jetzt erst richtig.
- Shop, gekaufte Waffen, Spielstände und alle bestehenden Modi bleiben unberührt.
- Bildrate bleibt 60. Der grössere Puffer kostet Leistung — deshalb der Deckel.

### Akzeptanzkriterien

1. `npx tsc --noEmit`, `npm test`, `npm run build` sauber; alle 485 Tests grün.
2. Tests:
   - In `src/` liest keine Stelle mehr `scale.width` oder `scale.height` für
     Layoutzwecke (Textprüfung über alle Dateien, wie `v2Geruest` sie für
     Importe schon macht). Erlaubt bleibt der Scale-Manager selbst in `main.ts`.
   - Der Gerätefaktor ist auf 2 gedeckelt und mindestens 1 — auch bei
     unsinnigen Werten für `devicePixelRatio` (0, negativ, NaN, undefined).
   - Eine Szene rechnet mit `FELD.breite` = 390, unabhängig vom Faktor.
3. **Browser-Nachweis bei 390×844** (führt Claude): Bei simulierter Gerätedichte 3
   ist der Puffer messbar breiter als 390 px, das Layout dabei unverändert
   (Menüknöpfe an denselben Stellen wie vorher, Vergleich gegen einen
   Screenshot von vor dem Umbau); 60 Bilder je Sekunde; Doppelstart identisch;
   Probelauf, Testgelände, Shop und Run Gun V2 starten und sehen aus wie vorher.

### Reißleine

Zerreisst das Layout nach Schritt 1 bis 3 an mehreren Stellen gleichzeitig, ist
der Ansatz falsch — dann zurückrollen und melden, statt Stelle für Stelle
nachzubessern. Der Umbau ist es nur wert, wenn er mechanisch durchgeht.

### Implementation Summary

- `FELD` trennt die feste Spielfläche 390 × 844 vom hochaufgelösten Zeichenpuffer.
- Der Gerätefaktor ist robust auf 1 bis 2 begrenzt; alle Szenen zentrieren und zoomen ihre Kamera über die gemeinsame Hilfsfunktion.
- Alle bisherigen Layoutlesezugriffe in Szenen und Systemen verwenden nun `FELD`; die beiden Kamerawackler bleiben optisch gleich stark.
- Terminal-Prüfungen: `npx tsc --noEmit`, `npm test` (50 Dateien, 488 Tests) und `npm run build` erfolgreich. Browser-Abnahme bleibt wie spezifiziert bei Claude offen.
