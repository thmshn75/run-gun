import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getGateLanes, getLabelScale } from '../src/systems/gateLanes'
import { getRoadHalfWidth } from '../src/systems/roadGeometry'

const gatesSource = readFileSync(new URL('../src/systems/gates.ts', import.meta.url), 'utf8')

describe('weapon gate presentation', () => {
  it('fits labels inside two- and three-lane gates from the horizon through the decision point', () => {
    const horizonRoadWidth = getRoadHalfWidth(390, 844, 150) * 2
    const decisionRoadWidth = getRoadHalfWidth(390, 844, 679) * 2
    const horizonLaneWidth = getGateLanes(3, 390 / 2, horizonRoadWidth, BALANCE.gates.gapBetween)[0].width
    const decisionLaneWidth = getGateLanes(3, 390 / 2, decisionRoadWidth, BALANCE.gates.gapBetween)[0].width

    expect(getLabelScale(86, horizonLaneWidth, BALANCE.gates.labelInsetPx)).toBeLessThan(1)
    expect(getLabelScale(86, decisionLaneWidth, BALANCE.gates.labelInsetPx)).toBe(1)
    for (const roadWidth of [horizonRoadWidth, decisionRoadWidth]) {
      for (const laneCount of [2, 3] as const) {
        const laneWidth = getGateLanes(laneCount, 390 / 2, roadWidth, BALANCE.gates.gapBetween)[0].width
        const scale = getLabelScale(86, laneWidth, BALANCE.gates.labelInsetPx)
        expect(86 * scale).toBeLessThanOrEqual(laneWidth - BALANCE.gates.labelInsetPx)
      }
    }
    expect(getLabelScale(0, horizonLaneWidth, BALANCE.gates.labelInsetPx)).toBe(1)
  })

  it('increases a label scale when the same label is given a wider lane', () => {
    const narrowWidth = getGateLanes(3, 390 / 2, getRoadHalfWidth(390, 844, 150) * 2, BALANCE.gates.gapBetween)[0].width
    const wideWidth = getGateLanes(3, 390 / 2, getRoadHalfWidth(390, 844, 679) * 2, BALANCE.gates.gapBetween)[0].width
    const narrowScale = getLabelScale(86, narrowWidth, BALANCE.gates.labelInsetPx)
    const wideScale = getLabelScale(86, wideWidth, BALANCE.gates.labelInsetPx)

    expect(wideScale).toBeGreaterThanOrEqual(narrowScale)
  })

  it('creates weapon icons only in the fixed group pool', () => {
    const createGroupStart = gatesSource.indexOf('  private createGroup(): GateGroup')
    const createGroupEnd = gatesSource.indexOf('  private spawn(): void')
    const outsidePoolFactory = gatesSource.slice(0, createGroupStart) + gatesSource.slice(createGroupEnd)

    expect(outsidePoolFactory).not.toContain('this.scene.add.image')
  })
})
