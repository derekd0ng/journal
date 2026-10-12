import { db } from './schema'
import type {
  Category, Activity, TimeEntry, Task,
  Habit, HabitCheck, Settings,
} from './schema'

const BACKUP_VERSION = 1

export interface BackupData {
  backup_version: number
  db_version: number
  exported_at: string
  categories: Category[]
  activities: Activity[]
  time_entries: TimeEntry[]
  tasks: Task[]
  habits: Habit[]
  habit_checks: HabitCheck[]
  settings: Settings[]
}

export async function exportBackup(): Promise<BackupData> {
  const [categories, activities, time_entries, tasks, habits, habit_checks, settings] =
    await Promise.all([
      db.categories.toArray(),
      db.activities.toArray(),
      db.time_entries.toArray(),
      db.tasks.toArray(),
      db.habits.toArray(),
      db.habit_checks.toArray(),
      db.settings.toArray(),
    ])

  return {
    backup_version: BACKUP_VERSION,
    db_version: db.verno,
    exported_at: new Date().toISOString(),
    categories,
    activities,
    time_entries,
    tasks,
    habits,
    habit_checks,
    settings,
  }
}

export function downloadBackup(data: BackupData): void {
  const date = new Date(data.exported_at).toISOString().slice(0, 10)
  const filename = `daylog-backup-${date}.json`
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface ImportResult {
  ok: boolean
  error?: string
  counts?: Record<string, number>
}

export async function importBackup(json: unknown): Promise<ImportResult> {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return { ok: false, error: 'Файл повреждён: ожидается JSON-объект' }
  }

  const data = json as Record<string, unknown>

  if (data.backup_version !== BACKUP_VERSION) {
    return { ok: false, error: `Неподдерживаемая версия бэкапа: ${String(data.backup_version)}` }
  }

  const tables: (keyof BackupData)[] = [
    'categories', 'activities', 'time_entries',
    'tasks', 'habits', 'habit_checks', 'settings',
  ]

  for (const t of tables) {
    if (!Array.isArray(data[t])) {
      return { ok: false, error: `Файл повреждён: отсутствует поле "${t}"` }
    }
  }

  await db.transaction(
    'rw',
    [db.categories, db.activities, db.time_entries, db.tasks, db.habits, db.habit_checks, db.settings],
    async () => {
      await db.categories.clear()
      await db.activities.clear()
      await db.time_entries.clear()
      await db.tasks.clear()
      await db.habits.clear()
      await db.habit_checks.clear()
      await db.settings.clear()

      await db.categories.bulkPut(data.categories as Category[])
      await db.activities.bulkPut(data.activities as Activity[])
      await db.time_entries.bulkPut(data.time_entries as TimeEntry[])
      await db.tasks.bulkPut(data.tasks as Task[])
      await db.habits.bulkPut(data.habits as Habit[])
      await db.habit_checks.bulkPut(data.habit_checks as HabitCheck[])
      await db.settings.bulkPut(data.settings as Settings[])
    },
  )

  return {
    ok: true,
    counts: {
      categories: (data.categories as unknown[]).length,
      activities: (data.activities as unknown[]).length,
      time_entries: (data.time_entries as unknown[]).length,
      tasks: (data.tasks as unknown[]).length,
      habits: (data.habits as unknown[]).length,
      habit_checks: (data.habit_checks as unknown[]).length,
    },
  }
}
