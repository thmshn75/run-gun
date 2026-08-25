# Bildauftrag V4e — Ersatz fuer enemy-light-e.png

**Nur EINE Datei erzeugen: `src/assets/enemy-light-e.png`. Keinen Spielcode aendern,
keine andere Datei anfassen.**

## Warum

Das vorhandene Bild ist doppelt mangelhaft und faellt im Spiel auf (Thomas am
2026-08-25: "in Level 12 kommt ein Charakter der nicht freigestellt ist"):

1. Es hatte einen **weissen Hintergrund** statt Transparenz - im Spiel steht die Figur in
   einem weissen Kasten. Der ist inzwischen entfernt, damit es nicht mehr stoert.
2. Die Figur ist mit **19 x 68 px sichtbarer Masse nur halb so breit** wie alle anderen
   leichten Gegner (37 bis 39 x 76). Das faellt erst seit dem Freistellen auf: Vorher
   wurde der weisse Kasten mitgemessen, und die Masspruefung ging deshalb durch.

## Was zu liefern ist

| Datei | Bildgroesse | Sichtbare Koerpermasse |
|---|---|---|
| `src/assets/enemy-light-e.png` | **56 x 76** | **37 x 76** (hoechstens 2 px Abweichung) |

- PNG mit **echter Transparenz**. Der Bildrand muss vollstaendig durchsichtig sein -
  nach dem Erzeugen pruefen und im Bericht angeben, wie viel Prozent des Randes opak ist
  (Zielwert 0 %). Genau daran ist die alte Datei gescheitert.
- Stil wie die vorhandenen Nachbarn: sieh dir `enemy-light-f.png` bis `enemy-light-j.png`
  an und triff deren Look, Kantenschaerfe und Farbtiefe.
- **light** heisst schmal und ausgemergelt - auf einen Blick vom `standard`- und
  `heavy`-Typ unterscheidbar. Das ist wichtiger als jede Detailidee.
- Die Gestalt darf von den Nachbarn abweichen (Kapuze, zerfetztes Hemd, schiefe Haltung),
  die Masse nicht. Fuesse auf gleicher Hoehe, gleiche Mitte wie bei den Nachbarn.

**Verfahren:** Gross erzeugen, dann auf 56 x 76 herunterrechnen - so sind alle brauchbaren
Assets dieses Projekts entstanden. Direkt in Zielgroesse erzeugte Bilder waren unbrauchbar.

## Abschluss

Bildgroesse, gemessene opake Koerpermasse und Randopazitaet ausgeben. Nichts anderes
aendern - die Einbindung besteht bereits.
