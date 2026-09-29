import { LEVELS } from '../src/v3d/balance3d.ts'
import { neuerLauf, schritt } from '../src/v3d/rechnung.ts'

const dt = 1 / 30
const botSchwelleT = Number(process.env.BOT_SCHWELLE_T ?? 30)
if (!Number.isFinite(botSchwelleT)) throw new Error('BOT_SCHWELLE_T muss eine Zahl sein')

for (const bot of ['passiv', 'strategie'] as const) {
  const zeilen = []
  for (let seed = 1; seed <= 20; seed++) {
    const z = neuerLauf(LEVELS[0], seed)
    let ersteSaeuleFrei = false
    while (z.ergebnis === 'laeuft' && z.t < 300) {
      const x = bot === 'passiv' ? 0 : z.T < botSchwelleT ? -1 : ersteSaeuleFrei ? 0 : 1
      const ereignisse = schritt(z, { x }, dt)
      if (ereignisse.some(e => e.art === 'einheitFrei')) ersteSaeuleFrei = true
    }
    zeilen.push({ Seed: seed, Ergebnis: z.ergebnis, Dauer: +z.t.toFixed(2),
      T: +z.T.toFixed(2), F: +z.F.toFixed(2), Z: +z.Z.toFixed(2),
      Saeulen: z.saeulenIndex })
  }
  console.log(`\n${bot} (Schwelle T=${botSchwelleT})`)
  console.table(zeilen)
  console.log(`Siegquote: ${zeilen.filter(z => z.Ergebnis === 'sieg').length}/20`)
}
