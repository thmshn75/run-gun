# Aktive Aufgabe

Status: APPROVED

## Aufgabe: V6/N11 — Der Endboss wird groß und sichtbar

Die Silhouette ist behoben (`setTintFill` ist raus, danke). Beim Nachweis bei
390×844 bleibt ein Rest: **Der Boss ist am Horizont so klein, dass man ihn kaum
findet**, und er steht auf derselben Zeichenebene wie die Gegnermasse, verschwindet
also teilweise dahinter. Thomas will einen Endboss, den man als Figur erkennt.

### 1. Größer

In `balanceV2.ts`:
- `ende.bossStartScale` von 0.48 auf **1.10**
- `ende.bossEndScale` von 0.78 auf **1.80**

Rechenweg als Kommentar: Am Horizont greift zusätzlich `tiefenSkala` mit 0.45, der
Boss steht dort also effektiv bei 0.50 — bei 256 px Bildbreite rund 128 px und
damit etwa ein Drittel der Bildbreite. Am Ende seines Abstiegs steht er bei
ungefähr 1.2 und füllt die Bahn sichtbar aus. Die Tiefenskala bleibt unangetastet.

### 2. Vor der Masse statt dahinter

Boss und Bosszähler stehen heute auf Tiefe 2 bzw. 3 — dieselbe Ebene wie Mauern und
Massen. Der Boss gehört **vor alles auf der Bahn**: Bild auf Tiefe **8**, Zähler auf
**9**. Damit bleibt er sichtbar, auch wenn die Gegnerfläche bis an den Horizont
reicht.

### 3. Er soll sich bewegen wie eine Figur

Heute wechselt er alle 700 ms zwischen zwei Standbildern. In `src/assets/` liegen
`boss-elite-move-1.png` bis `boss-elite-move-12.png` — eine vollständige
Laufbildfolge. Daraus eine echte Phaser-Animation bauen (rund 10 Bilder je Sekunde,
endlos) und den Boss diese abspielen lassen. Falls diese Bilder in V2 noch nicht
geladen werden, im Ladeteil der Szene ergänzen — **nur diese Bilddateien, keine
Importe aus `src/systems/` oder `src/scenes/`.**

### Grenzen

- Nur `src/v2/`. Keine Importe aus `src/systems/`, `src/config/balance`,
  `src/scenes/`. Kein Speicherzugriff.
- Bilanzrechnung, Steuerung, Sammellogik und die Tiefenskala bleiben unverändert.
- Bildrate bleibt 60.

### Akzeptanzkriterien

1. `npx tsc --noEmit`, `npm test`, `npm run build` sauber; alle Tests grün.
2. Tests:
   - Die Bossgröße am Horizont, also `bossStartScale * tiefenSkala(Horizont)`,
     liegt über 0.45 — der Boss ist dort also mindestens so groß wie ein Helm im
     Vordergrund.
   - Boss und Bosszähler liegen auf einer höheren Zeichenebene als Massen und
     Mauern (Textprüfung auf die gesetzten Tiefen genügt, wie `v2Geruest` es macht).
3. **Browser-Nachweis bei 390×844** (führt Claude): Der Boss ist beim Start sofort
   als Figur erkennbar, steht vor der Gegnermasse und bewegt sich; 60 Bilder je
   Sekunde; Doppelstart identisch.

## Implementation Summary

- Boss-Skalierung auf 1,10 bis 1,80 mit dem verlangten Rechenweg erhöht.
- Alle zwölf vorhandenen Elite-Laufbilder werden als endlose Phaser-Animation mit
  zehn Bildern pro Sekunde geladen und gespielt; Boss und Zähler liegen auf Tiefe 8/9.
- Neue Tests prüfen Horizontgröße, Zeichenebenen und Animationsvorrat.
- `npx tsc --noEmit`, `npm test` (48 Dateien, 461 Tests), `npm run build` und
  `git diff --check` sind grün. Browser-Nachweis/Doppelstart führt Claude aus.
