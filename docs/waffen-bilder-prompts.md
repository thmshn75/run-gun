# Bildaufträge für die vier Waffen-Symbole

Erzeugt werden **vier Bilder**, eines je Waffe. Danach rechne ich sie herunter und baue sie
ein — derselbe Weg, der bei der Spielfigur und den Zombies funktioniert hat (groß erzeugen,
dann verkleinern; siehe `docs/lessons.md`).

## Ablage

Die erzeugten Originale bitte unverkleinert hierhin legen:

```
assets/probe/waffen/normal.png
assets/probe/waffen/schrot.png
assets/probe/waffen/laser.png
assets/probe/waffen/rakete.png
```

Der Ordner liegt außerhalb von Git, die großen Dateien landen also nicht im Repo.

## Für alle vier gleich

Diese Sätze an **jeden** der vier Prompts anhängen, sonst passen die Bilder nicht zusammen:

> Seitenansicht, Waffe zeigt nach rechts, exakt waagerecht ausgerichtet.
> Freigestellt auf vollständig transparentem Hintergrund, kein Schatten, kein Boden,
> keine Hand, keine Person, kein Text, kein Rahmen.
> Gleichmäßige Ausleuchtung von vorne, kräftige Farben, klare Kanten, hoher Kontrast
> gegen dunklen Untergrund. Querformat, etwa 1536 × 640 Pixel, Waffe füllt die Breite aus.
> Stil einheitlich über alle vier Bilder: kompakte, leicht comichafte Spielgrafik mit
> deutlichen Konturen — kein Foto, keine Weichzeichnung, keine Spiegelungen.

## Die vier Motive

**1. `normal.png` — Standardwaffe**
> Ein kompaktes Sturmgewehr in Schwarz und Gunmetal-Grau, mit kurzem Lauf, geradem Magazin
> und schlichtem Schaft. Nüchtern und funktional, keine Verzierungen. Ein orangefarbener
> Akzentstreifen am Lauf.

**2. `schrot.png` — Schrotflinte**
> Eine Pump-Action-Schrotflinte mit dickem, kurzem Doppellauf, Holzschaft in warmem Braun
> und Vorderschaft-Pumpe. Wuchtig und breit, deutlich massiver als ein Gewehr.
> Warme gelb-orange Akzente an der Mündung.

**3. `laser.png` — Laserwaffe**
> Ein futuristisches Lasergewehr mit glatten weißen und dunkelgrauen Gehäuseflächen,
> einer leuchtenden cyanfarbenen Energiezelle in der Mitte und einem cyan glühenden
> Emitter an der Spitze. Kantiges Science-Fiction-Design, keine Rundungen.
> Das Cyan muss kräftig leuchten (Ton wie `#7af4ff`).

**4. `rakete.png` — Raketenwerfer**
> Ein schultergestützter Raketenwerfer: dickes graugrünes Rohr, Griff und Visier oben,
> vorne ragt eine Rakete mit **leuchtend rotem Kopf** heraus. Militärisch, gedrungen,
> deutlich dicker als die anderen drei Waffen.

## Warum diese Farben

Jede Waffe trägt die Farbe ihres Geschosses (Orange, Gelb-Orange, Cyan, Rot). So erkennt man
am Tor sofort, was gleich aus den Läufen kommt.

## Danach

Sobald die vier Dateien liegen: Ich prüfe sie an der großen Vorlage, rechne sie auf
Torgröße und HUD-Größe herunter, lege sie unter `src/assets/` ab und beauftrage den Umbau
von Tor und HUD auf Bilder statt Schrift.
