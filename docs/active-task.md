# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Gegner dürfen sich nie überlappen — Spurwahl muss das Einholen berücksichtigen.**

## Befund (gemessen, nicht vermutet)

Thomas meldet zum zweiten Mal, dass Zombies „doppelt" erscheinen — kleine und mittlere,
nie die großen, und auf einem Screenshot nicht zu sehen.

Nachgemessen am laufenden Spiel (120 s Dauerlauf, Positionen aller aktiven Gegner pro
Frame protokolliert):

- **147 von 8841 Frames (1,7 %) zeigen zwei einander überlappende Gegner-Sprites.**
- Überdeckung bis **35 px** — bei 42 px und 28 px breiten Sprites heißt das nahezu
  deckungsgleich.
- Betroffene Paarungen: `light+standard` (88 Frames), `heavy+light` (59 Frames).
  **Kein einziges Paar gleichen Typs.**

Ursache: Jeder Typ hat einen eigenen Geschwindigkeitsfaktor (`light` 1.35, `standard` 1.0,
`heavy` 0.7). Die Spur wird nur beim Spawn gezogen und nur gegen Gegner geprüft, die noch
ganz oben stehen (`spawner.ts`, `isSpawnLaneClear`: `enemy.y >= enemy.displayHeight + 20`
→ `true`). Ein schneller Gegner, der hinter einem langsameren in derselben Spur startet,
holt ihn deshalb ein und läuft mitten durch ihn hindurch.

Das erklärt beide Beobachtungen von Thomas:
- **Gleicher Typ = gleiche Geschwindigkeit = konstanter Abstand.** Zwei `heavy` können
  einander nie einholen — deshalb sind die großen nie betroffen.
- Die Konstellation besteht nur wenige Sekunden und tritt in 1,7 % der Frames auf — mit
  der Screenshot-Tastenkombination praktisch nicht zu treffen.

Beispiel aus dem Messlauf (ms 47332): `heavy` bei x=260.3 / y=190.4 und `light` bei
x=260.3 / y=149.6 — **identische x-Position**, vertikaler Abstand 40.8 px bei
Sprite-Höhen 52 und 38.

## Ziel

Zwei Gegner-Sprites überlappen sich zu keinem Zeitpunkt sichtbar — auch nicht beim
Überholen. Überholen selbst bleibt erlaubt und erwünscht; es muss nur sichtbar **neben**
dem Überholten stattfinden, nicht durch ihn hindurch.

Ausdrücklich **nicht** Teil des Ziels: Geschwindigkeitsunterschiede der Typen einebnen.
Der langsame, zähe `heavy` ist eine gewollte Design-Eigenschaft.

## Lösung: Spurwahl mit Einhol-Vorausschau

Die Spur eines Gegners steht beim Spawn fest und ändert sich nie. Damit lässt sich schon
beim Spawn entscheiden, ob es je zu einer Überlappung kommen kann.

### Geometrie-Grundlage

Die x-Position ist `x = width/2 + lane * getRoadHalfWidth(width, height, y)`. Die
Fahrbahn ist **oben am schmalsten** (`topWidthRatio: 0.46` → halbe Breite 89.7 px bei
390 px Bildbreite) und wird nach unten breiter. Der seitliche Abstand zweier Gegner mit
festen Spuren wächst also monoton, je weiter sie nach unten kommen.

Wenn zwei Gegner sich vertikal überlappen, stehen sie fast auf derselben Höhe, also gilt
für beide praktisch dieselbe Fahrbahnbreite. Deshalb genügt es, den seitlichen Abstand
**an der schmalsten Stelle** zu prüfen — `getRoadHalfWidth(width, height, 0)`. Wer dort
genug Abstand hat, hat ihn überall.

### Regel

Beim Spawn von Gegner **N** ist eine Spur nur zulässig, wenn für **jeden** aktiven Gegner
**E** gilt: entweder N kann E nie auf gleicher Höhe begegnen, oder der Spurabstand reicht.

**Schritt 1 — Kann N dem Gegner E je auf gleicher Höhe begegnen?**

- Wenn sie sich schon jetzt vertikal überlappen (`yE - yN < (bodyHeightN + bodyHeightE)/2`)
  → **ja**.
