# Active Task

## Status
`IDLE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
_Kein laufender Task._

## Zuletzt abgeschlossen (2026-08-20)

- **Gegner laufen nicht mehr durch andere Gegner hindurch** (`97e02c8`). Die Spurwahl rechnet
  jetzt voraus, ob ein schneller Gegner einen langsameren noch einholen kann, und hält dann
  Seitenabstand. Vorher 1,7 % aller Frames mit Überlappung, danach 0 über 211 s.
- **Zombies zittern nicht mehr seitwärts** (`2efa02c`). Der Spawner setzte die Position selbst,
  die Arcade-Physik schrieb sie danach um `body.offset.x` versetzt zurück — jedes Bild mit
  wechselndem Vorzeichen. Sichtbar als doppelte Figur, proportional zum transparenten Rand des
  Sprites, deshalb nur bei den kleinen und mittleren. Gegner stehen jetzt auf `moves = false`.
- **E4b — drei Zusatzwaffen und Waffen-Tore** (`db6c558`). Schrot, Laser, Rakete plus die
  Torart zum Wechseln. Vier getrennte Projektil-Segmente, keine Allokation im Hot Path.
- **Waffen erscheinen als Bild statt als Wort** (`ff56f3b`). Vier Waffenbilder von Codex
  erzeugt, groß erzeugt und heruntergerechnet; Tor und HUD zeigen das Bild.

## Offen / als Nächstes

Reihenfolge und Details in `docs/naechste-tasks.md` und `docs/plan.md`.

- **E4c** — Gegner als Truppen.
- **Torwahl sichtbar machen** — Tor länger einblenden, keine Zahlen (Thomas' Rahmen).
- **Hintergrund gestalten** — Farben von Fahrbahn und Umgebung zusammen entscheiden.
- **3D-Schritt 2** — Figuren wachsen beim Näherkommen. Nur, wenn Thomas Schritt 1 nicht reicht.
- **E5 / E6** — Menü, Persistenz, Feinschliff.

Offen aus dem letzten Test: ob die vier Waffen am iPhone auf Anhieb auseinanderzuhalten sind
(besonders das HUD-Bild mit 72 × 20 px) und ob es bei voller Truppe plus Schrot flüssig bleibt.
