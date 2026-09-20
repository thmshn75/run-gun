# Aktive Aufgabe

Status: APPROVED

## Aufgabe: V6/N9 — Die Brücke bekommt eine gebogene Trichterform

Thomas am 2026-09-20, wörtlich:
> "der trichter soll aber nicht gerade sein sondern eine kurve oben breit unten
> schmal aber so breit es laut bildschirm geht"

Heute laufen die Bahnkanten als **gerade Linie** von der Horizontecke zur unteren
Ecke — `bahnKantenBeiY` interpoliert linear. Das soll eine **Kurve** werden: am
Horizont weit aufgefächert, nach vorn hin rasch schmaler, im unteren Drittel fast
parallel. Und die Bahn soll die Bildschirmbreite ausnutzen.

### 1. Gebogene Kante in `bahnKantenBeiY`

Die halbe Bahnbreite auf einer Höhe folgt nicht mehr `topHalf + (bottomHalf -
topHalf) * f`, sondern:

```
halbeBreite(f) = bottomHalf + (topHalf - bottomHalf) * (1 - f) ** kurvenExponent
```

mit `f` dem bisherigen, weiterhin auf 0..1 begrenzten Höhenfortschritt zwischen
Horizont und Unterkante. Bei `kurvenExponent = 1` ergibt das exakt die heutige
Gerade — der neue Wert kommt als `track.kurvenExponent` nach `balanceV2.ts`,
**Startwert 1.8**, mit Rechenweg als Kommentar: bei halber Höhe ist die Bahn damit
schon auf etwa 29 Prozent des Breitenüberschusses zurück, liegt also im unteren,
bespielten Teil nahezu parallel, während die Auffächerung am Horizont sitzt.

`bahnKanten` liefert weiterhin dieselben vier Eckpunkte — die Kurve liegt
ausschliesslich dazwischen, damit Horizont- und Unterkante unverändert bleiben.

### 2. Breiter ausnutzen

- `topWidthRatio` von 0.90 auf **1.0**: die Brücke reicht am Horizont über die
  volle Bildschirmbreite. Das Wasser bleibt sichtbar, weil die Kurve nach vorn
  auseinandergeht — es füllt dann die unteren Ecken.
- `bottomWidthRatio` von 0.54 auf **0.58**: vorn weiterhin deutlich schmaler,
  aber nicht enger als nötig.

### 3. Alles Gezeichnete muss der Kurve folgen

Heute sind Straße, Wasserflächen und die beiden Kantenlinien **Vierecke bzw.
gerade Linien aus den vier Ecken**. Mit einer gebogenen Kante stimmt das nicht
mehr: die Fläche würde die Kurve abschneiden.

Alle vier Gebilde sind deshalb aus **Stützpunkten entlang der Kurve** zu bauen —
eine gemeinsame Hilfsfunktion in `balanceV2.ts`, die zu einer Schrittzahl die
Punktliste einer Kante liefert (Vorschlag `bahnKantenPunkte(width, height,
schritte)`), und **genau diese** benutzen Straßenpolygon, beide Wasserpolygone und
die beiden Geländerkanten. 24 Schritte genügen für eine glatte Linie bei 844 px
Höhe. **Keine zweite Geometrie danebenbauen** — was die Kurve nicht aus dieser
Quelle holt, driftet später auseinander (so ist S1 schon einmal gebrochen).

Die Kantenlinien (`add.line`) müssen dafür zu einem Polygon- oder Kurvenzug
werden; die Geländerpfosten stehen weiterhin auf `bahnKantenBeiY` und ziehen
automatisch mit.

### Grenzen

- Nur `src/v2/`. Keine Importe aus `src/systems/`, `src/config/balance`,
  `src/scenes/`. Kein Speicherzugriff.
- Truppe, Ränder, Flächen, Tor und die Bilanzrechnung bleiben unverändert — sie
  holen ihre Geometrie schon aus `bahnKantenBeiY` und ziehen von selbst mit.
- Bildrate bleibt 60. Die Stützpunkte werden **einmal beim Aufbau** gerechnet,
  nicht je Bild.

### Akzeptanzkriterien

1. `npx tsc --noEmit`, `npm test`, `npm run build` sauber; alle bestehenden Tests
   grün. Wo ein Test die alte gerade Interpolation nachrechnet, ist er auf die
   Kurvenformel umzustellen — nicht zu löschen.
2. Neue Tests:
   - Die Bahn ist auf jeder Höhe symmetrisch zur Bildmitte.
   - Die Breite nimmt von oben nach unten **streng monoton** ab.
   - Die Kante ist **gebogen, nicht gerade**: auf halber Höhe ist die Bahn
     schmaler als der Mittelwert aus oberer und unterer Breite — und zwar um mehr
     als 5 Prozent der Bildbreite, damit die Krümmung auch sichtbar ist.
   - Mit `kurvenExponent = 1` ergäbe die Formel wieder die lineare Gerade
     (Formeltest, ohne den Balance-Wert zu ändern).
3. **Browser-Nachweis bei 390×844** (führt Claude): sichtbar gebogene Kanten,
   oben über die volle Breite, unten schmaler; Wasser in den unteren Ecken;
   Geländer sitzen auf der Kurve; 60 Bilder je Sekunde; Doppelstart identisch.

## Implementation Summary

- `bahnKantenBeiY` nutzt jetzt die kurvenfoermige Breitenformel mit Exponent 1,8;
  die Bruecke ist oben bildschirmbreit und unten 58 Prozent breit.
- Straße, beide Wasserflaechen, Kantenlinien und Wasserwellen beziehen ihre Lage aus
  derselben 24-Punkte-Kurvenquelle; alle sonstigen V2-Elemente folgen weiter
  `bahnKantenBeiY`.
- Neue Geometrietests sichern Symmetrie, strikt abnehmende Breite, sichtbare Kruemmung
  und die lineare Rueckfallformel bei Exponent 1. `npx tsc --noEmit`, `npm test`
  (47 Dateien, 455 Tests), `npm run build` und `git diff --check` sind erfolgreich.
- Browser-Nachweis bei 390×844 inklusive Doppelstart ist gemaess Aufgabe bei Claude offen.
