# Uebergabe: Run & Gun

Stand: 2026-08-20 20:40

## Ziel
Kostenloses iPhone-PWA-Spiel (Auto-Runner-Shooter, Hochformat) bis V1 fertigstellen.
Verbindlicher Plan: `docs/plan.md`. E1–E3 und E4a sind durch, E4b/E4c/E5/E6 offen.
Dazu laufend Thomas' Wuensche aus seinen iPhone-Tests.

## Harte Randbedingungen
- Claude ist Architekt und Reviewer, schreibt **keinen** produktiven Code. Umsetzung immer
  ueber Codex per Terminal-Handoff (Ablauf in `CLAUDE.md`).
- Gamefeel, Optik und Performance gelten erst nach Thomas' iPhone-Test als erfuellt.
- Objekt-Pools: kein `create()`/`destroy()` im Hot Path, jede Poolgroesse mit Herleitung.
- Reissleinen muessen benennen, was **kein** zulaessiger Ersatz ist (`docs/lessons.md`).
- **Vor jedem Asset-Auftrag** den Ist-Zustand an der grossen Vorlage in `assets/probe/`
  pruefen und per Hash abgleichen, was schon in `src/assets/` liegt. Das 34-px-Sprite
  reicht zur Beurteilung nicht — hat heute zwei Codex-Laeufe gekostet (`docs/lessons.md`).

## Fertig (heute, alles gepusht, Arbeitsbaum sauber)
- Leichter Zombie fuelliger und heller, Trefferflaeche nachgemessen (`b251a83`).
- E4b-Spec geschrieben und nach zwei Gegenpruefungen gehaertet (`a14d0d6`) —
  liegt vollstaendig in `docs/spec-e4b-entwurf.md`, bereit zum Uebernehmen.
- Zombies lassen so viele Muenzen fallen wie sie wert sind, Pool 20 → 48 (`91718db`).
- Perspektivische Strasse, Gegner fahren auf Spuren und faechern auf, Tore skalieren mit
  (`8d9de5f`); Farbe nach Test wieder dunkel (`fddcb63`).
- Fehler behoben: Gegner erschienen staendig uebereinander (`fddcb63`).
- Geprueft und **kein Fehler**: RATE-Tore und Feuerrate. Im Spiel gemessen — doppelte Rate
  gibt doppelt so viele Schuesse; 6000 Tor-Ziehungen ohne Abweichung von Label zu Wirkung.
  Ursache von Thomas' Beobachtung ist vermutlich die Truppengroesse (siehe Offen 3).

## Offen — naechster Schritt zuerst
1. **Thomas' iPhone-Test** des aktuellen Stands: verteilen sich die Gegner jetzt gut,
   wirkt die Strassenperspektive, stoert die Querdrift beim Zielen?
2. **E4b — drei Zusatzwaffen + Waffen-Tore.** Spec liegt fertig und gehaertet in
   `docs/spec-e4b-entwurf.md`; nur nach `docs/active-task.md` uebernehmen und starten.
   Groesster Task des Projekts.
3. **Torwahl sichtbar machen** — Details in `docs/naechste-tasks.md`. Thomas' Rahmen:
   Tor laenger einblenden ja, Zahlen einblenden nein.
4. **Hintergrund gestalten** — Farben von Fahrbahn und Umgebung zusammen entscheiden
   (`docs/naechste-tasks.md`).
5. **3D-Schritt 2** — Figuren wachsen beim Naeherkommen. Erst nach Thomas' Urteil zu
   Schritt 1; womoeglich reicht ihm der Effekt schon so.

## Wichtige Dateien und Befehle
- `docs/plan.md` · `docs/active-task.md` (IDLE) · `docs/lessons.md` ·
  `docs/naechste-tasks.md` · `docs/spec-e4b-entwurf.md`
- Balance zentral in `src/config/balance.ts`; Strassenformel in `src/systems/road.ts`.
- `npm run check` · `npm run build` · `npm run dev` (→ http://localhost:5173/run-gun/)
- Live: https://thmshn75.github.io/run-gun/ · Deploy per GitHub Actions auf Push.
- Testlaeufe und Codex-Handoffs gehoeren ins Terminal, nicht in die Extension.
- Spiel laesst sich per Playwright pruefen: Screenshots nur nach
  `<projekt>/.playwright-mcp/`, andere Pfade werden abgelehnt.

## Einstiegssatz
"Lies `docs/UEBERGABE.md` und arbeite dort weiter."
