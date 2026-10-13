import { useMemo, useState } from 'react'
import { buildDaySummary } from 'lib/analytics'
import type { TimeEntry, Category, CategoryKind } from '@/db/schema'
import { QuickLogSection } from './QuickLogSection'

interface Props {
  entries: TimeEntry[]
  categories: Category[]
  dayStart: Date
  dayEnd: Date
  nowDate: Date
  date: string  // YYYY-MM-DD local date, for QuickLogSection
}

const TYPE_LABELS: Record<CategoryKind, { name: string; hint: string }> = {
  productive: { name: 'Продуктивное', hint: 'работа, саморазвитие' },
  maintenance: { name: 'Поддержание', hint: 'еда, быт, дорога, спорт' },
  rest: { name: 'Отдых', hint: 'сон' },
  leisure: { name: 'Досуг', hint: 'общение, развлечения' },
  other: { name: 'Другое', hint: 'прочее' },
}
const TYPE_ORDER: CategoryKind[] = ['productive', 'maintenance', 'rest', 'leisure', 'other']

const HATCH = 'repeating-linear-gradient(135deg, color-mix(in oklab, var(--muted-foreground) 40%, transparent) 0 1.5px, transparent 1.5px 5px)'

function formatDur(mins: number): string {
  mins = Math.round(mins)
  if (mins <= 0) return '0м'
  const h = Math.floor(mins / 60), m = mins % 60
  if (!h) return `${m}м`
  if (!m) return `${h}ч`
  return `${h}ч ${m}м`
}

