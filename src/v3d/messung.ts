import * as THREE from 'three'
import type Phaser from 'phaser'
import { auswerten, pmremPufferBytes, speicherMB, spiegelPufferBytes, urteil, type Bildgroesse } from './rechnen'
import { ZombieMasse } from './figuren'
import { SoldatenMasse, type SoldatEintrag } from './soldaten'
import { FIGUREN } from './balance3d'
import { bossFreieAufstellung } from './bosse'
import type { Welt } from './szene'
import type { WasserStufe } from './wasser'
import { SpielLauf, WeltDarstellung, hatKontakt } from './lauf'
import type { Zustand } from './rechnung'
import { LEVELS } from './balance3d'
import { speichereLetzteMessung } from './info'

export const MESSSTUFEN = [
  {name:'Vollast ohne Bosse',dauer:30000,mini:false,elite:false},
  {name:'Vollast + Mini-Boss',dauer:30000,mini:true,elite:false},
  {name:'Vollast + beide Bosse',dauer:30000,mini:true,elite:true},
  ...[1,2,3].map(minute=>({name:`Dauertest 3 min · Minute ${minute}`,dauer:60000,mini:true,elite:true})),
  {name:'Lauf (Bot)',dauer:60000,mini:true,elite:true},
] as const

type Phase = 'warm' | 'messen' | 'umbau'
interface Lauf {
  welt: Welt
  renderer: THREE.WebGLRenderer
  game: Phaser.Game
  anzeige: HTMLElement
  knopf: HTMLButtonElement
  original: WasserStufe
  stufe: number
  phase: Phase
  zeit: number
  bilder: number[]
  ergebnisse: string[]
  schwarz: number | null
  messpunktZ: number
  vollast: ZombieMasse
  soldaten: SoldatenMasse
  sichtbarkeiten: Map<THREE.Object3D, boolean>
  bossSichtbar: [boolean,boolean]
  bot: SpielLauf | null
  botSteuerung: MessBotSteuerung
  maxDrawCalls: number
  beiErgebnis: (offen: boolean) => void
}
let lauf: Lauf | null = null

export function zeigeMessErgebnis(anzeige: HTMLElement, ergebnis: string, beiErgebnis: (offen: boolean) => void): void {
  speichereLetzteMessung(ergebnis)
  const schliessen = document.createElement('button')
  schliessen.textContent = 'SCHLIESSEN'
  Object.assign(schliessen.style, { display: 'block', minWidth: '44px', minHeight: '44px', marginBottom: '8px', touchAction: 'manipulation' })
  schliessen.addEventListener('click', () => {
    anzeige.style.display = 'none'
    anzeige.style.pointerEvents = 'none'
    beiErgebnis(false)
  })
  const inhalt = document.createElement('div')
  inhalt.textContent = ergebnis
  anzeige.replaceChildren(schliessen, inhalt)
  Object.assign(anzeige.style, { display: 'block', pointerEvents: 'auto', touchAction: 'pan-y', overflowY: 'auto', overscrollBehavior: 'contain' })
  anzeige.scrollTop = 0
  beiErgebnis(true)
}

export function bereiteMessAnzeige(anzeige: HTMLElement): void {
  anzeige.style.display = 'block'
  anzeige.style.overflowY = 'auto'
  anzeige.style.pointerEvents = 'none'
  anzeige.textContent = 'Aufwärmen · Wasser 1 · 5 s'
}

// Gleiche Zustandsfolge wie rhythmusSaeule(60) in scripts/bots3d.ts.
export class MessBotSteuerung {
  private phase: 'links' | 'mitte' | 'rechts' = 'links'
  private vorratNummer = 0
  private saeulenIndex = 0
  ziel(z: Zustand): number {
    if (this.phase === 'links' && z.T >= 60) {
      this.vorratNummer++
      this.phase = this.vorratNummer % 2 === 0 && z.P !== null ? 'rechts' : 'mitte'
      this.saeulenIndex = z.saeulenIndex
    } else if (this.phase === 'mitte' && z.T < 2) this.phase = 'links'
    else if (this.phase === 'rechts' && z.saeulenIndex !== this.saeulenIndex) this.phase = 'mitte'
    return this.phase === 'links' ? -3 : this.phase === 'rechts' ? 3 : 0
  }
}

function starteBot(l: Lauf): void {
  l.vollast.gruppe.visible = false
  l.soldaten.gruppe.visible = false
  for (const gruppe of [l.welt.truppe.gruppe, l.welt.laufTrupp.gruppe, l.welt.front.gruppe, l.welt.zombieMasse.gruppe, l.welt.wand.parent]) if (gruppe) gruppe.visible = true
  l.botSteuerung = new MessBotSteuerung()
  l.bot = new SpielLauf(LEVELS[0], 12345, new WeltDarstellung(l.welt))
}

