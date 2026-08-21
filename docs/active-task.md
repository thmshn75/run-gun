# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Teil 1: Kulisse bewegt sich nach der falschen Kurve (Bug).
Teil 2: Hochhäuser statt Landhäuser — Stadtkulisse links und rechts.**

Thomas' iPhone-Test vom 2026-08-21: „die Bäume und Häuser sind zu schnell, sollen langsamer sein
und die Häuser sollten eher so wie Hochhäuser sein, links und rechts, als wenn man durch eine
Stadt läuft".

---

## Teil 1 — Bewegungskurve der Kulisse an die Straße angleichen

### Befund (nicht raten, der richtige Wert steht bereits im Code)
Die Fahrbahnmarkierungen in `src/systems/road.ts` bewegen sich **perspektivisch**:

```ts
// road.ts:31 und road.ts:44
const progressDelta = (BALANCE.scrollSpeed * dt) / (this.scene.scale.height * 1000)
const y = BALANCE.road.horizonY + (height - BALANCE.road.horizonY) * progress * progress
```

Die Kulisse in `src/systems/scenery.ts:52` bewegt sich dagegen **linear**:

```ts
object.image.y += (BALANCE.scrollSpeed * dt) / 1000
```

Damit rast ein Kulissenobjekt am Horizont mit vollen 180 px/s los, während die Mittellinie dort
nahezu stillsteht. Genau das nimmt Thomas als „zu schnell" wahr. Es ist kein Balance-Wert,
sondern eine Inkonsistenz zwischen zwei Systemen, die dieselbe Bodenebene darstellen.

### Auftrag
Die Kulisse übernimmt die Bewegungskurve der Straße **unverändert**. Konkret:

1. `SceneryObject` bekommt ein Feld `progress: number` (statt der y-Position als Zustand).
2. Beim Spawn: `progress = 0`.
3. In `update`: `object.progress += (BALANCE.scrollSpeed * dt) / (this.scene.scale.height * 1000)`,
   danach `object.image.y = BALANCE.road.horizonY + (height - BALANCE.road.horizonY) * object.progress * object.progress`.
4. **`progress` darf über 1 hinauslaufen** — nicht auf 1 clampen und nicht wie bei der Straße auf 0
   zurücksetzen. Sonst bleiben Objekte am unteren Bildrand stehen und werden nie recycelt.
   Die bestehende Recycle-Bedingung (unten raus oder seitlich raus) bleibt wie sie ist.
5. Die gemeinsame Formel gehört **in eine Funktion**, die Road und Scenery beide benutzen
   (z. B. `getScrollY(height, progress)` und `getScrollProgressDelta(height, dt)` in
   `src/systems/roadGeometry.ts`). Zwei Kopien derselben Kurve sind genau der Fehler, der hier
   gerade behoben wird. `road.ts` auf die neue Funktion umstellen, ohne sein Verhalten zu ändern.

### Erwartete Wirkung (nachrechnen, nicht schätzen)
Bei `width 390 / height 844`, `horizonY 150`, `scrollSpeed 180`:
- Geschwindigkeit am Horizont: **0 px/s** statt 180 px/s.
- Geschwindigkeit bei halber Strecke: ca. 148 px/s.
- Sichtbare Lebensdauer eines Objekts (bis es seitlich aus dem Bild wandert, ca. `y = 607`):
  **von 2,54 s auf 3,80 s**, also rund 50 % länger im Bild.

Diese Zahlen sind eine Herleitung, kein Akzeptanzkriterium — maßgeblich ist, dass Kulisse und
Mittellinie **dieselbe** Funktion benutzen.

### Was hier ausdrücklich NICHT gemacht wird
- **`BALANCE.scrollSpeed` nicht senken.** Das ist das Tempo des ganzen Spiels, nicht das der Kulisse.
- **Keinen eigenen Kulissen-Geschwindigkeitsfaktor einführen.** Bäume und Häuser stehen auf
  derselben Bodenebene wie die Straße; jede Abweichung von deren Tempo ist optisch falsch und
  würde als Rutschen wahrgenommen.

---

## Teil 2 — Hochhäuser statt Landhäuser

### Sprites (von Codex mit dem Bildwerkzeug zu erzeugen)
Drei neue Pixel-Art-Hochhäuser im Stil der vorhandenen Kulissen-Sprites, transparenter
Hintergrund, Frontansicht, Fußpunkt exakt an der Unterkante des Bildes (Origin ist `(0.5, 1)`):

| Datei | Zielmaß | Motiv |
|---|---|---|
| `src/assets/scenery-tower-a.png` | ca. 160 × 400 px | schmales Wohnhochhaus, gleichmäßiges Fensterraster, warme Fensterlichter |
| `src/assets/scenery-tower-b.png` | ca. 224 × 320 px | breiterer Büroblock, dunkle Glasfront, Dachaufbau |
| `src/assets/scenery-tower-c.png` | ca. 176 × 480 px | schlanker Turm mit Antenne, andere Fassadenfarbe |

Drei sichtbar unterschiedliche Silhouetten und Farben, damit eine Reihe nicht wie eine Tapete
wirkt. `scenery-cottage.png` **nicht löschen** — die Art bleibt erhalten, wird aber seltener
(siehe Gewichtung). Registrierung in `src/scenes/BootScene.ts` analog zu den bestehenden
`scenery-*`-Sprites.

