import { useState, useEffect, useCallback } from 'react'
import { addMinutes } from 'date-fns'
import { toTimeString, toUTCString, parseUTC, applyLocalTime } from 'lib/time'
import { cn } from '@/lib/utils'
import type { TimeEntry, Category } from '@/db/schema'
import type { EntryData } from './TimeEntrySheet'
import type { DraftEntry } from './DayTimeline'

interface Props {
  categories: Category[]
  timezone: string
  nowDate: Date
  gapStart: string       // ISO — pre-fill start time
  gapEnd: string         // ISO — pre-fill end time
  entry?: TimeEntry      // set when editing
  onSave: (data: EntryData) => Promise<void>
  onClose: () => void
  onDelete?: () => void
  onDraftChange: (draft: DraftEntry | null) => void
}

export function EntryPanel({
  categories, timezone, nowDate, gapStart, gapEnd,
  entry, onSave, onClose, onDelete, onDraftChange,
}: Props) {
  const [startISO, setStartISO] = useState(entry?.started_at ?? gapStart)
  const [endISO, setEndISO] = useState(entry?.ended_at ?? gapEnd)
  const [catId, setCatId] = useState<string | undefined>(entry?.category_id)
  const [note, setNote] = useState(entry?.note ?? '')

  const gapDurMin = Math.round((new Date(gapEnd).getTime() - new Date(gapStart).getTime()) / 60_000)

  const TIME_PRESETS = [
    { label: 'Весь промежуток', startISO: gapStart, endISO: gapEnd },
    { label: 'Последние 30 мин', startISO: toUTCString(addMinutes(nowDate, -30)), endISO: toUTCString(nowDate) },
    { label: 'Последний час', startISO: toUTCString(addMinutes(nowDate, -60)), endISO: toUTCString(nowDate) },
  ].filter(p => {
    const durMin = Math.round((new Date(p.endISO).getTime() - new Date(p.startISO).getTime()) / 60_000)
    return durMin > 0 && durMin <= gapDurMin + 5
  })

  // Validation
  const endMs = parseUTC(endISO).getTime()
  const startMs = parseUTC(startISO).getTime()
  const durMin = Math.round((endMs - startMs) / 60_000)
  const isInvalid = durMin <= 0
  const canSave = !isInvalid && (!!catId || !!note.trim())

  // Update draft in parent
  const updateDraft = useCallback(() => {
    if (isInvalid || (!catId && !note.trim())) {
      onDraftChange(null)
      return
    }
    const cat = categories.find(c => c.id === catId)
    onDraftChange({
      startISO,
      endISO,
      categoryColor: cat?.color ?? '#94a3b8',
      categoryName: cat?.name ?? '',
      note: note.trim() || undefined,
    })
  }, [startISO, endISO, catId, note, isInvalid, categories, onDraftChange])

  useEffect(() => { updateDraft() }, [updateDraft])

  // Cleanup draft on unmount
  useEffect(() => () => { onDraftChange(null) }, [onDraftChange])

  function handleSave() {
    if (!canSave) return
    void onSave({
      started_at: startISO,
      ended_at: endISO,
      category_id: catId,
      note: note.trim() || undefined,
    })
  }

  // Keyboard: Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const isPresetActive = (p: { startISO: string; endISO: string }) =>
    startISO === p.startISO && endISO === p.endISO

  return (
    <aside
      aria-labelledby="panel-title"
      className="flex flex-col bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden"
      style={{
        flex: '2 1 360px',
        minWidth: 0,
        boxShadow: '0 12px 32px -12px color-mix(in oklab, var(--foreground) 18%, transparent)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
        <div>
          <h2 id="panel-title" className="m-0 text-base font-semibold">
            {entry ? 'Изменить запись' : 'Новая запись'}
          </h2>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
            Заполняет промежуток {toTimeString(parseUTC(gapStart), timezone)}–{toTimeString(parseUTC(gapEnd), timezone)}
          </p>
        </div>
        <button
          aria-label="Закрыть"
          onClick={onClose}
          className="-mr-2 -mt-1.5 w-10 h-10 flex items-center justify-center rounded-[10px] border-0 bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
        {/* Category grid */}
        <fieldset className="m-0 p-0 border-0 flex flex-col gap-2.5">
          <legend className="p-0 mb-2.5 text-[13px] font-semibold">Категория</legend>
          <div className="grid grid-cols-2 gap-2">
            {categories.filter(c => !c.archived).map(cat => {
              const active = catId === cat.id
              return (
                <button
                  key={cat.id}
                  aria-pressed={active}
                  onClick={() => setCatId(active ? undefined : cat.id)}
                  className="flex items-center gap-2.5 h-11 px-3 rounded-[10px] text-sm font-medium text-[var(--foreground)] text-left transition-colors"
                  style={{
                    border: active ? `1.5px solid ${cat.color}` : '1px solid var(--border)',
                    background: active
                      ? `color-mix(in oklab, ${cat.color} 14%, var(--card))`
                      : 'var(--card)',
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                  <span className="flex-1">{cat.name}</span>
                  {active && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
                  )}
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* Time */}
        <fieldset className="m-0 p-0 border-0 flex flex-col gap-2.5">
          <legend className="p-0 mb-2.5 text-[13px] font-semibold">Время</legend>
          <div className="flex items-end gap-2.5">
            <label className="flex-1 flex flex-col gap-1.5 text-xs text-[var(--muted-foreground)]">
              Начало
              <input
                type="time"
                value={toTimeString(parseUTC(startISO), timezone)}
                onChange={e => setStartISO(applyLocalTime(startISO, e.target.value, timezone))}
                className="h-11 box-border px-3 rounded-[10px] border border-[var(--border)] bg-[var(--background)] font-mono text-[15px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </label>
            <span aria-hidden="true" className="h-11 flex items-center text-[var(--muted-foreground)] pb-0.5">—</span>
            <label className="flex-1 flex flex-col gap-1.5 text-xs text-[var(--muted-foreground)]">
              Конец
              <input
                type="time"
                value={toTimeString(parseUTC(endISO), timezone)}
                onChange={e => setEndISO(applyLocalTime(endISO, e.target.value, timezone))}
                className="h-11 box-border px-3 rounded-[10px] border border-[var(--border)] bg-[var(--background)] font-mono text-[15px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </label>
            <div className="h-11 px-3 flex items-center rounded-[10px] bg-[var(--muted)] font-mono text-[13px] font-medium shrink-0">
              {isInvalid ? '—' : formatDur(durMin)}
            </div>
          </div>

          {/* Time presets */}
          {TIME_PRESETS.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {TIME_PRESETS.map(p => {
                const active = isPresetActive(p)
                return (
                  <button
                    key={p.label}
                    aria-pressed={active}
                    onClick={() => { setStartISO(p.startISO); setEndISO(p.endISO) }}
                    className="h-8 px-3 rounded-full text-[13px] font-medium transition-colors"
                    style={{
                      border: active ? '1px solid var(--foreground)' : '1px solid var(--border)',
                      background: active ? 'var(--foreground)' : 'var(--card)',
                      color: active ? 'var(--background)' : 'var(--foreground)',
                    }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          )}
        </fieldset>

        {/* Note */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="panel-note" className="text-[13px] font-semibold">
            Описание{' '}
            <span className="font-normal text-[var(--muted-foreground)]">— необязательно</span>
          </label>
          <input
            id="panel-note"
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Например: ревью макетов"
            className="h-11 box-border px-3 rounded-[10px] border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        {/* Validation */}
        <div className={cn('flex items-center gap-2 text-[13px]', isInvalid ? 'text-red-500' : 'text-[var(--muted-foreground)]')}>
          {isInvalid ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>
          )}
          <span>
            {isInvalid ? 'Конец должен быть позже начала' : 'Без пересечений с другими записями'}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-5 py-4 border-t border-[var(--border)] shrink-0">
        <span className="text-xs text-[var(--muted-foreground)]">Esc — закрыть</span>
        {onDelete && (
          <button
            onClick={onDelete}
            className="ml-2 h-10 px-4 rounded-[10px] border border-red-500 text-red-500 text-sm font-medium active:opacity-70"
          >
            Удалить
          </button>
        )}
        <button
          onClick={onClose}
          className="ml-auto h-10 px-4 rounded-[10px] border border-[var(--border)] bg-[var(--card)] text-sm font-medium"
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="h-10 px-4 rounded-[10px] border-0 bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium disabled:opacity-40 active:opacity-80"
        >
          Сохранить запись
        </button>
      </div>
    </aside>
  )
}

function formatDur(mins: number): string {
  if (mins <= 0) return '0м'
  const h = Math.floor(mins / 60), m = mins % 60
  if (!h) return `${m}м`
  if (!m) return `${h}ч`
  return `${h}ч ${m}м`
}
