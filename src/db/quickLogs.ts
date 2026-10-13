import { db } from './schema'
import type { QuickLog } from './schema'

export async function getQuickLogsByDate(date: string): Promise<QuickLog[]> {
  return db.quick_logs.where('date').equals(date).sortBy('created_at')
}

export async function addQuickLog(
  date: string,
  title: string,
  durationMinutes?: number,
): Promise<void> {
  await db.quick_logs.add({
    id: crypto.randomUUID(),
    date,
    title,
    duration_minutes: durationMinutes,
    created_at: new Date().toISOString(),
  })
}

export async function deleteQuickLog(id: string): Promise<void> {
  await db.quick_logs.delete(id)
}
