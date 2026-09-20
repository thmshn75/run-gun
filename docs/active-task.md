# Aktive Aufgabe

Status: APPROVED

## Aufgabe: V6/N8 — Optik nach dem Video und zwei Mechanik-Änderungen

Thomas am 2026-09-20, wörtlich:
- "die Optik gefällt mir noch gar nicht, ich möchte Brücke und Wasser"
- "die Brücke hinten breiter machen, damit man hinten mehr Platz hat, und in einer
  Kurve bzw. wie ein Trichter nach vorne kommen, links und rechts bewegtes Wasser und
  einen schönen Horizontübergang zum Himmel"
- "die eigene Armee nur als Helme darstellen und die anderen auch, nur die Heavy und
  die Bosse als Figuren"
- "die +1 Wände sollen schneller werden, wenn ich nach links fahre"
- "das Tor in der Mitte nicht ×99, sondern nur ×2"
- Zu den +99: "überlege dir selbst etwas Logisches, was wir brauchen können" —
  festgelegt: **links gibt Menge, rechts gibt Stärke** (siehe Punkt 5).

### 1. Brücke über Wasser, Trichterform

- Die Bahn ist eine **Brücke**: mit Geländern an beiden Seiten, links und rechts
  daneben **bewegtes Wasser** (ruhige, wiederkehrende Wellenbewegung; kein Zufall je
  Bild, sondern eine Sinusbewegung, damit es ruhig wirkt).
- **Trichterform:** hinten (am Horizont) deutlich breiter als vorn. Heute ist es
  umgekehrt. Die Bahnkanten-Funktion `bahnKanten` ist entsprechend umzustellen; alle
  Stellen, die sie benutzen (Truppe, Ränder, Flächen), ziehen automatisch mit — genau
  dafür gibt es sie. **Keine zweite Geometrie danebenbauen.**
- **Horizontübergang:** weicher Verlauf zwischen Wasser/Bahn und Himmel statt der
  heutigen harten Kante. Ein Farbverlauf über wenige Dutzend Pixel genügt.

### 2. Helme statt Figuren

- Die **Masse** beider Seiten wird als **Helm** dargestellt, nicht als ganze Figur:
  eigene Seite blaue Helme, Gegnerseite rote Helme. Das ist der Grund, warum die
  Massen im Video so dicht wirken.
- **Nur Heavy und Bosse bleiben ganze Figuren** und sind entsprechend größer.
- Die Helm-Bilder **erzeugst du mit deinem Bildwerkzeug** und legst sie zu den übrigen
  Bildern. Zwei Stück genügen (ein Helm blau, ein Helm rot), schlicht und von oben
  gesehen, damit sie bei wenigen Pixeln Größe noch als Helm lesbar sind.

### 3. Das Tor zeigt ×2

`tor.faktor` auf 2. Der Freischaltzähler bleibt, aber die Zahl ist an den kleineren
Faktor anzupassen, damit die Freischaltung in ähnlicher Zeit gelingt — Rechenweg als
Kommentar.

### 4. Die +1-Reihe wird schneller, je weiter links

Heute laufen die Schilder mit festem Tempo vorbei. Neu: Das Tempo der **linken** Reihe
steigt, je weiter links die Truppe steht — ganz links deutlich schneller, in der Mitte
das Grundtempo. So lohnt sich das Hinfahren doppelt. Zwei Werte in `balanceV2.ts`
(Grundtempo, Zuschlag ganz links) mit Rechenweg.

### 5. Die +99-Reihe gibt STÄRKE statt Menge

Bisher vergrößert sie wie die +1-Reihe die Truppe — das ist doppelt gemoppelt und war
der Grund für Thomas' Einwand. Neu:

- Ein eingesammeltes +99-Schild erhöht die **Schlagkraft** der eigenen Seite: Jede
  eigene Einheit nimmt der Gegnerfläche mehr Vorrat ab.
- Die Truppengröße bleibt davon **unberührt**.
- Damit entsteht die Entscheidung: **links viele schwache, rechts wenige starke.**
- Die Schlagkraft wird als eigener Wert geführt und ist **sichtbar** — eine zweite
  Zahl neben der Truppengröße, klar beschriftet.
- Werte so wählen, dass beide Wege zum Sieg führen können und keiner offensichtlich
  besser ist. Der Rechenweg gehört als Kommentar dazu: Zustrom mal Schlagkraft gegen
  Gegnervorrat, für beide Wege einmal durchgerechnet.

### Grenzen

- Alles in `src/v2/` (plus die neuen Bilddateien). Keine Importe aus `src/systems/`,
  `src/config/balance`, `src/scenes/`. Kein Speicherzugriff.
- Die Bilanzrechnung aus S4/S7 bleibt in ihrer Struktur; nur der Schlagkraft-Faktor
  kommt hinzu.
- Bildrate bleibt bei 60, auch mit Wasser und Helmen.

### Akzeptanzkriterien

1. `npx tsc --noEmit`, `npm run build`, `npm test` sauber; bestehende V2-Tests grün.
2. Tests:
   - `bahnKanten` ist hinten breiter als vorn (Trichter), für mehrere Höhen geprüft.
   - Das Tempo der linken Reihe steigt streng monoton, je weiter links die Truppe
     steht; in der Mitte gilt das Grundtempo.
   - Ein +99-Schild erhöht die Schlagkraft und **nicht** die Truppengröße.
   - Beide Wege (nur links / nur rechts) führen rechnerisch zum Sieg — je einmal über
     die Bilanzfunktion durchgerechnet, ohne Phaser.
3. **Browser-Nachweis bei 390×844** (führt Claude selbst): Brücke mit Geländern über
   bewegtem Wasser, hinten breiter, weicher Horizont; Massen als Helme, Heavy und Boss
   als Figuren; Tor zeigt ×2; linke Reihe wird beim Linksfahren sichtbar schneller;
   +99 erhöht die zweite Zahl, nicht die Truppengröße; 60 Bilder je Sekunde;
   Doppelstart identisch.

### Vorab: kleiner Rest aus der Torlauf-Entfernung

In `src/systems/spawner.ts` steht bei `setData('bodyWidth', ...)` noch ein Kommentar,
der auf den entfernten Modus verweist, und die Multiplikation `* 1` ist dadurch
sinnlos geworden. Beides bereinigen — Kommentar auf die verbleibende Aussage kürzen
(Kampfhöhen-Maße für Spurwahl, Schatten und Formationsbreite), `* 1` streichen. Der
Test `tests/keinTorlauf.test.ts` wird damit grün. **Sonst nichts am Spawner ändern.**

## Implementation Summary

- V2 zeichnet die trichterfoermige Bruecke mit Geländern, sinusbewegtem Wasser und weichem Horizont; beide neu erzeugten Helm-PNGs liegen in `src/assets/` und werden fuer Truppe, Strom und Massen verwendet, Heavy/Boss bleiben Figuren.
- Tor ist ×2 mit proportional auf zwei reduzierten Treffern. Links beschleunigt die +1-Reihe von 120 auf 220 px/s, rechts erhöht +99 ausschliesslich die sichtbare Staerke (100 → 199).
- Bilanz-, Geometrie- und Randtests decken beide Siegwege ab. Der einzelne verbliebene Spawner-Kommentar wurde gekuerzt und `* 1` entfernt.
- Nachweise: `npx tsc --noEmit`, `npm test` (47 Dateien, 453 Tests) und `npm run build` erfolgreich; Browser- und 390×844-Doppelstart-Nachweis bleibt wie vereinbart bei Claude.