function schwarzAnteil(l: Lauf): number | null {
  const gl = l.renderer.getContext()
  const p = new THREE.Vector3(0, FIGUREN.ZOMBIE_HOEHE / 2, l.messpunktZ).project(l.welt.camera)
  const x = Math.round((p.x + 1) / 2 * gl.drawingBufferWidth) - 20
  const y = Math.round((p.y + 1) / 2 * gl.drawingBufferHeight) - 20
  if (x < 0 || y < 0 || x + 41 > gl.drawingBufferWidth || y + 41 > gl.drawingBufferHeight) return null
  const pixel = new Uint8Array(41 * 41 * 4)
  gl.readPixels(x, y, 41, 41, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  let dunkel = 0
  for (let i = 0; i < pixel.length; i += 4) if ((pixel[i] + pixel[i + 1] + pixel[i + 2]) / 3 < 30) dunkel++
  return dunkel / (41 * 41) * 100
}

function groessen(l: Lauf) {
  const texturen = new Set<THREE.Texture>(l.welt.bemalungen)
  const add = (wert: unknown) => { if (wert instanceof THREE.Texture) texturen.add(wert) }
  l.welt.scene.traverse(obj => {
    if (!(obj instanceof THREE.Mesh)) return
    for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
      Object.values(mat).forEach(add)
      if (mat instanceof THREE.ShaderMaterial) Object.values(mat.uniforms).forEach(u => add(u.value))
    }
  })
  if (l.welt.wasser.pmremZiel) texturen.delete(l.welt.wasser.pmremZiel.texture)
  if (l.welt.wasser.spiegelZiel) texturen.delete(l.welt.wasser.spiegelZiel.texture)
  const bilder: Bildgroesse[] = [...texturen].map(t => {
    const bild = t.image as { width?: number; height?: number } | undefined
    return { width: bild?.width || 0, height: bild?.height || 0 }
  })
  const renderflaechen = [l.renderer.domElement, l.game.canvas].map(c => ({ width: c.width, height: c.height }))
  const phaserBilder: Bildgroesse[] = []
  if (l.game.textures.list) Object.values(l.game.textures.list).forEach(texture => {
    for (const source of texture.source) phaserBilder.push({ width: source.width, height: source.height })
  })
  const grund = speicherMB(bilder, renderflaechen, phaserBilder)
  const zusatz = ((l.welt.wasser.pmremZiel ? pmremPufferBytes(l.welt.wasser.pmremZiel) : 0)
    + (l.welt.wasser.spiegelZiel ? spiegelPufferBytes(l.welt.wasser.spiegelZiel) : 0)) / 1048576
  return { ...grund, zusatz, gesamt: grund.bemalungen + zusatz }
}

export function starteMessung(welt: Welt, renderer: THREE.WebGLRenderer, game: Phaser.Game, anzeige: HTMLElement, knopf: HTMLButtonElement, beiErgebnis: (offen: boolean) => void = () => {}): void {
  if (lauf) return
  beiErgebnis(false)
  const vollast = new ZombieMasse(welt.zombieBau, welt.zombieBau.materialien, FIGUREN.ZOMBIES_SICHTBAR_MAX)
  const aufstellung = bossFreieAufstellung(FIGUREN.ZOMBIES_SICHTBAR_MAX, -15, FIGUREN.MINIBOSS_FREIRADIUS, 49183)
  vollast.setze(aufstellung)
  const messpunktZ = (Math.min(...aufstellung.map(z => z.z)) + Math.max(...aufstellung.map(z => z.z))) / 2
  const soldaten = new SoldatenMasse(welt.soldatBau)
  const liste:SoldatEintrag[]=Array.from({length:FIGUREN.SOLDATEN_SICHTBAR_MAX},(_,i)=>({x:(i%10-4.5)*.6,z:Math.floor(i/10)*.6,dreh:0,bewegung:'laufen'}))
  soldaten.setze(liste)
  welt.scene.add(vollast.gruppe, soldaten.gruppe)
  const sichtbarkeiten = new Map(welt.laufGruppen.map(obj => [obj, obj.visible]))
  welt.laufGruppen.forEach(obj => { obj.visible = false })
  const original = welt.wasser.stufe
  const bossSichtbar:[boolean,boolean]=[welt.miniboss.objekt.visible,welt.eliteboss.objekt.visible]
  welt.miniboss.objekt.visible=false;welt.eliteboss.objekt.visible=false
  welt.wasser.wechsle(1)
  lauf = { welt, renderer, game, anzeige, knopf, original, stufe: 0, phase: 'warm', zeit: 0, bilder: [], ergebnisse: [], schwarz: null, messpunktZ, vollast, soldaten, sichtbarkeiten,bossSichtbar,bot:null,botSteuerung:new MessBotSteuerung(),maxDrawCalls:0,beiErgebnis }
  knopf.disabled = true
  bereiteMessAnzeige(anzeige)
}

