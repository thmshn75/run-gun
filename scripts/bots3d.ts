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
        } else if (phase === 'mitte' && z.T < 1) phase = 'links'
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
