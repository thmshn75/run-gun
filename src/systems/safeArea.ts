export type SafeAreaInsets = Readonly<{ top: number; right: number; bottom: number; left: number }>

export function readSafeAreaInsets(canvas: HTMLCanvasElement): SafeAreaInsets {
  const styles = getComputedStyle(canvas)
  const readInset = (name: string): number => Number.parseFloat(styles.getPropertyValue(name)) || 0
  const insets = {
    top: readInset('--safe-area-inset-top'),
    right: readInset('--safe-area-inset-right'),
    bottom: readInset('--safe-area-inset-bottom'),
    left: readInset('--safe-area-inset-left'),
  }
  return insets
}
