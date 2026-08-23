# Bildauftrag V3 (B4 Granatwerfer, B5 Zombie-Farbvarianten)

Alle Bilder als PNG mit Transparenz nach `src/assets/`. Stil: **pixelig-illustrativ wie die
vorhandenen Dateien** — sieh dir `src/assets/enemy-standard.png`, `enemy-light.png`,
`enemy-heavy.png` und `weapon-rocket-gate.png` / `weapon-rocket-hud.png` vorher an und
triff deren Look, Kantenschärfe und Farbtiefe.

## Teil 1 — Granatwerfer (2 Bilder)

| Datei | Größe | Inhalt |
|---|---|---|
| `weapon-grenade-gate.png` | wie `weapon-rocket-gate.png` | Granatwerfer als Waffensymbol für das Wandtor |
| `weapon-grenade-hud.png` | wie `weapon-rocket-hud.png` | dasselbe Symbol, kleiner, für die HUD-Ecke |

Der Granatwerfer soll auf den ersten Blick von der Rakete unterscheidbar sein: kurzes,
dickes Rohr mit Trommelmagazin statt schlanker Rakete. **Maße exakt wie die
Rakete-Dateien** — sie werden an derselben Stelle eingesetzt und dort auf die Wandbreite
skaliert.

## Teil 2 — Zombie-Farbvarianten (Kern des Auftrags)

**Aufgabe:** Von jedem der drei vorhandenen Zombies **drei zusätzliche Farbvarianten**,
also 9 neue Dateien:

```
enemy-light-b.png     enemy-light-c.png     enemy-light-d.png
enemy-standard-b.png  enemy-standard-c.png  enemy-standard-d.png
enemy-heavy-b.png     enemy-heavy-c.png     enemy-heavy-d.png
```

**Was sich ändern darf: NUR die Kleidungsfarbe.** Alles andere muss identisch bleiben:

- **Gleiche Bildgröße, aufs Pixel** (light 56×76, standard 64×88, heavy 84×104).
- **Gleiche Silhouette, gleiche Haltung, gleiche Position im Bild.** Die Körpermaße in
  `src/config/balance.ts` (`enemy.types[].bodyWidth/bodyHeight`) sind an diesen Bildern
  nachgemessen; eine abweichende Silhouette verschiebt Trefferflächen und
  Formationsabstände im ganzen Spiel.
- **Haut, Gesicht, Hände und Knochen bleiben unverändert** — es sind dieselben Zombies in
  anderer Kleidung, keine anderen Wesen.

**Verfahren:** Nimm die vorhandene Datei als Vorlage und färbe die Kleidungsflächen um.
Am sichersten ist eine pixelgenaue Bearbeitung der Vorlage statt einer Neuzeichnung.

**Farbrichtungen** (je Typ dieselben drei, damit die Horde als Gruppe lesbar bleibt):
- **b** = rostrot/braun
- **c** = blaugrau
- **d** = ocker/senfgelb

Die Töne dürfen gedeckt und schmutzig sein — es sind Zombies, keine Sportmannschaft. Sie
müssen sich vor der dunklen Straße und voneinander unterscheiden, ohne bunt zu wirken.

## Abnahmekriterien

1. Alle 11 Dateien liegen in `src/assets/`.
2. Jede Variante hat **exakt** die Bildgröße ihrer Vorlage.
3. Die Silhouette (Alpha-Kanal) stimmt mit der Vorlage überein — prüfe das, bevor du
   fertig meldest.
4. Kein Code geändert, kein Test angefasst. Nur Bilder.

## Was KEIN zulässiger Ersatz ist

- Keine geometrischen Platzhalter, keine abstrakten Formen.
- Keine neu gezeichneten Figuren mit anderer Haltung oder Größe.
- Kein einfacher Vollbild-Farbfilter, der Gesicht und Hände mitfärbt.

Ist eine Farbvariante nicht sauber hinzubekommen, **melde das** statt etwas anderes zu
liefern.
