# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Sperren ab Level 1, steigende Häufigkeit, drei neue Waffen ab Level 3.**

Thomas-Entscheidung vom 2026-08-21: „ich möchte die tore schon ab level 1 aber die häufigkeit
der waffen weniger und ab 2 häufiger und ab 3 zusätzliche waffen — Minigun, Flammenwerfer und
was dir sonst noch einfällt".

---

# Teil 1 — Sperren ab Level 1

`blockers.spawnIntervalMsByDesignLevel` steht heute auf `[0, 0, 21000, …]`; die ersten beiden
Level haben also keine Sperren und damit keinen Weg zu einer anderen Waffe.

1. **Level 1 bekommt Sperren, aber selten** — deutlich seltener als Level 3, sodass in einem
   Level-1-Durchlauf typischerweise **eine** Sperre erscheint, nicht mehrere.
2. **Level 2 liegt spürbar darüber**, aber noch unter Level 3.
3. Die übrigen Level bleiben wie sie sind.
4. Die Regel aus E9 gilt unverändert: Eine Sperre erscheint **nie** ohne gleichzeitig
   anlaufende Gegner, und daneben bleibt immer ein freier Weg.

# Teil 2 — Drei neue Waffen

Zu Standard, Schrot, Laser und Rakete kommen drei Typen dazu. Sie müssen sich **deutlich
unterschiedlich anfühlen**, sonst ist eine davon überflüssig (Reißleine E4 in `docs/plan.md`).

| Typ | Charakter | Technische Umsetzung |
|---|---|---|
| **Minigun** | Sehr hohe Feuerrate, wenig Schaden je Schuss. Mäht leichte Gegner weg, tut sich gegen schwere schwer. | Hoher `rateFactor`, niedriger `damageFactor`, ein Projektil, hohe Geschossgeschwindigkeit |
| **Flammenwerfer** | Breiter Kegel auf kurze Distanz, trifft mehrere gleichzeitig, zwingt näher an die Gegner heran. | Mehrere Projektile im Fächer, kleiner `rangePx`, hoher `rateFactor`, niedriger `damageFactor` |
| **Kettenblitz** | Der Treffer springt vom getroffenen Gegner auf nahe Gegner über. Stark gegen die Trupp-Formationen aus E7, schwach gegen Einzelgegner. | Neue Waffen-Eigenschaften `chainCount` und `chainRadiusPx`; beim Treffer werden bis zu `chainCount` weitere Gegner im Radius mit verringertem Schaden getroffen |

## Verbindliche Obergrenze für die Projektillast

Bei voller Feuerrate und acht Schützen ergäbe eine Minigun rund **150**, ein Flammenwerfer
rund **167** gleichzeitige Projektile. Die Schrotflinte — bisher der schlimmste Fall im Spiel —
liegt bei **78**. Das Doppelte davon bricht dem iPhone genau im besten Moment das Genick.

**Deshalb:** Beide Waffen bekommen eine **reduzierte Schützenzahl je Salve**
(`shootersPerSalvo`), so wie es die Rakete mit 3 bereits vorlebt. Die Spitzenlast jeder neuen
Waffe muss **unter dem Wert der Schrotflinte bleiben**. Der Rechenweg gehört als Kommentar an
jede Waffe **und** an ihre Poolgröße — Salven pro Sekunde × Schützen × Projektile pro Schuss ×
Flugzeit.

Sichtbar bleibt trotzdem, dass alle Figuren feuern: Die Salve wandert wie bisher reihum durch
die Truppe.

## Weitere Vorgaben

1. **Getrennter Projektil-Pool je neuer Waffe**, jeder mit eigener Herleitung — dieselbe Regel
   wie für die vier vorhandenen.
2. **Der Kettenblitz erzeugt für die Übersprünge keine zusätzlichen Projektile.** Die
   Übersprünge sind reine Schadensanwendung im Radius, optisch begleitet von einem kurzen
   Aufblitzen aus einem kleinen eigenen Pool — **kein Partikelsystem** (V1-Regel).
   Ein Gegner darf pro Schuss **höchstens einmal** getroffen werden, sonst schaukelt sich der
   Schaden in dichten Trupps unkontrolliert auf.
3. **Waffen haben ein Mindestlevel.** Die drei neuen erscheinen erst ab Level 3. Die Auswahl
   in `Spawner.chooseBlockerWeapon` liest künftig das Mindestlevel aus der Waffen-Konfiguration
   statt einer fest verdrahteten Liste — sonst wird die nächste Waffe wieder vergessen.
   Die Regel „nie die aktuell getragene Waffe" bleibt.
4. **Symbole:** Für jede neue Waffe wird ein `weapon-<key>-gate`-Symbol im Stil der vorhandenen
   erzeugt, dazu die nötigen Projektil-Texturen. Verfahren wie im Projekt üblich: groß
   erzeugen, dann auf Zielgröße herunterrechnen; große Vorlage nach `assets/probe/`, das
   fertige Bild nach `src/assets/` (siehe `docs/lessons.md`).
5. **Die Waffenwerte gehören vollständig nach `balance.ts`**, wie bei den vorhandenen vier.

## Ausdrücklich nicht ändern

- Die vier vorhandenen Waffen und ihre Werte.
- Tore, Boss, Leveltabelle im Übrigen, Trupps, Menü, Titelbildschirm, Speicherformat.
- Die Regel, dass höchstens `crowd.shootersPerSalvo` Figuren gleichzeitig feuern und jede
  weitere Figur stattdessen den Schaden erhöht.

## Reißleine

Ruckelt eine der neuen Waffen am iPhone, wird zuerst die **Schützenzahl je Salve** gesenkt,
danach der `rateFactor` — die Waffe fliegt nicht raus. Fühlt sich dagegen eine der drei nach
einem Balance-Zyklus wie eine Variante einer vorhandenen an, **fliegt sie raus statt weiter
getunt zu werden** (Reißleine E4 aus `docs/plan.md`).

## Akzeptanzkriterien

1. In Level 1 erscheinen Sperren, aber seltener als in Level 2, und dort seltener als in
   Level 3. Unit-Test über `blockers.spawnIntervalMsByDesignLevel`.
2. Ein Unit-Test weist für **jede** Waffe nach, dass die rechnerische Spitzenlast an
   gleichzeitigen Projektilen unter der der Schrotflinte liegt, und dass die Poolgröße über
   dieser Spitzenlast liegt.
3. Die drei neuen Waffen sind vor Level 3 nicht erreichbar; ab Level 3 sind sie in der Auswahl
   an der Sperre enthalten. Unit-Test über die Auswahlfunktion.
4. `Spawner.chooseBlockerWeapon` liest die verfügbaren Waffen aus der Konfiguration, nicht aus
   einer im Code stehenden Liste.
5. Der Kettenblitz trifft jeden Gegner höchstens einmal pro Schuss und erzeugt keine
   zusätzlichen Projektile.
6. Jede neue Waffe hat ein eigenes Symbol und einen eigenen Projektil-Pool mit dokumentierter
   Herleitung.
7. Die vier vorhandenen Waffen verhalten sich unverändert.
8. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

Kriterien 1 bis 6 und 8 prüfst du selbst. Kriterium 7 prüft Claude; ob sich die neuen Waffen
unterschiedlich anfühlen und ob das iPhone die Last trägt, entscheidet Thomas am Gerät.

## Implementation Summary

<!-- Von Codex auszufüllen -->

## Verification

<!-- Von Codex auszufüllen -->
