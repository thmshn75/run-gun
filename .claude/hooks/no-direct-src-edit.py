#!/usr/bin/env python3
"""PreToolUse-Guard fuer Run-Gun.

Setzt die Projektregel aus CLAUDE.md technisch durch: Claude ist Architekt und
Reviewer, produktiven Code unter src/ schreibt Codex. Der Hook blockiert
Edit/Write/MultiEdit/NotebookEdit auf src/ und laesst alles andere durch.

Notausgang: RUNGUN_ALLOW_SRC_EDIT=1 in der Umgebung hebt die Sperre auf.
Der Hook faellt bei jedem eigenen Fehler still auf "durchlassen" zurueck --
eine kaputte Pruefung darf die Sitzung nicht blockieren.
"""
import json
import os
import sys
from pathlib import Path

GUARDED = "src"


def main() -> int:
    if os.environ.get("RUNGUN_ALLOW_SRC_EDIT") == "1":
        return 0

    payload = json.load(sys.stdin)
    tool_input = payload.get("tool_input") or {}
    raw_path = tool_input.get("file_path") or tool_input.get("notebook_path")
    if not raw_path:
        return 0

    project_root = Path(__file__).resolve().parents[2]
    guarded_dir = project_root / GUARDED

    target = Path(raw_path)
    if not target.is_absolute():
        target = Path(payload.get("cwd") or project_root) / target
    target = Path(os.path.normpath(str(target)))

    if guarded_dir not in target.parents:
        return 0

    relative = target.relative_to(project_root)
    reason = (
        f"Blockiert durch .claude/hooks/no-direct-src-edit.py: {relative}\n"
        "CLAUDE.md dieses Projekts: Claude ist Architekt und Reviewer und "
        "schreibt keinen produktiven Code direkt. Aenderungen unter src/ "
        "gehoeren in docs/active-task.md und von dort per Terminal-Handoff an "
        "Codex.\n"
        "Bewusst umgehen: RUNGUN_ALLOW_SRC_EDIT=1 setzen."
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)
