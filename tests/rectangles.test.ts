import { describe, expect, it } from 'vitest'
import { overlapsVisibleFigure, rectanglesOverlap, type FigureHitbox } from '../src/systems/rectangles'

const figure = { left: 100, right: 134, top: 200, bottom: 246 }

describe('figure collision rectangles', () => {
  it('counts a rectangle that actually reaches a figure', () => {
    expect(rectanglesOverlap(figure, { left: 130, right: 138, top: 220, bottom: 236 })).toBe(true)
  })

  it('rejects an object that is inside the coarse hull but outside a figure', () => {
    expect(rectanglesOverlap(figure, { left: 135, right: 143, top: 220, bottom: 236 })).toBe(false)
  })

  it('does not count edge-only contact as an overlap', () => {
    expect(rectanglesOverlap(figure, { left: 134, right: 142, top: 220, bottom: 236 })).toBe(false)
  })

  it('only considers active, visible figures', () => {
    const projectile = { left: 110, right: 118, top: 220, bottom: 236 }
    let inactiveBoundsRead = false
    let hiddenBoundsRead = false
    const figures: FigureHitbox[] = [
      { sprite: { active: false, visible: true, getBounds: () => { inactiveBoundsRead = true; return figure } } },
      { sprite: { active: true, visible: false, getBounds: () => { hiddenBoundsRead = true; return figure } } },
      { sprite: { active: true, visible: true, getBounds: () => figure } },
    ]
    expect(overlapsVisibleFigure(projectile, figures)).toBe(true)
    expect(inactiveBoundsRead).toBe(false)
    expect(hiddenBoundsRead).toBe(false)
  })
})
