import { db } from './schema'
import type { TimeEntry } from './schema'

export type NewTimeEntry = Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>

export interface ConflictInfo {
  conflicting: TimeEntry[]
}

/** Returns entries overlapping the given [start, end) interval, excluding `excludeId`. */
export async function findOverlapping(
  startedAt: string,
  endedAt: string,
  excludeId?: string
): Promise<TimeEntry[]> {
  const all = await db.time_entries
    .where('started_at')
    .below(endedAt)
    .toArray()

  return all.filter(e => {
    if (excludeId && e.id === excludeId) return false
    return e.ended_at > startedAt
  })
}

export async function getEntriesForRange(fromISO: string, toISO: string): Promise<TimeEntry[]> {
  const results = await db.time_entries
    .where('started_at')
    .between(fromISO, toISO, true, false)
    .toArray()
  const crossBoundary = await db.time_entries
    .where('started_at')
    .below(fromISO)
    .filter(e => e.ended_at > fromISO)
    .toArray()
  return [...crossBoundary, ...results].sort((a, b) =>
    a.started_at.localeCompare(b.started_at)
  )
}

export async function addTimeEntry(entry: NewTimeEntry): Promise<{ id: string } | ConflictInfo> {
  const overlapping = await findOverlapping(entry.started_at, entry.ended_at)
  if (overlapping.length > 0) return { conflicting: overlapping }

  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await db.time_entries.add({ ...entry, id, created_at: now, updated_at: now })
  return { id }
}

export async function updateTimeEntry(
  id: string,
  patch: Partial<NewTimeEntry>
): Promise<{ ok: true } | ConflictInfo> {
  const entry = await db.time_entries.get(id)
  if (!entry) throw new Error(`TimeEntry ${id} not found`)

  const merged = { ...entry, ...patch }
  const overlapping = await findOverlapping(merged.started_at, merged.ended_at, id)
  if (overlapping.length > 0) return { conflicting: overlapping }

  await db.time_entries.update(id, { ...patch, updated_at: new Date().toISOString() })
  return { ok: true }
}

export async function deleteTimeEntry(id: string): Promise<void> {
  await db.time_entries.delete(id)
}
