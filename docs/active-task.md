# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E5-1 — Speicherstand: laden, sichern, prüfen. Reine Logik, keine Oberfläche.**

Erster von vier Läufen für E5. Der Rahmen und alle stellvertretend getroffenen Entscheidungen
stehen in `docs/e5-design.md` — **vor dem Bauen lesen**.

Dieser Lauf baut ausschließlich das Fundament. **Es wird nichts sichtbar.** Boss, Menü und
Bestenliste kommen in den Läufen E5-2 bis E5-4 darauf.

## Warum zuerst und allein

Alle drei Folgeteile schreiben in denselben Speicherstand. Wäre die Speicherlogik Teil eines
größeren Laufs, würde ein Fehler darin erst auffallen, wenn schon Menü und Bestenliste darauf
stehen — und der teuerste Fehler dieses Projekts wäre ein Importvorgang, der einen
funktionierenden Spielstand zerstört.

## Neue Datei `src/systems/save.ts`

### Form des Spielstands

```ts
interface SaveData {
  version: 1
  coins: number                                   // Kontostand zwischen den Runs
  upgrades: { team: number; damage: number; rate: number }   // je 0..5
  highestLevel: number                            // >= 1
  scores: Array<{ coins: number; level: number; timeMs: number }>  // max 10
}
```

Schlüssel in `localStorage`: **`rungun_save_v1`** (steht so im Plan).

### Verlangte Funktionen

- `defaultSave(): SaveData` — Kontostand 0, alle Stufen 0, `highestLevel` 1, leere Liste.
- `loadSave(): SaveData` — liest aus `localStorage`. Bei fehlendem Eintrag, kaputtem JSON oder
  ungültiger Form **den Standard zurückgeben, nie werfen**. Ein Spiel, das wegen eines
  kaputten Speicherstands gar nicht startet, ist schlimmer als eines ohne Fortschritt.
- `writeSave(data: SaveData): void` — schreibt. Wirft `localStorage` (voll, privater Modus,
  abgeschaltet), wird das **abgefangen** und im DEV-Modus auf der Konsole gemeldet. Das Spiel
  läuft weiter.
- `parseSave(text: string): { ok: true; data: SaveData } | { ok: false; reason: string }` —
  prüft einen von außen kommenden Text, **ohne** irgendetwas zu schreiben. Der Grund ist ein
  kurzer deutscher Satz, der später unverändert angezeigt werden kann.
- `serializeSave(data: SaveData): string` — JSON-Text für den Export.
- `addScore(data: SaveData, entry): SaveData` — fügt einen Lauf in die Bestenliste ein,
  sortiert absteigend nach `coins`, kürzt auf zehn. **Gibt einen neuen Wert zurück, ändert
  den übergebenen nicht.**
- `qualifiesForScores(data: SaveData, coins: number): boolean` — ob ein Lauf es in die Liste
  schaffen würde. Wird später für die Hervorhebung nach dem Game Over gebraucht.

### Prüfregeln für `parseSave`

Diese Liste ist verbindlich, weil daran hängt, ob ein falscher Text den Spielstand zerstört:

1. Text ist gültiges JSON und ein Objekt — sonst `reason` „Text ist kein gültiger Spielstand."
2. `version` ist exakt `1` — sonst „Spielstand stammt aus einer anderen Version."
3. `coins`, `highestLevel` und alle drei Stufen sind **endliche Zahlen ≥ 0**; Stufen zusätzlich
   ≤ 5, `highestLevel` ≥ 1. `NaN` und `Infinity` gelten ausdrücklich als ungültig.
4. `scores` ist ein Array mit höchstens zehn Einträgen; jeder Eintrag hat drei endliche Zahlen
   ≥ 0. Ein einzelner kaputter Eintrag macht den ganzen Text ungültig — nicht stillschweigend
   überspringen.
5. Unbekannte zusätzliche Felder werden **verworfen**, nicht übernommen und nicht beanstandet.
   Die zurückgegebenen Daten enthalten nur die oben genannten Felder.

