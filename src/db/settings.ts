import { db } from './schema'
import type { Settings } from './schema'

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(1)
  if (!s) throw new Error('Settings not found — run seedIfEmpty() first')
  return s
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  await db.settings.update(1, { ...patch, updated_at: new Date().toISOString() })
}
