import { db } from './schema'
import type { Category, Activity, Settings } from './schema'

const CATEGORIES: Omit<Category, 'created_at' | 'updated_at'>[] = [
  { id: 'cat-sleep',   name: 'Сон',           color: '#6366f1', kind: 'maintenance', sort_order: 0,  archived: false },
  { id: 'cat-food',    name: 'Еда',            color: '#f59e0b', kind: 'maintenance', sort_order: 1,  archived: false },
  { id: 'cat-transit', name: 'Дорога',         color: '#64748b', kind: 'maintenance', sort_order: 2,  archived: false },
  { id: 'cat-work',    name: 'Работа',         color: '#3b82f6', kind: 'productive',  sort_order: 3,  archived: false },
  { id: 'cat-learn',   name: 'Саморазвитие',   color: '#10b981', kind: 'productive',  sort_order: 4,  archived: false },
  { id: 'cat-chores',  name: 'Быт',            color: '#f97316', kind: 'maintenance', sort_order: 5,  archived: false },
  { id: 'cat-sport',   name: 'Спорт',          color: '#ef4444', kind: 'productive',  sort_order: 6,  archived: false },
  { id: 'cat-social',  name: 'Общение',        color: '#ec4899', kind: 'rest',        sort_order: 7,  archived: false },
  { id: 'cat-leisure', name: 'Развлечения',    color: '#a855f7', kind: 'leisure',     sort_order: 8,  archived: false },
  { id: 'cat-other',   name: 'Прочее',         color: '#94a3b8', kind: 'other',       sort_order: 9,  archived: false },
]

const ACTIVITIES: Omit<Activity, 'created_at' | 'updated_at'>[] = [
  { id: 'act-sleep-night', category_id: 'cat-sleep',   name: 'Ночной сон',   is_preset: true,  sort_order: 0, archived: false },
  { id: 'act-sleep-nap',   category_id: 'cat-sleep',   name: 'Дневной сон',  is_preset: true,  sort_order: 1, archived: false },
  { id: 'act-food-home',   category_id: 'cat-food',    name: 'Дома',         is_preset: true,  sort_order: 0, archived: false },
  { id: 'act-food-cafe',   category_id: 'cat-food',    name: 'Кафе',         is_preset: true,  sort_order: 1, archived: false },
  { id: 'act-metro',       category_id: 'cat-transit', name: 'Метро',        is_preset: true,  sort_order: 0, archived: false },
  { id: 'act-car',         category_id: 'cat-transit', name: 'На машине',    is_preset: true,  sort_order: 1, archived: false },
  { id: 'act-work-deep',   category_id: 'cat-work',    name: 'Глубокая работа', is_preset: true, sort_order: 0, archived: false },
  { id: 'act-work-meet',   category_id: 'cat-work',    name: 'Встречи',      is_preset: true,  sort_order: 1, archived: false },
  { id: 'act-reading',     category_id: 'cat-learn',   name: 'Чтение',       is_preset: true,  sort_order: 0, archived: false },
  { id: 'act-course',      category_id: 'cat-learn',   name: 'Курс',         is_preset: true,  sort_order: 1, archived: false },
  { id: 'act-dota',        category_id: 'cat-leisure', name: 'Dota 2',       is_preset: true,  sort_order: 0, archived: false },
  { id: 'act-youtube',     category_id: 'cat-leisure', name: 'YouTube',      is_preset: true,  sort_order: 1, archived: false },
  { id: 'act-instagram',   category_id: 'cat-leisure', name: 'Instagram',    is_preset: true,  sort_order: 2, archived: false },
  { id: 'act-gym',         category_id: 'cat-sport',   name: 'Зал',          is_preset: true,  sort_order: 0, archived: false },
  { id: 'act-walk',        category_id: 'cat-sport',   name: 'Прогулка',     is_preset: true,  sort_order: 1, archived: false },
]

const DEFAULT_SETTINGS: Settings = {
  id: 1,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow',
  day_start_hour: 0,
  updated_at: new Date().toISOString(),
}

export async function seedIfEmpty(): Promise<void> {
  const count = await db.categories.count()
  if (count > 0) return

  const now = new Date().toISOString()

  await db.transaction('rw', [db.categories, db.activities, db.settings], async () => {
    await db.categories.bulkAdd(
      CATEGORIES.map(c => ({ ...c, created_at: now, updated_at: now }))
    )
    await db.activities.bulkAdd(
      ACTIVITIES.map(a => ({ ...a, created_at: now, updated_at: now }))
    )
    await db.settings.put(DEFAULT_SETTINGS)
  })
}
