# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Drei Punkte aus Thomas' Test: Boss bleibt weiß, Division besser lesbar, PWA-Icon aus dem
Titelbild.**

---

# Teil 1 — Der Boss bleibt ein weißer Umriss (Fehler)

Thomas: „der Boss am Level Ende funktioniert zwar ist aber nur ein weißer Umriss".

## Befund

Der Trefferblitz wird mit **zwei verschiedenen Uhren** behandelt:

- Gesetzt in `spawner.ts:87`: `enemy.setData('flashUntil', gameTimeMs + hitFlashMs)` —
  `gameTimeMs` ist `GameScene.elapsedMs`, also die **Szenenuhr** (nach 80 s ≈ 80 000).
- Gelöscht in `boss.ts:96`: `if (flashUntil <= this.elapsedMs) clearTint()` — `this.elapsedMs`
  ist die **eigene Uhr des Bosses**, die in `activate()` (Zeile 54) bei jedem Bosskampf auf 0
  zurückgesetzt wird.

Nach dem ersten Treffer steht also `flashUntil` bei etwa 80 000, während die Bossuhr bei 5
steht. Die Bedingung wird nie wahr, `clearTint()` läuft nie, und `setTintFill(0xffffff)` malt
den Boss dauerhaft als weiße Fläche. Genau das sieht Thomas.

**Derselbe Fehler steckt auch bei den normalen Gegnern**, nur unauffälliger: `resetForLevel`
(Zeile 71) setzt `Spawner.elapsedMs` ebenfalls auf 0. Ab Level 2 bleibt damit **jeder**
getroffene Gegner weiß, bis er stirbt — bei kurzlebigen Gegnern fällt es kaum auf, ist aber
derselbe Defekt.

## Verlangte Korrektur — die Kopplung an eine fremde Uhr abschaffen

Nicht die Uhren angleichen. Zwei Uhren, die zufällig gleich laufen müssen, sind genau das
Problem.

Stattdessen: **Restzeit statt Zeitpunkt.** Das Feld `flashUntil` wird zu
`flashRemainingMs` und in `update(dt)` um `dt` heruntergezählt; erreicht es 0, wird die
Tönung gelöscht. Damit braucht die Stelle, die den Blitz löscht, **gar keine Uhr mehr**.

Dieses Muster ist im Projekt bereits im Einsatz — der Einschlag-Flash der Rakete
(`SplashFlashPool` in `GameScene.ts`) macht es genau so. Es gibt danach nur noch einen Weg.

Betroffen: `spawner.ts` (Setzen und Herunterzählen), `boss.ts` (Herunterzählen). Der Parameter
`gameTimeMs` von `Spawner.damage` wird dadurch überflüssig und entfällt; die Aufrufer in
`GameScene` werden entsprechend angepasst.

## Reißleine

Bleibt eine Figur nach der Änderung weiß oder blitzt gar nicht mehr: **melden und stoppen**.
Kein zulässiger Ersatz ist es, `setTintFill` durch etwas anderes zu ersetzen, den Blitz
wegzulassen oder die Uhren doch wieder aneinander zu binden.

---

# Teil 2 — Division im Tor als `/` statt `÷`

Thomas: „plus und dividiert ist in den Toren schwer erkennbar - hier das dividiert mit /
darstellen".

- In `gates.ts` die Beschriftung der Divisionstore von `÷2` auf **`/2`** ändern. Betroffen
  sind beide Stellen, an denen ein Divisions-Label entsteht (`drawGateOp` und
  `drawDirectionalOp`).
- `×` für Multiplikation bleibt unverändert — es ist von `+` gut zu unterscheiden.
- Die Rechenwirkung ändert sich **nicht**, nur die Beschriftung.

---

# Teil 3 — PWA-Icon aus dem Titelbild

Thomas: „Icon von pwa soll wie das Titelbild sein".

Heute erzeugt `scripts/make-icons.py` die Icons aus `src/assets/player.png` mit einem
gezeichneten Hintergrund. Künftig entstehen sie aus **`src/assets/title.png`**.

- Quelle ist die Datei im Repo (`src/assets/title.png`, 390 × 844), **nicht** die große
  Vorlage aus `assets/probe/` — die liegt in `.gitignore` und fehlt nach einem frischen Klon.
- Ein **quadratischer Ausschnitt** aus dem Titelbild, der die drei Figuren gut gefüllt zeigt.
  Der Ausschnitt gehört als benannte Konstante ins Skript, mit einem Satz dazu, warum genau
  dieser Bereich.
