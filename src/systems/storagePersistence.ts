let persistentStorageGranted = false
const listeners = new Set<(granted: boolean) => void>()

export function requestPersistentStorage(): void {
  const storage = navigator.storage
  if (storage?.persist === undefined) return

  void storage.persist()
    .then(setPersistentStorageGranted)
    .catch(() => undefined)
}

export async function readPersistentStorageStatus(): Promise<boolean> {
  const storage = navigator.storage
  if (storage?.persisted === undefined) return persistentStorageGranted

  try {
    setPersistentStorageGranted(await storage.persisted())
  } catch {
    // Older browsers and private modes may reject this check; the menu must still work.
  }
  return persistentStorageGranted
}

export function onPersistentStorageStatusChanged(listener: (granted: boolean) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function setPersistentStorageGranted(granted: boolean): void {
  persistentStorageGranted = granted
  listeners.forEach((listener) => listener(granted))
}
