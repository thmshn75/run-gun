# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Ziellinie ersetzen: Die Torhälfte, in die man fährt, leuchtet. Dazu Horizont-Feinschliff.**

Thomas-Entscheidung vom 2026-08-20 nach dem Test: Die Ziellinie auf der Fahrbahn gefällt ihm
nicht. Statt eines Strichs soll die **Torhälfte, in die er gerade fährt, beim Näherkommen
heller werden** — die Rückmeldung sitzt damit am Tor selbst und nicht dauerhaft auf der Bahn.

Der Zweck bleibt derselbe wie beim Strich: Vor dem Durchfahren muss erkennbar sein, welche
Seite zählt. Auslöser war ein `+2`-Tor auf RATE, nach dem Thomas die Rate für gesunken hielt.
Die Tor-Mathematik ist geprüft und korrekt — unsichtbar war die Seitenwahl.

Der vorige Task (Himmel und Horizont) ist abgeschlossen und freigegeben; seine Farben,
Geschwindigkeiten und Geometrie werden hier **nicht** angefasst.

## Teil 1 — Ziellinie entfernen

Restlos, ohne Reste:

- Das Bildobjekt und `updateAimLine()` in `GameScene`.
- Die Textur `aim-line` und `createAimLineTexture()` in `BootScene`.
- Der Abschnitt `aim` in `balance.ts` und `aimLine` in `colors.ts`.

Das Ebenensystem `BALANCE.layers` **bleibt** — es wird weiterhin von allen Spielobjekten
benutzt. Nur ein durch die Linie ungenutzt gewordener Eintrag entfällt.

## Teil 2 — Leuchtende Torhälfte

Solange ein Torpaar sichtbar und noch nicht ausgelöst ist, wird **genau eine** der beiden
Hälften hervorgehoben: die, die bei der aktuellen Position der Spitzenfigur angewandt würde.
Die Hervorhebung wandert live mit, wenn Thomas den Finger bewegt.

### Die eine Regel, an der alles hängt

Welche Seite gilt, entscheidet heute `applyPair()` mit `anchorX < this.scene.scale.width / 2`.
**Die Hervorhebung muss dieselbe Entscheidung treffen — nicht eine nachgebaute.**

Dafür eine kleine gemeinsame Funktion herausziehen, zum Beispiel
`isLeftSelected(anchorX, width): boolean`, und sie **an beiden Stellen** aufrufen: in
`applyPair()` und in der Hervorhebung. Zwei getrennte Vergleiche wären der wahrscheinlichste
Weg, wie beide Seiten später auseinanderlaufen — besonders im Grenzfall „genau mittig", wo
heute die **rechte** Seite gilt.

### Wie hervorgehoben wird

- Die gewählte Hälfte bekommt eine **aufgehellte Fassung ihrer eigenen Farbe**, die andere
  behält den bisherigen Ton. Also kein Weiß und keine Fremdfarbe: Ein Stat-Tor muss weiterhin
  an seiner Statfarbe erkennbar sein, ein Waffen-Tor an seinem Violett.
- Dafür eine Hilfsfunktion in `colors.ts`, die eine Farbe in Richtung Weiß mischt
  (Vorschlag: `lighten(color, amount)`), und ein Balance-Wert `gates.highlightLighten`,
  Vorschlag **0.45**.
- Angewandt wird die Aufhellung auf den **Torrahmen** (`pair.left` / `pair.right`). Schrift
  und Waffenbild bleiben unverändert — der Rahmen trägt das Signal.
- Aktualisiert wird je Bild in `Gates.update()`, solange `pair.active && !pair.triggered`.
  Zwei `setTint`-Aufrufe je aktivem Paar; bei höchstens zwei Paaren unkritisch.
- Sobald das Tor ausgelöst hat, gilt weiter die bestehende Rückmeldung: die gewählte Seite
  blitzt `gates.choiceFlashMs` = 250 ms weiß auf. Die Aufhellung wird dabei nicht doppelt
  angewandt.

## Teil 3 — Horizont-Feinschliff

Nachgemessen am laufenden Spiel: Es ragt noch Sichtbares über den Horizont in den Himmel.
Ursache ist, dass die Einblendung an der **Mitte** eines Objekts hängt statt an seiner
**Oberkante**.

Gemessen über 12 058 Bilder:
- Gegner: bis zu **25 px** über dem Horizont bei einer Deckkraft von bis zu **0,64**.
- Kopfzeile über dem Tor (`SPD`, `WAFFE` …): bis zu **20 px** über dem Horizont bei voller
  Deckkraft — die Zeile sitzt 49 px über der Tormitte und wird deshalb von der heutigen
  Rechnung gar nicht erfasst.
- Projektile: Der Abgang prüft die **Unterkante** (`y + displayHeight / 2 < horizonY`), also
  fliegt ein Geschoss vollständig in den Himmel, bevor es verschwindet; gemessen bis
  **18 px** darüber.

Korrektur, einheitlich über die **Oberkante**:

```
alpha = clamp((oberkante - road.horizonY) / road.entryFadePx, 0, 1)
```

- **Gegner:** `oberkante = y - displayHeight / 2`.
- **Tore:** `oberkante` ist die Oberkante des **höchsten** sichtbaren Teils des Paares, also
  der Kopfzeile — nicht die des Rahmens.
- **Projektile:** verschwinden, sobald `y - displayHeight / 2 <= road.horizonY`.