export function messBild(dt: number, jetzt: number): void {
  const l = lauf
  if (!l) return
  l.soldaten.aktualisiere(jetzt)
  l.vollast.aktualisiere(jetzt)
  const sek = Number.isFinite(dt) ? Math.max(0, Math.min(.1, dt / 1000)) : 0
  l.welt.miniboss.aktualisiere(sek)
  l.welt.eliteboss.aktualisiere(sek)
  if (l.phase === 'messen' && l.bot && hatKontakt(l.bot.zustand)) l.maxDrawCalls = Math.max(l.maxDrawCalls, l.renderer.info.render.calls)
  if (l.phase === 'messen' && l.bot && Number.isFinite(dt) && dt > 0) {
    l.bot.schritt(sek, l.botSteuerung.ziel(l.bot.zustand))
    l.welt.truppe.aktualisiere(l.bot.zustand.t)
    l.welt.laufTrupp.aktualisiere(l.bot.zustand.t)
    l.welt.front.aktualisiere(l.bot.zustand.t)
    l.welt.zombieMasse.aktualisiere(l.bot.zustand.t)
  }
  // Der Aufrufer zeichnet unmittelbar vor dieser Funktion: Probe am Ende jeder Stufe/Minute.
  if (l.phase === 'messen' && l.schwarz === null && l.zeit >= MESSSTUFEN[l.stufe].dauer-1000) l.schwarz = schwarzAnteil(l)
  l.zeit += Math.max(0, dt)
  if (l.phase === 'messen') l.bilder.push(dt)
  const dauer = l.phase === 'warm' ? 5000 : l.phase === 'umbau' ? 2000 : MESSSTUFEN[l.stufe].dauer
  if (l.zeit < dauer) return
  if (l.phase === 'warm' || l.phase === 'umbau') {
    l.phase = 'messen'; l.zeit = 0; l.bilder = []; l.schwarz = null
    if (MESSSTUFEN[l.stufe].name === 'Lauf (Bot)') starteBot(l)
    l.anzeige.textContent = `${l.ergebnisse.join('\n\n')}\n${MESSSTUFEN[l.stufe].name} · ${dauer===5000?30:MESSSTUFEN[l.stufe].dauer/1000} s`
    return
  }
  const a = auswerten(l.bilder)
  const mb = groessen(l)
  l.ergebnisse.push(`${MESSSTUFEN[l.stufe].name}: ${a.fps?.toFixed(1) ?? '–'} fps · langsamste 5 % ${a.p95?.toFixed(1) ?? '–'} ms · Schwarz ${l.schwarz === null ? '–' : `${l.schwarz.toFixed(1)} %`} · >250 ms: ${a.verworfen}\nBacken Soldat: ${l.welt.soldatBau.backzeitMs.toFixed(1)} ms · Bemalungen inkl. Bosse ${mb.bemalungen.toFixed(2)} MB · Wasserpuffer ${mb.zusatz.toFixed(2)} MB · Renderflächen ${mb.renderflaechen.toFixed(2)} MB · Phaser-Rest ${mb.phaserRest.toFixed(2)} MB · Speicherplan ${mb.gesamt.toFixed(2)} MB · Geometrien ${l.renderer.info.memory.geometries} · Texturen ${l.renderer.info.memory.textures}${l.bot ? `\nProtokoll: ${l.bot.protokollFehler ?? `ok (nach ${l.bot.zustand.t.toFixed(1)} s)`} · Draw Calls (max): ${l.maxDrawCalls}` : ''}\n${urteil(a, l.schwarz, mb.gesamt)}`)
  if (l.stufe === MESSSTUFEN.length - 1) {
    const ergebnis = l.ergebnisse.join('\n\n')
    bricheAb()
    zeigeMessErgebnis(l.anzeige, ergebnis, l.beiErgebnis)
    return
  }
  l.stufe++
  l.welt.miniboss.objekt.visible=MESSSTUFEN[l.stufe].mini
  l.welt.eliteboss.objekt.visible=MESSSTUFEN[l.stufe].elite
  l.phase = 'umbau'; l.zeit = 0; l.bilder = []; l.schwarz = null
  l.anzeige.textContent = `${l.ergebnisse.join('\n\n')}\n${MESSSTUFEN[l.stufe].name} · Pause · 2 s`
}

export function bricheAb(grund?: string, wiederherstellen = true): void {
  if (!lauf) return
  const l = lauf
  lauf = null
  l.bot?.gibLaufFrei()
  l.welt.scene.remove(l.vollast.gruppe, l.soldaten.gruppe)
  l.vollast.gibNetzeFrei()
  l.soldaten.gibNetzeFrei()
  l.sichtbarkeiten.forEach((sichtbar,obj) => { obj.visible = sichtbar })
  l.welt.miniboss.objekt.visible=l.bossSichtbar[0];l.welt.eliteboss.objekt.visible=l.bossSichtbar[1]
  if (wiederherstellen) l.welt.wasser.wechsle(l.original)
  l.knopf.disabled = false
  if (grund) zeigeMessErgebnis(l.anzeige, [...l.ergebnisse, grund].join('\n\n'), l.beiErgebnis)
}

export function messungLaeuft(): boolean { return lauf !== null }
