# Aktive Aufgabe

Status: APPROVED

## Aufgabe: V6/N12 — Moderne Militärhelme statt Ritterhelme

Thomas am 2026-09-20, wörtlich:
> "helme super, aber moderne militärhelme von oben hinten"

Die Helmdarstellung als solche bleibt — sie funktioniert. Nur die beiden Bilder
`src/assets/v2-helm-blau.png` und `src/assets/v2-helm-rot.png` zeigen heute einen
**mittelalterlichen Ritterhelm mit Visier**. Gebraucht wird ein **moderner
Militärhelm**, gesehen **von schräg oben hinten** — also die Perspektive, die man
auf einen Soldaten hat, der von einem wegmarschiert.

### Die beiden Bilder neu erzeugen

**Du erzeugst die Bilder mit deinem Bildwerkzeug** und ersetzt die beiden
vorhandenen Dateien unter demselben Namen, damit im Code nichts anzupassen ist.

Anforderungen an das Bild:

- **Moderner Kampfhelm** in der Art heutiger Gefechtshelme: runde, glatte Schale,
  die nach hinten und zu den Seiten herunterreicht, leicht kantige Silhouette,
  keine Hörner, kein Visier, kein Kamm, kein Gitter.
- **Blickwinkel von schräg oben hinten**: man sieht überwiegend die Helmschale von
  oben, dahinter angedeutet den Nackenschutz. Kein Gesicht, keine Augen.
- **Quadratisches Bild mit durchsichtigem Hintergrund** (PNG mit Alpha), in den
  Maßen der heutigen Dateien, damit die Skalierung im Spiel unverändert bleibt.
- Zwei Fassungen: eine in **Blau** (eigene Seite), eine in **Rot** (Gegnerseite).
  Kräftige, klar unterscheidbare Farben.
- **Bei sehr kleiner Darstellung noch lesbar:** Im Spiel ist ein Helm nur wenige
  Pixel groß. Deshalb wenige, große Formen, deutlicher dunkler Rand, ein einziges
  helles Glanzlicht oben. Keine feinen Details, keine dünnen Linien, keine
  Beschriftung — das verschwindet ohnehin und macht die Fläche nur unruhig.
- Stil passend zum übrigen Spiel: flächig und kräftig, keine Fotorealistik.

### Grenzen

- **Nur die beiden Bilddateien.** Kein Code, keine Balance-Werte, keine Tests
  ändern — die Helme werden bereits an der richtigen Stelle in der richtigen Größe
  gezeichnet.
- Dateinamen und Bildmaße bleiben exakt gleich.

### Akzeptanzkriterien

1. Beide Dateien sind ersetzt, PNG mit durchsichtigem Hintergrund, gleiche Maße
   wie vorher. `npx tsc --noEmit`, `npm test` und `npm run build` bleiben grün.
2. `git diff --stat` zeigt **ausschliesslich** die beiden Bilddateien (plus diese
   Task-Datei).
3. **Sichtprüfung bei 390×844** (führt Claude): Die Massen lesen sich als moderne
   Helme von oben, blau gegen rot klar unterscheidbar, auch am Horizont noch als
   Helm erkennbar und nicht als Farbklecks.

## Implementation Summary

- `v2-helm-blau.png` und `v2-helm-rot.png` mit dem Bildwerkzeug als moderne,
  von schräg oben hinten sichtbare Kampfhelme neu erzeugt; beide behalten 1254×1254
  Pixel sowie RGBA-Alpha bei.
- Kein Code, keine Balance-Werte und keine Tests geändert.
- `npx tsc --noEmit`, `npm test` (48 Dateien, 461 Tests) und `npm run build`
  sind grün; die Sichtprüfung bei 390×844 bleibt bei Claude.
