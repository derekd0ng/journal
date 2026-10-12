import { db } from './schema'
import type { Category, Activity } from './schema'

export async function getCategories(includeArchived = false): Promise<Category[]> {
  const q = includeArchived
    ? db.categories.orderBy('sort_order')
    : db.categories.where('archived').equals(0)
  return q.toArray()
}

export async function getActivities(categoryId?: string, includeArchived = false): Promise<Activity[]> {
  const q = db.activities.filter(
    a => (includeArchived || !a.archived) && (categoryId == null || a.category_id === categoryId)
  )
  const results = await q.toArray()
  return results.sort((a, b) => a.sort_order - b.sort_order)
}

export async function getPresetActivities(): Promise<Activity[]> {
  const results = await db.activities.where('archived').equals(0).toArray()
  return results.filter(a => a.is_preset).sort((a, b) => a.sort_order - b.sort_order)
}

export async function upsertCategory(category: Omit<Category, 'created_at' | 'updated_at'> & { id?: string }): Promise<string> {
  const now = new Date().toISOString()
  const id = category.id ?? crypto.randomUUID()
  await db.categories.put({ ...category, id, created_at: now, updated_at: now })
  return id
}

export async function upsertActivity(activity: Omit<Activity, 'created_at' | 'updated_at'> & { id?: string }): Promise<string> {
  const now = new Date().toISOString()
  const id = activity.id ?? crypto.randomUUID()
  await db.activities.put({ ...activity, id, created_at: now, updated_at: now })
  return id
}
