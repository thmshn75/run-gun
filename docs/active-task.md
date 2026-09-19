# Aktive Aufgabe

Status: IDLE

Zuletzt abgeschlossen: V5/E3 — Torlauf spielbar (2026-09-19, ohne Codex gebaut,
weil dessen Kontingent erschöpft war; Notausgang RUNGUN_ALLOW_SRC_EDIT).

## Was in diesem Durchgang fertig wurde

- **Eigene Laufphase im Torlauf** (`torlauf.laufphaseSec` 25 s statt 55 s). Ohne
  Einzelgegner füllte die Gegnerphase des echten Laufs nur Leerlauf — die Horde kam so
  spät, dass ein kurzer Test sie nie sah.
- **Startgröße der Quelle** (`torlauf.startEinheiten` 12). Der geerbte Startwert 1
  ergab 0,4 Figuren/s; damit war kein Pfeiler aufzuhacken.
- **Horde bleibt an der Truppe stehen** (`horde.grenzeBodenAbstandPx` 220). Vorher lief
  sie unbegrenzt weiter (gemessen y=5032 bei 844 px Bildhöhe) und kam nie in Kontakt.
- **Nahkampf zieht wirklich ab**: Bruchteil-Sammler `hordeFressRest`, weil `hp`
  ganzzahlig ist (siehe lessons.md, 2026-09-19).
- **Niederlage kehrt zurück**: Truppe auf 0 beendet den Lauf über `triggerGameOver`.
- `horde.basis` 120 → 320, `strom.tempoPxPerSec` 260 → 150, `kachel.breiteAnteil`
  0,14 → 0,22 und `hoeheAnteil` 0,5 → 0,7 (Thomas' iPhone-Befunde vom 18:17).

## Nachweis im Browser (localhost, 2026-09-19 19:05)

Prüfkriterium vorab: Horde-y dauerhaft ≤ 624, Hordenzahl sinkt monoton im Kontakt,
Truppenstärke sinkt gleichzeitig, Durchgang endet in Sieg oder Niederlage.

- **Niederlage:** Truppe 12 → 6 → 0, "TORLAUF VORBEI", zurück ins MenuScene.
- **Sieg (zweiter Start derselben Sitzung, Truppe 120):** Horde 320 → 0 in 11 s,
  "HORDE GESCHAFFT", Level 2, Truppe 120 → 89.
- Horde-y erreicht in beiden Läufen genau 624 und bleibt dort. Keine Konsolenfehler.
- 447 Tests grün, `tsc --noEmit` sauber.

## Offen für die nächste Sitzung

1. **Thomas' iPhone-Test** — erst danach gilt Gamefeel als abgenommen (Projektregel).
   Besonders: Sind die +1-Kacheln jetzt gross genug? Ist der Strom mit 150 px/s ruhig
   genug? Reichen 25 s Laufphase?
2. **Seitliche Steuerung prüfen.** Im passiven Messlauf wuchs die Quelle nie, weil die
   Truppe mittig bleibt und Tore wie Kacheln am Rand liegen. Ob ein Spieler sie
   erreichen kann, ist am Gerät zu prüfen — Thomas' Vorgabe: "die plus 1 Wände soll man
   mit dem Team erreichen damit sie zählen".
3. E4 Boss-Nahkampf, E5 Gestalten (Horde = `standard`, `heavy` zwischendurch, Bosse am
   Ende, alle auf 0,6 skaliert), E2b/E3b Bilder durch Codex.
