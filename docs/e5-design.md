# E5 — Entwurf und stellvertretend getroffene Entscheidungen

Thomas hat am 2026-08-21 nachts die Umsetzung von E5 freigegeben und ausdrücklich gesagt,
dass er bis zum Morgen **keine Entscheidungen treffen** kann. Alles hier ist deshalb von
Claude stellvertretend entschieden, nach dem Rahmen aus `docs/plan.md`.

**Jede Zahl steht in `balance.ts` und ist damit eine Einzeländerung.** Diese Datei ist die
Liste zum Überstimmen — nicht der Code.

## Was E5 fertig macht

Die Definition „fertig" aus dem Plan: mehrere vollständige Runs offline, **inklusive Boss**,
Fortschritt übersteht einen Neustart. Dazu die Erweiterung V1.2: Startbildschirm mit Bild
und lokale Bestenliste.

## Reihenfolge der Umsetzung

Vier Codex-Läufe nacheinander, jeder einzeln geprüft und committet. Grund für die Trennung:
Ein einziger Lauf über alles wäre nicht mehr prüfbar, und ein Fehler in einem Teil würde die
anderen mitreißen.

1. **E5-1 Speicherung** — `save.ts` mit Laden, Speichern, Prüfen; reine Logik, keine Oberfläche.
2. **E5-2 Boss und Level** — Bossgegner, Levelabschluss, nächstes Level.
3. **E5-3 Startbildschirm** — eigene Szene mit erzeugtem Bild und permanenten Stufenkäufen.
4. **E5-4 Bestenliste und Export/Import** — Anzeige im Menü und nach Game Over.

## Entscheidung 1 — Wonach die Bestenliste wertet

**Gewertet werden die in einem Run gesammelten Münzen.** Zusätzlich gespeichert und angezeigt
werden das erreichte Level und die Laufzeit, aber sie entscheiden die Reihenfolge nicht.

Begründung: Münzen sind die Zahl, die im HUD ohnehin mitläuft; der Spieler sieht seinen
Punktestand also die ganze Zeit. Level oder Laufzeit als Maß würden langsames, vorsichtiges
Spielen belohnen — Münzen belohnen das Töten von Gegnern, also das, was das Spiel ausmacht.

**Zum Ändern:** Ein Feld in der Vergleichsfunktion in `save.ts`.

## Entscheidung 2 — Münzen sind zugleich Währung

Am Ende eines Runs werden die gesammelten Münzen auf ein **Konto** addiert, das zwischen den
Runs bestehen bleibt. Im Startbildschirm wird davon gekauft. Der Punktestand in der
Bestenliste bleibt die Zahl **dieses einen Runs**, unabhängig vom Kontostand.

Begründung: Ohne Währung hätten die permanenten Stufenkäufe aus dem Plan keine Kosten, und die
Münzen im Run wären nach dem Run wertlos.

## Entscheidung 3 — Level und Boss

- Ein Level dauert `level.normalPhaseSec` = **75 s** normale Gegner, dann erscheint der Boss.
- **Während des Bosskampfs erscheinen keine normalen Gegner mehr.** Sonst wäre der Bildschirm
  bei hoher Spawnrate zu voll, um das Bewegungsmuster des Bosses zu lesen.
- Boss-Lebenspunkte: `boss.baseHp` = **400**, je Level mal `boss.hpPerLevel` = **1.6**.
  Herleitung: Bei Grundschaden 1, Feuerrate 3,5/s und acht Schützen sind das etwa 28 Schaden
  pro Sekunde — der erste Boss fällt also in gut 14 s, wenn nichts aufgewertet wurde. Mit
  aufgewerteten Werten schneller; das ist gewollt, weil die Tore im Level dafür da sind.
- Der Boss fährt waagerecht über die Fahrbahn und feuert in Schüben nach unten
  (`boss.moveSpeed`, `boss.fireIntervalMs`, `boss.burstCount` in `balance.ts`).
- Lebensbalken oben, **unterhalb** der HUD-Leiste, mit Safe-Area-Abstand.
- Boss tot → kurzes Overlay „LEVEL n geschafft" → nächstes Level in derselben Szene.
  Statuswerte, Truppe und Waffe **bleiben erhalten**; die Gegnerwellen starten härter.
- Spieler tot → Game Over wie bisher, Run wird gewertet.

**Das Bild des Bosses erzeugt Codex** nach dem bewährten Verfahren (groß erzeugen, dann
herunterrechnen). Motiv: ein deutlich größerer, gepanzerter Zombie, im Stil der drei
vorhandenen Gegner, etwa 120 × 120 px im Spiel.

## Entscheidung 4 — Permanente Stufenkäufe

Drei Aufwertungen, je fünf Stufen, gleiche Preisreihe: **50, 120, 250, 450, 750** Münzen.

| Aufwertung | Wirkung je Stufe | von → bis |
|---|---|---|
| Truppe | +1 Startfigur | 2 → 7 |
| Schaden | +0,5 Startschaden | 1 → 3,5 |
| Feuerrate | +0,3 Schuss/s | 3,0 → 4,5 |

Begründung für genau drei: Sie entsprechen den drei Statwerten, die im Run ohnehin über Tore
verändert werden. Ein vierter Kauf auf Geschwindigkeit wäre eine Verschlechterung, weil
höheres Tempo im Spiel auch weniger Reaktionszeit bedeutet.

## Entscheidung 5 — Inhalt des Speicherstands

```
{
  version: 1,
  coins:        Kontostand zwischen den Runs,
  upgrades:     { team, damage, rate },  je 0 bis 5,
  highestLevel: höchstes je erreichtes Level,
  scores:       bis zu zehn Einträge { coins, level, timeMs }, absteigend nach coins
}
```

Gespeichert wird **nach jedem Levelabschluss und bei Game Over**, wie im Plan vorgesehen.

## Entscheidung 6 — Prüfwerkzeug für die Speicherlogik

Der Plan sieht unter `tests/` Unit-Tests für `save.ts` und `upgrades.ts` vor. Dafür kommt
**Vitest** als Entwicklungsabhängigkeit dazu — kostenlos, gehört zum Vite-Umfeld, läuft nur
lokal und landet nicht im ausgelieferten Spiel.

Begründung: Die Prüfung „kaputter Importtext zerstört den Speicherstand nicht" lässt sich
ohne Testlauf nicht ehrlich belegen, und genau dieser Fall ist der teuerste, wenn er schiefgeht.

## Was bewusst **nicht** in E5 kommt

- Keine Namenseingabe für die Bestenliste (Thomas' Gerät, Thomas' Liste; eine Tastatur in
  einer iOS-PWA ist eine eigene Fehlerquelle).
- Kein Ton, keine Partikel — beides ist Nicht-Ziel beziehungsweise V1-Regel.
- Keine Verschlüsselung oder Manipulationssicherung des Speicherstands. Es gibt keinen
  Wettbewerb, also nichts zu schützen.
- Keine Cloud-Sicherung. Dafür ist der Export da.

## Was Thomas morgen prüfen sollte

1. Ob Münzen als Wertung stimmig sind (Entscheidung 1).
2. Ob ein Level mit 75 s plus Boss die richtige Länge hat (Entscheidung 3).
3. Ob der erste Boss zu leicht oder zu zäh ist (`boss.baseHp`).
4. Ob die Preise der Stufenkäufe passen (Entscheidung 4).
5. Ob ihm das Startbild gefällt.
