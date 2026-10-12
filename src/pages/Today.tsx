import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { toUTCString } from 'lib/time'
import { useNow } from '@/hooks/useNow'
import { useSettings } from '@/hooks/useSettings'
import { useDayBounds } from '@/hooks/useDayBounds'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { usePresets } from '@/hooks/usePresets'
import { useCategoryMap, useActivityMap } from '@/hooks/useCategoryMap'
import { useDesktop } from '@/hooks/useDesktop'
import { addTimeEntry, updateTimeEntry, deleteTimeEntry } from '@/db/entries'
import { db } from '@/db/schema'
import type { TimeEntry } from '@/db/schema'
import { DayTimeline } from '@/components/today/DayTimeline'
import type { DraftEntry } from '@/components/today/DayTimeline'
import { UntrackedBanner } from '@/components/today/UntrackedBanner'
import { TimeEntrySheet } from '@/components/today/TimeEntrySheet'
import type { EntryData } from '@/components/today/TimeEntrySheet'
import { ConflictDialog } from '@/components/today/ConflictDialog'
import { DaySummary } from '@/components/today/DaySummary'
import { EntryPanel } from '@/components/today/EntryPanel'
import type { ActivityWithCategory } from '@/hooks/usePresets'

interface SheetState {
  open: boolean
  startISO: string
  endISO: string
  entry?: TimeEntry
}

interface ConflictState {
  pending: EntryData
  editingId?: string
  conflicting: TimeEntry[]
}

type PanelMode =
  | { kind: 'summary' }
  | { kind: 'new'; gapStart: string; gapEnd: string }
  | { kind: 'edit'; entry: TimeEntry; gapStart: string; gapEnd: string }

