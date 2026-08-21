export interface RectangleBounds {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

export interface FigureHitbox {
  readonly sprite: {
    readonly active: boolean
    readonly visible: boolean
    getBounds(): RectangleBounds
  }
}

export function rectanglesOverlap(first: RectangleBounds, second: RectangleBounds): boolean {
  return first.left < second.right
    && first.right > second.left
    && first.top < second.bottom
    && first.bottom > second.top
}

export function overlapsVisibleFigure(rect: RectangleBounds, figures: Iterable<FigureHitbox>): boolean {
  for (const figure of figures) {
    const { sprite } = figure
    if (sprite.active && sprite.visible && rectanglesOverlap(sprite.getBounds(), rect)) return true
  }
  return false
}
