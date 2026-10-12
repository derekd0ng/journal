import type { TimeEntry, Category, Activity } from '@/db/schema'
import { toTimeString, durationMinutes, parseUTC } from 'lib/time'
import { cn } from '@/lib/utils'

interface Props {
  entry: TimeEntry
  topPx: number
  heightPx: number
  timezone: string
  category?: Category
  activity?: Activity
  onClick: () => void
}

export function TimeBlock({ entry, topPx, heightPx, timezone, category, activity, onClick }: Props) {
  const color = category?.color ?? '#94a3b8'
  const label = activity?.name ?? category?.name ?? '—'
  const startStr = toTimeString(parseUTC(entry.started_at), timezone)
  const endStr = toTimeString(parseUTC(entry.ended_at), timezone)
  const mins = durationMinutes(entry.started_at, entry.ended_at)
  const showLabel = heightPx >= 28

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute left-14 right-1 rounded-sm text-white text-left px-2 overflow-hidden',
        'transition-opacity active:opacity-70',
      )}
      style={{ top: topPx, height: Math.max(heightPx, 20), backgroundColor: color }}
      aria-label={`${label} ${startStr}–${endStr}`}
    >
      {showLabel && (
        <span className="block text-xs font-medium leading-tight truncate">
          {label}
          {mins >= 30 && <span className="opacity-75 ml-1">{formatDuration(mins)}</span>}
        </span>
      )}
    </button>
  )
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}м`
  if (m === 0) return `${h}ч`
  return `${h}ч ${m}м`
}
