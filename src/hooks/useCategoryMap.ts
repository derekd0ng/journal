import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import type { Category, Activity } from '@/db/schema'

export function useCategoryMap(): Map<string, Category> | undefined {
  return useLiveQuery(async () => {
    const cats = await db.categories.toArray()
    return new Map(cats.map(c => [c.id, c]))
  })
}

export function useActivityMap(): Map<string, Activity> | undefined {
  return useLiveQuery(async () => {
    const acts = await db.activities.toArray()
    return new Map(acts.map(a => [a.id, a]))
  })
}