**Zahlen werden beim Einlesen geklemmt, nicht dem Text geglaubt.** Auch ein formal gültiger
Text darf keine Stufe 9 setzen.

## Anbindung an das Spiel — nur das Nötigste

Mehr als diese zwei Punkte wird in diesem Lauf **nicht** angeschlossen:

- `GameScene` merkt sich die im Run gesammelten Münzen und die Laufzeit (beides existiert
  bereits) und ruft bei Game Over `writeSave` mit dem um den Run ergänzten Stand auf:
  Kontostand plus Münzen des Runs, `addScore` mit Münzen, Level und Laufzeit.
  **Level ist in diesem Lauf immer 1** — Level kommen erst in E5-2.
- Beim Start eines Runs werden die gekauften Stufen aus dem Speicherstand auf die Startwerte
  angewandt: `hp` + Stufe Truppe, `damage` + 0,5 je Stufe, `shotsPerSec` + 0,3 je Stufe,
  jeweils über die vorhandene Klemmung in `upgrades.ts`. Da noch nichts gekauft werden kann,
  sind die Stufen immer 0 — der Weg muss aber jetzt stehen, damit E5-3 nur noch den Kauf
  ergänzt.

## Tests unter `tests/`

**Vitest** als Entwicklungsabhängigkeit ergänzen (`npm i -D vitest`) und ein Skript
`"test": "vitest run"` in `package.json`. Vitest gehört zum Vite-Umfeld, ist kostenlos und
landet nicht im ausgelieferten Spiel.

`tests/save.test.ts` deckt mindestens ab:

1. Leerer Speicher → Standardwerte, kein Fehler.
2. Kaputter JSON-Text im Speicher → Standardwerte, kein Fehler.
3. Runde: schreiben, lesen, gleicher Inhalt.
4. `parseSave` mit gültigem Export → `ok: true`, Werte identisch.
5. `parseSave` mit falscher Version → `ok: false` mit Begründung.
6. `parseSave` mit `coins: NaN`, mit `coins: -5`, mit Stufe `9`, mit elf Einträgen in der
   Liste, mit einem kaputten Eintrag in der Liste → jeweils `ok: false`.
7. `parseSave` mit zusätzlichem unbekanntem Feld → `ok: true`, Feld ist im Ergebnis **nicht**
   enthalten.
8. `addScore`: besserer Lauf steht vorn; elfter Lauf verdrängt den schlechtesten; ein
   schlechterer Lauf bei voller Liste ändert nichts; der übergebene Wert bleibt unverändert.

## Ausdrücklich nicht in diesem Lauf

- Keine Menü-Szene, kein Startbildschirm, keine Anzeige der Bestenliste.
- Kein Export- oder Import-Knopf, keine Oberfläche dafür.
- Kein Boss, keine Level, keine Kaufmöglichkeit.
- Keine Änderung an Gegnern, Waffen, Toren, Himmel oder HUD.
- `navigator.clipboard.readText()` wird nirgends benutzt — auch später nicht, siehe Plan.

## Reißleine

Lässt sich `localStorage` in der Zielumgebung nicht verlässlich benutzen: **melden und
stoppen**. Kein zulässiger Ersatz sind Cookies, IndexedDB oder ein Speicher im Arbeitsspeicher,
der beim Schließen verschwindet — das wäre ein Fortschritt, der nur so tut als ob.

## Akzeptanzkriterien

1. `npm run check` und `npm run build` laufen fehlerfrei durch.
2. `npm test` läuft und **alle** Tests aus der Liste oben sind grün.
3. Ein Run mit Game Over erhöht den Kontostand um die im Run gesammelten Münzen und schreibt
   einen Eintrag in die Bestenliste; nach einem Neuladen der Seite sind beide noch da.
4. Ein von Hand kaputt gemachter Eintrag in `localStorage` lässt das Spiel normal starten.
5. Im ausgelieferten Bündel ist kein Testcode enthalten.
6. Nichts am sichtbaren Spiel hat sich verändert.

Kriterium 3 und 4 prüft Claude am laufenden Spiel nach.