### Größen in `scenery.ts`
`baseHeightPx` ist die Höhe **am Horizont**; unten skaliert sie über `getSceneryScale` hoch
(sichtbares Maximum ca. Faktor 1,77, bevor das Objekt seitlich aus dem Bild wandert).

- `scenery-tower-a`: `baseHeightPx: 150`
- `scenery-tower-b`: `baseHeightPx: 120`
- `scenery-tower-c`: `baseHeightPx: 185`

Zum Vergleich: Eiche 54, Nadelbaum 58. Die Türme ragen damit deutlich über den Horizont —
gewollt, das ist der Stadteindruck.

### Gewichtung statt Gleichverteilung
Die Auswahl in `spawn()` ist heute uniform über fünf Arten. Sie bekommt ein Gewicht pro Art,
damit die Stadt dominiert, ohne dass Grün verschwindet:

| Art | Gewicht |
|---|---|
| `scenery-tower-a` | 3 |
| `scenery-tower-b` | 3 |
| `scenery-tower-c` | 3 |
| `scenery-oak` | 2 |
| `scenery-conifer` | 2 |
| `scenery-bush` | 1 |
| `scenery-stone` | 1 |
| `scenery-cottage` | 1 |

Ergibt 56 % Hochhaus. Die Gewichte gehören als Feld `weight` an `SceneryKind`, die Ziehung als
gewichtete Auswahl über die vorhandene `this.rng()` — **kein zweiter Zufallsgenerator**, der Seed
muss reproduzierbar bleiben.

### Dichte
`BALANCE.scenery.spawnIntervalMs` von `900` auf `650` senken (dichtere Häuserzeile) und
`BALANCE.scenery.spreadPx` von `48` auf `20` (Häuser stehen an der Straßenkante statt verstreut
im Grün). `marginPx` bleibt bei `12`.

Seitliche Überlappung zweier Türme ist **erlaubt und erwünscht** — eine geschlossene Häuserfront
ist genau der Effekt. Es darf aber kein Objekt in die Straße ragen; der bestehende Test
`keeps every sampled roadside object fully outside the road` muss weiter grün sein.

### Poolgröße messen, nicht schätzen
`BALANCE.pools.scenery` steht auf 16. Mit längerer Lebensdauer (Teil 1) und kürzerem
Spawn-Intervall reicht das nicht mehr. Die neue Größe **wird gemessen**:

Einen Test schreiben, der die Spawn-/Recycle-Logik über mindestens 120 Sekunden Spielzeit
simuliert (feste dt-Schritte, deterministischer RNG, `width 390 / height 844`) und die maximale
Zahl gleichzeitig aktiver Objekte ermittelt. `BALANCE.pools.scenery` = dieses Maximum + 4 Reserve.
Der Test prüft anschließend, dass `spawn()` in der Simulation **nie** an einem leeren Pool
scheitert. Kein `create()`/`destroy()` im Hot Path — die Preallocation im Konstruktor bleibt.

Dafür muss die Platzierungs-/Lebensdauer-Logik testbar sein, ohne Phaser zu starten: falls
nötig die reine Rechnung nach `sceneryLayout.ts` ziehen (wie schon bei `getSceneryPlacement`)
und aus `scenery.ts` heraus aufrufen.

---

## Akzeptanzkriterien
1. Kulisse und Fahrbahnmarkierung benutzen **dieselbe** Bewegungsfunktion aus `roadGeometry.ts`;
   in `scenery.ts` steht keine eigene y-Fortschreibung mehr.
2. `scenery.ts` clampt `progress` nicht auf 1; Objekte wandern vollständig aus dem Bild und
   werden recycelt. Ein Test belegt, dass nach 120 s Simulation kein Objekt dauerhaft am unteren
   Rand hängt.
3. `BALANCE.scrollSpeed` ist unverändert `180`.
4. Drei neue Hochhaus-Sprites existieren, sind in `BootScene.ts` geladen und in `sceneryKinds`
   mit den oben genannten `baseHeightPx` eingetragen.
5. Die Artenwahl ist gewichtet, benutzt weiterhin `this.rng()` und ist bei gleichem Seed
   reproduzierbar. Ein Test belegt die Verteilung grob (Hochhaus-Anteil zwischen 45 % und 65 %
   über 2.000 Ziehungen).
6. `BALANCE.pools.scenery` ist aus der Simulation hergeleitet, nicht geschätzt; die Herleitung
   steht als Kommentar an der Konstante (wie bei `bossProjectiles`).
7. Der bestehende Test `keeps every sampled roadside object fully outside the road` ist grün —
   auch mit den neuen, breiteren Sprites. Der Test in `scenery.test.ts`, der
   `expect(BALANCE.pools.scenery).toBe(16)` festnagelt, wird auf den neuen Wert nachgezogen.
8. `npm run check`, `npm run build` und `npm test` laufen sauber durch.
9. Keine neuen Laufzeit-Requests, keine neuen Abhängigkeiten.

## Reißleine
Wenn die gewichtete Auswahl oder die Pool-Simulation nach **zwei Anläufen** nicht sauber testbar
ist, ohne Phaser zu instanziieren: Teil 1 allein abliefern (der ist unabhängig und behebt Thomas'
Hauptbeschwerde), Teil 2 zurückstellen und im Abschlussbericht sagen, woran es lag.
**Kein zulässiger Ersatz** ist: die Poolgröße doch zu schätzen, den Verteilungstest wegzulassen,
oder Teil 2 ohne Test einzubauen. Ebenfalls kein Ersatz: `scrollSpeed` senken, um „langsamer"
zu erreichen.