export function Today() {
  const nowDate = useNow()
  const isDesktop = useDesktop()
  const settings = useSettings()

  const [viewedDaysAgo, setViewedDaysAgo] = useState(0)
  const [draftEntry, setDraftEntry] = useState<DraftEntry | null>(null)
  const [panel, setPanel] = useState<PanelMode>({ kind: 'summary' })

  const viewedDate = useMemo(
    () => viewedDaysAgo === 0 ? nowDate : subDays(nowDate, viewedDaysAgo),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewedDaysAgo, nowDate.toDateString()],
  )

  const dayBounds = useDayBounds(viewedDate)
  const entries = useTimeEntries(
    dayBounds?.start.toISOString() ?? '',
    dayBounds?.end.toISOString() ?? '',
  )
  const presets = usePresets()
  const categoryMap = useCategoryMap()
  const activityMap = useActivityMap()

  const categories = useMemo(
    () => (categoryMap ? [...categoryMap.values()] : []),
    [categoryMap],
  )

  // Mobile sheet state
  const [sheet, setSheet] = useState<SheetState>({ open: false, startISO: '', endISO: '' })
  const [conflict, setConflict] = useState<ConflictState | null>(null)

  if (!settings || !dayBounds || !categoryMap || !activityMap) {
    return <div className="p-4 text-[var(--muted-foreground)] text-sm">Загрузка…</div>
  }

  const tz = settings.timezone
  const sortedEntries = entries ?? []
  const lastEntry = sortedEntries.at(-1)
  const lastGapStartISO = lastEntry?.ended_at ?? dayBounds.start.toISOString()
  const isToday = viewedDaysAgo === 0
  const displayEnd = isToday
    ? new Date(Math.min(nowDate.getTime(), dayBounds.end.getTime()))
    : dayBounds.end
  const hasGap = displayEnd.getTime() > new Date(lastGapStartISO).getTime() + 60_000

  const zonedViewed = toZonedTime(viewedDate, tz)
  const dayTitle = format(zonedViewed, 'd MMMM, EEEE')

  // ── Open panel / sheet ──────────────────────────────────────
  function handleGapClick(startISO: string, endISO: string) {
    if (isDesktop) {
      setPanel({ kind: 'new', gapStart: startISO, gapEnd: endISO })
    } else {
      setSheet({ open: true, startISO, endISO })
    }
  }

  function handleEntryClick(entry: TimeEntry) {
    if (isDesktop) {
      const gapEnd = toUTCString(displayEnd)
      setPanel({ kind: 'edit', entry, gapStart: entry.started_at, gapEnd: entry.ended_at ?? gapEnd })
    } else {
      setSheet({ open: true, startISO: entry.started_at, endISO: entry.ended_at, entry })
    }
  }

  function openNewEntry() {
    const gapEnd = toUTCString(displayEnd)
    if (isDesktop) {
      setPanel({ kind: 'new', gapStart: lastGapStartISO, gapEnd })
    } else {
      setSheet({ open: true, startISO: lastGapStartISO, endISO: gapEnd })
    }
  }

  // ── Save logic ──────────────────────────────────────────────
  async function handlePresetTap(preset: ActivityWithCategory) {
    await saveEntry({
      started_at: lastGapStartISO,
      ended_at: toUTCString(nowDate),
      activity_id: preset.id,
      category_id: preset.category_id,
    })
  }

  async function saveEntry(data: EntryData, editingId?: string) {
    if (editingId) {
      const result = await updateTimeEntry(editingId, data)
      if ('conflicting' in result) {
        setConflict({ pending: data, editingId, conflicting: result.conflicting })
        return
      }
    } else {
      const result = await addTimeEntry(data)
      if ('conflicting' in result) {
        setConflict({ pending: data, conflicting: result.conflicting })
        return
      }
    }
    setSheet(s => ({ ...s, open: false }))
    setPanel({ kind: 'summary' })
  }

  async function handleConflictTrim() {
    if (!conflict) return
    const { pending, editingId, conflicting } = conflict
    for (const c of conflicting) {
      await db.time_entries.update(c.id, {
        ended_at: pending.started_at,
        updated_at: new Date().toISOString(),
      })
    }
    setConflict(null)
    await saveEntry(pending, editingId)
  }

  const allActivities = [...(activityMap?.values() ?? [])].filter(a => !a.archived)

  // ── Desktop layout ──────────────────────────────────────────
  if (isDesktop) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <header
          className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border)] shrink-0"
          style={{ background: 'color-mix(in oklab, var(--muted) 45%, var(--background))' }}
        >
          <div className="flex items-center gap-2">
            <button
              aria-label="Предыдущий день"
              onClick={() => setViewedDaysAgo(d => d + 1)}
              className="w-9 h-9 flex items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h1 className="text-base font-semibold capitalize min-w-[220px] text-center">
              {isToday ? `Сегодня · ${dayTitle}` : dayTitle}
            </h1>
            <button
              aria-label="Следующий день"
              onClick={() => setViewedDaysAgo(d => Math.max(0, d - 1))}
              disabled={isToday}
              className="w-9 h-9 flex items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] transition-colors disabled:opacity-30"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
          {!isToday && (
            <button
              onClick={() => setViewedDaysAgo(0)}
              className="text-sm text-[var(--primary)] hover:underline"
            >
              ← Сегодня
            </button>
          )}
          {isToday && (
            <span className="font-mono text-sm text-[var(--muted-foreground)] ml-auto">
              {format(toZonedTime(nowDate, tz), 'HH:mm')}
            </span>
          )}
        </header>

        {/* Two-column body */}
        <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">
          {/* Timeline card */}
          <div
            className="flex flex-col bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden"
            style={{ flex: '3 1 480px', minWidth: 0 }}
          >
            {/* Timeline card header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Таймлайн</span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {sortedEntries.length > 0 ? `${sortedEntries.length} записей` : ''}
                </span>
              </div>
              <button
                onClick={openNewEntry}
                className="h-8 px-3 rounded-[10px] border border-[var(--border)] bg-[var(--background)] text-sm font-medium hover:bg-[var(--muted)] transition-colors"
              >
                + Добавить запись
              </button>
            </div>

            {/* Banner (desktop) */}
            {isToday && hasGap && presets && (
              <div
                className="flex items-center gap-3 mx-4 mt-3 px-4 py-3 rounded-[10px] border border-[var(--border)] cursor-pointer"
                style={{ background: 'color-mix(in oklab, var(--muted) 40%, var(--background))' }}
                role="button"
                tabIndex={0}
                onClick={() => handleGapClick(lastGapStartISO, toUTCString(nowDate))}
                onKeyDown={e => e.key === 'Enter' && handleGapClick(lastGapStartISO, toUTCString(nowDate))}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--muted-foreground)]" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                <span className="text-sm">Есть неучтённое время — нажмите, чтобы заполнить</span>
              </div>
            )}

            <DayTimeline
              entries={sortedEntries}
              dayStart={dayBounds.start}
              displayEnd={displayEnd}
              timezone={tz}
              categoryMap={categoryMap}
              activityMap={activityMap}
              onEntryClick={handleEntryClick}
              onGapClick={handleGapClick}
              variant="desktop"
              draftEntry={draftEntry}
              showNow={isToday}
            />
          </div>

          {/* Right panel: DaySummary or EntryPanel */}
          {panel.kind === 'summary' ? (
            <DaySummary
              entries={sortedEntries}
              categories={categories}
              dayStart={dayBounds.start}
              dayEnd={dayBounds.end}
              nowDate={isToday ? nowDate : dayBounds.end}
            />
          ) : (
            <EntryPanel
              categories={categories}
              timezone={tz}
              nowDate={nowDate}
              gapStart={panel.gapStart}
              gapEnd={panel.gapEnd}
              entry={panel.kind === 'edit' ? panel.entry : undefined}
              onSave={data => saveEntry(data, panel.kind === 'edit' ? panel.entry.id : undefined)}
              onClose={() => setPanel({ kind: 'summary' })}
              onDelete={panel.kind === 'edit' ? async () => {
                if (panel.kind === 'edit') await deleteTimeEntry(panel.entry.id)
                setPanel({ kind: 'summary' })
              } : undefined}
              onDraftChange={setDraftEntry}
            />
          )}
        </div>

        {/* Conflict dialog */}
        {conflict && (
          <ConflictDialog
            conflicting={conflict.conflicting}
            activityMap={activityMap}
            categoryMap={categoryMap}
            timezone={tz}
            onTrim={handleConflictTrim}
            onCancel={() => setConflict(null)}
          />
        )}
      </div>
    )
  }

  // ── Mobile layout ───────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <header className="px-4 pt-5 pb-3 shrink-0">
        <h1 className="text-xl font-bold capitalize">{dayTitle}</h1>
      </header>

      {hasGap && presets && (
        <UntrackedBanner
          lastGapStartISO={lastGapStartISO}
          nowDate={nowDate}
          presets={presets}
          onPresetTap={handlePresetTap}
          onBannerTap={() => openNewEntry()}
        />
      )}

      <div className="flex-1 overflow-y-auto pb-20">
        <DayTimeline
          entries={sortedEntries}
          dayStart={dayBounds.start}
          displayEnd={displayEnd}
          timezone={tz}
          categoryMap={categoryMap}
          activityMap={activityMap}
          onEntryClick={handleEntryClick}
          onGapClick={handleGapClick}
          variant="mobile"
        />
      </div>

      {/* FAB */}
      <button
        onClick={openNewEntry}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-2xl shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Добавить запись"
      >
        +
      </button>

      {sheet.open && (
        <TimeEntrySheet
          open
          onClose={() => setSheet(s => ({ ...s, open: false }))}
          initialStartISO={sheet.startISO}
          initialEndISO={sheet.endISO}
          entry={sheet.entry}
          activities={allActivities}
          categoryMap={categoryMap}
          timezone={tz}
          onSave={data => saveEntry(data, sheet.entry?.id)}
          onDelete={sheet.entry ? async () => {
            const id = sheet.entry?.id
            if (id) await deleteTimeEntry(id)
            setSheet(s => ({ ...s, open: false }))
          } : undefined}
        />
      )}

      {conflict && (
        <ConflictDialog
          conflicting={conflict.conflicting}
          activityMap={activityMap}
          categoryMap={categoryMap}
          timezone={tz}
          onTrim={handleConflictTrim}
          onCancel={() => setConflict(null)}
        />
      )}
    </div>
  )
}
