import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { addQuickLog, deleteQuickLog } from '@/db/quickLogs'

interface Props {
  date: string  // YYYY-MM-DD
}

const DURATION_OPTIONS: Array<{ label: string; value: number | undefined }> = [
  { label: '—', value: undefined },
  { label: '5м', value: 5 },
  { label: '10м', value: 10 },
  { label: '15м', value: 15 },
  { label: '20м', value: 20 },
  { label: '30м', value: 30 },
  { label: '45м', value: 45 },
  { label: '1ч', value: 60 },
  { label: '1.5ч', value: 90 },
  { label: '2ч', value: 120 },
]

function formatDur(mins: number): string {
  const h = Math.floor(mins / 60), m = mins % 60
  if (!h) return `${m}м`
  if (!m) return `${h}ч`
  return `${h}ч ${m}м`
}

export function QuickLogSection({ date }: Props) {
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState<number | undefined>(undefined)

  const logs = useLiveQuery(
    () => db.quick_logs.where('date').equals(date).sortBy('created_at'),
    [date],
    [],
  )

  const totalMinutes = (logs ?? []).reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0)

  async function handleAdd() {
    const t = title.trim()
    if (!t) return
    await addQuickLog(date, t, duration)
    setTitle('')
    setDuration(undefined)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h3 className="m-0 text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[0.06em]">
          Мелкие дела
        </h3>
        {totalMinutes > 0 && (
          <span className="font-mono text-xs text-[var(--muted-foreground)]">
            итого {formatDur(totalMinutes)}
          </span>
        )}
      </div>

      {/* Add form */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void handleAdd()}
          placeholder="Что сделал?"
          className="flex-1 min-w-0 h-8 px-3 rounded-[8px] border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ring)] placeholder:text-[var(--muted-foreground)]"
        />
        <select
          value={duration ?? ''}
          onChange={e => setDuration(e.target.value !== '' ? Number(e.target.value) : undefined)}
          className="h-8 px-2 rounded-[8px] border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ring)] text-[var(--muted-foreground)] shrink-0"
          aria-label="Длительность"
        >
          {DURATION_OPTIONS.map(opt => (
            <option key={opt.label} value={opt.value ?? ''}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => void handleAdd()}
          disabled={!title.trim()}
          className="h-8 w-8 rounded-[8px] border border-[var(--border)] bg-[var(--background)] flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-40 transition-colors shrink-0"
          aria-label="Добавить"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>

      {/* List */}
      {logs && logs.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {logs.map(log => (
            <div key={log.id} className="flex items-center gap-2 py-1 group">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--muted-foreground)]" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
              <span className="text-sm flex-1 truncate">{log.title}</span>
              {log.duration_minutes != null && log.duration_minutes > 0 && (
                <span className="font-mono text-xs text-[var(--muted-foreground)] shrink-0">{formatDur(log.duration_minutes)}</span>
              )}
              <button
                onClick={() => void deleteQuickLog(log.id)}
                className="opacity-0 group-hover:opacity-100 shrink-0 w-5 h-5 flex items-center justify-center rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-opacity"
                aria-label={`Удалить "${log.title}"`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
