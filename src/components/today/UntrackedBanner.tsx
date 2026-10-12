import { toTimeString, durationMinutes, parseUTC } from 'lib/time'
import type { ActivityWithCategory } from '@/hooks/usePresets'

interface Props {
  lastGapStartISO: string
  nowDate: Date
  presets: ActivityWithCategory[]
  onPresetTap: (preset: ActivityWithCategory) => void
  onBannerTap: () => void
}

export function UntrackedBanner({ lastGapStartISO, nowDate, presets, onPresetTap, onBannerTap }: Props) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const startTime = toTimeString(parseUTC(lastGapStartISO), timezone)
  const mins = Math.floor(durationMinutes(lastGapStartISO, nowDate.toISOString()))
  const durationLabel = mins < 60
    ? `${mins}м`
    : `${Math.floor(mins / 60)}ч ${mins % 60 > 0 ? `${mins % 60}м` : ''}`

  return (
    <div className="mx-4 mb-3 rounded-xl bg-[var(--muted)] border border-[var(--border)] overflow-hidden">
      <button
        onClick={onBannerTap}
        className="w-full text-left px-4 py-3 active:opacity-70"
      >
        <p className="text-sm font-medium">
          С {startTime} не учтено
          <span className="ml-2 text-[var(--muted-foreground)] font-normal">{durationLabel}</span>
        </p>
      </button>

      {presets.length > 0 && (
        <div className="px-3 pb-3 flex flex-wrap gap-2">
          {presets.map(preset => (
            <button
              key={preset.id}
              onClick={() => onPresetTap(preset)}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-white active:opacity-70 transition-opacity"
              style={{ backgroundColor: preset.category?.color ?? '#94a3b8' }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
