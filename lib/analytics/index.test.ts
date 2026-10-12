import { describe, it, expect } from 'vitest'
import { buildDaySummary } from './index'

const DAY_START = new Date('2026-10-12T21:00:00Z').getTime()  // = 2026-10-13 00:00 UTC+3
const DAY_END   = new Date('2026-10-13T21:00:00Z').getTime()  // = 2026-10-14 00:00 UTC+3

function iso(utcH: number, utcM = 0) {
  return new Date(DAY_START + (utcH * 60 + utcM) * 60_000).toISOString()
}

describe('buildDaySummary', () => {
  it('returns zeros for an empty day with no elapsed time', () => {
    const result = buildDaySummary([], DAY_START, DAY_START, DAY_END)
    expect(result.trackedMinutes).toBe(0)
    expect(result.untrackedMinutes).toBe(0)
    expect(result.remainingMinutes).toBe(1440)
    expect(result.grid.every(c => c.kind === 'future')).toBe(true)
  })

  it('computes tracked / untracked correctly', () => {
    const entries = [
      { started_at: iso(0), ended_at: iso(1), category_id: 'cat-sleep' },  // 60 min
    ]
    const now = DAY_START + 2 * 3_600_000  // 2h elapsed
    const r = buildDaySummary(entries, DAY_START, now, DAY_END)
    expect(r.trackedMinutes).toBe(60)
    expect(r.untrackedMinutes).toBe(60)
    expect(r.remainingMinutes).toBe(1440 - 120)
  })

  it('clips entries to day boundaries', () => {
    const beforeDay = { started_at: new Date(DAY_START - 3_600_000).toISOString(), ended_at: iso(1), category_id: 'a' }
    const now = DAY_START + 3_600_000
    const r = buildDaySummary([beforeDay], DAY_START, now, DAY_END)
    // Only 60 min within the day should be tracked
    expect(r.trackedMinutes).toBe(60)
  })

  it('marks the current 30-min slot as isCurrent', () => {
    const now = DAY_START + 45 * 60_000  // 45 minutes into the day = slot 1 (30-60)
    const r = buildDaySummary([], DAY_START, now, DAY_END)
    expect(r.grid[0].isCurrent).toBe(false)  // 00:00-00:30 is past
    expect(r.grid[1].isCurrent).toBe(true)   // 00:30-01:00 is current
    expect(r.grid[2].kind).toBe('future')
  })

  it('assigns activity to slot when entry covers ≥50% of it', () => {
    const entries = [
      // covers 00:10-00:40 → overlaps slot 0 (00:00-00:30) by 20/30 min ≥50%
      { started_at: iso(0, 10), ended_at: iso(0, 40), category_id: 'work' },
    ]
    const now = DAY_START + 3_600_000
    const r = buildDaySummary(entries, DAY_START, now, DAY_END)
    expect(r.grid[0].kind).toBe('activity')
    expect(r.grid[0].categoryId).toBe('work')
    expect(r.grid[1].kind).toBe('gap')  // slot 1 (00:30-01:00): 10/30 min < 50% → gap
  })

  it('marks slot as gap when entry covers <50%', () => {
    const entries = [
      // covers 00:26-00:40 → overlaps slot 0 by 4/30 < 50%
      { started_at: iso(0, 26), ended_at: iso(0, 40), category_id: 'work' },
    ]
    const now = DAY_START + 3_600_000
    const r = buildDaySummary(entries, DAY_START, now, DAY_END)
    expect(r.grid[0].kind).toBe('gap')
  })

  it('accumulates byCategoryMinutes', () => {
    const entries = [
      { started_at: iso(0), ended_at: iso(1), category_id: 'work' },
      { started_at: iso(1), ended_at: iso(1, 30), category_id: 'work' },
      { started_at: iso(1, 30), ended_at: iso(2), category_id: 'food' },
    ]
    const now = DAY_START + 3 * 3_600_000
    const r = buildDaySummary(entries, DAY_START, now, DAY_END)
    expect(r.byCategoryMinutes.get('work')).toBe(90)
    expect(r.byCategoryMinutes.get('food')).toBe(30)
  })
})
