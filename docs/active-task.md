# Aktive Aufgabe

Status: APPROVED

## Aufgabe: V6/N10 — Echte Tiefe statt flacher Draufsicht, breitere Bahn, Boss als Figur

Thomas am 2026-09-20, wörtlich:
> "schon besser aber mehr 3d von hinten nach vorne als von oben nach unten und die
> strassen im video wirken breiter trotz der wände links und rechts — sieh dir das
> nochmal im video an und fixe bzw. ändere das, der endboss ist nur eine silhouette
> aber keine richtige figur bis jetzt"

Gegenprüfung am Video (`/Users/mcbooktehn/Downloads/111.mov`, Bild 200) ergab drei
Unterschiede — die ersten beiden sind der Grund, warum unsere Bahn flach wirkt:

1. **Im Video werden Schilder, Mauern und Figuren nach hinten kleiner.** Ein +1-Schild
   am Horizont ist etwa halb so groß wie eines im Vordergrund. Bei uns ist jedes
   Schild gleich groß — dadurch sieht die Bahn aus wie eine von oben gesehene Fläche
   statt wie eine Straße, die in die Ferne läuft. **Das ist die Hauptursache.**
2. **Die Bahn verjüngt sich im Video nach hinten, nicht nach vorn** — schwach, aber
   in der richtigen Richtung: am Horizont rund 47 Prozent der Bildbreite, vorn rund
   59 Prozent. Unsere heutige Form (oben voll breit, vorn schmal) ist die
   Umkehrung und arbeitet gegen jede Tiefenwirkung.
3. Die Fahrbahn wirkt **breiter**, obwohl links und rechts Mauern stehen: die
   Schilder sind schmal und lassen die Mitte frei. Unsere Schilder sind mit 54 px
   auf 390 px Bild so breit, dass sie die halbe Bahn verdecken.

### 1. Perspektivische Verkleinerung nach hinten (der Kern)

Neue Funktion in `balanceV2.ts`, etwa `tiefenSkala(height, y)`: liefert zu einer
Bildschirmhöhe den Größenfaktor eines Objekts, das dort steht.

```
tiefenSkala(y) = skalaHorizont + (1 - skalaHorizont) * f
```

mit `f` dem schon vorhandenen Höhenfortschritt zwischen Horizont (0) und Unterkante
(1). `track.skalaHorizont` kommt neu nach `balanceV2.ts`, **Startwert 0.45** mit
Rechenweg: ein Schild am Horizont ist damit knapp halb so groß wie vorn — das
entspricht dem im Video gemessenen Verhältnis.

**Diese Funktion ist von allen Dingen zu benutzen, die auf der Bahn stehen:**
Randschilder (Breite, Höhe und Schriftgröße), die Helme beider Massen, die
Stromfiguren, Heavy und Boss, das Tor. Wo heute eine feste Pixelgröße gesetzt wird,
steht künftig diese Größe mal `tiefenSkala`. **Keine zweite Skalenrechnung
danebenbauen** — eine Quelle, sonst driften die Dinge auseinander (so ist S1 schon
einmal gebrochen).

Die Tiefenskala betrifft **nur die Darstellung**. Sammelreichweiten, Bilanzrechnung
und Steuerung bleiben in ihren heutigen Maßen, damit sich das Spiel nicht ändert.

### 2. Die Bahn verjüngt sich wieder nach hinten

- `topWidthRatio` von 1.0 auf **0.62**
- `bottomWidthRatio` von 0.58 auf **0.94**

Die in N9 gebaute Krümmung bleibt erhalten und dreht sich mit: Die Formel rechnet
den Breitenüberschuss künftig von der **unteren** Kante aus, sodass die starke
Krümmung weiterhin am Horizont sitzt und die Bahn im unteren, bespielten Drittel
nahezu parallel läuft. `kurvenExponent` bleibt 1.8.

**Hinweis für den Test:** Die Monotonie dreht sich um — die Breite nimmt jetzt von
oben nach unten **zu**. Bestehende Tests entsprechend umstellen, nicht löschen.

### 3. Mauern mit Höhe statt Striche

Die Bahnkante ist heute ein Strich. Im Video ist sie eine **Mauer mit sichtbarer
Höhe**, die nach hinten kleiner wird. Die Kante bekommt deshalb einen Aufbau aus
kurzen senkrechten Mauersegmenten entlang derselben Stützpunkte, die schon die
Kurve liefert; die Höhe eines Segments ist `track.mauerHoehePx` (Startwert 26) mal
`tiefenSkala` an seiner Stelle. Heller Kamm oben, dunklere Flanke — zwei Farben
genügen, das Video zeigt nicht mehr.

