import { describe, it, expect } from 'vitest'
import {
  getDayBounds,
  toUTCString,
  parseUTC,
  durationMinutes,
  clipInterval,
  toDayDateString,
} from './index'

const MOSCOW: { timezone: string; day_start_hour: number } = {
  timezone: 'Europe/Moscow',
  day_start_hour: 4,
}

describe('getDayBounds — Moscow UTC+3, day_start_hour=4', () => {
  it('время после 04:00 принадлежит текущему дню', () => {
    // Oct 12 10:00 Moscow = Oct 12 07:00 UTC
    const { start, end } = getDayBounds(new Date('2026-10-12T07:00:00Z'), MOSCOW)
    expect(start.toISOString()).toBe('2026-10-12T01:00:00.000Z') // Oct 12 04:00 MSK
    expect(end.toISOString()).toBe('2026-10-13T01:00:00.000Z')   // Oct 13 04:00 MSK
  })

  it('время до 04:00 принадлежит предыдущему дню', () => {
    // Oct 12 03:00 Moscow = Oct 12 00:00 UTC
    const { start, end } = getDayBounds(new Date('2026-10-12T00:00:00Z'), MOSCOW)
    expect(start.toISOString()).toBe('2026-10-11T01:00:00.000Z') // Oct 11 04:00 MSK
    expect(end.toISOString()).toBe('2026-10-12T01:00:00.000Z')   // Oct 12 04:00 MSK
  })

  it('ровно в 04:00 — начало нового дня', () => {
    // Oct 12 04:00 Moscow = Oct 12 01:00 UTC
    const { start, end } = getDayBounds(new Date('2026-10-12T01:00:00Z'), MOSCOW)
    expect(start.toISOString()).toBe('2026-10-12T01:00:00.000Z')
    expect(end.toISOString()).toBe('2026-10-13T01:00:00.000Z')
  })
})

describe('getDayBounds — UTC, day_start_hour=0 (полночь)', () => {
  const UTC_MIDNIGHT = { timezone: 'UTC', day_start_hour: 0 }

  it('стандартная полночная граница', () => {
    const { start, end } = getDayBounds(new Date('2026-10-12T15:00:00Z'), UTC_MIDNIGHT)
    expect(start.toISOString()).toBe('2026-10-12T00:00:00.000Z')
    expect(end.toISOString()).toBe('2026-10-13T00:00:00.000Z')
  })
})

describe('сон через полночь (23:30–07:30)', () => {
  it('clipInterval режет сон по границе дня (04:00 MSK)', () => {
    const sleepStart = '2026-10-11T20:30:00.000Z' // Oct 11 23:30 MSK
    const sleepEnd   = '2026-10-12T04:30:00.000Z' // Oct 12 07:30 MSK

    const { start: dayStart, end: dayEnd } = getDayBounds(
      new Date('2026-10-12T01:00:00Z'), // Oct 12 04:00 MSK — начало нового дня
      MOSCOW
    )

    const prevDayBounds = getDayBounds(new Date('2026-10-11T20:30:00Z'), MOSCOW)

    const inPrevDay = clipInterval(sleepStart, sleepEnd, prevDayBounds.start, prevDayBounds.end)
    const inCurrDay = clipInterval(sleepStart, sleepEnd, dayStart, dayEnd)

    expect(inPrevDay).not.toBeNull()
    expect(inCurrDay).not.toBeNull()
    // Граница — Oct 12 04:00 MSK = Oct 12 01:00 UTC
    if (!inPrevDay || !inCurrDay) return
    expect(inPrevDay.clippedEnd.toISOString()).toBe('2026-10-12T01:00:00.000Z')
    expect(inCurrDay.clippedStart.toISOString()).toBe('2026-10-12T01:00:00.000Z')
  })
})

describe('UTC round-trip', () => {
  it('toUTCString и parseUTC взаимно обратны', () => {
    const date = new Date('2026-10-12T14:30:00.000Z')
    expect(parseUTC(toUTCString(date)).toISOString()).toBe(date.toISOString())
  })
})

describe('durationMinutes', () => {
  it('считает длительность правильно', () => {
    expect(durationMinutes('2026-10-12T10:00:00Z', '2026-10-12T11:30:00Z')).toBe(90)
  })
})

describe('toDayDateString', () => {
  it('возвращает дату в часовом поясе пользователя, не UTC', () => {
    // Oct 12 00:30 UTC = Oct 12 03:30 MSK → дата всё ещё Oct 12
    const result = toDayDateString(new Date('2026-10-12T00:30:00Z'), 'Europe/Moscow')
    expect(result).toBe('2026-10-12')
  })
})
