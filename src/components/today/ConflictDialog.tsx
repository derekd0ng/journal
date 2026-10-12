import type { TimeEntry, Activity, Category } from '@/db/schema'
import { toTimeString, parseUTC } from 'lib/time'

interface Props {
  conflicting: TimeEntry[]
  activityMap: Map<string, Activity>
  categoryMap: Map<string, Category>
  timezone: string
  onTrim: () => void
  onCancel: () => void
}

export function ConflictDialog({ conflicting, activityMap, categoryMap, timezone, onTrim, onCancel }: Props) {
  const entry = conflicting[0]
  if (!entry) return null

  const name = entry.activity_id
    ? (activityMap.get(entry.activity_id)?.name ?? '—')
    : (entry.category_id ? (categoryMap.get(entry.category_id)?.name ?? '—') : '—')

  const start = toTimeString(parseUTC(entry.started_at), timezone)
  const end = toTimeString(parseUTC(entry.ended_at), timezone)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-[var(--background)] border border-[var(--border)] rounded-2xl p-5 w-full max-w-sm shadow-xl">
        <h2 className="text-base font-semibold mb-2">Пересечение интервалов</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-5">
          Новая запись перекрывается с «{name}» ({start}–{end}).
          Обрезать существующую запись до начала новой?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium active:opacity-70"
          >
            Отменить
          </button>
          <button
            onClick={onTrim}
            className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium active:opacity-70"
          >
            Обрезать
          </button>
        </div>
      </div>
    </div>
  )
}