### 4. Schmalere Schilder, breitere Fahrbahn

- `schildBreitePx` von 54 auf **38**, `randEinzugPx` von 42 auf **30**.
- Beide Werte gelten für den Vordergrund und werden über `tiefenSkala` nach hinten
  kleiner.
- Die Schrift auf dem Schild skaliert mit, damit sie nicht über den Rand steht.

Zusammen mit der breiteren Vorderkante bleibt die Bahnmitte frei — das ist der
Eindruck, den Thomas am Video meint.

### 5. Der Boss ist eine Figur, keine Silhouette

In `erstelleBoss` steht `.setTintFill(BALANCE_V2.colors.gegnerSeite)`. `setTintFill`
**ersetzt jede Pixelfarbe** durch die eine Farbe — deshalb ist vom Boss nur ein
roter Umriss übrig. Das ist die Ursache, nicht das Bild.

- Den Boss ohne Einfärbung zeichnen; wenn eine Zugehörigkeitsfarbe gewünscht ist,
  dann `setTint` (multiplikativ, Struktur bleibt sichtbar) mit einem hellen Ton.
- Der Boss ist **deutlich größer** als die übrigen Figuren und nutzt die vorhandene
  Bildfolge `boss-elite-move-*` als Laufanimation, damit er sich bewegt.
- Dieselbe Prüfung für Heavy und alle anderen Figuren: **nirgends `setTintFill`** —
  wo es steht, ist die Figur eine Silhouette. Helme dürfen eingefärbt bleiben, da
  sie als Farbfläche gedacht sind.

### Grenzen

- Nur `src/v2/`. Keine Importe aus `src/systems/`, `src/config/balance`,
  `src/scenes/`. Kein Speicherzugriff.
- Die Bilanzrechnung, die Steuerung und die Sammellogik bleiben unverändert.
- Bildrate bleibt 60. Die Tiefenskala eines ruhenden Objekts wird **einmal beim
  Aufbau** gerechnet; nur bei tatsächlich wandernden Dingen (Schilder, Strom) je
  Bild — dort ist es eine Multiplikation, kein neues Objekt.

### Akzeptanzkriterien

1. `npx tsc --noEmit`, `npm test`, `npm run build` sauber; alle Tests grün.
2. Neue Tests:
   - `tiefenSkala` liefert am Horizont `skalaHorizont`, an der Unterkante genau 1
     und wächst dazwischen streng monoton.
   - Die Bahnbreite nimmt von oben nach unten streng monoton **zu**; auf halber
     Höhe ist die Bahn schmaler als der Mittelwert der beiden Endbreiten (die
     Krümmung sitzt also weiterhin oben).
   - Ein Schild am Horizont ist in Breite und Höhe kleiner als eines vorn.
   - Die Quelltexte in `src/v2/` enthalten **kein** `setTintFill` auf Figuren
     (Boss, Heavy, Strom) — Textprüfung, wie sie `v2Geruest` schon für Importe macht.
3. **Browser-Nachweis bei 390×844** (führt Claude): sichtbare Tiefe — Schilder und
   Mauern werden nach hinten kleiner; Bahn hinten schmaler, vorn fast volle Breite;
   freie Bahnmitte; Boss als erkennbare Figur mit Bewegung, nicht als Umriss;
   60 Bilder je Sekunde; Doppelstart identisch.

### Reißleine

Wirkt die Bahn nach Punkt 1 bis 4 immer noch flach, liegt es nicht an weiteren
Feinwerten, sondern an der Kameraführung — dann melden statt nachjustieren.

## Implementation Summary

- Zentrale `tiefenSkala` für Bahnobjekte ergänzt; Trichter ist hinten schmal und vorne breit.
- Segmentmauern, schmale Schilder, Tor, Helme, Strom, Heavy und Boss folgen derselben Perspektive.
- Boss behält seine Bildstruktur mit heller Multiplikativ-Färbung und wechselnder Pose; keine V2-Figur nutzt eine Silhouetten-Färbung.
- Neue transparente Blau-/Rot-Helme mit dem Bildwerkzeug erzeugt und eingebunden.
- `npx tsc --noEmit`, `npm test` (47 Dateien, 458 Tests), `npm run build` und `git diff --check` erfolgreich. Browser-Doppelstart bei 390×844 bleibt der separate Claude-Nachweis.