- Daraus die drei Dateien wie bisher: `public/icon-192.png`, `public/icon-512.png`,
  `public/apple-touch-icon.png` (180 px).
- **Vollständig deckend, kein transparenter Rand.** iOS setzt hinter ein durchsichtiges
  Apple-Touch-Icon Schwarz und rundet die Ecken selbst — ein eigener Rahmen oder eigene runde
  Ecken sähen doppelt aus.
- Skaliert wird mit einem Verfahren, das die Pixel-Optik erhält (Nearest Neighbour), nicht
  weichgezeichnet.
- Zur Prüfung ein Kontaktbild der drei Icons nach `assets/probe/icons-kontrolle.png` legen.

Das Skript bleibt über `npm run make-icons` aufrufbar und wird in diesem Lauf **einmal
ausgeführt**, damit die neuen Dateien im Repo liegen.

---

## Ausdrücklich nicht ändern

- Keine Spielbalance, keine Werte von Boss, Gegnern, Waffen oder Toren.
- Keine anderen Beschriftungen der Tore außer der Division.
- Kein neues Bild erzeugen — das Titelbild existiert bereits.
- Das Manifest bleibt unverändert; nur die Bilddateien werden ersetzt.

## Akzeptanzkriterien

1. Der Boss ist während des gesamten Kampfs normal gefärbt und blitzt bei einem Treffer nur
   kurz weiß auf; nach `feedback.hitFlashMs` = 80 ms ist er wieder normal.
2. Auch ab Level 2 bleibt kein getroffener Gegner dauerhaft weiß.
3. Im Code gibt es kein `flashUntil` mehr und keine Stelle, die den Blitz gegen eine Uhr
   vergleicht; `Spawner.damage` hat keinen Zeitparameter mehr.
4. Divisionstore zeigen `/2` statt `÷2`; die Wirkung ist unverändert.
5. `public/icon-192.png`, `public/icon-512.png` und `public/apple-touch-icon.png` zeigen einen
   Ausschnitt des Titelbilds, sind quadratisch, vollständig deckend und in der jeweils
   richtigen Größe.
6. Das Kontaktbild liegt unter `assets/probe/icons-kontrolle.png`.
7. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

Kriterien 1, 2 und 4 prüft Claude am laufenden Spiel nach — Kriterium 1 über eine Messung der
Tönung des Bosses über die Zeit, nicht über den Augenschein. Ob das Icon gefällt, entscheidet
Thomas.

## Implementation Summary

- Trefferblitze nutzen jetzt eine pro Figur heruntergezählte Restzeit; `Spawner.damage` hat keinen Zeitparameter mehr.
- Divisionstore verwenden `/`, und die drei PWA-Icons werden aus dem dokumentierten quadratischen Titelbild-Ausschnitt mit Nearest Neighbour erzeugt.
- `npm run make-icons`, `npm run check`, `npm run build` und `npm test` waren erfolgreich; das Kontaktbild liegt unter `assets/probe/icons-kontrolle.png`.


## Review-Ergebnis (Claude, am laufenden Spiel gemessen)

- **Kriterium 1 und 2, der Boss-Fehler:** Laengste ununterbrochene Weissphase des Bosses
  **10 Bilder**, bei normalen Gegnern **4 Bilder** — beides der regulaere Trefferblitz von
  80 ms, beim Boss durch schnell aufeinanderfolgende Treffer etwas verlaengert. Vorher blieb
  der Boss nach dem ersten Treffer **dauerhaft** weiss. Auch nach mehreren Levelwechseln
  bleibt kein Gegner weiss.
- **Kriterium 3:** Kein `flashUntil` mehr im Code, keine Stelle vergleicht den Blitz gegen
  eine Uhr, `Spawner.damage` hat keinen Zeitparameter mehr.
- **Kriterium 4:** Unter den im Lauf beobachteten Torbeschriftungen stehen `/2`, `×2`, `×1.5`,
  `+53`, `−79`, `+50 %`, `−30 %` — die Division erscheint als Schraegstrich, kein `÷` mehr.
- **Kriterium 5 und 6:** Icons in 192, 512 und 180 px, quadratisch und deckend, Ausschnitt mit
  den drei Figuren aus dem Titelbild; Kontrollbild liegt unter
  `assets/probe/icons-kontrolle.png`.
- **Kriterium 7:** `npm run check`, `npm run build`, `npm test` selbst im Terminal, alle exit 0.
