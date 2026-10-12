import { useMemo, useRef, useEffect } from 'react'
import { buildTimelineSegments, toTimeString } from 'lib/time'
import { addHours } from 'date-fns'
import type { TimeEntry, Category, Activity } from '@/db/schema'
import { TimeBlock } from './TimeBlock'
import { GapBlock } from './GapBlock'

const HOUR_PX = 80

export interface DraftEntry {
  startISO: string
  endISO: string
  categoryColor: string
  categoryName: string
  note?: string
}

interface Props {
  entries: TimeEntry[]
  dayStart: Date
  displayEnd: Date
  timezone: string
  categoryMap: Map<string, Category>
  activityMap: Map<string, Activity>
  onEntryClick: (entry: TimeEntry) => void
  onGapClick: (startISO: string, endISO: string) => void
  variant?: 'mobile' | 'desktop'
  draftEntry?: DraftEntry | null
  showNow?: boolean
}

export function DayTimeline({
  entries, dayStart, displayEnd, timezone,
  categoryMap, activityMap, onEntryClick, onGapClick,
  variant = 'mobile', draftEntry, showNow = true,
}: Props) {
  const dayStartMs = dayStart.getTime()
  const totalHours = (displayEnd.getTime() - dayStartMs) / 3_600_000
  const totalPx = Math.max(totalHours * HOUR_PX, 60)

  const nowRef = useRef<HTMLDivElement>(null)

  // Scroll to now indicator on mount (desktop)
  useEffect(() => {
    if (variant === 'desktop' && nowRef.current) {
      nowRef.current.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [variant])

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

  // Draft block dimensions (desktop only)
  const draft = variant === 'desktop' && draftEntry ? (() => {
    try {
      const s = new Date(draftEntry.startISO).getTime()
      const e = new Date(draftEntry.endISO).getTime()
      if (e <= s) return null
      const topPx = msToPx(Math.max(s, dayStartMs))
      const heightPx = msToPx(Math.min(e, displayEnd.getTime())) - topPx
      return { topPx, heightPx }
    } catch { return null }
  })() : null

  if (variant === 'desktop') {
    const leftOffset = 64  // px from content left for labels
    return (
      <div
        className="overflow-y-auto flex-1"
        style={{ paddingLeft: leftOffset + 20, paddingRight: 20, paddingTop: 16, paddingBottom: 24 }}
      >
        <div className="relative" style={{ height: totalPx }}>
          {/* Hour labels + grid lines */}
          {hourLabels.map(({ label, topPx }) => (
            <div
              key={label + topPx}
              className="absolute right-0 flex items-center"
              style={{ left: -leftOffset, top: topPx, transform: 'translateY(-50%)' }}
            >
              <span className="w-11 shrink-0 text-right font-mono text-[11px] text-[var(--muted-foreground)] pr-3">{label}</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>
          ))}

          {/* Future overlay */}
          <div
            className="absolute left-0 right-0 bottom-0 rounded-[10px]"
            style={{ top: nowTopPx, background: 'color-mix(in oklab, var(--muted) 45%, transparent)' }}
          />

          {/* Segments */}
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
                  variant="desktop"
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
                variant="desktop"
                onClick={() => onGapClick(
                  new Date(seg.startMs).toISOString(),
                  new Date(seg.endMs).toISOString(),
                )}
              />
            )
          })}

          {/* Draft block */}
          {draftEntry && draft && (
            <TimeBlock
              entry={{
                id: '__draft__',
                started_at: draftEntry.startISO,
                ended_at: draftEntry.endISO,
                category_id: undefined,
                note: draftEntry.note ?? draftEntry.categoryName,
                created_at: draftEntry.startISO,
                updated_at: draftEntry.startISO,
              }}
              topPx={draft.topPx}
              heightPx={draft.heightPx}
              timezone={timezone}
              category={{ id: '__draft__', name: draftEntry.categoryName, color: draftEntry.categoryColor, kind: 'rest', sort_order: 0, archived: false, created_at: '', updated_at: '' }}
              onClick={() => {}}
              variant="desktop"
              isDraft
            />
          )}

          {/* Now indicator */}
          {showNow && (
            <div
              ref={nowRef}
              className="absolute right-0 flex items-center z-[3]"
              style={{ left: -(leftOffset + 8), top: nowTopPx, transform: 'translateY(-50%)' }}
            >
              <span
                className="shrink-0 font-mono text-[11px] font-medium text-center rounded-[6px] py-0.5"
                style={{ width: 52, background: 'var(--foreground)', color: 'var(--background)' }}
              >
                {toTimeString(displayEnd, timezone)}
              </span>
              <div className="w-2 h-2 rounded-full shrink-0 ml-2" style={{ background: 'var(--foreground)' }} />
              <div className="flex-1 h-0.5" style={{ background: 'var(--foreground)' }} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Mobile variant (original)
  return (
    <div className="relative mx-4" style={{ height: totalPx }}>
      {hourLabels.map(({ label, topPx }) => (
        <div key={label + topPx} className="absolute left-0 right-0 flex items-center" style={{ top: topPx }}>
          <span className="w-12 text-right pr-2 text-xs text-[var(--muted-foreground)] shrink-0">{label}</span>
          <div className="flex-1 border-t border-[var(--border)]" />
        </div>
      ))}

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
              variant="mobile"
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
            variant="mobile"
            onClick={() => onGapClick(
              new Date(seg.startMs).toISOString(),
              new Date(seg.endMs).toISOString(),
            )}
          />
        )
      })}

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
