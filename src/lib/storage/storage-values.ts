import { STORAGE_INSTANCE } from '@/lib/storage/storage-instance'

// Plasmo serializes values as JSON strings. Commit related keys in one browser
// storage operation so closing the popup cannot leave half of a preset saved.
export async function saveStorageValues(values: Record<string, unknown>) {
  const entries = await Promise.all(
    Object.entries(values).map(async ([key, value]) => {
      const stored = await STORAGE_INSTANCE.get(key)
      return JSON.stringify(stored) === JSON.stringify(value)
        ? null
        : ([
            STORAGE_INSTANCE.getNamespacedKey(key),
            JSON.stringify(value)
          ] as const)
    })
  )
  const changed = entries.filter(
    (entry): entry is readonly [string, string] => entry !== null
  )
  if (changed.length === 0) return

  await STORAGE_INSTANCE.primaryClient.set(Object.fromEntries(changed))
  // Extension reads use primary storage. Keep Plasmo's optional local copies
  // current after the browser has accepted the entire update.
  for (const [key, value] of changed) {
    if (!STORAGE_INSTANCE.isCopied(key)) continue
    try {
      STORAGE_INSTANCE.secondaryClient?.setItem(key, value)
    } catch {
      // A full local mirror must not report failure for an accepted sync write.
    }
  }
}
