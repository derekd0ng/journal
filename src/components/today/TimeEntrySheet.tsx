import { useState, useEffect } from 'react'
import { toTimeString, toUTCString, parseUTC, applyLocalTime } from 'lib/time'
import { addMinutes } from 'date-fns'
import { cn } from '@/lib/utils'
import type { TimeEntry, Activity, Category } from '@/db/schema'

interface Props {
  open: boolean
  onClose: () => void
  initialStartISO: string
  initialEndISO: string
  entry?: TimeEntry
  activities: Activity[]
  categoryMap: Map<string, Category>
  timezone: string
  onSave: (data: EntryData) => void
  onDelete?: () => void
}

export interface EntryData {
  started_at: string
  ended_at: string
  activity_id?: string
  category_id?: string
  note?: string
  intentional?: boolean
}

export function TimeEntrySheet({
  open, onClose, initialStartISO, initialEndISO,
  entry, activities, categoryMap, timezone, onSave, onDelete,
}: Props) {
  const [startISO, setStartISO] = useState(initialStartISO)
  const [endISO, setEndISO] = useState(initialEndISO)
  const [selectedActivityId, setSelectedActivityId] = useState<string | undefined>(entry?.activity_id)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(entry?.category_id)
  const [intentional, setIntentional] = useState<boolean | undefined>(entry?.intentional)
  const [note, setNote] = useState(entry?.note ?? '')

  useEffect(() => {
    if (open) {
      setStartISO(initialStartISO)
      setEndISO(initialEndISO)
      setSelectedActivityId(entry?.activity_id)
      setSelectedCategoryId(entry?.category_id)
      setIntentional(entry?.intentional)
      setNote(entry?.note ?? '')
    }
  }, [open, initialStartISO, initialEndISO, entry])

  const selectedActivity = selectedActivityId ? activities.find(a => a.id === selectedActivityId) : undefined
  const effectiveCategoryId = selectedActivity?.category_id ?? selectedCategoryId
  const effectiveCategory = effectiveCategoryId ? categoryMap.get(effectiveCategoryId) : undefined
  const isLeisure = effectiveCategory?.kind === 'leisure'

  const canSave = Boolean(selectedActivityId ?? effectiveCategoryId ?? note.trim())

  function adjustTime(field: 'start' | 'end', deltaMin: number) {
    if (field === 'start') {
      setStartISO(iso => toUTCString(addMinutes(parseUTC(iso), deltaMin)))
    } else {
      setEndISO(iso => toUTCString(addMinutes(parseUTC(iso), deltaMin)))
    }
  }

  function handleSave() {
    if (!canSave) return
    onSave({
      started_at: startISO,
      ended_at: endISO,
      activity_id: selectedActivityId,
      category_id: effectiveCategoryId,
      note: note.trim() || undefined,
      intentional: isLeisure ? intentional : undefined,
    })
  }

  // Группируем активности по категориям
  const grouped = new Map<string, Activity[]>()
  for (const a of activities) {
    const list = grouped.get(a.category_id) ?? []
    if (list.length === 0) grouped.set(a.category_id, list)
    list.push(a)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[var(--background)] rounded-t-2xl max-h-[90dvh] flex flex-col shadow-2xl">
        {/* Ручка */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        <div className="px-4 pt-1 pb-2 shrink-0">
          <h2 className="text-base font-semibold">
            {entry ? 'Редактировать запись' : 'Новая запись'}
          </h2>
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-4">
          {/* Время */}
          <div className="grid grid-cols-2 gap-3">
            <TimeField
              label="Начало"
              iso={startISO}
              timezone={timezone}
              onAdjust={d => adjustTime('start', d)}
              onTimeChange={t => setStartISO(applyLocalTime(startISO, t, timezone))}
            />
            <TimeField
              label="Конец"
              iso={endISO}
              timezone={timezone}
              onAdjust={d => adjustTime('end', d)}
              onTimeChange={t => setEndISO(applyLocalTime(endISO, t, timezone))}
            />
          </div>

          {/* Свободное название */}
          <div>
            <p className="text-xs text-[var(--muted-foreground)] mb-1.5">Название</p>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Что делал?"
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          {/* Залип/Осознанно для leisure */}
          {isLeisure && (
            <div>
              <p className="text-xs text-[var(--muted-foreground)] mb-1.5">Характер</p>
              <div className="flex gap-2">
                {([
                  { value: false, label: 'Залип' },
                  { value: true,  label: 'Осознанно' },
                ] as const).map(({ value, label }) => (
                  <button
                    key={label}
                    onClick={() => setIntentional(intentional === value ? undefined : value)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm border transition-colors',
                      intentional === value
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent'
                        : 'border-[var(--border)] text-[var(--muted-foreground)]',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Выбор активности */}
          <div>
            <p className="text-xs text-[var(--muted-foreground)] mb-1.5">Категория / активность</p>
            <div className="space-y-2">
              {Array.from(grouped.entries()).map(([catId, acts]) => {
                const cat = categoryMap.get(catId)
                if (!cat) return null
                return (
                  <div key={catId}>
                    <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1 uppercase tracking-wide">
                      {cat.name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {acts.map(a => (
                        <button
                          key={a.id}
                          onClick={() => {
                            if (selectedActivityId === a.id) {
                              setSelectedActivityId(undefined)
                              setSelectedCategoryId(undefined)
                            } else {
                              setSelectedActivityId(a.id)
                              setSelectedCategoryId(a.category_id)
                            }
                          }}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-sm border transition-colors',
                            selectedActivityId === a.id
                              ? 'text-white border-transparent'
                              : 'border-[var(--border)] text-[var(--foreground)]',
                          )}
                          style={selectedActivityId === a.id ? { backgroundColor: cat.color } : {}}
                        >
                          {a.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div className="px-4 pb-6 pt-2 shrink-0 flex gap-3 border-t border-[var(--border)]">
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-3 rounded-xl border border-red-500 text-red-500 text-sm font-medium active:opacity-70"
            >
              Удалить
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-semibold active:opacity-70 disabled:opacity-40"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}

function TimeField({
  label, iso, timezone, onAdjust, onTimeChange,
}: {
  label: string
  iso: string
  timezone: string
  onAdjust: (deltaMin: number) => void
  onTimeChange: (localHHMM: string) => void
}) {
  return (
    <div>
      <p className="text-xs text-[var(--muted-foreground)] mb-1">{label}</p>
      <input
        type="time"
        value={toTimeString(parseUTC(iso), timezone)}
        onChange={e => onTimeChange(e.target.value)}
        className="w-full px-2 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-[var(--ring)] mb-1.5"
      />
      <div className="flex gap-1">
        <button
          onClick={() => onAdjust(-15)}
          className="flex-1 py-1 rounded-lg border border-[var(--border)] text-xs text-[var(--muted-foreground)] active:opacity-70"
        >
          −15м
        </button>
        <button
          onClick={() => onAdjust(+15)}
          className="flex-1 py-1 rounded-lg border border-[var(--border)] text-xs text-[var(--muted-foreground)] active:opacity-70"
        >
          +15м
        </button>
      </div>
    </div>
  )
}
