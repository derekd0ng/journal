import { toTimeString, durationMinutes, parseUTC } from 'lib/time'

interface Props {
  startMs: number
  endMs: number
  topPx: number
  heightPx: number
  timezone: string
  onClick: () => void
  variant?: 'mobile' | 'desktop'
}

export function GapBlock({ startMs, endMs, topPx, heightPx, timezone, onClick, variant = 'mobile' }: Props) {
  const startISO = new Date(startMs).toISOString()
  const endISO = new Date(endMs).toISOString()
  const mins = durationMinutes(startISO, endISO)
  const startStr = toTimeString(parseUTC(startISO), timezone)
  const endStr = toTimeString(parseUTC(endISO), timezone)
  const tall = heightPx >= 52

  if (variant === 'desktop') {
    return (
      <div
        className="absolute left-0 right-0 box-border rounded-[10px] overflow-hidden"
        style={{
          top: topPx + 1,
          height: Math.max(heightPx - 2, 14),
          border: '1.5px dashed color-mix(in oklab, var(--muted-foreground) 55%, transparent)',
          background: 'color-mix(in oklab, var(--muted) 60%, var(--card))',
          zIndex: 1,
        }}
      >
        <button
          onClick={onClick}
          className="w-full h-full border-0 bg-transparent flex flex-col items-center justify-center gap-1 text-[var(--muted-foreground)] active:opacity-70"
        >
          {tall ? (
            <>
              <span className="flex items-center gap-2 text-[13px] font-medium text-[var(--foreground)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                Не учтено · {formatDuration(mins)}
              </span>
              <span className="font-mono text-xs">{startStr}–{endStr} · нажмите, чтобы заполнить</span>
            </>
          ) : (
            <span className="flex items-center gap-2 text-xs">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              Не учтено · {formatDuration(mins)} · {startStr}–{endStr}
            </span>
          )}
        </button>
      </div>
    )
  }

  // Mobile variant
  const showLabel = heightPx >= 32
  return (
    <button
      onClick={onClick}
      className="absolute left-14 right-1 rounded-sm bg-[var(--muted)] border border-dashed border-[var(--border)] text-left px-2 overflow-hidden transition-opacity active:opacity-70"
      style={{ top: topPx, height: Math.max(heightPx, 20) }}
      aria-label={`Не учтено с ${startStr}`}
    >
      {showLabel && (
        <span className="block text-xs text-[var(--muted-foreground)] truncate">
          {startStr} — не учтено{mins >= 30 ? ` (${formatDuration(mins)})` : ''}
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
