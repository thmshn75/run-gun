# Uebergabe: Run & Gun

Stand: 2026-08-20 17:53

## Ziel
Kostenloses iPhone-PWA-Spiel (Auto-Runner-Shooter, Hochformat) bis V1 fertigstellen.
Verbindlicher Plan: `docs/plan.md`. Etappen E1–E3 und E4a sind durch, E4b/E4c/E5/E6 offen.

## Harte Randbedingungen
- Claude ist Architekt und Reviewer, schreibt **keinen** produktiven Code. Umsetzung immer
  ueber Codex per Terminal-Handoff (Ablauf in `CLAUDE.md`, Abschnitt "Handoff → Codex").
- Gamefeel-, Optik- und Performance-Kriterien gelten erst nach Thomas' iPhone-Test als
  erfuellt. Desktop-Preview und Codex' Selbsteinschaetzung zaehlen nie als Nachweis.
- Objekt-Pools: kein `create()`/`destroy()` im Hot Path, jede Poolgroesse mit Herleitung.
- Keine kostenpflichtigen Dienste, keine Requests an fremde Hosts zur Laufzeit.
- Spec-Reissleinen muessen benennen, was **kein** zulaessiger Ersatz ist — sonst tauscht
  Codex regelkonform das Ziel (siehe `docs/lessons.md`, Eintrag vom 2026-08-20).

## Fertig
- E4a + drei Nacharbeiten: Truppe als Lebensanzeige, Formation, Trefferzone am Bildrand,
  SPD ohne Zeitzuschlag, Tore ohne wirkungslose Seite (`ab1dc7e`…`e2b2fba`).
- GUNS in TEAM aufgegangen, alle Figuren feuern reihum, Salvengroesse 8 (`67117e2`).
- PWA laedt sich nach einem Update selbst neu — vorher hing der iPhone-Test eine Version
  hinterher (`67117e2`).
- Drei Gegnertypen mit Wellenverteilung, Kontaktschaden, Muenzwerten; Sprites sind Zombies,
  Trefferflaechen auf die sichtbare Figur begrenzt (`5945c0e`, `6a8af88`).

Arbeitsbaum sauber, alles gepusht, Deploy gruen. Kein Hintergrund-Agent laeuft.

## Offen — naechster Schritt zuerst
1. **Thomas' iPhone-Test** des aktuellen Stands plus sein Urteil zu den Zombie-Sprites.
   Bis dahin nichts Neues bauen, das darauf aufbaut.
2. **E4b** — Schrot, Laser, Rakete + Waffen-Tore. Vor dem Spezifizieren zwingend rechnen:
   Faecherbreite der Schrotflinte × 8 Figuren pro Salve ergibt die Projektil-Spitzenlast;
   heutiger Pool ist 96 bei ~72 gleichzeitig. Der Plan nennt Schrot als groesstes
   Pool-Volumen im Spiel — hier bricht es sonst am iPhone.
3. **E4c** — Gegner als Truppen. `src/systems/formation.ts` ist importfrei und dafuer
   vorbereitet, kann unveraendert mitbenutzt werden.
4. Hintergrundgestaltung (Thomas' Wunsch, eigener Task, entkoppelt).
5. Kleinigkeit: Tore ueberlappen beim Erscheinen kurz die HUD-Leiste.

## Wichtige Dateien und Befehle
- Plan `docs/plan.md` · Task `docs/active-task.md` (steht auf IDLE) · `docs/lessons.md`
- Balance zentral in `src/config/balance.ts`; Gegnertypen dort unter `enemy.types`.
  `bodyWidth` je Typ ist die gemessene Breite der sichtbaren Figur — bei neuen Sprites
  neu messen, sonst stimmt die Trefferflaeche nicht.
- `npm run check` · `npm run build` · `npm run dev` (→ http://localhost:5173/run-gun/)
- Live: https://thmshn75.github.io/run-gun/ · Deploy laeuft per GitHub Actions auf Push.
- Sprites gross erzeugen und **danach** herunterrechnen — direkt in Zielgroesse erzeugte
  Bilder wurden unbrauchbar. Trefferflaechen sichtbar machen: `BALANCE.debug` auf `true`.
- Testlaeufe und Codex-Handoffs gehoeren ins Terminal, nicht in die Extension.

## Einstiegssatz
"Lies `docs/UEBERGABE.md` und arbeite dort weiter."
