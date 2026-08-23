// Dauerhafter Speicher: Ohne ihn darf iOS den Spielstand (Bestenliste, Münzen) bei
// Platzmangel löschen. Die Anfrage ist ein Vorschlag an den Browser, keine Garantie -
// der Rückgabewert sagt nur, ob er sie angenommen hat.
//
// Das Abo-System (onPersistentStorageStatusChanged plus die listeners-Menge) ist am
// 2026-08-23 in W6 entfernt worden: Es hat nie jemand abonniert. Der Status wird an der
// einen Stelle, die ihn braucht, direkt gelesen.
let persistentStorageGranted = false

export function requestPersistentStorage(): void {
  const storage = navigator.storage
  if (storage?.persist === undefined) return

  void storage.persist()
    .then((granted) => { persistentStorageGranted = granted })
    .catch(() => undefined)
}

export async function readPersistentStorageStatus(): Promise<boolean> {
  const storage = navigator.storage
  if (storage?.persisted === undefined) return persistentStorageGranted

  try {
    persistentStorageGranted = await storage.persisted()
  } catch {
    // Older browsers and private modes may reject this check; the menu must still work.
  }
  return persistentStorageGranted
}
