import { LEVELS } from '../src/v3d/balance3d.ts'
import { neuerLauf, schritt } from '../src/v3d/rechnung.ts'

const dt = 1 / 30
const bots = [
  { name: 'passiv', art: 'passiv', S: 0 },
  { name: 'nurLinks', art: 'nurLinks', S: 0 },
  { name: 'rhythmus(40)', art: 'rhythmus', S: 40 },
  { name: 'rhythmusSaeule(60)', art: 'rhythmusSaeule', S: 60 },
  { name: 'rhythmusSaeule(15)', art: 'rhythmusSaeule', S: 15 },
  { name: 'rhythmusSaeule(25)', art: 'rhythmusSaeule', S: 25 },
] as const

for (const bot of bots) {
  let siege = 0, dauer = 0, saeulen = 0
  for (let seed = 1; seed <= 20; seed++) {
    const z = neuerLauf(LEVELS[0], seed)
    let phase: 'links' | 'mitte' | 'rechts' = 'links'
    let vorratNummer = 0
    let saeulenIndex = 0
    while (z.ergebnis === 'laeuft' && z.t < 300) {
      if (bot.art === 'rhythmus' || bot.art === 'rhythmusSaeule') {
        if (phase === 'links' && z.T >= bot.S) {
          vorratNummer++
          phase = bot.art === 'rhythmusSaeule' && vorratNummer % 2 === 0 && z.P !== null ? 'rechts' : 'mitte'
          saeulenIndex = z.saeulenIndex
        } else if (phase === 'mitte' && z.T < 2) phase = 'links'
        else if (phase === 'rechts' && z.saeulenIndex !== saeulenIndex) phase = 'mitte'
      }
      const x = bot.art === 'passiv' ? 0 : bot.art === 'nurLinks' ? -1 : phase === 'links' ? -1 : phase === 'rechts' ? 1 : 0
      schritt(z, { x }, dt)
    }
    if (z.ergebnis === 'sieg') siege++
    dauer += z.t
    saeulen += z.saeulenIndex
  }
  console.log(`${bot.name}: Siege ${siege}/20, Ø Dauer ${(dauer / 20).toFixed(1)} s, Ø gefallene Säulen ${(saeulen / 20).toFixed(2)}`)
}

// D7-Nachweis: je Level passiv, Zahl gewinnender Spielweisen (≥ 15/20) und beste Gewinnquote.
function spiele(level: typeof LEVELS[number], art: 'passiv' | 'rhythmus' | 'rhythmusSaeule', S: number, seed: number) {
  const z = neuerLauf(level, seed); let phase: 'links' | 'mitte' | 'rechts' = 'links', nr = 0, si = 0
  while (z.ergebnis === 'laeuft' && z.t < 400) {
    if (art !== 'passiv') {
      if (phase === 'links' && z.T >= S) { nr++; phase = art === 'rhythmusSaeule' && nr % 2 === 0 && z.P !== null ? 'rechts' : 'mitte'; si = z.saeulenIndex }
      else if (phase === 'mitte' && z.T < 2) phase = 'links'
      else if (phase === 'rechts' && z.saeulenIndex !== si) phase = 'mitte'
    }
    schritt(z, { x: art === 'passiv' ? 0 : phase === 'links' ? -1 : phase === 'rechts' ? 1 : 0 }, dt)
  }
  return z.ergebnis === 'sieg'
}
for (const [i, level] of LEVELS.entries()) {
  let passiv = 0, spielweisen = 0, beste = 0
  for (let s = 1; s <= 20; s++) if (spiele(level, 'passiv', 0, s)) passiv++
  for (const art of ['rhythmus', 'rhythmusSaeule'] as const) for (let S = 10; S <= 150; S += 10) {
    let w = 0; for (let s = 1; s <= 20; s++) if (spiele(level, art, S, s)) w++
    if (w >= 15) spielweisen++; beste = Math.max(beste, w)
  }
  console.log(`Level ${i + 1}: passiv ${passiv}/20 · gewinnende Spielweisen ${spielweisen}/30 · beste ${beste}/20`)
}