export function DaySummary({ entries, categories, dayStart, dayEnd, nowDate, date }: Props) {
  const [expanded, setExpanded] = useState<Set<CategoryKind>>(new Set())

  const catMap = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories],
  )

  // clamp nowDate to [dayStart, dayEnd] so untracked = elapsed-only, not future
  const clampedNow = useMemo(
    () => new Date(Math.min(Math.max(nowDate.getTime(), dayStart.getTime()), dayEnd.getTime())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nowDate.getTime(), dayStart.getTime(), dayEnd.getTime()],
  )

  const summary = useMemo(
    () => buildDaySummary(entries, dayStart.getTime(), clampedNow.getTime(), dayEnd.getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, dayStart.getTime(), dayEnd.getTime(), clampedNow.getTime()],
  )

  const { trackedMinutes, untrackedMinutes, remainingMinutes, byCategoryMinutes, grid } = summary
  const elapsedMinutes = trackedMinutes + untrackedMinutes

  // By-type rows — % and bar widths relative to elapsed (not just tracked)
  const typeRows = TYPE_ORDER.map(kind => {
    const kindCats = categories.filter(c => c.kind === kind && !c.archived)
    const total = kindCats.reduce((sum, c) => sum + (byCategoryMinutes.get(c.id) ?? 0), 0)
    const hint = kindCats
      .filter(c => byCategoryMinutes.has(c.id))
      .map(c => c.name.toLowerCase())
      .join(', ') || TYPE_LABELS[kind].hint
    const segs = kindCats
      .filter(c => byCategoryMinutes.get(c.id))
      .map(c => ({ color: c.color, pct: ((byCategoryMinutes.get(c.id) ?? 0) / (elapsedMinutes || 1)) * 100 }))
    const catRows = kindCats
      .filter(c => (byCategoryMinutes.get(c.id) ?? 0) > 0)
      .map(c => ({ cat: c, mins: byCategoryMinutes.get(c.id) ?? 0 }))
      .sort((a, b) => b.mins - a.mins)
    return { kind, total, segs, catRows, ...TYPE_LABELS[kind], hint }
  }).filter(r => r.total > 0)

  // By-category rows (sorted by duration desc)
  const catRows = [...byCategoryMinutes.entries()]
    .filter((entry): entry is [string, number] => entry[0] !== undefined)
    .sort((a, b) => b[1] - a[1])
    .map(([id, mins]) => ({ cat: catMap.get(id), mins }))
    .filter((r): r is { cat: NonNullable<typeof r.cat>; mins: number } => r.cat !== undefined)

  function toggleExpanded(kind: CategoryKind) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  return (
    <section
      aria-labelledby="sum-title"
      className="flex flex-col gap-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 overflow-y-auto"
      style={{ flex: '2 1 360px', minWidth: 0 }}
    >
      {/* Title */}
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="sum-title" className="m-0 text-base font-semibold">Сводка дня</h2>
        <span className="font-mono text-xs text-[var(--muted-foreground)]">00:00–24:00</span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Отслежено', value: formatDur(trackedMinutes), muted: false },
          { label: 'Не учтено', value: formatDur(untrackedMinutes), muted: true },
          { label: 'Впереди', value: formatDur(remainingMinutes), muted: true },
        ].map(({ label, value, muted }) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
            <span
              className="text-2xl font-semibold tabular-nums tracking-tight"
              style={{ color: muted ? 'var(--muted-foreground)' : 'var(--foreground)' }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* 24h grid */}
      <div className="flex flex-col gap-3">
        <div
          role="img"
          aria-label="24 часа дня, ячейка — 30 минут"
          className="grid gap-y-2.5 gap-x-1.5"
          style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}
        >
          {grid.length > 0 && Array.from({ length: 24 }, (_, h) => {
            const cell0 = grid[h * 2]
            const cell1 = grid[h * 2 + 1]
            return (
              <div key={h} className="flex flex-col gap-1">
                <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                  {String(h).padStart(2, '0')}
                </span>
                <div className="flex gap-0.5">
                  {[cell0, cell1].map((cell, j) => {
                    if (!cell) return null
                    const endH = j === 0 ? h : (h + 1) % 24
                    const pad = (n: number) => String(n).padStart(2, '0')
                    const tooltipLabel = `${pad(h)}:${j === 0 ? '00' : '30'}–${pad(endH)}:${j === 0 ? '30' : '00'}`
                    const allFuture = cell.fills.every(f => f.kind === 'future')
                    return (
                      <div
                        key={j}
                        title={tooltipLabel}
                        className="flex-1 rounded-[4px] box-border overflow-hidden"
                        style={{
                          height: 26,
                          display: 'flex',
                          border: allFuture ? '1px dashed var(--border)' : undefined,
                          outline: cell.isCurrent ? '2px solid var(--foreground)' : undefined,
                          outlineOffset: cell.isCurrent ? 1 : undefined,
                        }}
                      >
                        {!allFuture && cell.fills.map((fill, fi) => {
                          const catColor = fill.categoryId ? (catMap.get(fill.categoryId)?.color ?? '#94a3b8') : undefined
                          return (
                            <div
                              key={fi}
                              style={{
                                width: `${fill.pct}%`,
                                height: '100%',
                                flexShrink: 0,
                                background: fill.kind === 'activity' && catColor
                                  ? catColor
                                  : fill.kind === 'future'
                                  ? 'transparent'
                                  : 'var(--muted)',
                                backgroundImage: fill.kind === 'gap' ? HATCH : undefined,
                              }}
                            />
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-[var(--muted-foreground)]">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-flex gap-0.5">
              {['#6366f1', '#3b82f6', '#f59e0b'].map(c => (
                <span key={c} className="w-2 h-3 rounded-[2px]" style={{ background: c }} />
              ))}
            </span>
            Активность
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="w-3.5 h-3 rounded-[2px]" style={{ background: 'var(--muted)', backgroundImage: HATCH }} />
            Не учтено
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="w-3.5 h-3 box-border rounded-[2px] border border-dashed border-[var(--muted-foreground)]" />
            Впереди
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="w-3 h-2.5 box-border rounded-[2px] outline outline-2 outline-[var(--foreground)]" style={{ outlineOffset: 1 }} />
            Сейчас
          </span>
        </div>
      </div>

      {/* By type — expandable */}
      {typeRows.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="m-0 mb-2.5 text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[0.06em]">По типу</h3>
          {[...typeRows, ...(untrackedMinutes >= 1 ? [{ kind: '__untracked__' as const }] : [])].map(row => {
            if (row.kind === '__untracked__') {
              const pct = Math.round((untrackedMinutes / (elapsedMinutes || 1)) * 100)
              const barW = (untrackedMinutes / (elapsedMinutes || 1)) * 100
              return (
                <div key="__untracked__" className="flex flex-col">
                  <div className="flex items-center gap-2 w-full py-1.5 px-2 -mx-2">
                    <svg width="14" height="14" aria-hidden="true" style={{ opacity: 0 }} />
                    <span className="font-medium text-sm flex-1 text-[var(--muted-foreground)]">Не учтено</span>
                    <span className="ml-auto shrink-0 font-mono text-[13px] text-[var(--muted-foreground)]">{formatDur(untrackedMinutes)}</span>
                    <span className="shrink-0 w-9 text-right font-mono text-xs text-[var(--muted-foreground)]">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mx-6 mb-1" style={{ background: 'var(--muted)' }}>
                    <div style={{ width: `${barW}%`, height: '100%', backgroundImage: HATCH, background: 'color-mix(in oklab, var(--muted-foreground) 35%, var(--muted))' }} />
                  </div>
                </div>
              )
            }
            const typedRow = row as typeof typeRows[0]
            const isOpen = expanded.has(typedRow.kind)
            return (
              <div key={typedRow.kind} className="flex flex-col">
                {/* Type row header */}
                <button
                  onClick={() => typedRow.catRows.length > 1 && toggleExpanded(typedRow.kind)}
                  className="flex items-center gap-2 w-full text-left py-1.5 rounded-lg hover:bg-[var(--muted)] px-2 -mx-2 transition-colors"
                  style={{ cursor: typedRow.catRows.length > 1 ? 'pointer' : 'default' }}
                  aria-expanded={isOpen}
                >
                  {/* Chevron */}
                  <svg
                    width="14" height="14"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="shrink-0 text-[var(--muted-foreground)] transition-transform duration-150"
                    style={{
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      opacity: typedRow.catRows.length > 1 ? 1 : 0,
                    }}
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6"/>
                  </svg>

                  <span className="font-medium text-sm flex-1 truncate">{typedRow.name}</span>
                  <span className="text-xs text-[var(--muted-foreground)] truncate max-w-[120px] hidden sm:block">{typedRow.hint}</span>
                  <span className="ml-auto shrink-0 font-mono text-[13px]">{formatDur(typedRow.total)}</span>
                  <span className="shrink-0 w-9 text-right font-mono text-xs text-[var(--muted-foreground)]">
                    {Math.round((typedRow.total / (elapsedMinutes || 1)) * 100)}%
                  </span>
                </button>

                {/* Combined progress bar */}
                <div className="h-1.5 rounded-full bg-[var(--muted)] flex gap-px overflow-hidden mx-6 mb-1">
                  {typedRow.segs.map((seg, i) => (
                    <div key={i} style={{ width: `${seg.pct}%`, background: seg.color, height: '100%' }} />
                  ))}
                </div>

                {/* Expanded: individual categories */}
                {isOpen && typedRow.catRows.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1 mb-2 ml-6 pl-3 border-l-2 border-[var(--border)]">
                    {typedRow.catRows.map(({ cat, mins }) => {
                      const pct = Math.round((mins / (elapsedMinutes || 1)) * 100)
                      const barW = (mins / (elapsedMinutes || 1)) * 100
                      return (
                        <div key={cat.id} className="flex flex-col gap-0.5 py-1">
                          <div className="flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: cat.color }}
                            />
                            <span className="text-sm flex-1 truncate">{cat.name}</span>
                            <span className="font-mono text-[13px] shrink-0">{formatDur(mins)}</span>
                            <span className="shrink-0 w-9 text-right font-mono text-xs text-[var(--muted-foreground)]">{pct}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-[var(--muted)] overflow-hidden ml-4">
                            <div style={{ width: `${barW}%`, height: '100%', background: cat.color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* By category */}
      {catRows.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h3 className="m-0 text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[0.06em]">По категориям</h3>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2">
            {catRows.map(({ cat, mins }) => (
              <div key={cat.id} className="flex items-center gap-2 min-h-[28px]">
                <span aria-hidden="true" className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: cat.color }} />
                <span className="text-sm">{cat.name}</span>
                <span className="ml-auto font-mono text-[13px]">{formatDur(mins)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {typeRows.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
          Нет записей за сегодня
        </p>
      )}

      {/* Quick log — small tasks without a dedicated time slot */}
      <div className="border-t border-[var(--border)] pt-5">
        <QuickLogSection date={date} />
      </div>
    </section>
  )
}
