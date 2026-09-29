import { SPEZIAL, type Level, type SpezialName } from './balance3d.ts'

export type Ziel = 'front'
export type BossName = 'miniBoss' | 'eliteBoss'
export interface Trupp { ziel: Ziel; pos: number; anzahl: number; vervielfacht: boolean; k: number }
export interface Boss { imFeld: boolean; B: number }
export interface AktiveEinheit { einheit: SpezialName; rest: number; einschlaege: number }
export type EreignisArt = 'welle' | 'eingesammelt' | 'ausgesandt' | 'vervielfacht' |
  'wandStufe' | 'angekommenFront' | 'saeuleTreffer' | 'einheitFrei' |
  'einheitAktiv' | 'einheitEnde' | 'spezialTreffer' | 'zombieGefallen' |
  'bossTreffer' | 'soldatGefallen' | 'sieg' | 'niederlage'
export interface Ereignis { art: EreignisArt; menge: number; t: number; einheit?: string; boss?: BossName }
export interface Zustand {
  level: Level
  t: number
  T: number
  trupps: Trupp[]
  F: number
  Z: number
  y: number
  P: number | null
  saeulenIndex: number
  miniBoss: Boss
  eliteBoss: Boss
  gestarteteWellen: number
  eliteErschienen: boolean
  ergebnis: 'laeuft' | 'sieg' | 'niederlage'
  sendeRest: number
  durchWand: number
  kAktuell: number
  aktiv: AktiveEinheit[]
  seedZustand: number
}

// Mulberry32: der gesamte Zufallszustand liegt im Laufzustand.
function zufall(z: Zustand): number {
  z.seedZustand = (z.seedZustand + 0x6D2B79F5) >>> 0
  let n = z.seedZustand
  n = Math.imul(n ^ (n >>> 15), n | 1)
  n ^= n + Math.imul(n ^ (n >>> 7), n | 61)
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296
}

export function neuerLauf(level: Level, seed: number): Zustand {
  return {
    level, t: 0, T: level.T0, trupps: [], F: 0, Z: 0, y: level.startY,
    P: level.saeulen.length ? level.P : null, saeulenIndex: 0,
    miniBoss: { imFeld: false, B: level.B_mini },
    eliteBoss: { imFeld: false, B: level.B_elite },
    gestarteteWellen: 0, eliteErschienen: false, ergebnis: 'laeuft',
    sendeRest: 0, durchWand: 0, kAktuell: level.kStart, aktiv: [], seedZustand: seed >>> 0,
  }
}

