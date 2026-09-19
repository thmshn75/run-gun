# Active Task

## Status
`IMPL_DONE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Stand des Reviews (2026-09-19)

**Code-Review bestanden nach Nacharbeit N4.** Eigenes System `Strom` mit Pool 200 und
Spurformel aus dem Projektilpfad, dritter Dispatch-Zweig in `handleCombatOverlap` vor
Projektil und Huelle, Kopien erben die Platten-Markierung, +1-Kacheln links, kein
×-Paar innerhalb 1100 px, Guard in `collectPickup`, Nachschub nach jedem Levelstart aus,
`cleared`-Sprung mit eigener Levelzaehlung, Feuer-Schalter in `Weapons`, Waffen-HUD
aus. `npm run check`, `npm test` (41 Dateien, 436 Tests), `npm run build` gruen, im
Terminal nachgelaufen.

**A10 — Bot-Messung, selbst durchgefuehrt (Playwright, Vite-Dev, 390x844):**

| Messung | Ergebnis |
|---|---|
| Torlauf L5, Quelle 10, Bot lenkt auf das bessere Tor, 9 Paare | ×2-Pfeiler mit -13 faellt in **2,5 s**; Quelle **10 → 61 in 47 s** (vor allem +1/s ueber die Kacheln, dazu +N-Tore); keine Projektile aktiv; hoechstens 22 Strom-Figuren gleichzeitig |
| Bildzeit, Quelle 60, Torlauf-Level in der Gegnerphase, 20 s | **Median 16,7 ms, p95 18,1 ms**, 1201 Bilder, 0 Pool-Warnungen |
| **Zweiter Start in derselben Sitzung (vor N4)** | **0 Treffer** bei 136 geometrischen Ueberlappungen — Collider zeigte auf die Gruppen des vorigen Laufs |
| Zwei Starts in derselben Sitzung (**nach N4**) | Lauf 1: **77** Treffer, Lauf 2: **76** Treffer, Quelle je 40 → 49 in 8 s |

**Gemessene Flugzeit ~0,8 s** (nicht 1,9 s wie in der Spec geschaetzt) — Pool 200 hat
sehr viel Reserve, Kommentar am Pool nachgezogen. Die ×3-Vervielfachung konnte im
Lastfall nicht sichtbar gemacht werden, weil die erzwungene Platte nahe am Horizont
lag und die Kopien sofort recycelt wurden; die Logik ist ueber `hitSpawnIds` und Tests
abgesichert, der Lastfall bleibt eine Sichtpruefung fuer E3.

**Bekannte Eigenheit, keine Aenderung:** Die +1-Kacheln am linken Rand werden fast immer
eingesammelt, weil die 214-px-Formation Figuren bis an den linken Rand losschickt —
+1/s Grundwachstum unabhaengig von der Lenkung. Balance-Thema fuer E3, wenn die Horde
Verlust bringt.

**Offen: A11 — Thomas' iPhone-Test** (Strom liest sich als losgeschickte Einheiten,
Pfeiler fallen unter dem Strom, ×2 verdoppelt die Dichte, +1 zaehlt; und N1.4
Wipptakt). Bis dahin `IMPL_DONE`, nicht `APPROVED`. **E2b (Pfeiler-Bilder) offen.**
