import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import type { Activity, Category } from '@/db/schema'

export interface ActivityWithCategory extends Activity {
  category: Category | undefined
}

export function usePresets(): ActivityWithCategory[] | undefined {
  return useLiveQuery(async () => {
    const [activities, categories] = await Promise.all([
      db.activities.where('archived').equals(0).toArray(),
      db.categories.toArray(),
    ])
    const catMap = new Map(categories.map(c => [c.id, c]))
    return activities
      .filter(a => a.is_preset)
      .sort((a, b) => {
        const cA = catMap.get(a.category_id)?.sort_order ?? 99
        const cB = catMap.get(b.category_id)?.sort_order ?? 99
        return cA !== cB ? cA - cB : a.sort_order - b.sort_order
      })
      .map(a => ({ ...a, category: catMap.get(a.category_id) }))
  })
}