- Sonst, wenn `speedFactorN <= speedFactorE` → **nein** (N holt nie auf, der Abstand
  wächst oder bleibt gleich).
- Sonst gilt „ja", wenn N den Gegner E einholt, **bevor E den Bildschirm verlässt**:

  ```
  (yE - yN - (bodyHeightN + bodyHeightE)/2) / (speedFactorN - speedFactorE)
      <   (height + bodyHeightE/2 - yE) / speedFactorE
  ```

  Beide Seiten sind Zeiten, geteilt durch die globale Geschwindigkeit — die kürzt sich
  heraus. **Die Regel bleibt deshalb gültig, wenn SPD-Tore die Geschwindigkeit während
  des Laufs ändern.** Das ist beabsichtigt und darf nicht durch Einsetzen der aktuellen
  Geschwindigkeit „vereinfacht" werden.

**Schritt 2 — Wenn ja, muss der Spurabstand reichen:**

```
|laneN - laneE| * getRoadHalfWidth(width, height, 0)
    >=  (bodyWidthN + bodyWidthE) / 2  +  BALANCE.enemy.spawnLaneSafetyGap
```

### Spurauswahl statt Zufallsversuche

Die heutige Schleife mit `spawnLaneMaxAttempts: 5` Zufallsziehungen ersetzen: Jeder
relevante Gegner E sperrt genau ein Intervall um seine Spur. Aus den verbotenen
Intervallen die erlaubten Restintervalle innerhalb `[-maxLane, +maxLane]` bilden und
daraus **längengewichtet gleichverteilt** ziehen — sonst kippt die Verteilung zu den
Rändern und die Gegner klumpen sichtbar.

`spawnLaneMaxAttempts` entfällt damit; den Wert aus `balance.ts` entfernen.

### Wenn keine Spur frei ist

Den Spawn **verschieben, nicht erzwingen**. Ein ausgefallener Spawn wird beim nächsten
Update erneut versucht; es wird höchstens **ein** aufgeschobener Spawn mitgeführt, weitere
verfallen (kein Nachholen im Schwall, sonst entsteht genau die Traube, die vermieden
werden soll).

### Reißleine — was ausdrücklich **kein** zulässiger Ersatz ist

Wenn die Regel nicht umsetzbar ist oder die Aufschub-Quote das Akzeptanzkriterium reißt:
**melden und stoppen**, nicht ersetzen. Kein zulässiger Ersatz ist insbesondere:

- Gegner trotzdem überlappend setzen (das ist der Ist-Zustand).
- Die Geschwindigkeitsfaktoren der Typen angleichen oder annähern.
- Gegner zur Laufzeit seitlich verschieben, ausweichen oder abbremsen lassen.
- Überlappung per Arcade-Physik auflösen (Kollision zwischen Gegnern).
- Die Prüfung auf einen Teil der Gegner beschränken (z. B. nur die oberen), um sie
  „billiger" zu machen — genau das ist der heutige Fehler.

Zeitbudget: Führt der Ansatz nach 2–3 Stunden Maschinenzeit nicht zu 0 Überlappungen im
Messlauf, Ansatz melden statt weiterbohren.

## Umzusetzende Änderungen

**`src/config/balance.ts`**
- In `enemy.types` je Typ `bodyHeight` ergänzen — gemessene sichtbare Höhen:
  `light: 38`, `standard: 42`, `heavy: 49`.
  Den vorhandenen Kommentar zu `bodyWidth` so erweitern, dass er beide Maße abdeckt und
  das Nachmessen bei Sprite-Änderungen verlangt.
- `spawnLaneMaxAttempts` entfernen.
- `spawnLaneTopPadding` entfernen, falls nach dem Umbau ungenutzt.

**`src/systems/spawner.ts`**
- `drawSpawnLane` / `isSpawnLaneClear` durch die Intervall-Auswahl oben ersetzen.
- Die Spurwahl als **reine Funktion** herausziehen (keine Phaser-Abhängigkeit, Eingabe:
  Liste der aktiven Gegner mit `lane`/`y`/`speedFactor`/`bodyWidth`/`bodyHeight`, Typ des
  neuen Gegners, `roadHalfWidthTop`, `height`, Zufallsquelle). So ist sie ohne Browser
  prüfbar und der Rest bleibt unverändert.
