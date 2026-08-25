# Bildauftrag V4d — Gegner-Gestalten (E5) und Elite-Boss (E7)

Alle Bilder als PNG mit Transparenz nach `src/assets/`. Stil: **pixelig-illustrativ wie die
vorhandenen Dateien** — sieh dir `src/assets/enemy-light.png`, `enemy-standard.png`,
`enemy-heavy.png` und `enemy-boss.png` vorher an und triff deren Look, Kantenschärfe und
Farbtiefe.

---

## Teil 1 — Neue Gegner-Gestalten (18 Dateien)

**Thomas:** „Verschiedene Farben haben wir, und zusätzliche andere Gestalten in allen drei
Figurstärken."

Je Stärke **drei neue Gestalten**, jede in **zwei** der vorhandenen Farbtöne:

```
enemy-light-e.png    enemy-light-f.png    enemy-light-g.png
enemy-light-h.png    enemy-light-i.png    enemy-light-j.png
enemy-standard-e.png … enemy-standard-j.png
enemy-heavy-e.png    … enemy-heavy-j.png
```

### Maße — exakt einzuhalten

| Typ | Bildgröße | Sichtbare Körpermaße |
|---|---|---|
| light | **56 × 76** | 37 × 76 |
| standard | **64 × 88** | 50 × 84 |
| heavy | **84 × 104** | 82 × 98 |

### Der Freiheitsgrad — hier liegt der Unterschied zum letzten Auftrag

Beim Farbauftrag im V3 war eine **pixelgenau identische Silhouette** verlangt. Das ist
hier **nicht** so, und das ist der Kern dieses Auftrags: Die Trefferflächen hängen nicht
am Bild, sondern an `bodyWidth`/`bodyHeight` in `src/config/balance.ts`.

**Solange die sichtbare Körpermasse gleich bleibt, darf die Gestalt abweichen:** Kapuze,
Hut, Helm, zerfetztes Hemd, fehlender Arm, schiefe Haltung, Mantel, nackter Oberkörper.
Genau solche Unterschiede sind gewollt — die Horde soll nicht mehr aus derselben Figur in
mehreren Farben bestehen.

**Was gleich bleiben muss:**
- Bildgröße aufs Pixel (Tabelle oben).
- Die sichtbaren Körpermaße: höchstens **2 px Abweichung** in Breite und Höhe. Sie sind
  an den Vorlagen nachgemessen; eine abweichende Masse verschiebt Trefferflächen und
  Formationsabstände im ganzen Spiel.
- Die Position im Bild (Füße auf gleicher Höhe, gleiche Mitte).
- Der Typ muss auf einen Blick erkennbar bleiben: **light** schmal und ausgemergelt,
  **standard** normal gebaut, **heavy** breit und massig. Ein Kind muss im Anflug sofort
  sehen, was auf es zukommt — das ist wichtiger als jede Detailidee.

**Nachmessen, nicht schätzen:** Nach dem Erzeugen die opaken Maße jedes Bildes prüfen und
im Bericht angeben. Beim letzten Gegner-Auftrag war das der Grund, warum alle Bilder
brauchbar waren.

---

## Teil 2 — Elite-Boss (1 Datei)

**Thomas:** „Ein neues Bild, größer und böser, und er darf sich hin und her bewegen."

| Datei | Größe | Inhalt |
|---|---|---|
| `enemy-boss-elite.png` | **240 × 240** (wie `enemy-boss.png`) | Der Elite-Boss |

Er erscheint alle fünf Level und steht neben dem normalen Boss, nicht an seiner Stelle.
**Deutlich größer und bedrohlicher wirkend** als `enemy-boss.png` — massiger Körperbau,
mehr Panzerung oder Auswüchse, aggressivere Haltung.

**Die Bildgröße bleibt 240 × 240**, er wird im Spiel skaliert. „Größer" heißt also: Er
füllt das Bild stärker aus als der normale Boss, nicht dass die Datei größer wird.

Er muss vom normalen Boss auf einen Blick unterscheidbar sein — wenn er auftaucht, soll
sofort klar sein, dass dieser anders ist.

---

## Reißleine

Wenn eine Gestalt die geforderten Körpermaße nicht einhalten kann, ohne unkenntlich zu
werden: **melden, welche und warum.** **Kein zulässiger Ersatz:** die Maße überschreiten,
abstrakte Formen statt Figuren liefern oder programmatisch zeichnen. Ein abstraktes
Symbol statt einer erkennbaren Figur ist im Projekt schon einmal geliefert worden und
kostete einen kompletten Lauf.

## Abschluss

Für **jede** Datei die Bildgröße **und** die gemessenen opaken Körpermaße ausgeben, damit
sie ohne Nachfrage prüfbar sind. **Nur Bilddateien erzeugen, keinen Spielcode ändern** —
die Einbindung macht Claude.
