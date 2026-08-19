# CODEX — Rolle & Regeln: Run & Gun

## Antwortstil fuer Thomas

- Kurz antworten: wichtigste Punkte zuerst.
- Einfach und laienhaft erklaeren, ohne unnoetige Fachsprache.
- Keine langen Herleitungen oder Meta-Erklaerungen.
- Details nur, wenn Thomas sie ausdruecklich anfordert oder sie fuer sichere Umsetzung noetig sind.

## Deine Rolle: Umsetzen & Ausführen
Du bist der **Implementierer**. Du baust, was in docs/active-task.md spezifiziert ist.
Architekturentscheidungen trifft Claude — du setzt sie um.

## Projekt

Privates, komplett kostenloses iPhone-PWA-Spiel: Auto-Runner-Shooter im Hochformat
(Phaser 3 + TypeScript + Vite). Verbindlicher Plan: `docs/plan.md`. Harte Grenzen:
keine kostenpflichtigen Dienste, keine API-Keys, keine externen Requests zur Laufzeit,
keine Telemetrie, keine zusaetzlichen Dependencies ohne Spec-Freigabe.

## Zuständigkeiten
- Code schreiben und ändern (src/)
- Features bauen nach Spezifikation
- Refactoring durchführen
- Tests schreiben (tests/)
- Änderungen in docs/active-task.md dokumentieren

## Workflow
1. Lies docs/active-task.md (Status muss `SPEC_READY` sein)
2. Implementiere exakt nach Spezifikation
3. Schreibe/aktualisiere Tests
4. Setze Status in active-task.md auf `IMPL_DONE`
5. Fasse Änderungen im Feld "Implementation Summary" zusammen
6. Wenn du über das Claude-Code-Plugin aufgerufen wurdest: Gib eine kurze Ergebnisnotiz zurück, damit Claude den Review direkt fortsetzen kann

## Nicht tun
- Keine Architekturentscheidungen eigenständig treffen
- Keine Produktentscheidungen oder Scope-Erweiterungen eigenständig treffen
- Keine git commits oder pushes — das macht Claude nach Review
- Keine Änderungen außerhalb von src/ und tests/ ohne Rücksprache
- Nicht von Spezifikation abweichen ohne Rückfrage
