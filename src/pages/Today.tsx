import { useState } from 'react'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { toUTCString } from 'lib/time'
import { useNow } from '@/hooks/useNow'
import { useSettings } from '@/hooks/useSettings'
import { useDayBounds } from '@/hooks/useDayBounds'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { usePresets } from '@/hooks/usePresets'
import { useCategoryMap, useActivityMap } from '@/hooks/useCategoryMap'
import { addTimeEntry, updateTimeEntry, deleteTimeEntry } from '@/db/entries'
import { db } from '@/db/schema'
import type { TimeEntry } from '@/db/schema'
import { DayTimeline } from '@/components/today/DayTimeline'
import { UntrackedBanner } from '@/components/today/UntrackedBanner'
import { TimeEntrySheet } from '@/components/today/TimeEntrySheet'
import type { EntryData } from '@/components/today/TimeEntrySheet'
import { ConflictDialog } from '@/components/today/ConflictDialog'
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

export function Today() {
  const nowDate = useNow()
  const settings = useSettings()
  const dayBounds = useDayBounds(nowDate)
  const entries = useTimeEntries(
    dayBounds?.start.toISOString() ?? '',
    dayBounds?.end.toISOString() ?? '',
  )
  const presets = usePresets()
  const categoryMap = useCategoryMap()
  const activityMap = useActivityMap()

  const [sheet, setSheet] = useState<SheetState>({ open: false, startISO: '', endISO: '' })
  const [conflict, setConflict] = useState<ConflictState | null>(null)

  if (!settings || !dayBounds || !categoryMap || !activityMap) {
    return <div className="p-4 text-[var(--muted-foreground)] text-sm">Загрузка…</div>
  }

  const tz = settings.timezone

  // Последняя запись → начало последнего пробела
  const sortedEntries = entries ?? []
  const lastEntry = sortedEntries.at(-1)
  const lastGapStartISO = lastEntry?.ended_at ?? dayBounds.start.toISOString()
  const displayEnd = new Date(Math.min(nowDate.getTime(), dayBounds.end.getTime()))
  const hasGap = displayEnd.getTime() > new Date(lastGapStartISO).getTime() + 60_000 // >1 мин

  // Заголовок дня
  const zonedNow = toZonedTime(nowDate, tz)
  const dayTitle = format(zonedNow, 'd MMMM, EEEE', { locale: undefined })

  function openNewSheet(startISO: string, endISO: string) {
    setSheet({ open: true, startISO, endISO })
  }

  function openEditSheet(entry: TimeEntry) {
    setSheet({ open: true, startISO: entry.started_at, endISO: entry.ended_at, entry })
  }

  async function handlePresetTap(preset: ActivityWithCategory) {
    const endISO = toUTCString(nowDate)
    await saveEntry({
      started_at: lastGapStartISO,
      ended_at: endISO,
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
  }

  async function handleConflictTrim() {
    if (!conflict) return
    const { pending, editingId, conflicting } = conflict
    // Обрезаем конфликтующую запись до начала новой
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

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Заголовок */}
      <header className="px-4 pt-5 pb-3 shrink-0">
        <h1 className="text-xl font-bold capitalize">{dayTitle}</h1>
      </header>

      {/* Плашка «не учтено» */}
      {hasGap && presets && (
        <UntrackedBanner
          lastGapStartISO={lastGapStartISO}
          nowDate={nowDate}
          presets={presets}
          onPresetTap={handlePresetTap}
          onBannerTap={() => openNewSheet(lastGapStartISO, toUTCString(nowDate))}
        />
      )}

      {/* Таймлайн */}
      <div className="flex-1 overflow-y-auto pb-4">
        <DayTimeline
          entries={sortedEntries}
          dayStart={dayBounds.start}
          displayEnd={displayEnd}
          timezone={tz}
          categoryMap={categoryMap}
          activityMap={activityMap}
          onEntryClick={openEditSheet}
          onGapClick={(startISO, endISO) => openNewSheet(startISO, endISO)}
        />
      </div>

      {/* Форма добавления/редактирования — монтируется только когда открыта */}
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

      {/* Диалог конфликта */}
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
