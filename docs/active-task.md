# Active Task

## Status
`IDLE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
_Kein laufender Task._

## E5 ist vollständig umgesetzt (Nacht auf 2026-08-21)

Thomas hat E5 nachts freigegeben und konnte nicht entscheiden. Alle stellvertretend
getroffenen Entscheidungen stehen einzeln begründet in **`docs/e5-design.md`** — das ist die
Liste zum Überstimmen.

| Lauf | Inhalt | Commit |
|---|---|---|
| E5-1 | Speicherstand mit Prüfung, Bestenlisten-Logik, Tests | `9051e1c` |
| E5-2 | Boss, Levelfortschritt, ordnungssichere Trefferzuordnung | `d634488` |
| E5-3 | Startbildschirm mit Titelbild, dauerhafte Stufenkäufe | `a84c736` |
| E5-4 | Bestenliste, Sichern und Laden des Spielstands | `925fa6e` |

Damit ist die Definition „fertig" aus `docs/plan.md` inhaltlich erreicht: mehrere
vollständige Runs offline inklusive Boss, Fortschritt übersteht einen Neustart.

## Was Thomas prüfen sollte

1. **Wonach die Bestenliste wertet** — gesammelte Münzen (`docs/e5-design.md`, Entscheidung 1).
2. **Levellänge** — 75 s normale Phase, dann Boss (Entscheidung 3).
3. **Erster Boss zu leicht oder zu zäh** — `boss.baseHp`, derzeit 400.
4. **Preise der Stufenkäufe** — 50/120/250/450/750 (Entscheidung 4).
5. **Titelbild und Bossbild** — beide von Codex erzeugt.
6. **Vorwarnzeit** — seit dem Horizont braucht ein Standard-Gegner 5,4 statt 7,0 s bis zur
   Truppe. Stellschraube: `stats.speed.base`.
7. **Helligkeit der leuchtenden Torhälfte** — `gates.highlightLighten`, derzeit 0.45.

## Offen / als Nächstes

- **E6 — V1-Abnahme:** finale Icons, README, Aufräumen. Dazu die Prüfungen aus dem Plan:
  Update wird nach Force-Quit sichtbar, keine Requests an fremde Hosts im Web-Inspector,
  keine `.map`-Dateien im Deploy.
- **E4c** — Gegner als Truppen (Erweiterung, nicht für „fertig" nötig).
- **3D-Schritt 2** — Figuren wachsen beim Näherkommen (nur, wenn Thomas Schritt 1 nicht reicht).

## Kleine offene Nachziehpunkte

- Die Laufzeit wird als Gleitkommazahl mit vielen Nachkommastellen gespeichert
  (`timeMs: 20015.526666666578`). Angezeigt wird sie korrekt als `m:ss`; beim nächsten
  Anfassen der Speicherlogik auf ganze Millisekunden runden.
- In `gates.ts` steht der Abgang eines Torpaars am unteren Bildrand als `else if` hinter der
  Blitz-Bedingung und greift für ausgelöste Paare deshalb nicht. Bei `choiceFlashMs` = 250 ms
  folgenlos.
