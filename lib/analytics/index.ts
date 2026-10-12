import { parseISO } from 'date-fns'

export interface GridCellFill {
  kind: 'activity' | 'gap' | 'future'
  categoryId: string | undefined
  pct: number  // 0–100, fraction of the 30-min slot
}

export interface GridCell {
  kind: 'activity' | 'gap' | 'future'   // dominant kind
  categoryId: string | undefined          // dominant category
  isCurrent: boolean
  fills: GridCellFill[]                   // ordered segments summing to ≈100
}

export interface DaySummaryData {
  trackedMinutes: number
  untrackedMinutes: number
  remainingMinutes: number
  byCategoryMinutes: Map<string | undefined, number>
  grid: GridCell[]  // 48 cells: slot i = [dayStartMs + i*30min, +30min)
}

/**
 * Computes a 24-hour day summary from a list of entries.
 * dayStartMs / dayEndMs are UTC ms for the local-timezone day boundaries.
 * nowMs is the current UTC ms.
 * Grid slot 0 = first 30 min of day, slot 47 = last 30 min.
 */
export function buildDaySummary(
  entries: ReadonlyArray<{ started_at: string; ended_at: string; category_id?: string }>,
  dayStartMs: number,
  nowMs: number,
  dayEndMs: number,
): DaySummaryData {
  const clampedNow = Math.min(nowMs, dayEndMs)
  const elapsedMs = Math.max(0, clampedNow - dayStartMs)

  // Parse entries once
  const parsed = entries.map(e => ({
    s: parseISO(e.started_at).getTime(),
    e: parseISO(e.ended_at).getTime(),
    catId: e.category_id,
  }))

  let trackedMs = 0
  const byCategoryMinutes = new Map<string | undefined, number>()

  for (const p of parsed) {
    const s = Math.max(p.s, dayStartMs)
    const end = Math.min(p.e, clampedNow)
    if (end <= s) continue
    const durMin = (end - s) / 60_000
    trackedMs += end - s
    byCategoryMinutes.set(p.catId, (byCategoryMinutes.get(p.catId) ?? 0) + durMin)
  }

  const trackedMinutes = trackedMs / 60_000
  const untrackedMinutes = Math.max(0, elapsedMs / 60_000 - trackedMinutes)
  const remainingMinutes = Math.max(0, (dayEndMs - clampedNow) / 60_000)

  const SLOT_MS = 30 * 60_000
  const grid: GridCell[] = []

  for (let i = 0; i < 48; i++) {
    const slotStart = dayStartMs + i * SLOT_MS
    const slotEnd = slotStart + SLOT_MS
    const isCurrent = elapsedMs > 0 && nowMs >= slotStart && nowMs < slotEnd
    const effectiveEnd = Math.min(slotEnd, clampedNow)

    const fills: GridCellFill[] = []

    if (effectiveEnd > slotStart) {
      // Find all entries overlapping [slotStart, effectiveEnd], clipped and sorted
      const relevant = parsed
        .map(p => ({ s: Math.max(p.s, slotStart), e: Math.min(p.e, effectiveEnd), catId: p.catId }))
        .filter(p => p.e > p.s)
        .sort((a, b) => a.s - b.s)

      let cursor = slotStart
      for (const r of relevant) {
        if (r.s > cursor) {
          fills.push({ kind: 'gap', categoryId: undefined, pct: (r.s - cursor) / SLOT_MS * 100 })
        }
        fills.push({ kind: 'activity', categoryId: r.catId, pct: (r.e - r.s) / SLOT_MS * 100 })
        cursor = r.e
      }
      if (cursor < effectiveEnd) {
        fills.push({ kind: 'gap', categoryId: undefined, pct: (effectiveEnd - cursor) / SLOT_MS * 100 })
      }
    }

    if (effectiveEnd < slotEnd) {
      fills.push({ kind: 'future', categoryId: undefined, pct: (slotEnd - effectiveEnd) / SLOT_MS * 100 })
    }

    // Derive dominant kind + categoryId from fills (preserves existing test expectations)
    let kind: GridCell['kind'] = 'future'
    let categoryId: string | undefined
    const elapsed = fills.filter(f => f.kind !== 'future')
    if (elapsed.length > 0) {
      const elapsedPct = elapsed.reduce((s, f) => s + f.pct, 0)
      const best = elapsed.filter(f => f.kind === 'activity').sort((a, b) => b.pct - a.pct)[0]
      if (best && best.pct * 2 >= elapsedPct) {
        kind = 'activity'
        categoryId = best.categoryId
      } else {
        kind = 'gap'
      }
    }

    grid.push({ kind, categoryId, isCurrent, fills })
  }

  return { trackedMinutes, untrackedMinutes, remainingMinutes, byCategoryMinutes, grid }
}