- Aufgeschobenen Spawn im Spawner mitführen.
- DEV-Instrumentierung analog `warnPoolExhausted`: alle 10 s Anzahl Spawns und Anzahl
  aufgeschobener Spawns ausgeben. Nur unter `import.meta.env.DEV`.

## Akzeptanzkriterien

1. `npm run check` und `npm run build` laufen fehlerfrei durch.
2. **Messlauf über 3 Minuten Spielzeit: 0 Frames mit überlappenden Gegner-Sprites.**
   Überlappung heißt: `|xA-xB| < (bodyWidthA+bodyWidthB)/2` **und**
   `|yA-yB| < (bodyHeightA+bodyHeightB)/2`. Vergleichswert vorher: 1,7 % der Frames.
3. Aufschub-Quote im selben Lauf **unter 5 %** der geplanten Spawns. Wird sie höher,
   melden statt die Regel aufweichen.
4. Gegner nutzen weiterhin die volle Fahrbahnbreite; keine sichtbare Klumpenbildung in
   der Mitte oder an den Rändern.
5. Kein `create()`/`destroy()` im Hot Path; Gegner-Pool bleibt bei 48.
6. Spielgefühl unverändert: Typ-Geschwindigkeiten, Spawn-Intervalle und Wellen bleiben
   wie sie sind.

Kriterium 2 und 3 prüft Claude nach der Umsetzung selbst am laufenden Spiel nach
(Prototyp-Instrumentierung über Playwright, gleiches Verfahren wie bei der Diagnose).
Codex muss dafür nichts bauen — aber die DEV-Ausgabe aus dem letzten Punkt oben liefern.

## Review-Ergebnis (Claude, am laufenden Spiel nachgemessen)

Messlauf 211 s / 12650 Frames, gleiches Verfahren wie bei der Diagnose:

- **0 Frames mit überlappenden Gegnern** (vorher: 147 von 8841 = 1,7 %). Kriterium 2 erfüllt.
- **Aufschub-Quote 0 %** — in jedem 10-s-Fenster über den ganzen Lauf `planned == spawns`,
  auch bei bis zu 10 gleichzeitigen Gegnern. Kriterium 3 erfüllt.
- Spurverteilung beim Erscheinen über zehn Bänder: 235–345 je Band bei 266 erwartet
  (Randbänder niedriger, weil `maxLane` typabhängig kleiner ist). Keine Klumpenbildung,
  volle Fahrbahnbreite genutzt. Kriterium 4 erfüllt.
  Die scheinbar leere Fahrbahnmitte weiter unten ist kein Spawn-Effekt, sondern die
  Truppe: sie steht mittig und schießt geradeaus, mittige Gegner sterben zuerst.
- `npm run check` und `npm run build` selbst im Terminal ausgeführt, beide exit 0.
- Nebenwirkung, bewusst übernommen: Trefferfläche und Spawn-Höhe nutzen jetzt die
  sichtbare Figurenhöhe statt der Sprite-Höhe. Die Hitbox von `standard` und `heavy` ist
  dadurch 2 bzw. 3 px kürzer — konsistent zu `bodyWidth`, spürbar ist das nicht.

## Implementation Summary

- Die reine Funktion `chooseSpawnLane` berechnet zulässige Restintervalle für alle
  aktiven Gegner, einschließlich der Einhol-Vorausschau, und zieht daraus
  längengewichtet.
- Nicht verfügbare Spuren verschieben genau einen Spawn; weitere geplante Spawns verfallen.
  Die DEV-Konsole meldet je 10 Sekunden `spawns`, `deferred` und `planned`.
- Sichtbare Gegnermaße sind je Typ hinterlegt; Geschwindigkeit, Wellen, Spawn-Intervalle
  und der 48er-Pool blieben unverändert.

## Danach als Nächstes

- **E4b** — drei Zusatzwaffen + Waffen-Tore. Gehärtete Spec liegt fertig in
  `docs/spec-e4b-entwurf.md`, muss nur hierher übernommen werden. Größter Task des
  Projekts.
- Torwahl sichtbar machen; Hintergrund gestalten; 3D-Schritt 2; E4c (Gegner als Truppen).