Damit ist die Deckkraft in dem Moment 0, in dem die Oberkante den Horizont berührt, und
erreicht 1 erst 40 px darunter. Über dem Horizont ist dann nichts mehr sichtbar.

## Ausdrücklich nicht ändern

- Der Bezugspunkt der Torwahl (`anchorX`) und der Auslösezeitpunkt bleiben.
- `gates.choiceFlashMs` (250 ms) und `feedback.hitFlashMs` (80 ms) bleiben.
- Keine eingeblendeten Zahlen, nirgends — Thomas' Vorgabe gilt weiter.
- Keine Farben von Himmel, Boden oder Fahrbahn ändern; die stehen seit dem letzten Task.
- `gates.extraSpeed` (227) bleibt — die Torlesezeit ist bereits nachgerechnet.
- Die Geschwindigkeitswerte der Gegner bleiben unangetastet.

## Reißleine

Lässt sich die Hervorhebung nicht so bauen, dass sie **immer** dieselbe Seite anzeigt, die
danach angewandt wird: **melden und stoppen**. Kein zulässiger Ersatz ist eine Anzeige, die
„meistens" stimmt, eine zweite eigene Vergleichslogik, oder ein Rückgriff auf die gerade
entfernte Linie.

## Akzeptanzkriterien

1. Auf der Fahrbahn ist keine Linie mehr; im Code gibt es keine Reste davon (`aim-line`,
   `createAimLineTexture`, `BALANCE.aim`, `WORLD_COLORS.aimLine`, `updateAimLine`).
2. Solange ein Tor sichtbar und nicht ausgelöst ist, ist **genau eine** Hälfte aufgehellt.
3. Die aufgehellte Hälfte ist in **jedem** Fall die Hälfte, die beim Durchfahren angewandt
   wird — auch bei genau mittiger Position, wo die rechte Seite gilt.
4. Die Hervorhebung wandert ohne sichtbare Verzögerung mit, wenn der Finger bewegt wird.
5. Stat-Tore behalten ihre Statfarbe, Waffen-Tore ihr Violett; die Hervorhebung ist eine
   aufgehellte Fassung derselben Farbe, kein Weiß.
6. Über drei Minuten Spielzeit hat **kein** Objekt mit einer Deckkraft über 0,02 einen Teil
   oberhalb von `road.horizonY` — weder Gegner, noch Tore, noch deren Kopfzeile, noch
   Projektile.
7. Die bisherigen Messwerte bleiben gehalten: 0 überlappende Gegner über drei Minuten,
   Tor-Sichtbarkeit rund 1,3 s.
8. `npm run check` und `npm run build` laufen fehlerfrei durch.

Kriterien 2, 3, 6 und 7 prüft Claude am laufenden Spiel nach — Kriterium 3 wie beim letzten
Mal über viele Tordurchfahrten mit bewegtem Finger, mit dem Anspruch **null Abweichungen**.
Ob die leuchtende Hälfte im Spiel gut ablesbar ist, entscheidet Thomas am iPhone.

## Implementation Summary

- Ziellinie einschließlich Textur, Konfiguration und Aktualisierung entfernt.
- Gemeinsame Funktion `isLeftSelected()` steuert sowohl Torwirkung als auch die live
  mitwandernde Aufhellung des ausgewählten Torrahmens; Stat- und Waffenfarben bleiben erhalten.
- Gegner, Tore samt Kopfzeile und Projektile richten ihre Horizontbehandlung nun an der
  Oberkante aus.
- Verifiziert mit `npm run check`, `npm run build`, `git diff --check` und einer Suche nach
  verbliebenen Linienresten.


## Review-Ergebnis (Claude, am laufenden Spiel nachgemessen)

Messlauf 7689 Bilder mit bewegtem Finger (links, Mitte, rechts im Wechsel):

- **Kriterium 3, die kritische Stelle:** 14 Tordurchfahrten, **0 Abweichungen** zwischen
  aufgehellter und angewandter Haelfte. Gemessen wurde nicht die Absicht im Code, sondern der
  tatsaechliche Farbwert der beiden Torrahmen — welche Haelfte gezeichnet heller ist.
- **Kriterium 2:** In **0** von 14 Faellen war keine Haelfte hervorgehoben, in **0** Faellen
  waren beide gleich hell. Es ist also immer genau eine.
- **Kriterium 6:** Maximale Deckkraft oberhalb des Horizonts: **0,00** bei Gegnern, Toren,
  Kopfzeilen und Projektilen. Ueber dem Horizont ist nichts mehr sichtbar (vorher: Gegner
  0,64 / Kopfzeile 1,00 / Projektile sichtbar bis 18 px darueber).
- **Kriterium 7:** 0 Frames mit ueberlappenden Gegnern.
- **Kriterium 1:** Keine Reste der Ziellinie im Code — weder Textur, Objekt, Balance-Wert
  noch Farbe.
- **Kriterium 8:** `npm run check` und `npm run build` selbst im Terminal, beide exit 0.

Die gemeinsame Funktion `isLeftSelected(anchorX, width)` wird von der Hervorhebung **und**
von `applyPair()` benutzt. Damit koennen Anzeige und Wirkung nicht auseinanderlaufen, auch
nicht im Grenzfall genau mittig.

**Offen bis zu Thomas' iPhone-Test:** ob der Helligkeitsunterschied zwischen den beiden
Torhaelften am kleinen Bildschirm deutlich genug ist. Stellschraube dafuer waere ein
einziger Wert: `gates.highlightLighten` (derzeit 0.45).
