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
  variant?: 'mobile' | 'desktop'
  isDraft?: boolean
}

export function TimeBlock({
  entry, topPx, heightPx, timezone, category, activity, onClick,
  variant = 'mobile', isDraft = false,
}: Props) {
  const color = category?.color ?? '#94a3b8'
  const label = activity?.name ?? entry.note ?? category?.name ?? '—'
  const startStr = toTimeString(parseUTC(entry.started_at), timezone)
  const endStr = toTimeString(parseUTC(entry.ended_at), timezone)
  const mins = durationMinutes(entry.started_at, entry.ended_at)
  const tall = heightPx >= 56
  const showLabel = heightPx >= 20

  if (variant === 'desktop') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'absolute left-0 right-0 box-border rounded-[10px] overflow-hidden text-left transition-opacity active:opacity-80',
          isDraft && 'cursor-default',
        )}
        style={{
          top: topPx + 1,
          height: Math.max(heightPx - 2, 14),
          background: `color-mix(in oklab, ${color} 16%, var(--card))`,
          border: isDraft
            ? `1.5px dashed ${color}`
            : `1px solid color-mix(in oklab, ${color} 45%, transparent)`,
          boxShadow: isDraft ? `0 0 0 4px color-mix(in oklab, ${color} 18%, transparent)` : undefined,
          zIndex: isDraft ? 2 : 1,
        }}
        aria-label={`${label} ${startStr}–${endStr}`}
      >
        {tall ? (
          <div className="px-3.5 py-2.5 flex flex-col gap-1">
            <span className="flex items-center gap-2 font-semibold text-sm text-[var(--foreground)]">
              <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              {label}
              {isDraft && (
                <span className="ml-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--foreground)] text-[var(--background)]">
                  Черновик
                </span>
              )}
            </span>
            {showLabel && (
              <span className="font-mono text-xs text-[var(--muted-foreground)]">
                {category?.name ?? '—'} · {startStr}–{endStr} · {formatDuration(mins)}
              </span>
            )}
          </div>
        ) : (
          <div className="px-3.5 h-full flex items-center gap-2">
            <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            <span className="font-semibold text-[13px] text-[var(--foreground)] truncate">{label}</span>
            <span className="ml-auto shrink-0 font-mono text-xs text-[var(--muted-foreground)]">{startStr}–{endStr}</span>
          </div>
        )}
      </button>
    )
  }

  // Mobile variant
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
