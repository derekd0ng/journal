import { toTimeString, durationMinutes, parseUTC } from 'lib/time'

interface Props {
  startMs: number
  endMs: number
  topPx: number
  heightPx: number
  timezone: string
  onClick: () => void
}

export function GapBlock({ startMs, endMs, topPx, heightPx, timezone, onClick }: Props) {
  const startISO = new Date(startMs).toISOString()
  const endISO = new Date(endMs).toISOString()
  const mins = durationMinutes(startISO, endISO)
  const showLabel = heightPx >= 32

  return (
    <button
      onClick={onClick}
      className="absolute left-14 right-1 rounded-sm bg-[var(--muted)] border border-dashed border-[var(--border)] text-left px-2 overflow-hidden transition-opacity active:opacity-70"
      style={{ top: topPx, height: Math.max(heightPx, 20) }}
      aria-label={`Не учтено с ${toTimeString(parseUTC(startISO), timezone)}`}
    >
      {showLabel && (
        <span className="block text-xs text-[var(--muted-foreground)] truncate">
          {toTimeString(parseUTC(startISO), timezone)} — не учтено{mins >= 30 ? ` (${formatDuration(mins)})` : ''}
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
