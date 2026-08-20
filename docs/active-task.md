# Active Task

## Status
`IDLE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
_Kein laufender Task._

## Zuletzt abgeschlossen (2026-08-20/21)

- **Gegner laufen nicht mehr durch andere Gegner hindurch** (`97e02c8`) — Spurwahl rechnet
  voraus, ob ein schneller Gegner einen langsameren einholt. 1,7 % → 0 % der Frames.
- **Zombies zittern nicht mehr seitwärts** (`2efa02c`) — die Physik schrieb die selbst
  gesetzte Position um `body.offset.x` versetzt zurück. Ursache des „doppelt"-Eindrucks.
- **E4b — drei Zusatzwaffen und Waffen-Tore** (`db6c558`).
- **Waffen als Bild statt als Wort** an Tor und HUD (`ff56f3b`).
- **Ziellinie und längere Torhervorhebung** (`baa2a8e`), danach auf Thomas' Wunsch ersetzt
  durch die **leuchtende Torhälfte** (`3dce286`).
- **Horizont mit Tageshimmel, Boden neben der Fahrbahn, Asphalt statt Dunkelblau**
  (`b99a914`), Himmelsverlauf nachgezogen (`b7166ab`).

## Offen / als Nächstes

Reihenfolge und Details in `docs/plan.md` und `docs/naechste-tasks.md`.

- **E5 — Boss, Level, Persistenz.** Der einzige echte Rest bis zur Definition „fertig":
  mehrere vollständige Runs offline **inklusive Boss**, Fortschritt übersteht Force-Quit,
  Save-Export/Import als Pflichtteil (iOS kann Website-Daten ohne Vorwarnung verwerfen).
- **E4c** — Gegner als Truppen.
- **3D-Schritt 2** — Figuren wachsen beim Näherkommen. Nur, wenn Thomas Schritt 1 nicht reicht.
- **E6 — V1-Abnahme.**

## Zwei Werte, die auf Thomas' Urteil warten

Beide sind je eine einzige Zahl, falls sie im Spiel stören:

- `stats.speed.base` (105) — seit dem Horizont braucht ein Standard-Gegner 5,4 statt 7,0 s
  bis zur Truppe, weil die Straße nicht mehr am Bildrand beginnt. Bewusst nicht ausgeglichen,
  Begründung im Commit `b99a914`.
- `gates.highlightLighten` (0.45) — wie stark die gewählte Torhälfte aufleuchtet.

## Kleine offene Nachzieharbeit

In `gates.ts` steht der Abgang eines Torpaars am unteren Bildrand als `else if` hinter der
Blitz-Bedingung und greift für ausgelöste Paare deshalb nicht. Bei `choiceFlashMs` = 250 ms
folgenlos; bei einem deutlich höheren Wert bliebe ein unsichtbares Paar im Pool. Beim
nächsten Anfassen der Tore mitziehen.
