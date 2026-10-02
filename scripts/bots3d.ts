import { LEVELS } from '../src/v3d/balance3d.ts'
import { neuerLauf, schritt } from '../src/v3d/rechnung.ts'
import { leereStufen, muenzenFuerLauf, wendeStufenAn, zaehleBesiegt } from '../src/v3d/werkstatt.ts'
import { WERKSTATT } from '../src/v3d/balance3d.ts'

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
function spiele(level: typeof LEVELS[number], levelNr: number, art: 'passiv' | 'rhythmus' | 'rhythmusSaeule', S: number, seed: number) {
  const z = neuerLauf(level, seed); let phase: 'links' | 'mitte' | 'rechts' = 'links', nr = 0, si = 0
  let besiegt = 0
  while (z.ergebnis === 'laeuft' && z.t < 400) {
    if (art !== 'passiv') {
      if (phase === 'links' && z.T >= S) { nr++; phase = art === 'rhythmusSaeule' && nr % 2 === 0 && z.P !== null ? 'rechts' : 'mitte'; si = z.saeulenIndex }
      else if (phase === 'mitte' && z.T < 2) phase = 'links'
      else if (phase === 'rechts' && z.saeulenIndex !== si) phase = 'mitte'
    }
    besiegt += zaehleBesiegt(schritt(z, { x: art === 'passiv' ? 0 : phase === 'links' ? -1 : phase === 'rechts' ? 1 : 0 }, dt))
  }
  return { sieg: z.ergebnis === 'sieg', muenzen: muenzenFuerLauf(levelNr, z.ergebnis === 'sieg' ? 'sieg' : 'niederlage', besiegt) }
}
const basisGewinner: number[] = [], basisSiegMuenzen: number[] = []
for (const [i, level] of LEVELS.entries()) {
  let passiv = 0, spielweisen = 0, beste = 0, besteSiegMuenzen = 0
  for (let s = 1; s <= 20; s++) if (spiele(level, i + 1, 'passiv', 0, s).sieg) passiv++
  for (const art of ['rhythmus', 'rhythmusSaeule'] as const) for (let S = 10; S <= 150; S += 10) {
    let w = 0, siegMuenzen = 0
    for (let s = 1; s <= 20; s++) { const ergebnis = spiele(level, i + 1, art, S, s); if (ergebnis.sieg) { w++; siegMuenzen += ergebnis.muenzen } }
    if (w >= 15) spielweisen++
    if (w > beste || w === beste && w > 0 && siegMuenzen / w > besteSiegMuenzen) { beste = w; besteSiegMuenzen = siegMuenzen / w }
  }
  basisGewinner.push(spielweisen); basisSiegMuenzen.push(besteSiegMuenzen)
  console.log(`Level ${i + 1}: passiv ${passiv}/20 · gewinnende Spielweisen ${spielweisen}/30 · beste ${beste}/20`)
}

const profile = [
  { name: 'Stufen 3/3/3, keine Fahrzeuge', stufen: { ...leereStufen(), truppe: 3, feuer: 3, eis: 3 } },
  { name: 'alle Stufen voll', stufen: { truppe: 5, feuer: 5, eis: 5, panzer: 1, haubitze: 1, humvee: 1, hubschrauber: 1, mecha: 1 } },
]
for (const profil of profile) for (const [i, basis] of LEVELS.entries()) {
  const level = wendeStufenAn(basis, profil.stufen)
  let passiv = 0, spielweisen = 0, beste = 0, besteMuenzen = 0
  for (let s = 1; s <= 20; s++) if (spiele(level, i + 1, 'passiv', 0, s).sieg) passiv++
  for (const art of ['rhythmus', 'rhythmusSaeule'] as const) for (let S = 10; S <= 150; S += 10) {
    let siege = 0, muenzen = 0
    for (let s = 1; s <= 20; s++) { const ergebnis = spiele(level, i + 1, art, S, s); if (ergebnis.sieg) siege++; muenzen += ergebnis.muenzen }
    if (siege >= 15) spielweisen++
    if (siege > beste || siege === beste && muenzen / 20 > besteMuenzen) { beste = siege; besteMuenzen = muenzen / 20 }
  }
  console.log(`Profil ${profil.name} · Level ${i + 1}: passiv ${passiv}/20 · gewinnende Spielweisen ${spielweisen}/30 · beste ${beste}/20 · Ø Münzen ${besteMuenzen.toFixed(1)}/Lauf`)
  if (profil.name === 'alle Stufen voll' && (spielweisen < basisGewinner[i] || passiv >= 1)) console.log(`Profil Hinweis Level ${i + 1}: ${spielweisen < basisGewinner[i] ? 'weniger gewinnende Spielweisen' : ''}${spielweisen < basisGewinner[i] && passiv >= 1 ? ', ' : ''}${passiv >= 1 ? 'passiv gewinnt' : ''}`)
}
const gesamtPreis = Object.values(WERKSTATT).reduce((summe, art) => summe + art.preise.reduce((a, b) => a + b, 0), 0)
let muenzen = 0, siege = 0
while (muenzen < gesamtPreis && siege < 10000) { muenzen += basisSiegMuenzen[siege % LEVELS.length]; siege++ }
console.log(`Profil Siege Level 1–10 der Reihe nach bis voll: ${siege} Siege · Bedarf ¢ ${gesamtPreis} · Ø Siegmünzen je Level ${basisSiegMuenzen.map(n => n.toFixed(1)).join('/')}`)
