# Bildauftrag V4 (Pistole + vier neue Waffen)

Alle Bilder als PNG mit Transparenz nach `src/assets/`. Stil: **pixelig-illustrativ wie die
vorhandenen Dateien** — sieh dir `src/assets/weapon-normal-gate.png`,
`weapon-rocket-gate.png`, `weapon-grenade-gate.png` und die zugehörigen `-hud.png` vorher
an und triff deren Look, Kantenschärfe und Farbtiefe.

## Maße — exakt einzuhalten

| Zweck | Größe | Vorlage zum Nachmessen |
|---|---|---|
| Wandtor (`*-gate.png`) | **150 × 44 px** | `weapon-normal-gate.png` |
| HUD-Ecke (`*-hud.png`) | **72 × 20 px** | `weapon-normal-hud.png` |

Die Bilder werden an fester Stelle eingesetzt und dort auf die Wandbreite skaliert;
abweichende Maße verschieben die Darstellung. **Nach dem Erzeugen selbst nachmessen**
(`file src/assets/<datei>.png`), nicht auf den Bildeindruck verlassen.

**Verfahren:** Groß erzeugen, dann auf die Zielgröße herunterrechnen — so sind alle
brauchbaren Assets dieses Projekts entstanden. Direkt in Zielgröße erzeugte Bilder waren
bisher unbrauchbar.

## Teil 1 — Pistole (2 Bilder)

| Datei | Inhalt |
|---|---|
| `weapon-pistol-gate.png` | Pistole als Waffensymbol für das Wandtor |
| `weapon-pistol-hud.png` | dasselbe Symbol, kleiner, für die HUD-Ecke |

Die Pistole ist die **schwächste Waffe des Spiels** und die Startwaffe auf Level 1. Sie
muss auf den ersten Blick als das kleinste, einfachste Stück lesbar sein — kurze Läufe,
schlichte Form, keine Trommel, kein Magazinbogen, nichts Wuchtiges. Sie steht neben dem
Sturmgewehr (`weapon-normal-gate.png`), und der Größenunterschied zu diesem soll auf den
ersten Blick erkennbar sein, ohne dass sie im Tor verschwindet.

## Teil 2 — Vier neue Waffen (8 Bilder)

Je Waffe ein `-gate.png` und ein `-hud.png` in den Maßen oben.

| Dateiname | Waffe | Was sie zeigen soll |
|---|---|---|
| `weapon-ricochet-*` | **PRELLSCHUSS** | Waffe mit auffälligem Prallwinkel-Motiv: Lauf mit abgewinkelter Mündung oder sichtbar abprallender Kugelbahn. Erkennbar daran, dass etwas **abgelenkt** wird. |
| `weapon-cluster-*` | **STREUBOMBE** | Werfer mit einem Geschoss, das sich sichtbar in mehrere kleine Sprengsätze teilt. Erkennbar an der **Aufteilung in mehrere Teile**. |
| `weapon-sawblade-*` | **SÄGEBLATT** | Werfer mit rundem Sägeblatt als Munition — gezahnte Kreisscheibe, klar als schneidend lesbar. Die einzige Waffe ohne Lauf-Charakter. |
| `weapon-shockwave-*` | **SCHOCKWELLE** | Emitter mit ringförmiger Druckwelle, die **rundherum** austritt. Erkennbar daran, dass die Wirkung nicht nach vorne, sondern **in alle Richtungen** geht. |

**Unterscheidbarkeit ist das Hauptkriterium.** Die vier kommen erst spät im Spiel dazu und
stehen dann neben acht vorhandenen Waffen im selben Tor. Ein Kind muss sie im Vorbeifahren
auseinanderhalten können — im Zweifel eine deutlichere Silhouette wählen statt mehr Details.

Sie sind außerdem die **stärksten Waffen des Spiels**. Sie dürfen wuchtiger und
auffälliger wirken als die vorhandenen — das ist gewollt und der Unterschied zur Pistole.

## Reißleine

Wenn ein Motiv in 150 × 44 px nicht lesbar wird: **melden, welches und warum**, nicht
ersatzweise ein anderes Motiv liefern und nicht programmatisch zeichnen. Ein abstraktes
Symbol statt einer erkennbaren Waffe ist **kein zulässiger Ersatz** — dieser Fall ist im
Projekt schon einmal eingetreten und kostete einen kompletten Lauf.

## Abschluss

Wenn alle zehn Dateien liegen: Größen aller Dateien mit `file` ausgeben, damit sie ohne
Nachfrage prüfbar sind. Die Einbindung in `BootScene.ts` und `balance.ts` macht Claude —
**nur die Bilddateien erzeugen, keinen Spielcode ändern.**
