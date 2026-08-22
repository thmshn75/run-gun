export type ReinforcementOffer = Readonly<{ label: string; apply: (current: number) => number }>

// Verstaerkungs-Angebot der linken Dauerwand (W4), zustandsabhaengig gezogen nach dem
// Tor-Mathematik-Prinzip: Die Hoehe des Zuschlags skaliert mit dem aktuellen Stand.
// Angezeigt wird der OPERATOR ("+4", "x1.5") — er bleibt wahr, egal wie sich der Stand
// bis zum Freischiessen aendert; angewandt wird er auf den dann aktuellen Wert
// (W4-Haertungsbefund: kein beim Spawn eingefrorener, veraltender Absolutwert).
export function getReinforcementOffer(currentTeam: number, rng: () => number): ReinforcementOffer {
  const addValue = Math.max(2, Math.round(currentTeam * 0.35))
  // Multiplikative Angebote wachsen um mindestens eine Figur: Bei winzigen Truppen
  // wuerde die Rundung sonst auf denselben Wert fuehren und das Goodie waere leer.
  const grow = (factor: number) => (current: number) => Math.max(current + 1, Math.round(current * factor))
  const offers: ReinforcementOffer[] = [
    { label: `+${addValue}`, apply: (current) => current + addValue },
    { label: '×1.3', apply: grow(1.3) },
    { label: '×1.5', apply: grow(1.5) },
    { label: '+25%', apply: grow(1.25) },
  ]
  return offers[Math.min(offers.length - 1, Math.floor(rng() * offers.length))]
}

// Unregelmaessige Goodies mit Garantie: chance pro Segment, aber nie mehr als maxDry
// Nieten in Folge — sonst reisst der Truppen-Nachschub ab, der bis W4 aus den Toren kam.
export function decideGoodie(drySpawns: number, chance: number, maxDry: number, rng: () => number): boolean {
  return drySpawns >= maxDry || rng() < chance
}
