import { useMemo } from 'react'
import { buildTimelineSegments, toTimeString } from 'lib/time'
import { addHours } from 'date-fns'
import type { TimeEntry, Category, Activity } from '@/db/schema'
import { TimeBlock } from './TimeBlock'
import { GapBlock } from './GapBlock'

const HOUR_PX = 80

interface Props {
  entries: TimeEntry[]
  dayStart: Date
  displayEnd: Date
  timezone: string
  categoryMap: Map<string, Category>
  activityMap: Map<string, Activity>
  onEntryClick: (entry: TimeEntry) => void
  onGapClick: (startISO: string, endISO: string) => void
}

export function DayTimeline({
  entries, dayStart, displayEnd, timezone,
  categoryMap, activityMap, onEntryClick, onGapClick,
}: Props) {
  const dayStartMs = dayStart.getTime()

  const totalHours = (displayEnd.getTime() - dayStartMs) / 3_600_000
  const totalPx = Math.max(totalHours * HOUR_PX, 60)

  const segments = useMemo(
    () => buildTimelineSegments(entries, dayStart, displayEnd),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, dayStart.getTime(), displayEnd.getTime()],
  )

  const hourLabels = useMemo(() => {
    const labels: { label: string; topPx: number }[] = []
    let t = new Date(dayStartMs)
    while (t.getTime() <= displayEnd.getTime()) {
      labels.push({
        label: toTimeString(t, timezone),
        topPx: (t.getTime() - dayStartMs) / 3_600_000 * HOUR_PX,
      })
      t = addHours(t, 1)
    }
    return labels
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayStartMs, displayEnd.getTime(), timezone])

  const nowTopPx = (displayEnd.getTime() - dayStartMs) / 3_600_000 * HOUR_PX

  function msToPx(ms: number) {
    return (ms - dayStartMs) / 3_600_000 * HOUR_PX
  }

  return (
    <div className="relative mx-4" style={{ height: totalPx }}>
      {/* Часовые метки и горизонтальные линии */}
      {hourLabels.map(({ label, topPx }) => (
        <div key={label + topPx} className="absolute left-0 right-0 flex items-center" style={{ top: topPx }}>
          <span className="w-12 text-right pr-2 text-xs text-[var(--muted-foreground)] shrink-0">{label}</span>
          <div className="flex-1 border-t border-[var(--border)]" />
        </div>
      ))}

      {/* Сегменты */}
      {segments.map((seg, i) => {
        const topPx = msToPx(seg.startMs)
        const heightPx = (seg.endMs - seg.startMs) / 3_600_000 * HOUR_PX

        if (seg.type === 'entry') {
          const entry = seg.item
          const cat = entry.category_id ? categoryMap.get(entry.category_id) : undefined
          const act = entry.activity_id ? activityMap.get(entry.activity_id) : undefined
          return (
            <TimeBlock
              key={entry.id}
              entry={entry}
              topPx={topPx}
              heightPx={heightPx}
              timezone={timezone}
              category={cat}
              activity={act}
              onClick={() => onEntryClick(entry)}
            />
          )
        }

        return (
          <GapBlock
            key={`gap-${i}`}
            startMs={seg.startMs}
            endMs={seg.endMs}
            topPx={topPx}
            heightPx={heightPx}
            timezone={timezone}
            onClick={() =>
              onGapClick(
                new Date(seg.startMs).toISOString(),
                new Date(seg.endMs).toISOString(),
              )
            }
          />
        )
      })}

      {/* Индикатор «сейчас» */}
      <div
        className="absolute left-14 right-1 flex items-center gap-1 pointer-events-none"
        style={{ top: nowTopPx }}
      >
        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
        <div className="flex-1 border-t-2 border-red-500" />
      </div>
    </div>
  )
}
