import { parseISO } from 'date-fns'

export interface GridCell {
  kind: 'activity' | 'gap' | 'future'
  categoryId: string | undefined
  isCurrent: boolean
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

  let trackedMs = 0
  const byCategoryMinutes = new Map<string | undefined, number>()

  for (const e of entries) {
    const s = Math.max(parseISO(e.started_at).getTime(), dayStartMs)
    const end = Math.min(parseISO(e.ended_at).getTime(), clampedNow)
    if (end <= s) continue
    const durMin = (end - s) / 60_000
    trackedMs += end - s
    byCategoryMinutes.set(e.category_id, (byCategoryMinutes.get(e.category_id) ?? 0) + durMin)
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

    if (slotStart >= clampedNow && !isCurrent) {
      grid.push({ kind: 'future', categoryId: undefined, isCurrent: false })
      continue
    }

    // Effective end of the slot for coverage calculation
    const effectiveEnd = Math.min(slotEnd, clampedNow)
    const slotSpan = effectiveEnd - slotStart
    if (slotSpan <= 0) {
      grid.push({ kind: isCurrent ? 'gap' : 'future', categoryId: undefined, isCurrent })
      continue
    }

    let bestEntry: (typeof entries)[0] | null = null
    let bestOverlap = 0

    for (const e of entries) {
      const es = parseISO(e.started_at).getTime()
      const ee = parseISO(e.ended_at).getTime()
      const overlap = Math.min(ee, effectiveEnd) - Math.max(es, slotStart)
      if (overlap > bestOverlap) {
        bestOverlap = overlap
        bestEntry = e
      }
    }

    if (bestEntry && bestOverlap * 2 >= slotSpan) {
      grid.push({ kind: 'activity', categoryId: bestEntry.category_id, isCurrent })
    } else {
      grid.push({ kind: 'gap', categoryId: undefined, isCurrent })
    }
  }

  return { trackedMinutes, untrackedMinutes, remainingMinutes, byCategoryMinutes, grid }
}