export function schritt(z: Zustand, eingabe: { x: number }, dt: number): Ereignis[] {
  if (z.ergebnis !== 'laeuft') return []
  if (!Number.isFinite(dt) || dt <= 0) throw new RangeError('dt muss positiv und endlich sein')
  const l = z.level
  const ereignisse: Ereignis[] = []
  const melde = (art: EreignisArt, menge: number, extra: Pick<Ereignis, 'einheit' | 'boss'> = {}) => {
    ereignisse.push({ art, menge, t: z.t, ...extra })
  }

  while (z.gestarteteWellen < l.wellen.length && z.t >= l.wellen[z.gestarteteWellen].t - 1e-9) {
    const index = z.gestarteteWellen++
    const menge = l.wellen[index].groesse * (1 + l.streuung * (2 * zufall(z) - 1))
    z.Z += menge
    melde('welle', menge)
    if (index === l.miniBossWelle) z.miniBoss.imFeld = true
  }
  if (!z.eliteErschienen && z.t >= l.eliteBossZeit - 1e-9) {
    z.eliteBoss.imFeld = true
    z.eliteErschienen = true
  }

  if (eingabe.x < l.schwelleLinks) {
    const menge = l.einsammeln * dt
    z.T += menge
    melde('eingesammelt', menge)
  }
  if (eingabe.x >= l.schwelleLinks && eingabe.x <= l.schwelleRechts && z.T >= 2) {
    z.sendeRest += l.senden * dt
  } else z.sendeRest = 0
  const gesendet = Math.min(Math.floor(z.sendeRest), Math.max(0, Math.floor(z.T) - 1))
  if (gesendet > 0) {
    z.sendeRest -= gesendet
    z.T -= gesendet
    z.trupps.push({ ziel: 'front', pos: 0, anzahl: gesendet, vervielfacht: false, k: 1 })
    melde('ausgesandt', gesendet)
  }
  if (z.T < 2) z.sendeRest = 0
  if (eingabe.x > l.schwelleRechts && z.P !== null) {
    const schaden = l.saeuleSchaden * z.T * dt
    const treffer = Math.min(schaden, z.P)
    z.P -= treffer
    if (treffer > 0) melde('saeuleTreffer', treffer)
    if (z.P <= 0) {
      const einheit = l.saeulen[z.saeulenIndex] as SpezialName
      melde('einheitFrei', 1, { einheit })
      z.aktiv.push({ einheit, rest: SPEZIAL[einheit].dauer, einschlaege: 0 })
      melde('einheitAktiv', 1, { einheit })
      z.saeulenIndex++
      z.P = z.saeulenIndex < l.saeulen.length ? l.P : null
    }
  }

  const unterwegs: Trupp[] = []
  for (const trupp of z.trupps) {
    trupp.pos += l.laufgeschwindigkeit * dt
    // Bei naher Front entscheidet die zuerst erreichte Zielposition.
    if (trupp.pos >= z.y && z.y < l.wand && !trupp.vervielfacht) {
      z.F += trupp.anzahl
      melde('angekommenFront', trupp.anzahl)
      continue
    }
    if (!trupp.vervielfacht && trupp.pos >= l.wand) {
      const vorher = trupp.anzahl
      const k = Math.min(l.kMax, l.kStart + Math.floor(z.durchWand / l.wandStufe))
      const plus = (k - 1) * vorher
      trupp.anzahl *= k
      trupp.k = k
      z.durchWand += vorher
      trupp.vervielfacht = true
      melde('vervielfacht', plus)
      const neu = Math.min(l.kMax, l.kStart + Math.floor(z.durchWand / l.wandStufe))
      if (neu > z.kAktuell) { z.kAktuell = neu; melde('wandStufe', neu) }
    }
    if (trupp.pos >= z.y) {
      z.F += trupp.anzahl
      melde('angekommenFront', trupp.anzahl)
    } else {
      unterwegs.push(trupp)
    }
  }
  z.trupps = unterwegs

  const weiterAktiv: AktiveEinheit[] = []
  for (const aktiv of z.aktiv) {
    const wirkZeit = Math.min(dt, aktiv.rest)
    const einheit = aktiv.einheit
    const spezial = SPEZIAL[einheit]
    if (einheit === 'haubitze') {
      const ende = spezial as typeof SPEZIAL.haubitze
      const verstrichen = ende.dauer - aktiv.rest
      while (aktiv.einschlaege < ende.einschlaege && aktiv.einschlaege * ende.abstand <= verstrichen + wirkZeit + 1e-9) {
        const treffer = Math.min(ende.zombiesProEinschlag, z.Z)
        z.Z -= treffer
        if (treffer > 0) melde('spezialTreffer', treffer, { einheit })
        aktiv.einschlaege++
      }
    } else {
      const rate = spezial as typeof SPEZIAL.humvee | typeof SPEZIAL.panzer | typeof SPEZIAL.hubschrauber
      const treffer = Math.min(rate.zombiesProSekunde * wirkZeit, z.Z)
      z.Z -= treffer
      if (treffer > 0) melde('spezialTreffer', treffer, { einheit })
      if (einheit === 'hubschrauber') {
        const boss = z.miniBoss.imFeld && z.miniBoss.B > 0 ? 'miniBoss' : z.eliteBoss.imFeld && z.eliteBoss.B > 0 ? 'eliteBoss' : null
        if (boss) {
          const schaden = Math.min(SPEZIAL.hubschrauber.bossPunkteProSekunde * wirkZeit, z[boss].B)
          z[boss].B -= schaden
          melde('bossTreffer', schaden, { boss })
          if (z[boss].B <= 0) z[boss].imFeld = false
        }
      }
    }
    aktiv.rest -= dt
    if (aktiv.rest <= 1e-9) melde('einheitEnde', 1, { einheit })
    else weiterAktiv.push(aktiv)
  }
  z.aktiv = weiterAktiv

  const miniImFeld = z.miniBoss.imFeld && z.miniBoss.B > 0
  const eliteImFeld = z.eliteBoss.imFeld && z.eliteBoss.B > 0
  const feind = z.Z > 0 || miniImFeld || eliteImFeld
  if (z.F > 0 && feind) {
    const K = Math.min(z.F, l.C)
    const Zk = Math.min(z.Z, l.C) + l.bossDruck * (Number(miniImFeld) + Number(eliteImFeld))
    let treffer = l.zombieTreffer * K * dt
    const gefallen = Math.min(treffer, z.Z)
    z.Z -= gefallen
    treffer -= gefallen
    if (gefallen > 0) melde('zombieGefallen', gefallen)
    for (const [name, imFeld] of [['miniBoss', miniImFeld], ['eliteBoss', eliteImFeld]] as const) {
      if (!imFeld || treffer <= 0) continue
      const boss = z[name]
      const anteil = Math.min(treffer, boss.B / l.bossSchaden)
      const schaden = l.bossSchaden * anteil
      boss.B = Math.max(0, boss.B - schaden)
      treffer -= anteil
      melde('bossTreffer', schaden, { boss: name })
      if (boss.B <= 0) boss.imFeld = false
    }
    const verlust = Math.min(z.F, l.soldatenVerlust * Math.min(Zk, l.gegnerProSoldat * K) * dt)
    z.F -= verlust
    if (verlust > 0) melde('soldatGefallen', verlust)
    z.y += l.frontVerschiebung * (K - Zk) / (K + Zk) * dt
  } else if (feind) {
    z.y -= l.marsch * dt
  }
  z.y = Math.min(l.startY, z.y)

  if (z.y <= 0) {
    z.ergebnis = 'niederlage'
    melde('niederlage', 1)
  } else if (z.eliteErschienen && z.eliteBoss.B <= 0) {
    z.ergebnis = 'sieg'
    melde('sieg', 1)
  }
  z.t += dt
  return ereignisse
}
